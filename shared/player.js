const ASSETS = new URL('../assets/', import.meta.url);
const STYLE = new URL('./player.css', import.meta.url);
const KEY = 'hellodeng.music.session.v1';
const VOLUME = 'hellodeng.music.volume.v1';
const time = seconds => `${Math.floor((seconds || 0) / 60)}:${String(Math.floor((seconds || 0) % 60)).padStart(2, '0')}`;
const read = (storage, key, fallback) => { try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (storage, key, value) => { try { storage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable in privacy mode. */ } };

export class SiteMusicPlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.suppressed = false;
    this.wanted = true;
    this.index = 0;
    this.tracks = [];
    this.lastSave = 0;
    this.status = '正在准备歌单';
    this.pendingGesture = false;
    this.shadowRoot.innerHTML = `<link rel="stylesheet" href="${STYLE}">
      <section class="music-shell" aria-label="背景音乐播放器">
        <div class="expanded" hidden>
          <div class="panel-heading"><span>MY LITTLE PLAYLIST <i>♫</i></span><button data-action="close" aria-label="收起歌单">⌄</button></div>
          <div class="track-info"><span class="eyebrow">NOW PLAYING</span><strong class="panel-title">GIRLS BAND CRY</strong><small class="panel-subtitle">トゲナシトゲアリ</small></div>
          <label class="seek-label"><span class="sr-only">播放进度</span><input class="seek" type="range" min="0" max="100" step="0.1" value="0" aria-label="播放进度"></label>
          <div class="time-row"><span class="elapsed">0:00</span><span class="duration">0:00</span></div>
          <div class="large-controls"><button data-action="previous" aria-label="上一首">❮❮</button><button class="large-play" data-action="toggle" aria-label="播放音乐">▶</button><button data-action="next" aria-label="下一首">❯❯</button><span class="loop-label" title="列表循环">↻</span></div>
          <div class="volume-row"><span aria-hidden="true">♫</span><label><span class="sr-only">音量</span><input class="volume" type="range" min="0" max="1" step="0.01" aria-label="音量"></label><span class="volume-text"></span></div>
          <div class="playlist" role="list" aria-label="选择歌曲"></div>
          <p class="playback-note" role="status" aria-live="polite"></p><button class="retry" data-action="retry" hidden>重新加载 / 重试</button>
        </div>
        <div class="mini"><button class="disc" data-action="toggle" aria-label="播放音乐"><img src="${new URL('subaru-avatar.webp', ASSETS)}" alt="" width="40" height="40"><span class="disc-symbol">▶</span></button>
        <button class="mini-info" data-action="expand" aria-label="展开歌单"><strong class="mini-title">GBC · 小小播放器</strong><span class="mini-status">正在准备歌单</span></button>
        <button class="mini-next" data-action="next" aria-label="下一首">❯❯</button><button class="expand-button" data-action="expand" aria-label="展开歌单" aria-expanded="false">☷</button></div>
      </section>`;
    this.$ = selector => this.shadowRoot.querySelector(selector);
    this.shadowRoot.addEventListener('click', event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      if (action === 'expand' || action === 'close') {
        const expand = action !== 'close' && this.$('.expanded').hidden;
        this.$('.expanded').hidden = !expand;
        this.$('.expand-button').setAttribute('aria-expanded', String(expand));
      } else if (action === 'toggle') {
        if (!this.audio.paused) { this.wanted = false; this.audio.pause(); this.status = '已暂停 · 点击播放'; this.save(); this.render(); }
        else this.playFromGesture();
      } else if (action === 'next' || action === 'previous') this.select(this.index + (action === 'next' ? 1 : -1), true);
      else if (action === 'select') this.select(Number(event.target.closest('[data-index]').dataset.index), true);
      else if (action === 'retry') {
        if (!this.tracks.length) this.ready = this.initialize();
        else { this.audio.load(); this.playFromGesture(); }
      }
    });
    this.shadowRoot.addEventListener('keydown', event => {
      if (event.key === 'Escape') { this.$('.expanded').hidden = true; this.$('.expand-button').setAttribute('aria-expanded', 'false'); this.$('.expand-button').focus(); }
    });
    this.$('.seek').addEventListener('input', event => {
      if (Number.isFinite(this.audio.duration)) this.audio.currentTime = Number(event.target.value) / 100 * this.audio.duration;
      this.save(); this.updateProgress();
    });
    const savedVolume = Number(read(localStorage, VOLUME, .25));
    this.audio.volume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : .25;
    this.$('.volume').value = this.audio.volume;
    this.$('.volume-text').textContent = `${Math.round(this.audio.volume * 100)}%`;
    this.$('.volume').addEventListener('input', event => {
      this.audio.volume = Number(event.target.value);
      this.$('.volume-text').textContent = `${Math.round(this.audio.volume * 100)}%`;
      write(localStorage, VOLUME, this.audio.volume);
    });
    this.audio.addEventListener('play', () => {
      if (this.suppressed) { this.audio.pause(); return; }
      this.status = '正在播放 · 列表循环'; this.$('.retry').hidden = true; this.render(); this.save();
      this.channel?.postMessage({ action: 'claim-audio', id: this.instanceId });
    });
    this.audio.addEventListener('pause', () => { this.render(); this.save(); });
    this.audio.addEventListener('ended', () => { if (!this.suppressed) this.select(this.index + 1, true); });
    this.audio.addEventListener('timeupdate', () => {
      this.updateProgress();
      if (Date.now() - this.lastSave > 4000) { this.save(); this.lastSave = Date.now(); }
    });
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.resumeTime > 0 && Number.isFinite(this.audio.duration)) { this.audio.currentTime = Math.min(this.resumeTime, Math.max(0, this.audio.duration - .25)); this.resumeTime = 0; }
      this.updateProgress();
    });
    this.audio.addEventListener('error', () => { this.status = '音频加载失败 · 可重试或切歌'; this.$('.retry').hidden = false; this.render(); });
    this.onPageHide = () => this.save();
    window.addEventListener('pagehide', this.onPageHide);
    this.instanceId = globalThis.crypto?.randomUUID?.() || String(Math.random());
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('hellodeng.music');
      this.channel.onmessage = event => {
        if (event.data?.action === 'claim-audio' && event.data.id !== this.instanceId && !this.audio.paused) {
          this.wanted = false; this.audio.pause(); this.status = '已在另一页面播放'; this.render();
        }
      };
    }
  }
  connectedCallback() { this.ready ??= this.initialize(); }
  disconnectedCallback() { this.audio.pause(); this.channel?.close(); window.removeEventListener('pagehide', this.onPageHide); }
  async initialize() {
    try {
      const response = await fetch(new URL('playlist.json', ASSETS));
      if (!response.ok) throw new Error('Playlist unavailable');
      this.tracks = await response.json();
      if (!Array.isArray(this.tracks) || !this.tracks.length) throw new Error('Empty playlist');
      const state = read(sessionStorage, KEY, {});
      const saved = this.tracks.findIndex(track => track.id === state.id);
      this.index = saved >= 0 ? saved : 0;
      this.wanted = this.pendingGesture || state.wanted !== false;
      this.resumeTime = saved >= 0 ? Number(state.time) || 0 : 0;
      this.$('.playlist').replaceChildren(...this.tracks.map((track, index) => {
        const row = document.createElement('button');
        row.className = 'playlist-track'; row.dataset.action = 'select'; row.dataset.index = index;
        const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
        const title = document.createElement('span'); title.textContent = track.title;
        row.append(number, title); row.setAttribute('aria-label', `播放 ${track.title}`); return row;
      }));
      this.audio.src = new URL(this.tracks[this.index].src, ASSETS).href;
      this.status = this.wanted ? '点击开启音乐' : '已暂停 · 点击播放';
      this.$('.retry').hidden = true;
      this.render();
      if (this.wanted && !this.suppressed) await this.attemptPlay();
    } catch { this.status = '歌单加载失败 · 点击重试'; this.$('.retry').hidden = false; this.render(); }
  }
  async attemptPlay() {
    if (this.suppressed || !this.tracks.length) return;
    try { await this.audio.play(); if (this.suppressed) this.audio.pause(); }
    catch (error) {
      if (error.name === 'AbortError' || this.suppressed) return;
      this.status = error.name === 'NotAllowedError' ? '点击开启音乐' : '播放失败 · 可重试或切歌';
      this.$('.retry').hidden = error.name === 'NotAllowedError'; this.render();
    }
  }
  playFromGesture() {
    this.wanted = true; this.pendingGesture = true;
    if (this.tracks.length) { this.save(); return this.attemptPlay(); }
    return this.ready;
  }
  select(index, play) {
    if (!this.tracks.length) return;
    this.index = (index + this.tracks.length) % this.tracks.length;
    this.resumeTime = 0; this.wanted = play;
    this.audio.src = new URL(this.tracks[this.index].src, ASSETS).href;
    this.status = play ? '正在加载…' : '已暂停 · 点击播放';
    this.$('.retry').hidden = true;
    this.save(); this.render(); this.updateProgress();
    if (play && !this.suppressed) this.attemptPlay();
  }
  setSuppressed(value) {
    value = Boolean(value);
    if (this.suppressed === value) return;
    this.suppressed = value; this.hidden = value;
    if (value) { this.audio.pause(); this.$('.expanded').hidden = true; this.$('.expand-button').setAttribute('aria-expanded', 'false'); }
    else if (this.wanted && this.tracks.length) this.attemptPlay();
  }
  updateProgress() {
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    this.$('.elapsed').textContent = time(this.audio.currentTime);
    this.$('.duration').textContent = time(duration);
    this.$('.seek').value = duration ? this.audio.currentTime / duration * 100 : 0;
  }
  save() {
    if (!this.tracks.length) return;
    write(sessionStorage, KEY, { id: this.tracks[this.index].id, time: this.audio.currentTime || this.resumeTime || 0, wanted: this.wanted });
  }
  render() {
    const track = this.tracks[this.index];
    const playing = !this.audio.paused && !this.suppressed;
    this.$('.music-shell').classList.toggle('is-playing', playing);
    if (track) { this.$('.mini-title').textContent = track.title; this.$('.panel-title').textContent = track.title; this.$('.panel-subtitle').textContent = track.subtitle; }
    this.$('.mini-status').textContent = this.status;
    this.$('.playback-note').textContent = this.status;
    this.$('.disc-symbol').textContent = playing ? 'Ⅱ' : '▶';
    this.$('.large-play').textContent = playing ? 'Ⅱ' : '▶';
    this.shadowRoot.querySelectorAll('[data-action="toggle"]').forEach(button => button.setAttribute('aria-label', playing ? '暂停音乐' : '播放音乐'));
    this.shadowRoot.querySelectorAll('.playlist-track').forEach((row, index) => { row.classList.toggle('active', index === this.index); row.setAttribute('aria-pressed', String(index === this.index)); });
  }
}
if (!customElements.get('site-music-player')) customElements.define('site-music-player', SiteMusicPlayer);
export function createPlayer() {
  const existing = document.querySelector('site-music-player');
  if (existing) return existing;
  const player = document.createElement('site-music-player');
  document.body.append(player);
  return player;
}

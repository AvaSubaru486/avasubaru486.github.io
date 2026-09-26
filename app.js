import { projects } from './projects.js';
import { createPlayer } from './shared/player.js';

const player = createPlayer();
const home = document.querySelector('#home-view');
const projectView = document.querySelector('#project-view');
const frames = document.querySelector('#project-frame-container');
const grid = document.querySelector('#project-grid');
let currentId = null;
let loadTimer;

for (const project of projects) {
  const card = document.createElement('article');
  card.className = `project-card project-${project.cover}`;
  card.innerHTML = `<a class="project-cover cover-${project.cover}" href="#/project/${project.id}" aria-label="打开${project.name}">
    <span class="cover-label">${project.category}</span><span class="cover-number">${project.number}</span>
    ${project.cover === 'intro' ? '<div class="intro-preview"><span>HELLO, THIS IS ME</span><strong>你好，<br>我是<span>邓嘉峰。</span></strong><small>BE CURIOUS. KEEP CREATING.</small><i>DJF<span>.</span></i></div>' : '<div class="map-preview"><img src="assets/map-preview.webp" alt="红色精神地图界面预览" loading="lazy" onerror="this.hidden=true"><div class="map-preview-fallback"><span>1921 — 至今</span><strong>红色精神<br>全国历史地图</strong><small>沿着足迹，读懂来路。</small></div></div>'}
    <span class="cover-open" aria-hidden="true">↗</span></a>
    <div class="project-details"><div class="project-title-row"><h3><a href="#/project/${project.id}">${project.name}</a></h3><span>${project.number} / PROJECT</span></div><p class="project-english">${project.title}</p><p>${project.description}</p><div class="project-card-bottom"><div class="project-tags">${project.tags.map(tag => `<span>${tag}</span>`).join('')}</div><a class="source-link" href="https://github.com/AvaSubaru486/${project.repository}" target="_blank" rel="noopener noreferrer" aria-label="${project.name}源码">源码 ↗</a></div></div>`;
  grid.append(card);
}

function route() {
  const match = location.hash.match(/^#\/project\/([^/?]+)/);
  const project = match && projects.find(item => item.id === match[1]);
  const isProject = Boolean(project);
  home.hidden = isProject;
  projectView.hidden = !isProject;
  document.body.classList.toggle('viewing-project', isProject);
  player.setSuppressed(isProject && !project.musicEnabled);
  clearTimeout(loadTimer);
  if (!isProject) {
    frames.replaceChildren();
    currentId = null;
    document.title = 'HelloDeng · AvaSubaru486';
    if (location.hash === '#projects' || location.hash === '#about') {
      requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' }));
    } else window.scrollTo(0, 0);
    return;
  }
  document.title = `${project.name} · HelloDeng`;
  document.querySelector('#project-title').textContent = project.title;
  document.querySelector('#project-external').href = project.url;
  if (currentId === project.id) return;
  currentId = project.id;
  const loading = document.querySelector('#project-loading');
  loading.hidden = false;
  loading.textContent = '正在打开项目…';
  const iframe = document.createElement('iframe');
  iframe.title = project.title;
  iframe.src = `${project.url}?embedded=1`;
  iframe.addEventListener('load', () => { clearTimeout(loadTimer); loading.hidden = true; });
  frames.replaceChildren(iframe);
  loadTimer = setTimeout(() => { loading.textContent = '加载较慢，可使用右侧“独立打开”，或刷新重试。'; }, 12000);
  window.scrollTo(0, 0);
}
document.querySelector('#hero-listen').addEventListener('click', () => player.playFromGesture());
document.querySelector('#year').textContent = new Date().getFullYear();
window.addEventListener('hashchange', route);
route();

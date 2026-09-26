import { projects } from './projects.js';
import { createPlayer } from './shared/player.js';

const player = createPlayer();
player.setAttribute('theme', 'glass');
const home = document.querySelector('#home-view');
const projectView = document.querySelector('#project-view');
const frames = document.querySelector('#project-frame-container');
const grid = document.querySelector('#project-grid');
let currentId = null;
let loadTimer;

// Decorative melody pixels, deliberately not presented as contribution data.
const pixelGrid = document.querySelector('#pixel-grid');
const letters = [
  '01110011110001111',
  '10000010001010000',
  '10000010001010000',
  '10111011110010000',
  '10001010001010000',
  '10001010001010000',
  '01110011110001111',
];
const pixels = document.createDocumentFragment();
for (let row = 0; row < 7; row++) {
  for (let col = 0; col < 53; col++) {
    const cell = document.createElement('span');
    let tone = 0;
    if (col >= 18 && col < 35 && letters[row][col - 18] === '1') tone = 2;
    else if (col < 14 || col > 39) {
      const height = 1 + ((col * 7 + 3) % 7);
      if (row >= 7 - height && (col % 3 !== 0)) tone = col < 14 ? 1 : 3;
    }
    cell.className = 'pixel' + (tone ? ' tone-' + tone : '');
    pixels.append(cell);
  }
}
pixelGrid.append(pixels);

for (const project of projects) {
  const card = document.createElement('article');
  card.className = `glass project-card project-${project.cover}`;
  card.innerHTML = `<a class="project-cover cover-${project.cover}" href="#/project/${project.id}" aria-label="打开${project.name}">
    <span class="project-thumbnail"><img src="assets/${project.cover === 'intro' ? 'subaru-avatar.webp' : 'map-preview.webp'}" alt="" width="47" height="47" loading="lazy"></span>
    <div class="project-heading"><h3>${project.name}</h3><span class="cover-label">${project.category}</span></div>
    <span class="cover-open" aria-hidden="true">↗</span></a>
    <p class="project-english">${project.title}</p><p class="project-description">${project.description}</p>
    <div class="project-card-bottom"><div class="project-tags">${project.tags.map(tag => `<span>${tag}</span>`).join('')}</div><a class="source-link" href="https://github.com/AvaSubaru486/${project.repository}" target="_blank" rel="noopener noreferrer" aria-label="${project.name}源码">源码 ↗</a></div>`;
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

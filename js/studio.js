const viewerEnglish = document.documentElement.lang.startsWith('en');
const local = (ko, en) => viewerEnglish ? en : ko;
const scenes = {
  shell: {
    label: local('회전 각도', 'Rotation'),
    description: local('그립을 돌려 네 버튼의 위치를 살펴보세요.', 'Rotate the grip to see where the four levers sit.'),
    alt: local('그립 외형', 'Assembled grip'), initial: 0
  },
  assembly: {
    label: local('분해 정도', 'Separation'),
    description: local('두 커버 사이에서 네 개의 레버와 회로기판의 위치를 살펴보세요.', 'Separate the covers to reveal four levers and the circuit board.'),
    alt: local('그립 커버, 레버와 내부 회로기판', 'Grip covers, levers and circuit board'), initial: 47
  },
  input: {
    label: local('누른 깊이', 'Button travel'),
    description: local('파란 버튼을 누르면 은색 고정부 안쪽으로 이동합니다.', 'Press the blue button to move it into the silver mount.'),
    alt: local('버튼과 고정부 확대', 'Close-up of one button and its mount'), initial: 0
  }
};

function enableViewer(panel) {
  const stage = panel.querySelector('.view-stage');
  const canvas = stage.querySelector('canvas');
  const context = canvas.getContext('2d');
  const poster = stage.querySelector('img');
  const play = panel.querySelector('.playbtn');
  const range = panel.querySelector('input[type=range]');
  const output = panel.querySelector('output');
  const note = panel.querySelector('.view-description');
  const buttons = Array.from(panel.querySelectorAll('[data-scene]'));
  const prefix = panel.dataset.root;
  const cache = new Map();
  let scene = 'assembly';
  let frame = 47;
  let playing = false;
  let animation = 0;
  let progress = 0;
  let pointer = null;

  function stop() {
    cancelAnimationFrame(animation);
    playing = false;
    play.textContent = local('재생', 'Play');
    play.dataset.playing = 'false';
  }

  function loadStrip(key) {
    if (cache.has(key)) return cache.get(key);
    const img = new Image();
    const pending = new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image unavailable'));
    });
    img.src = prefix + key + '.webp';
    if (cache.size >= 3) cache.delete(cache.keys().next().value);
    cache.set(key, pending);
    return pending;
  }

  function showFrame(next) {
    frame = Math.max(0, Math.min(47, Math.round(next)));
    range.value = frame;
    const value = scene === 'shell' ? Math.round(frame / 47 * 360) + '°' : Math.round(frame / 47 * 100) + '%';
    output.value = value;
    range.setAttribute('aria-valuetext', value);
    const requested = scene;
    const target = frame;
    const key = requested + '-' + Math.floor(frame / 8);
    loadStrip(key).then(strip => {
      if (scene !== requested || frame !== target || !context) return;
      const col = target % 4;
      const row = Math.floor(target % 8 / 4);
      context.drawImage(strip, col * 640, row * 416, 640, 416, 0, 0, 640, 416);
      canvas.hidden = false;
      poster.style.visibility = 'hidden';
    }).catch(() => {
      cache.delete(key);
      if (scene !== requested || frame !== target) return;
      stop();
      canvas.hidden = true;
      poster.style.visibility = 'visible';
      note.textContent = local('장면을 불러오지 못했습니다. 아래에서 그립과 앱 영상을 볼 수 있습니다.', 'This view could not load. Open the grip and app film below.');
      panel.querySelector('.film-backup').hidden = false;
    });
  }

  function selectScene(next) {
    stop();
    scene = next;
    progress = 0;
    canvas.hidden = true;
    poster.src = prefix + scene + '.webp';
    poster.alt = scenes[scene].alt;
    poster.style.visibility = 'visible';
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === scene)));
    note.textContent = scenes[scene].description;
    panel.querySelector('.range-name').textContent = scenes[scene].label;
    if (context) {
      showFrame(scenes[scene].initial);
    } else {
      panel.querySelector('.view-transport').hidden = true;
      panel.querySelector('.drag-hint').hidden = true;
      panel.querySelector('.film-backup').hidden = false;
    }
  }

  function togglePlayback() {
    if (playing) { stop(); return; }
    if (progress >= 1) progress = 0;
    const duration = scene === 'shell' ? 4800 : 3200;
    const start = performance.now() - progress * duration;
    playing = true;
    play.textContent = local('일시정지', 'Pause');
    play.dataset.playing = 'true';
    const tick = now => {
      progress = Math.min(1, Math.max(0, (now - start) / duration));
      const fraction = scene === 'input' ? 1 - Math.abs(2 * progress - 1) : progress;
      const next = Math.round(fraction * 47);
      if (frame !== next) showFrame(next);
      if (progress === 1) stop();
      else animation = requestAnimationFrame(tick);
    };
    tick(performance.now());
  }

  function scrub(next) {
    stop();
    showFrame(next);
    progress = (scene === 'input' ? 0.5 : 1) * frame / 47;
  }

  play.onclick = togglePlayback;
  range.oninput = () => scrub(Number(range.value));
  buttons.forEach(button => { button.onclick = () => selectScene(button.dataset.scene); });
  stage.onpointerdown = event => {
    if (!event.isPrimary || event.button !== 0) return;
    stop();
    pointer = {id: event.pointerId, x: event.clientX, start: frame};
    stage.setPointerCapture(event.pointerId);
  };
  stage.onpointermove = event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const delta = (event.clientX - pointer.x) / stage.clientWidth * 60;
    const next = Math.round(pointer.start + delta);
    scrub(scene === 'shell' ? (next % 48 + 48) % 48 : next);
  };
  stage.onlostpointercapture = () => { pointer = null; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  panel.addEventListener('modelpause', stop);
  selectScene('assembly');
}



function filmMetadata(video) {
  if (video.error) return Promise.reject(video.error);
  if (video.readyState >= 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    function loaded() { cleanup(); resolve(); }
    function invalid() { cleanup(); reject(new Error('Unavailable film')); }
    function cleanup() {
      video.removeEventListener('loadedmetadata', loaded);
      video.removeEventListener('error', invalid);
    }
    video.addEventListener('loadedmetadata', loaded);
    video.addEventListener('error', invalid);
  });
}

// Some static preview servers do not serve byte ranges. A local copy of
// this short film lets both the native timeline and chapter links seek.
async function prepareSeekableFilm(video) {
  await filmMetadata(video);
  if ((video.seekable.length && video.seekable.end(video.seekable.length-1) >= video.duration - 0.1) ||
      !/^https?:/.test(video.currentSrc)) return;
  const response = await fetch(video.currentSrc);
  if (!response.ok) throw new Error('Unavailable film');
  const url = URL.createObjectURL(await response.blob());
  video.src = url;
  await filmMetadata(video);
}

function enableFilm(panel) {
  const filmPane = panel.querySelector('.film-pane');
  const modelPane = panel.querySelector('.model-pane');
  const video = filmPane.querySelector('video');
  const start = filmPane.querySelector('.film-start');
  const summary = filmPane.querySelector('.chapter-summary');
  const modes = Array.from(panel.querySelectorAll('[data-mode]'));
  const chapters = Array.from(filmPane.querySelectorAll('[data-time]'));
  const fallback = filmPane.querySelector('.film-file');
  const durationLabel = panel.dataset.duration;
  const playLabel = start.querySelector('span').textContent;
  const cover = video.poster;
  const filmIntro = summary.textContent;
  let intro = filmIntro;
  let initialTime;
  let modelInitialized = false;
  let preparation;
  let requestId = 0;
  let started = false;

  function updateChapter() {
    if (!started) return;
    const current = chapters.filter(ch => Number(ch.dataset.time) <= video.currentTime + 0.02).pop() || chapters[0];
    chapters.forEach(ch => {
      if (ch === current) ch.setAttribute('aria-current', 'step');
      else ch.removeAttribute('aria-current');
    });
    summary.textContent = current.dataset.summary;
  }

  async function playFilm(at) {
    const id = ++requestId;
    try {
      preparation ||= prepareSeekableFilm(video);
      await preparation;
      if (requestId !== id || filmPane.hidden) return;
      if (at !== undefined) video.currentTime = at;
      video.controls = true;
      await video.play();
    } catch (error) {
      if (requestId !== id || error.name === 'AbortError') return;
      if (error.name === 'NotAllowedError') {
        video.controls = true;
        return;
      }
      failed();
    }
  }

  video.addEventListener('play', () => {
    for (const other of document.querySelectorAll('[data-viewer] video, [data-lever-film] video')) {
      if (other !== video && !other.paused) other.pause();
    }
    started = true;
    start.hidden = true;
    updateChapter();
  });
  video.addEventListener('timeupdate', updateChapter);
  video.addEventListener('ended', () => {
    start.hidden = false;
    start.querySelector('span').textContent = local('다시 재생', 'Replay');
    start.querySelector('small').textContent = durationLabel;
    video.controls = false;
  });
  function failed() {
    fallback.hidden = false;
    start.hidden = true;
    video.controls = true;
    summary.textContent = local('영상을 열 수 없습니다. 아래 MP4 파일을 열어 주세요.', 'Open the MP4 file below to watch the film.');
  }
  video.addEventListener('error', failed);
  video.querySelector('source:last-child').addEventListener('error', failed);
  chapters.forEach(ch => ch.onclick = () => playFilm(Number(ch.dataset.time)));
  start.onclick = () => {
    playFilm(video.ended ? 0 : !started ? initialTime : undefined);
  };
  video.controls = false;
  start.hidden = false;
  modes.forEach(mode => mode.onclick = () => {
    const film = mode.dataset.mode === 'film';
    filmPane.hidden = !film;
    modelPane.hidden = film;
    modes.forEach(other => other.setAttribute('aria-pressed', String(other === mode)));
    if (film) {
      panel.dispatchEvent(new Event('modelpause'));
      if (!started) summary.textContent = intro;
    } else {
      requestId++;
      video.pause();
      if (!modelInitialized) { enableViewer(panel); modelInitialized = true; }
    }
  });
  function applyChapterLink() {
    const link = chapters.find(ch => ch.dataset.link && location.hash === '#' + ch.dataset.link);
    if (started) {
      if (link) {
        modes.find(mode => mode.dataset.mode === 'film')?.click();
        playFilm(Number(link.dataset.time));
      }
      return;
    }
    initialTime = link ? Number(link.dataset.time) : undefined;
    intro = link ? link.dataset.summary : filmIntro;
    summary.textContent = intro;
    video.poster = link ? link.dataset.poster : cover;
    chapters.forEach(ch => {
      if (ch === link) ch.setAttribute('aria-current','step');
      else ch.removeAttribute('aria-current');
    });
    if (link) modes.find(mode => mode.dataset.mode === 'film')?.click();
    start.querySelector('span').textContent = link ? link.dataset.playLabel : playLabel;
    start.querySelector('small').textContent = link ? link.querySelector('small').textContent+'–'+link.dataset.end : durationLabel;
  }
  applyChapterLink();
  window.addEventListener('hashchange', applyChapterLink);

}
document.querySelectorAll('[data-viewer], [data-lever-film]').forEach(enableFilm);


document.querySelectorAll('[data-model-only]').forEach(enableViewer);

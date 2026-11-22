(() => {
  const panel = document.querySelector('#family-play');
  const video = panel?.querySelector('video');
  if (!video) return;
  const group = panel.querySelector('.family-chapters');
  const buttons = [...group.querySelectorAll('button')];
  const overlay = panel.querySelector('.film-play');
  const status = panel.querySelector('.motion-status');
  const hint = panel.querySelector('.motion-hint');
  let request = 0;
  let preparing;
  const requested = new URLSearchParams(location.search).get('activity');
  const activity = ['reach','tilt'].includes(requested) ? 'dance' : requested;
  let selection = buttons.find(button => button.dataset.activity === activity);

  function highlight(current) {
    const message = current?.dataset.hint || '';
    if (hint.textContent !== message) hint.textContent = message;
    buttons.forEach(button => {
      if (button === current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function update() {
    if (selection) return;
    const current = video.currentTime >= 48 ? undefined :
      buttons.filter(button => Number(button.dataset.second) <= video.currentTime).pop();
    highlight(current);
  }
  async function start(button) {
    const id = ++request;
    selection = button;
    const address = new URL(location.href);
    if (button.dataset.activity === 'intro') address.searchParams.delete('activity');
    else address.searchParams.set('activity', button.dataset.activity);
    address.hash = 'family-play';
    history.replaceState(history.state, '', address);
    highlight(button);
    status.textContent = '';
    video.controls = true;
    overlay?.remove();
    const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
    const bounds = video.getBoundingClientRect();
    if (bounds.top < headerBottom || bounds.bottom > window.innerHeight) {
      const top = Math.max(headerBottom, (window.innerHeight + headerBottom - bounds.height) / 2);
      window.scrollBy({top: bounds.top - top, behavior: 'instant'});
    }
    try {
      if (!preparing) {
        video.preload = 'auto';
        if (!video.readyState) video.load();
        preparing = prepareSeekableFilm(video);
      }
      await preparing;
      if (id !== request) return;
      video.currentTime = Number(button.dataset.second);
      selection = null;
      await video.play();
    } catch {
      if (id !== request) return;
      selection = null;
      preparing = undefined;
      status.textContent = document.documentElement.lang.startsWith('ko')
        ? '영상 아래의 재생 버튼으로 이 장면을 볼 수 있어요.'
        : 'Use the video controls to play this scene.';
    }
    update();
  }
  for (const button of buttons) button.addEventListener('click', () => start(button));
  if (selection && selection.dataset.activity !== 'intro') {
    video.poster = video.poster.replace('-poster.webp', '-' + selection.dataset.activity + '.webp');
    overlay?.addEventListener('click', event => {
      event.stopImmediatePropagation();
      if (selection) start(selection);
    }, {capture: true, once: true});
    highlight(selection);
  } else {
    selection = null;
    update();
  }
  group.hidden = false;
  video.addEventListener('timeupdate', update);
  video.addEventListener('seeked', update);
})();

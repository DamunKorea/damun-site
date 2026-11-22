(() => {
  const figure = document.querySelector('#center-session');
  if (!figure) return;
  const video = figure.querySelector('video');
  const controls = figure.querySelector('.center-cues');
  const buttons = [...controls.querySelectorAll('button')];
  let preparation;
  let request = 0;
  const update = () => {
    const active = buttons.filter(button => Number(button.dataset.second) <= video.currentTime).pop();
    for (const button of buttons) {
      if (button === active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
  };
  for (const button of buttons) {
    button.addEventListener('click', async () => {
      const id = ++request;
      try {
        preparation ||= prepareSeekableFilm(video);
        await preparation;
        if (id !== request) return;
        video.currentTime = Number(button.dataset.second);
        await video.play();
      } catch {
        preparation = undefined;
      }
      update();
    });
  }
  controls.hidden = false;
  video.addEventListener('timeupdate', update);
  video.addEventListener('seeked', update);
  update();
  const films = [...document.querySelectorAll('.center-film video')];
  for (const film of films) {
    film.addEventListener('play', () => {
      if (film !== video) request++;
      films.forEach(other => {
        if (other !== film && !other.paused) other.pause();
      });
    });
  }
})();

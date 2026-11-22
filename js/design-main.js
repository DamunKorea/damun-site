(() => {
  'use strict';

  document.querySelectorAll('.player-chapters').forEach((details) => {
    const summary = details.querySelector('summary');
    const label = summary.querySelector('.scene-name');
    const syncChapter = () => {
      const selected = details.querySelector('button[aria-current="step"]');
      const name = selected?.dataset.sceneName || '';
      if (label.textContent !== name) label.textContent = name;
    };
    new MutationObserver(syncChapter).observe(details, {
      subtree: true, attributes: true, attributeFilter: ['aria-current']
    });
    syncChapter();
    details.addEventListener('click', (event) => {
      if (!event.target.closest('button[data-scene-name]') || !matchMedia('(max-width: 760px)').matches) return;
      details.open = false;
      summary.focus({preventScroll: true});
      const player = details.closest('[data-viewer], #center-session')?.querySelector('video');
      if (player && player.getBoundingClientRect().top < 0) player.scrollIntoView({block: 'center', behavior: 'instant'});
    });
  });

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let activeFilm;
  document.addEventListener('play', (event) => {
    const film = event.target;
    if (!(film instanceof HTMLVideoElement) || (film.muted && film.loop)) return;
    if (activeFilm && activeFilm !== film && !activeFilm.paused) activeFilm.pause();
    activeFilm = film;
  }, true);

  /* 화면 문구: 페이지의 lang 으로 한국어·영어를 고른다 (UX-009) */
  const EN = document.documentElement.lang === 'en';
  const S = EN
    ? { open: 'Open menu', close: 'Close menu', copied: 'Email address copied.', play: 'Play activity demo', playOf: (n) => `Play ${n} activity demo`, playV: 'Play video', pauseV: 'Pause video', watch: 'Watch video', pauseAll: 'Pause videos', playAll: 'Play videos',
        failed: 'Could not copy. Press and hold the selected address, or copy it with Ctrl+C.' }
    : { open: '메뉴 열기', close: '메뉴 닫기', copied: '이메일 주소를 복사했습니다.', play: '활동 영상 재생', playOf: (n) => `${n} 활동 영상 재생`, playV: '영상 재생', pauseV: '영상 일시정지', watch: '영상 보기', pauseAll: '영상 멈추기', playAll: '영상 다시 재생',
        failed: '복사하지 못했습니다. 선택된 주소를 길게 누르거나 Ctrl+C로 복사해 주세요.' };

  /* 언어 전환: 보고 있던 구역(#앵커)을 그대로 가지고 대응 페이지로 간다 */
  document.querySelectorAll('[data-lang-switch]').forEach((a) => {
    a.addEventListener('click', () => {
      const destination = new URL(a.href);
      destination.hash = location.hash;
      const activity = new URLSearchParams(location.search).get('activity');
      if (document.querySelector('#family-play') && ['dance', 'tilt', 'reach'].includes(activity)) {
        destination.searchParams.set('activity', 'dance');
      }
      a.href = destination.href;
    });
  });

  // On narrow screens read the same coverage matrix one activity at a time.
  const coverage = document.querySelector('#coverage');
  const matrix = coverage?.querySelector('table.matrix');
  if (matrix?.tHead && matrix.tBodies.length) {
    const games = Array.from(matrix.tHead.rows[0].cells).slice(1);
    const form = document.createElement('div');
    form.className = 'coverage-picker';
    const label = document.createElement('label');
    label.htmlFor = 'coverage-activity';
    label.textContent = EN ? 'Choose an activity' : '콘텐츠 선택';
    const select = document.createElement('select');
    select.id = label.htmlFor;
    games.forEach((cell, i) => select.add(new Option(cell.textContent.trim(), String(i + 1))));
    const areas = document.createElement('dl');
    areas.setAttribute('aria-live', 'polite');
    areas.setAttribute('aria-atomic', 'true');
    function showAreas() {
      areas.replaceChildren();
      for (const [type, title] of [
        ['m', EN ? 'Main areas' : '주로 보는 영역'],
        ['s', EN ? 'Also covered' : '함께 보는 영역']
      ]) {
        const names = Array.from(matrix.tBodies[0].rows)
          .filter(row => row.cells[Number(select.value)]?.querySelector('.dot.' + type))
          .map(row => row.cells[0].textContent.trim());
        const group = document.createElement('div');
        const term = document.createElement('dt');
        const values = document.createElement('dd');
        term.textContent = title;
        values.textContent = names.length ? names.join(EN ? ', ' : ' · ') : (EN ? 'None' : '해당 없음');
        group.append(term, values);
        areas.append(group);
      }
    }
    select.addEventListener('change', showAreas);
    showAreas();
    form.append(label, select, areas);
    coverage.querySelector('.table-wrap').before(form);
    coverage.classList.add('has-activity-picker');
  }

  /* 헤더: 스크롤하면 아래 선이 생긴다 */
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* 모바일 메뉴 */
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr-only').textContent = open ? S.close : S.open;
    nav.classList.toggle('open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  const menuOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen()) { setMenu(false); toggle.focus(); }
  });
  /* 초점이 메뉴 밖(제품 탭·본문·다른 헤더 링크)으로 나가거나 바깥을 누르면 메뉴만 닫는다. 그 대상의 초점은 빼앗지 않는다 (UX-010) */
  document.addEventListener('focusin', (e) => {
    if (menuOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
  });
  document.addEventListener('click', (e) => {
    if (menuOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
  });

  const productMenu = nav.querySelector('.has-sub');
  if (productMenu) {
    const productButton = productMenu.querySelector('.sub-toggle');
    const setProduct = open => {
      productMenu.classList.toggle('open', open);
      productButton.setAttribute('aria-expanded', String(open));
    };
    productButton.addEventListener('click', () => setProduct(!productMenu.classList.contains('open')));
    productMenu.addEventListener('focusout', e => {
      if (!productMenu.contains(e.relatedTarget)) setProduct(false);
    });
    productMenu.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !productMenu.classList.contains('open')) return;
      e.stopPropagation();
      setProduct(false);
      productButton.focus();
    });
    document.addEventListener('click', e => {
      if (!productMenu.contains(e.target)) setProduct(false);
    });
    window.matchMedia('(min-width:901px)').addEventListener('change', () => setProduct(false));
  }

  // A saved link opens its technical reference in place. Reading and opening rows never navigates.
  const revealReference = () => {
    const id = location.hash.slice(1);
    if (!id) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(id)); } catch { return; }
    const row = target?.closest('details.tech-reference');
    if (!row || row.open) return;
    row.open = true;
    target.scrollIntoView({block: 'start', behavior: 'instant'});
  };
  revealReference();
  window.addEventListener('hashchange', revealReference);
  window.matchMedia('(min-width: 901px)').addEventListener('change', e => {
    if (e.matches) setMenu(false);
  });

  /* 활동 고르기 (Rehaptic 소개): 눌러서 고른다. 자동으로 넘어가지 않는다 (UX-005). 펼침 버튼(aria-expanded) 방식이라 모두 Tab 키로 닿는다.
     키보드: 좌우·위아래 화살표로도 이동, Home/End 로 처음·끝. */
  const tabsRoot = document.querySelector('.tabs');
  if (tabsRoot) {
    const tabs = [...tabsRoot.querySelectorAll('.tab')];
    const screens = [...document.querySelectorAll('.screens .screen')];
    let current = 0;

    const select = (i, focus) => {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach((t, n) => {
        const on = n === current;
        t.setAttribute('aria-expanded', String(on));
        t.parentElement.classList.toggle('is-active', on);
        screens[n].classList.toggle('is-active', on);
      });
      if (focus) tabs[current].focus();
    };

    tabs.forEach((t, n) => {
      t.addEventListener('click', () => select(n));
      t.addEventListener('keydown', (e) => {
        const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (move) { e.preventDefault(); select(current + move, true); }
        if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });
  }

  /* 이메일 주소 복사 (문의 페이지) (UX-006): 이 주소만 복사한다. 실패하면 주소를 선택해 직접 복사하도록 안내한다. */
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const status = btn.closest('.contact-card')?.querySelector('.copy-status');
    btn.addEventListener('click', async () => {
      let ok = true;
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
      } catch (_) {
        ok = false;
        const el = document.getElementById(btn.dataset.target);
        if (el) {
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      if (status) {
        status.textContent = ok ? S.copied : S.failed;
        clearTimeout(btn._clear);
        btn._clear = setTimeout(() => { status.textContent = ''; }, 6000);
      }
    });
  });

  /* 영상 슬롯
     [data-video] 가 가리키는 mp4 가 실제로 올라와 있을 때만 영상을 붙인다.
     - data-mode="loop"   : 무음 자동재생 반복. 정지 이미지(img)가 영상 전의 화면이 된다.
     - data-mode="player" : 재생 버튼이 있는 영상. 기본은 숨김(hidden)이고 파일이 있으면 나타난다.
     파일이 없으면 아무 일도 하지 않으므로 영상 없이 공개해도 빈 칸이 생기지 않는다. */
  const exists = async (url) => {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
      return res.ok && (res.headers.get('content-type') || '').startsWith('video');
    } catch (_) {
      return false;
    }
  };

  /* 설명 영상(player)은 파일 확인을 기다리지 않고 바로 붙인다. 확인이 끝난 뒤에야 자리가 생기면 문서가 뒤늦게 길어져서,
     언어 전환 뒤 뒤로 가기에서 읽던 위치가 밀린다 (UX-015). 영상 칸의 비율은 CSS 가 미리 잡아 둔다. */
  const reel = document.querySelector('.activity-reel-stage');
  if (reel) {
    const video = reel.querySelector('video');
    const button = reel.querySelector('.activity-reel-start');
    video.controls = false;
    button.hidden = false;
    button.addEventListener('click', () => {
      button.hidden = true;
      video.controls = true;
      video.focus({ preventScroll: true });
      video.play().catch(() => {
        video.controls = false;
        button.hidden = false;
        button.focus({ preventScroll: true });
      });
    });
  }

  const mountPlayer = (slot, url) => {
    const video = document.createElement('video');
    video.playsInline = true;
    video.controls = true;
    const cap = slot.querySelector('figcaption');
    if (cap) video.setAttribute('aria-label', cap.textContent.trim());
    if (slot.dataset.poster) {
      /* 첫 장면이 비어 있는 영상은 읽어 둔 대표 장면(poster)을 재생 전까지 그대로 보인다 */
      video.preload = 'none';
      video.poster = slot.dataset.poster;
      video.src = url;
    } else {
      video.preload = 'metadata';
      video.src = `${url}#t=0.1`;
    }
    video.addEventListener('error', () => { slot.hidden = true; }, { once: true });
    /* 재생 전에는 대표 장면과 「영상 보기」 단추만 보인다. 누르면 기본 컨트롤로 넘어간다 */
    const stageEl = document.createElement('div');
    stageEl.className = 'film-stage';
    stageEl.appendChild(video);
    if (slot.dataset.poster) {
      video.controls = false;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'film-play';
      btn.textContent = S.watch;
      if (cap) btn.setAttribute('aria-label', `${S.watch}: ${cap.textContent.trim()}`);
      btn.addEventListener('click', () => {
        btn.remove();
        video.controls = true;
        video.play().catch(() => {});
        video.focus({ preventScroll: true });
      });
      stageEl.appendChild(btn);
    }
    slot.prepend(stageEl);
    slot.hidden = false;
  };

  /* 움직임 줄이기 환경: 활동 영상을 저절로 틀지 않는다. 정지 화면은 그대로 두고, 프레임 바로 아래의 작은 버튼으로
     사용자가 원할 때만 기본 컨트롤이 있는 영상을 시작한다 (UX-017). */
  const activityName = (slot) => {
    const alt = (slot.querySelector('img') || {}).alt || '';
    return alt.split(/\s*(?:화면|screen)\b|:/)[0].trim();
  };
  const startDemo = (slot, url, btn) => {
    let video = slot.querySelector('video.slot-video');
    if (!video) {
      video = document.createElement('video');
      video.className = 'slot-video is-live';
      video.playsInline = true;
      video.controls = true;
      video.preload = 'auto';
      video.setAttribute('aria-label', S.playOf(activityName(slot)));
      video.src = url;
      slot.appendChild(video);
    }
    video.currentTime = 0;
    video.play().catch(() => {});
    if (btn) btn.hidden = true;
  };
  const manualPlay = (slot, url) => {
    const screens = slot.closest('.screens');
    if (screens) {
      /* 활동 탭의 세 화면은 한 프레임을 함께 쓴다: 버튼 하나가 지금 보이는 화면의 영상을 연다 */
      if (screens.dataset.manual) return;
      screens.dataset.manual = '1';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'demo-play';
      const device = screens.closest('.device');
      device.insertAdjacentElement('afterend', btn);
      const current = () => screens.querySelector('.screen.is-active') || slot;
      const refresh = () => {
        const cur = current();
        const v = cur.querySelector('video.slot-video');
        btn.textContent = S.play;
        btn.setAttribute('aria-label', S.playOf(activityName(cur)));
        btn.hidden = !!v && !v.paused;
        screens.querySelectorAll('.screen:not(.is-active) video.slot-video').forEach((x) => x.pause());
      };
      btn.addEventListener('click', () => { const cur = current(); startDemo(cur, cur.dataset.video, btn); });
      new MutationObserver(refresh).observe(screens, { subtree: true, attributes: true, attributeFilter: ['class'] });
      refresh();
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'demo-play';
      btn.textContent = S.play;
      btn.setAttribute('aria-label', S.playOf(activityName(slot)));
      btn.addEventListener('click', () => startDemo(slot, url, btn));
      slot.insertAdjacentElement('afterend', btn);
    }
  };

  /* 첫 화면 태블릿의 반복 영상: 재생·일시정지 버튼. 대표 지시(11/07)로 움직임 줄이기 설정이어도 저절로 틀고, 이 버튼으로 멈출 수 있게 한다 */
  const loopToggle = (slot, video) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'loop-toggle';
    const sync = () => {
      const on = !video.paused;
      btn.classList.toggle('is-playing', on);
      btn.setAttribute('aria-label', on ? S.pauseV : S.playV);
    };
    btn.addEventListener('click', () => {
      if (video.paused) { video.play().catch(() => {}); } else { video.pause(); }
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();
    slot.appendChild(btn);
  };

  /* 콘텐츠 영상: 누를 것 없이 화면에 들어온 영상이 소리 없이 돈다. 첫 화면 태블릿과 같이(대표 지시 11/07)
     움직임 줄이기 설정에서도 틀고, 구역 위의 단추 하나로 모두 멈출 수 있다. */
  const setupClips = (list) => {
    const btn = document.querySelector('[data-clips-toggle]');
    const seen = new Set();
    let stopped = false;
    const videoOf = (slot) => {
      let v = slot.querySelector('video');
      if (v) return v;
      v = document.createElement('video');
      v.className = 'slot-video';
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.setAttribute('aria-hidden', 'true');
      v.src = slot.dataset.video;
      v.addEventListener('playing', () => v.classList.add('is-live'), { once: true });
      v.addEventListener('error', () => v.remove(), { once: true });
      slot.appendChild(v);
      return v;
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          seen.add(e.target);
          if (!stopped) videoOf(e.target).play().catch(() => {});
        } else {
          seen.delete(e.target);
          const v = e.target.querySelector('video');
          if (v) v.pause();
        }
      });
    }, { threshold: 0.2 });
    list.querySelectorAll('figure[data-video]').forEach((slot) => io.observe(slot));
    if (!btn) return;
    const sync = () => {
      btn.textContent = stopped ? S.playAll : S.pauseAll;
      btn.classList.toggle('is-stopped', stopped);
    };
    btn.hidden = false;
    sync();
    btn.addEventListener('click', () => {
      stopped = !stopped;
      sync();
      seen.forEach((slot) => { const v = videoOf(slot); if (stopped) v.pause(); else v.play().catch(() => {}); });
    });
  };
  document.querySelectorAll('[data-clips]').forEach(setupClips);

  document.querySelectorAll('[data-video]').forEach(async (slot) => {
    if (slot.closest('[data-clips]')) return;
    const url = slot.dataset.video;
    const mode = slot.dataset.mode;
    if (mode === 'player') { mountPlayer(slot, url); return; }
    const heroStage = slot.classList.contains('stage');
    if (mode === 'loop' && reduceMotion && !heroStage) {
      if (await exists(url)) manualPlay(slot, url);
      return;
    }
    if (!(await exists(url))) return;

    const video = document.createElement('video');
    video.playsInline = true;
    video.className = 'slot-video';
    video.muted = true;
    video.loop = true;
    video.setAttribute('aria-hidden', 'true');
    /* 여기까지 온 반복 영상은 첫 화면 태블릿(설정과 관계없이) 또는 움직임 줄이기가 아닌 경우라 모두 저절로 튼다 */
    video.preload = 'auto';
    video.src = url;
    video.addEventListener('playing', () => video.classList.add('is-live'), { once: true });
    /* 태블릿 틀이 있으면 그 안(베젤 안쪽)에 영상을 놓아 테두리·둥근 모서리가 그대로 보이게 한다 */
    (slot.querySelector('.tablet') || slot).appendChild(video);
    if (heroStage) loopToggle(slot, video);
    video.autoplay = true;
    video.play().catch(() => {});
  });
})();

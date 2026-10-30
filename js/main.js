(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 화면 문구: 페이지의 lang 으로 한국어·영어를 고른다 (UX-009) */
  const EN = document.documentElement.lang === 'en';
  const S = EN
    ? { open: 'Open menu', close: 'Close menu', copied: 'Email address copied.', play: 'Play activity demo', playOf: (n) => `Play ${n} activity demo`,
        failed: 'Could not copy. Press and hold the selected address, or copy it with Ctrl+C.' }
    : { open: '메뉴 열기', close: '메뉴 닫기', copied: '이메일 주소를 복사했습니다.', play: '활동 영상 재생', playOf: (n) => `${n} 활동 영상 재생`,
        failed: '복사하지 못했습니다. 선택된 주소를 길게 누르거나 Ctrl+C로 복사해 주세요.' };

  /* 언어 전환: 보고 있던 구역(#앵커)을 그대로 가지고 대응 페이지로 간다 */
  document.querySelectorAll('[data-lang-switch]').forEach((a) => {
    a.addEventListener('click', () => {
      a.setAttribute('href', a.getAttribute('href').split('#')[0] + location.hash);
    });
  });

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

  /* 제품 탭 줄(좁은 화면에서는 안에서 가로로 민다): 열 때·폭이 바뀔 때 현재 탭 전체가 보이게 이 줄만 맞춘다. 쪽 위치는 건드리지 않는다 (UX-011) */
  const subRow = document.querySelector('.subnav-inner');
  if (subRow) {
    const placeCurrent = () => {
      const cur = subRow.querySelector('[aria-current="page"]');
      if (!cur) return;
      const cr = cur.getBoundingClientRect(), sr = subRow.getBoundingClientRect();
      const left = cr.left - sr.left + subRow.scrollLeft, right = left + cr.width, pad = 28;
      if (right > subRow.scrollLeft + subRow.clientWidth - pad) subRow.scrollLeft = right - subRow.clientWidth + pad;
      if (left < subRow.scrollLeft + pad) subRow.scrollLeft = Math.max(0, left - pad);
    };
    placeCurrent();
    window.addEventListener('resize', placeCurrent);
    window.addEventListener('pageshow', placeCurrent);
  }

  /* 긴 기술 페이지 목차 (UX-012): 넓은 화면은 본문 옆 고정 목차, 좁은 화면은 접힌 목차 + 작은 목차 버튼(아래에서 올라오는 시트).
     이동은 짧게 끝나도록 바로 가고(부드러운 스크롤 끔), 도착한 구역 제목에 초점을 둔다. */
  const toc = document.getElementById('page-toc');
  if (toc) {
    const fab = document.querySelector('.toc-fab');
    const closeBtn = toc.querySelector('.toc-close');
    const hero = document.querySelector('.page-head');
    const wide = window.matchMedia('(min-width: 1100px)');
    const links = [...toc.querySelectorAll('a[href^="#"]:not([data-top])')];
    const sections = links.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
    const root = document.documentElement;
    toc.tabIndex = -1;

    const setOpen = (open) => {
      toc.classList.toggle('is-open', open);
      fab.setAttribute('aria-expanded', String(open));
      if (open) closeBtn.focus();
    };
    const jump = (a) => {
      root.style.scrollBehavior = 'auto';
      if (a.hasAttribute('data-top')) {
        window.scrollTo(0, 0);
        history.pushState(null, '', location.pathname + location.search);
      } else {
        const target = document.getElementById(a.getAttribute('href').slice(1));
        if (!target) { root.style.scrollBehavior = ''; return; }
        target.scrollIntoView({ block: 'start' });
        history.pushState(null, '', a.getAttribute('href'));
        const h = target.querySelector('h2');
        if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
      }
      root.style.scrollBehavior = '';
    };
    const onLink = (e, onDone) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      jump(a);
      onDone();
    };
    toc.addEventListener('click', (e) => onLink(e, () => { if (!wide.matches) setOpen(false); }));
    const inline = document.querySelector('.toc-inline');
    if (inline) inline.addEventListener('click', (e) => onLink(e, () => { inline.open = false; }));
    fab.addEventListener('click', () => setOpen(!toc.classList.contains('is-open')));
    closeBtn.addEventListener('click', () => { setOpen(false); fab.focus(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toc.classList.contains('is-open')) { setOpen(false); fab.focus(); }
    });
    toc.addEventListener('focusout', (e) => {
      if (toc.classList.contains('is-open') && !toc.contains(e.relatedTarget) && e.relatedTarget !== fab) setOpen(false);
    });
    document.addEventListener('pointerdown', (e) => {
      if (toc.classList.contains('is-open') && !toc.contains(e.target) && !fab.contains(e.target)) setOpen(false);
    });

    /* 첫 화면을 지나면 목차를 보이고, 지금 읽는 구역을 표시한다 */
    let ticking = false;
    const sync = () => {
      ticking = false;
      const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 100;
      root.classList.toggle('toc-on', hero ? hero.getBoundingClientRect().bottom < pad + 60 : true);
      const line = pad + 24;
      let cur = -1;
      sections.forEach((sec, i) => { if (sec && sec.getBoundingClientRect().top <= line) cur = i; });
      links.forEach((a, i) => { if (i === cur) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    };
    const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(sync); } };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    sync();
  }

  /* 상단 메뉴 「제품」 펼침 목록: 눌러 열고 닫는다. 바깥을 누르거나 Esc, 초점이 밖으로 나가면 닫힌다.
     넓은 화면에서 마우스를 올려도 열린다(CSS). 좁은 화면 메뉴에서는 늘 펼쳐 둔다. */
  document.querySelectorAll('.has-sub').forEach((li) => {
    const btn = li.querySelector('.sub-toggle');
    if (!btn) return;
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); li.classList.toggle('open', open); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); set(btn.getAttribute('aria-expanded') !== 'true'); });
    li.addEventListener('focusout', (e) => { if (!li.contains(e.relatedTarget)) set(false); });
    document.addEventListener('click', (e) => { if (!li.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
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
    slot.prepend(video);
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

  document.querySelectorAll('[data-video]').forEach(async (slot) => {
    const url = slot.dataset.video;
    const mode = slot.dataset.mode;
    if (mode === 'player') { mountPlayer(slot, url); return; }
    if (mode === 'loop' && reduceMotion) {
      if (!slot.closest('.hero') && (await exists(url))) manualPlay(slot, url);
      return;
    }
    if (!(await exists(url))) return;

    const video = document.createElement('video');
    video.playsInline = true;
    video.className = 'slot-video';
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.setAttribute('aria-hidden', 'true');
    video.src = url;
    video.addEventListener('playing', () => video.classList.add('is-live'), { once: true });
    slot.appendChild(video);
    video.play().catch(() => {});
  });
})();

(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 헤더: 스크롤하면 아래 선이 생긴다 */
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* 모바일 메뉴 */
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr-only').textContent = open ? '메뉴 닫기' : '메뉴 열기';
    nav.classList.toggle('open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* 스크롤 등장 */
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('in'));
  }

  /* 활동 탭 (제품 페이지): 누르면 바뀌고, 화면에 보이는 동안은 6초마다 저절로 넘어간다 */
  const tabsRoot = document.querySelector('.tabs');
  if (tabsRoot) {
    const tabs = [...tabsRoot.querySelectorAll('.tab')];
    const screens = [...document.querySelectorAll('.screens .screen')];
    const DURATION = 6000;
    let current = 0;
    let timer = null;
    let visible = false;
    let stopped = reduceMotion;   // 사용자가 직접 눌렀거나 모션 줄이기면 자동 넘김을 멈춘다

    const select = (i, focus) => {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach((t, n) => {
        const on = n === current;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        t.parentElement.classList.toggle('is-active', on);
        screens[n].classList.toggle('is-active', on);
      });
      if (focus) tabs[current].focus();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (stopped || !visible) { tabsRoot.classList.remove('autoplay'); return; }
      tabsRoot.style.setProperty('--dur', `${DURATION}ms`);
      tabsRoot.classList.remove('autoplay');
      void tabsRoot.offsetWidth;            // 진행 줄 애니메이션을 처음부터 다시 시작
      tabsRoot.classList.add('autoplay');
      timer = setTimeout(() => { select(current + 1); schedule(); }, DURATION);
    };

    tabs.forEach((t, n) => {
      t.addEventListener('click', () => { stopped = true; select(n); schedule(); });
      t.addEventListener('keydown', (e) => {
        const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (move) { e.preventDefault(); stopped = true; select(current + move, true); schedule(); }
        if (e.key === 'Home') { e.preventDefault(); stopped = true; select(0, true); schedule(); }
        if (e.key === 'End') { e.preventDefault(); stopped = true; select(tabs.length - 1, true); schedule(); }
      });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; schedule(); }, { threshold: 0.35 }).observe(document.querySelector('.act-wrap'));
    }
  }

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

  document.querySelectorAll('[data-video]').forEach(async (slot) => {
    const url = slot.dataset.video;
    const mode = slot.dataset.mode;
    if (mode === 'loop' && reduceMotion) return;
    if (!(await exists(url))) return;

    const video = document.createElement('video');
    video.playsInline = true;

    if (mode === 'player') {
      video.controls = true;
      video.preload = 'metadata';
      video.src = `${url}#t=0.1`;
      slot.prepend(video);
      slot.hidden = false;
    } else {
      video.className = 'slot-video';
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.setAttribute('aria-hidden', 'true');
      video.src = url;
      video.addEventListener('playing', () => video.classList.add('is-live'), { once: true });
      slot.appendChild(video);
      video.play().catch(() => {});
    }
  });
})();

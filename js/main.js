(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 화면 문구: 페이지의 lang 으로 한국어·영어를 고른다 (UX-009) */
  const EN = document.documentElement.lang === 'en';
  const S = EN
    ? { open: 'Open menu', close: 'Close menu', copied: 'Email address copied.',
        failed: 'Could not copy. Press and hold the selected address, or copy it with Ctrl+C.' }
    : { open: '메뉴 열기', close: '메뉴 닫기', copied: '이메일 주소를 복사했습니다.',
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
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

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

  document.querySelectorAll('[data-video]').forEach(async (slot) => {
    const url = slot.dataset.video;
    const mode = slot.dataset.mode;
    if (mode === 'loop' && reduceMotion) return;
    if (!(await exists(url))) return;

    const video = document.createElement('video');
    video.playsInline = true;

    if (mode === 'player') {
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

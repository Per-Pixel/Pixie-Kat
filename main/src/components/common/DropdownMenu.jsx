import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { TiLocationArrow } from 'react-icons/ti';

import { useAuth } from '../../contexts/AuthContext';
import { useAppearance } from '../../contexts/AppearanceContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { publicMediaUrl } from '../../lib/supabase';
import {
  getMenuCardPose,
  getMenuParallax,
  getMenuScrollState,
} from '../../animations/menuDeck';
import Button from './Button';

gsap.registerPlugin(ScrollTrigger);

const menuLayers = [
  {
    id: 'home',
    label: 'Home',
    title: 'Welcome to PixieKat',
    description: 'Your trusted gaming top-up partner',
    path: '/',
    image: publicMediaUrl('/videos/feature-1.mp4'),
    poster: publicMediaUrl('/img/loading/1.jpg'),
    buttonText: 'Get Started',
  },
  {
    id: 'games',
    label: 'Games',
    title: 'Popular Games',
    description: 'Top up MLBB, PUBG, Free Fire & more',
    path: '/games',
    image: publicMediaUrl('/videos/feature-2.mp4'),
    poster: publicMediaUrl('/img/loading/2.jpg'),
    buttonText: 'Browse Games',
  },
  {
    id: 'cart',
    label: 'Cart',
    title: 'Your Cart',
    description: 'Stack top-ups for any account, pay once',
    path: '/cart',
    image: publicMediaUrl('/videos/feature-4.mp4'),
    poster: publicMediaUrl('/img/loading/5.jpg'),
    buttonText: 'Open Cart',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    title: 'Membership Plans',
    description: 'Get exclusive benefits and bonuses',
    path: '/pricing',
    image: publicMediaUrl('/videos/feature-3.mp4'),
    poster: publicMediaUrl('/img/loading/3.jpg'),
    buttonText: 'View Plans',
  },
  {
    id: 'howitworks',
    label: 'How It Works',
    title: 'How It Works',
    description: 'Simple 5-step process for instant top-ups',
    path: '/how-it-works',
    image: publicMediaUrl('/videos/feature-4.mp4'),
    poster: publicMediaUrl('/img/loading/4.jpg'),
    buttonText: 'Learn More',
  },
  {
    id: 'faq',
    label: 'FAQ',
    title: 'FAQ',
    description: 'Find answers to common questions',
    path: '/faq',
    image: publicMediaUrl('/videos/feature-5.mp4'),
    poster: publicMediaUrl('/img/loading/6.jpg'),
    buttonText: 'Read FAQ',
  },
  {
    id: 'support',
    label: 'Support',
    title: 'Customer Support',
    description: '24/7 support via WhatsApp & more',
    path: '/support',
    image: publicMediaUrl('/videos/feature-1.mp4'),
    poster: publicMediaUrl('/img/about.webp'),
    buttonText: 'Get Help',
  },
  {
    id: 'promo',
    label: 'Promo',
    title: 'Promotions',
    description: 'Deals, bonuses & limited-time offers',
    image: publicMediaUrl('/img/promotion/leomord.webp'),
    comingSoon: true,
  },
  {
    id: 'blog',
    label: 'Blog',
    title: 'PixieKat Blog',
    description: 'News, guides & top-up tips',
    image: publicMediaUrl('/img/loading/7.jpg'),
    comingSoon: true,
  },
];

const clampIndex = (index) => Math.max(0, Math.min(menuLayers.length - 1, index));
const formatOrdinal = (index) => String(index + 1).padStart(2, '0');

const DropdownMenu = ({ onClose }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef(null);
  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const listRef = useRef(null);
  const floatRef = useRef(null);
  const progressRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const handleCloseRef = useRef(() => {});
  const closingRef = useRef(false);
  const selectLayerRef = useRef(null);
  const activeIndexRef = useRef(0);
  const reducedRef = useRef(false);
  const closeTweenRef = useRef(null);
  const enterTweenRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const appearance = useAppearance();
  const reduced = useReducedMotion();
  const isCoarsePointer =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const brandText = appearance.header_brand_text || 'PixieKat';

  onCloseRef.current = onClose;
  reducedRef.current = reduced;

  const handleClose = useCallback((path) => {
    if (closingRef.current) return;
    closingRef.current = true;
    enterTweenRef.current?.kill();
    const finish = () => {
      onCloseRef.current();
      if (path) navigate(path);
    };
    const menu = menuRef.current;
    if (reducedRef.current || !menu) {
      finish();
      return;
    }
    closeTweenRef.current = gsap.to(menu, {
      yPercent: -100,
      duration: 0.45,
      ease: 'power2.in',
      onComplete: finish,
    });
  }, [navigate]);
  handleCloseRef.current = handleClose;

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return undefined;

    const docEl = document.documentElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = docEl.style.overflow;
    document.body.style.overflow = 'hidden';
    docEl.style.overflow = 'hidden';

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const inerted = [];
    Array.from(document.body.children).forEach((el) => {
      if (el === menu || el.contains(menu) || !(el instanceof HTMLElement)) return;
      inerted.push([el, el.hasAttribute('inert')]);
      el.setAttribute('inert', '');
    });

    if (!reducedRef.current) {
      enterTweenRef.current = gsap.fromTo(
        menu,
        { yPercent: -100 },
        { yPercent: 0, duration: 0.6, ease: 'power3.out' }
      );
    }

    closeButtonRef.current?.focus({ preventScroll: true });

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseRef.current();
      }
    };
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('keydown', onEscape);
      enterTweenRef.current?.kill();
      closeTweenRef.current?.kill();
      document.body.style.overflow = previousBodyOverflow;
      docEl.style.overflow = previousHtmlOverflow;
      inerted.forEach(([el, hadInert]) => {
        if (hadInert) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
      });
      if (opener && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return undefined;

    const ctx = gsap.context(() => {
      const scroller = scrollRef.current;
      const track = trackRef.current;
      const list = listRef.current;
      const floatEl = floatRef.current;
      const progressFill = progressRef.current;
      const layerButtons = gsap.utils.toArray('.layer-menu__layer', list);
      const cards = gsap.utils.toArray('.layer-menu__card', floatEl);
      const copies = gsap.utils.toArray('.layer-menu__card-copy', floatEl);
      const backplates = gsap.utils.toArray('.layer-menu__backplate', floatEl);
      const firstRow = layerButtons[0];

      const playhead = { progress: 0 };
      let rowHeight = firstRow ? firstRow.offsetHeight : 0;
      let viewportWidth = menu.clientWidth;
      let viewportHeight = menu.clientHeight;
      const mixColor = gsap.utils.interpolate('#8b6dff', '#DFDFF0');

      const renderProgress = () => {
        const state = getMenuScrollState(playhead.progress, menuLayers.length);
        gsap.set(list, { y: reduced ? 0 : -state.position * rowHeight });
        layerButtons.forEach((button, index) => {
          const focus = Math.max(0, 1 - Math.abs(index - state.position));
          gsap.set(button, {
            color: mixColor(focus),
            opacity: reduced ? 1 : Math.max(0.42, 1 - Math.abs(index - state.position) * 0.22),
          });
        });
        cards.forEach((card, index) => {
          const distance = index - state.position;
          gsap.set(card, {
            ...getMenuCardPose(distance, reduced),
            zIndex: index === state.activeIndex ? 20 : 10 - Math.min(6, Math.round(Math.abs(distance))),
          });
          gsap.set(copies[index], { opacity: Math.max(0, 1 - Math.abs(distance) * 1.6) });
        });
        backplates.forEach((plate, index) => {
          if (reduced) {
            gsap.set(plate, { opacity: 0 });
            return;
          }
          gsap.set(plate, {
            ...getMenuCardPose(index === 0 ? -1 : 1),
            z: -320,
            opacity: 0.28,
            zIndex: 2,
          });
        });
        gsap.set(progressFill, { scaleX: state.progress });
        if (activeIndexRef.current !== state.activeIndex) {
          if (cards[activeIndexRef.current]?.contains(document.activeElement)) {
            layerButtons[state.activeIndex]?.focus({ preventScroll: true });
          }
          activeIndexRef.current = state.activeIndex;
          setActiveIndex(state.activeIndex);
        }
      };

      const tween = gsap.fromTo(playhead, { progress: 0 }, {
        progress: 1,
        ease: 'none',
        duration: 1,
        onUpdate: renderProgress,
        scrollTrigger: {
          trigger: track,
          scroller,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      renderProgress();

      selectLayerRef.current = (index, immediate = false) => {
        const selected = clampIndex(index);
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        scroller.scrollTo({
          top: (selected / (menuLayers.length - 1)) * maxScroll,
          behavior: reduced || immediate ? 'auto' : 'smooth',
        });
        if (immediate || reduced) {
          tween.scrollTrigger.update();
        }
      };

      const focusableInMenu = () =>
        gsap.utils.toArray('a[href], button, [tabindex]', menu).filter((el) => {
          if (el.disabled || el.tabIndex < 0) return false;
          for (let node = el; node && node !== menu; node = node.parentElement) {
            if (node.hasAttribute('inert') || node.getAttribute('aria-hidden') === 'true') {
              return false;
            }
          }
          return el.getClientRects().length > 0;
        });

      const onKeyDown = (event) => {
        if (event.key === 'Tab') {
          const focusable = focusableInMenu();
          if (!focusable.length) {
            event.preventDefault();
            return;
          }
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const focusedIndex = focusable.indexOf(document.activeElement);
          const wrapToLast = event.shiftKey && focusedIndex <= 0;
          const wrapToFirst = !event.shiftKey && (focusedIndex < 0 || focusedIndex === focusable.length - 1);
          if (wrapToLast || wrapToFirst) {
            event.preventDefault();
            (wrapToLast ? last : first).focus({ preventScroll: true });
          }
          return;
        }

        const keySteps = { ArrowDown: 1, ArrowUp: -1, PageDown: 3, PageUp: -3 };
        let target = null;
        if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = menuLayers.length - 1;
        else if (event.key in keySteps) {
          const maxScroll = scroller.scrollHeight - scroller.clientHeight;
          const liveIndex = maxScroll > 0
            ? Math.round((scroller.scrollTop / maxScroll) * (menuLayers.length - 1))
            : activeIndexRef.current;
          target = liveIndex + keySteps[event.key];
        }
        if (target === null) return;

        event.preventDefault();
        const selected = clampIndex(target);
        selectLayerRef.current?.(selected, true);
        layerButtons[selected]?.focus({ preventScroll: true });
      };
      menu.addEventListener('keydown', onKeyDown);

      let refreshRaf = 0;
      let disposed = false;
      let pendingProgress = null;
      const captureProgress = () => {
        pendingProgress = playhead.progress;
      };
      window.addEventListener('resize', captureProgress);
      const scheduleRefresh = () => {
        if (disposed || refreshRaf) return;
        refreshRaf = requestAnimationFrame(() => {
          refreshRaf = 0;
          if (disposed) return;
          rowHeight = firstRow ? firstRow.offsetHeight : rowHeight;
          viewportWidth = menu.clientWidth;
          viewportHeight = menu.clientHeight;
          const progress = pendingProgress ?? playhead.progress;
          pendingProgress = null;
          tween.scrollTrigger.refresh();
          const maxScroll = scroller.scrollHeight - scroller.clientHeight;
          scroller.scrollTop = progress * maxScroll;
          tween.scrollTrigger.update();
          renderProgress();
        });
      };
      const observer = new ResizeObserver(scheduleRefresh);
      observer.observe(scroller);
      if (firstRow) observer.observe(firstRow);
      if (document.fonts?.ready) {
        document.fonts.ready.then(scheduleRefresh).catch(() => {});
      }

      const deck = menu.querySelector('.layer-menu__deck');
      let touchDrag = null;
      let swallowClick = false;
      const onDeckPointerDown = (event) => {
        if (event.pointerType === 'mouse' || !deck) return;
        swallowClick = false;
        touchDrag = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startScroll: scroller.scrollTop,
          startTime: event.timeStamp,
          active: false,
        };
        try {
          deck.setPointerCapture(event.pointerId);
        } catch {
          /* synthetic or already-released pointer */
        }
      };
      const onDeckPointerMove = (event) => {
        if (!touchDrag || event.pointerId !== touchDrag.id) return;
        const dx = event.clientX - touchDrag.startX;
        const dy = event.clientY - touchDrag.startY;
        if (!touchDrag.active) {
          if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            touchDrag.active = true;
          } else if (Math.abs(dy) > 8) {
            touchDrag = null;
            return;
          } else {
            return;
          }
        }
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        const perLayer = maxScroll / (menuLayers.length - 1);
        const span = Math.max(deck.clientWidth * 0.9, 1);
        scroller.scrollTop = Math.max(
          0,
          Math.min(maxScroll, touchDrag.startScroll - (dx / span) * perLayer)
        );
      };
      const onDeckPointerEnd = (event) => {
        if (!touchDrag || event.pointerId !== touchDrag.id) return;
        const wasActive = touchDrag.active;
        const dx = event.clientX - touchDrag.startX;
        const elapsed = Math.max(event.timeStamp - touchDrag.startTime, 1);
        touchDrag = null;
        if (!wasActive) return;
        swallowClick = true;
        const maxScroll = scroller.scrollHeight - scroller.clientHeight;
        const position = maxScroll > 0
          ? (scroller.scrollTop / maxScroll) * (menuLayers.length - 1)
          : 0;
        const flick = Math.abs(dx) / elapsed > 0.25;
        const target = flick
          ? clampIndex(dx < 0 ? Math.ceil(position + 0.01) : Math.floor(position - 0.01))
          : clampIndex(Math.round(position));
        selectLayerRef.current?.(target);
      };
      const swallowDeckClick = (event) => {
        if (!swallowClick) return;
        swallowClick = false;
        event.preventDefault();
        event.stopPropagation();
      };
      if (deck) {
        deck.addEventListener('pointerdown', onDeckPointerDown);
        deck.addEventListener('pointermove', onDeckPointerMove);
        deck.addEventListener('pointerup', onDeckPointerEnd);
        deck.addEventListener('pointercancel', onDeckPointerEnd);
        deck.addEventListener('click', swallowDeckClick, true);
      }

      let removeParallax = () => {};
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
      if (!reduced && floatEl) {
        const quickX = gsap.quickTo(floatEl, 'x', { duration: 0.55, ease: 'power3.out' });
        const quickY = gsap.quickTo(floatEl, 'y', { duration: 0.55, ease: 'power3.out' });
        const quickRX = gsap.quickTo(floatEl, 'rotationX', { duration: 0.55, ease: 'power3.out' });
        const quickRY = gsap.quickTo(floatEl, 'rotationY', { duration: 0.55, ease: 'power3.out' });
        const quickR = gsap.quickTo(floatEl, 'rotation', { duration: 0.55, ease: 'power3.out' });
        const onPointerMove = (event) => {
          if (!finePointer.matches || event.pointerType !== 'mouse') return;
          const pose = getMenuParallax(event.clientX, event.clientY, viewportWidth, viewportHeight);
          quickX(pose.x);
          quickY(pose.y);
          quickRX(pose.rotationX);
          quickRY(pose.rotationY);
          quickR(pose.rotation);
        };
        const resetParallax = () => {
          quickX(0);
          quickY(0);
          quickRX(0);
          quickRY(0);
          quickR(0);
        };
        menu.addEventListener('pointermove', onPointerMove);
        menu.addEventListener('pointerleave', resetParallax);
        window.addEventListener('blur', resetParallax);
        finePointer.addEventListener('change', resetParallax);
        removeParallax = () => {
          menu.removeEventListener('pointermove', onPointerMove);
          menu.removeEventListener('pointerleave', resetParallax);
          window.removeEventListener('blur', resetParallax);
          finePointer.removeEventListener('change', resetParallax);
          gsap.set(floatEl, { x: 0, y: 0, rotationX: 0, rotationY: 0, rotation: 0 });
        };
      }

      return () => {
        disposed = true;
        if (refreshRaf) cancelAnimationFrame(refreshRaf);
        observer.disconnect();
        window.removeEventListener('resize', captureProgress);
        menu.removeEventListener('keydown', onKeyDown);
        removeParallax();
        if (deck) {
          deck.removeEventListener('pointerdown', onDeckPointerDown);
          deck.removeEventListener('pointermove', onDeckPointerMove);
          deck.removeEventListener('pointerup', onDeckPointerEnd);
          deck.removeEventListener('pointercancel', onDeckPointerEnd);
          deck.removeEventListener('click', swallowDeckClick, true);
        }
        selectLayerRef.current = null;
      };
    }, menu);

    return () => ctx.revert();
  }, [reduced]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return undefined;
    const videos = gsap.utils.toArray('video', menu);
    const applyVideoState = () => {
      videos.forEach((video) => {
        const card = video.closest('.layer-menu__card');
        const isActive = card?.dataset.layerIndex === String(activeIndexRef.current);
        if (isActive && !reducedRef.current && !document.hidden) {
          const pending = video.play();
          if (pending && pending.catch) pending.catch(() => {});
        } else {
          video.pause();
        }
      });
    };
    applyVideoState();
    document.addEventListener('visibilitychange', applyVideoState);
    return () => {
      document.removeEventListener('visibilitychange', applyVideoState);
      videos.forEach((video) => video.pause());
    };
  }, [activeIndex, reduced]);

  return createPortal(
    <div
      className="layer-menu"
      ref={menuRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="layer-menu-title"
      data-reduced-motion={reduced}
      data-active-index={activeIndex}
    >
      <header className="layer-menu__header">
        <span className="layer-menu__brand">{brandText}</span>
        <h2 id="layer-menu-title" className="sr-only">
          Explore PixieKat
        </h2>
        <div className="layer-menu__header-actions">
          {!isAuthenticated ? (
            <button
              type="button"
              className="layer-menu__login"
              onClick={() => handleClose('/login')}
            >
              Login
            </button>
          ) : null}
          <button
            type="button"
            ref={closeButtonRef}
            className="layer-menu__close"
            aria-label="Close menu"
            onClick={() => handleClose()}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="layer-menu__scroll" ref={scrollRef}>
        <div
          className="layer-menu__track"
          ref={trackRef}
          style={{ '--menu-pages': String(1 + (menuLayers.length - 1) * 0.75) }}
        >
          <div className="layer-menu__stage">
            <nav className="layer-menu__navigation" aria-label="Explore PixieKat">
              <p className="layer-menu__hint">
                {isCoarsePointer ? 'Swipe to explore' : 'Scroll to explore'}
              </p>
              <div className="layer-menu__window">
                <ol className="layer-menu__list" ref={listRef}>
                  {menuLayers.map((item, index) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="layer-menu__layer"
                        aria-pressed={index === activeIndex}
                        aria-controls={`menu-card-${item.id}`}
                        tabIndex={index === activeIndex ? 0 : -1}
                        data-layer-index={index}
                        data-active={index === activeIndex}
                        data-long={item.label.length > 9}
                        onClick={() => selectLayerRef.current?.(index)}
                      >
                        <small className="layer-menu__meta">
                          <span className="layer-menu__ordinal">{formatOrdinal(index)}</span>
                          <span className="layer-menu__caption">{item.title}</span>
                        </small>
                        <span className="layer-menu__label">{item.label}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>

            <div className="layer-menu__deck">
              <div className="layer-menu__float" ref={floatRef}>
                <div className="layer-menu__backplate" aria-hidden="true" />
                <div className="layer-menu__backplate" aria-hidden="true" />
                {menuLayers.map((item, index) => (
                  <article
                    key={item.id}
                    id={`menu-card-${item.id}`}
                    className="layer-menu__card"
                    data-layer-index={index}
                    data-active={index === activeIndex}
                    aria-hidden={index === activeIndex ? undefined : 'true'}
                    inert={index === activeIndex ? undefined : ''}
                  >
                    {/\.(mp4|webm|mov)$/i.test(item.image) ? (
                      <video
                        src={item.image}
                        poster={item.poster}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        aria-hidden="true"
                      />
                    ) : (
                      <img
                        src={item.image}
                        alt=""
                        className="layer-menu__still"
                        loading="lazy"
                        decoding="async"
                        aria-hidden="true"
                      />
                    )}
                    <div className="layer-menu__shade" />
                    <div className="layer-menu__card-copy">
                      <h3 className="layer-menu__card-title">{item.title}</h3>
                      <p className="layer-menu__card-description">{item.description}</p>
                      {item.comingSoon ? (
                        <span className="layer-menu__soon">
                          <TiLocationArrow aria-hidden="true" /> coming soon
                        </span>
                      ) : (
                        <Button
                          title={item.buttonText}
                          containerClass="layer-menu__cta"
                          onClick={() => handleClose(item.path)}
                        />
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="layer-menu__footer">
        <span className="layer-menu__count">
          {formatOrdinal(activeIndex)} / {formatOrdinal(menuLayers.length - 1)}
        </span>
        <div className="layer-menu__progress">
          <div className="layer-menu__progress-fill" ref={progressRef} />
        </div>
        <button
          type="button"
          className="layer-menu__control"
          aria-label="Previous layer"
          disabled={activeIndex === 0}
          onClick={() => selectLayerRef.current?.(activeIndexRef.current - 1)}
        >
          <ChevronUp size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="layer-menu__control"
          aria-label="Next layer"
          disabled={activeIndex === menuLayers.length - 1}
          onClick={() => selectLayerRef.current?.(activeIndexRef.current + 1)}
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </footer>
    </div>,
    document.body
  );
};

export default DropdownMenu;

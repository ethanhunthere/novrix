'use client';

import { useEffect, useLayoutEffect, useRef, RefObject } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';

/* ═══════════════════════════════════════════════════════════
   GSAP REGISTRATION — run once on module load
   ═══════════════════════════════════════════════════════════ */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, CustomEase);

  ScrollTrigger.config({
    // Mobile browser chrome can emit resize events while the user is scrolling.
    // Refreshing ScrollTrigger during those events can adjust scroll position.
    ignoreMobileResize: true,
  });

  /* Custom easing curves — institutional, heavy, precise */
  CustomEase.create('novrix.enter', '0.16, 1, 0.3, 1');       // fast-start, smooth decel
  CustomEase.create('novrix.heavy', '0.22, 0.68, 0, 1.00');   // weighty, authoritative
  CustomEase.create('novrix.sharp', '0.65, 0, 0.35, 1');      // precise, symmetrical
  CustomEase.create('novrix.reveal', '0.0, 0.0, 0.2, 1');     // slow start, accelerate
  CustomEase.create('novrix.brutal', '0.7, 0, 0.3, 1');       // aggressive snap
  CustomEase.create('novrix.elastic', '0.25, 1, 0.5, 1.12');  // slight overshoot settle

  /* Global GSAP defaults — 120fps optimized */
  gsap.defaults({
    ease: 'novrix.enter',
  });

  /* ScrollTrigger defaults — prevent position drift on resize/reflow */
  ScrollTrigger.defaults({
    invalidateOnRefresh: true,
    fastScrollEnd: true,
  });

  /* GPU rasterisation hints — autoSleep 120 reduces wake-ups between frames */
  gsap.config({
    autoSleep: 60,
    nullTargetWarn: false,
  });
}

function shouldAvoidScrollTrigger(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(max-width: 768px), (pointer: coarse), (prefers-reduced-motion: reduce)').matches;
}

function revealImmediately(elements: Element | Element[] | NodeListOf<Element>) {
  gsap.set(elements, {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    filter: 'none',
    clearProps: 'transform,filter,will-change',
  });
}

/* ═══════════════════════════════════════════════════════════
   SCI-FI CHARACTER DECODE
   Two-phase scramble → resolve:
     Phase 1 (0–20%)  : rapid green system-boot glyphs
     Phase 2 (20–62%) : crimson intel-lock glyphs
     Phase 3 (62–100%): snap to real character + gradient
   Each character is individually timed with a left→right
   stagger, producing a decryption-sweep read pattern.
   ═══════════════════════════════════════════════════════════ */
const GLYPHS =
  '▓▒░█▄▀▌▐■□▪▫◆◇●○◉◎╬╫╪║═╔╗╚╝╠╣╦╩' +
  '#@$%&!?±×÷∑∏∫√∂∆∇⊕⊗ABCDEF0123456789><|/\\';
const GLYPHS_LEN = GLYPHS.length;

/* Pre-computed color pools — built once at module load.
   Eliminates per-frame rgba string construction and Math.round calls from the hot path. */
const GREEN_POOL: string[] = Array.from({ length: 64 }, () => {
  const g = 200 + Math.round(Math.random() * 55);
  const b = 90 + Math.round(Math.random() * 40);
  const a = (0.5 + Math.random() * 0.5).toFixed(2);
  return `rgba(0,${g},${b},${a})`;
});
const RED_POOL: string[] = Array.from({ length: 64 }, () => {
  const r = 170 + Math.round(Math.random() * 85);
  const g = 20 + Math.round(Math.random() * 50);
  const b = 40 + Math.round(Math.random() * 40);
  const a = (0.6 + Math.random() * 0.4).toFixed(2);
  return `rgba(${r},${g},${b},${a})`;
});

function scrambleDecode(
  els: HTMLElement[],
  stagger = 0.02,
  duration = 0.4,
  onComplete?: () => void,
): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: false });

  // Cache original text on first call
  els.forEach(el => {
    if (!('real' in el.dataset)) el.dataset.real = el.textContent ?? '';
  });

  // Pre-compute non-space elements and their start times for batched onUpdate
  const nonSpaceEls: HTMLElement[] = [];
  const startTimes: number[] = [];

  els.forEach((el, i) => {
    const real    = el.dataset.real ?? '';
    const isSpace = !real.trim();
    const t0      = i * stagger;

    if (!isSpace) {
      nonSpaceEls.push(el);
      startTimes.push(t0);
      el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS_LEN)];
      el.style.setProperty('-webkit-text-fill-color', GREEN_POOL[(i * 7) & 63]);
    }
  });

  // Reveal only after final text has been replaced with scramble glyphs.
  gsap.set(els, {
    visibility: 'visible',
    opacity: 1,
    y: 0,
  });

  const totalDuration = (els.length - 1) * stagger + duration;
  let poolIdx = 0;
  const resolved = new Set<number>();

  tl.to({ _: 0 }, {
    duration: totalDuration,
    ease: 'none',
    onUpdate() {
      const now = tl.time();
      poolIdx = (poolIdx + 1) & 63;

      for (let i = 0; i < nonSpaceEls.length; i++) {
        if (resolved.has(i)) continue;

        const t0 = startTimes[i];
        if (now < t0) break;                 // sorted startTimes → early exit

        const localT = now - t0;
        const el = nonSpaceEls[i];

        if (localT > duration) {
          el.textContent = el.dataset.real ?? '';
          el.style.setProperty('-webkit-text-fill-color', 'transparent');
          resolved.add(i);
          continue;
        }

        const p = localT / duration;
        if (p < 0.42) {
          el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS_LEN)];
          el.style.setProperty(
            '-webkit-text-fill-color',
            p < 0.14
              ? GREEN_POOL[(poolIdx + i * 3) & 63]
              : RED_POOL[(poolIdx + i * 5) & 63],
          );
        } else {
          el.textContent = el.dataset.real ?? '';
          el.style.setProperty('-webkit-text-fill-color', 'transparent');
          resolved.add(i);
        }
      }
    },
    onComplete() {
      for (let i = 0; i < nonSpaceEls.length; i++) {
        if (!resolved.has(i)) {
          const el = nonSpaceEls[i];
          el.textContent = el.dataset.real ?? '';
          el.style.setProperty('-webkit-text-fill-color', 'transparent');
        }
      }
      onComplete?.();
    },
  }, 0);

  return tl;
}

/* ═══════════════════════════════════════════════════════════
   HERO TIMELINE — Extreme kinetic entrance sequence
   
   10-phase orchestrated timeline:
   0: Canvas particle engine fades in
   1: Corner decorations materialise
   2: Status badge blur-in
   3: KINETIC LINE 1 — characters cascade FROM BELOW
   4: Dash separator expands
   5: KINETIC LINE 2 — characters cascade FROM ABOVE
   6: Separator lines grow from center
   7: Description + trust badges
   8: CTA buttons with scale
   9: Metrics strip with stagger
   ═══════════════════════════════════════════════════════════ */
export function useHeroTimeline(onComplete?: () => void) {
  gsap.ticker.wake();
  const containerRef = useRef<HTMLElement>(null);
  const onCompleteRef = useRef(onComplete);

  useIsomorphicLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chars = Array.from(
      container.querySelectorAll<HTMLElement>(
        '.hero-line-1 .kinetic-char, .hero-line-2 .kinetic-char'
      )
    );
    const kineticShells = container.querySelectorAll<HTMLElement>('.kinetic-text-shell');

    gsap.set(kineticShells, { autoAlpha: 1 });
    gsap.set(chars, { autoAlpha: 1, opacity: 1, visibility: 'visible' });

    // Start KineticText scramble immediately — characters are visible by default in component
    const tl = scrambleDecode(chars, 0.022, 0.28, () => {
      onCompleteRef.current?.();
    });

    return () => {
      tl.kill();
    };
  }, []);

  return containerRef;
}

/* ═══════════════════════════════════════════════════════════
   MOUSE PARALLAX — depth-based cursor tracking
   
   Reads data-depth attributes on child elements and applies
   proportional transform offsets based on mouse position.
   Only active on pointer:fine devices (desktop).
   
   Usage in JSX:
     <div data-depth="2">corner decoration</div>
     <div data-depth="0.5">subtle content sway</div>
   ═══════════════════════════════════════════════════════════ */
export function useMouseParallax(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /* Only on devices with precise pointer (skip touch) */
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let rafId = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rectCache: DOMRect | null = null;
    let layers: NodeListOf<HTMLElement> | null = null;
    let isInView = true;

    const updateParallax = () => {
      rafId = 0;
      if (!layers || !isInView) return;
      /* Smooth lerp toward target — runs at display refresh rate */
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;

      layers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth || '1');
        const x = currentX * depth * 22;
        const y = currentY * depth * 16;
        layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });

      /* Stop RAF once settled to free CPU */
      if (Math.abs(currentX) < 0.001 && Math.abs(currentY) < 0.001 && targetX === 0 && targetY === 0) {
        layers?.forEach((layer) => { layer.style.transform = ''; });
        return;
      }

      rafId = requestAnimationFrame(updateParallax);
    };

    const handleMove = (e: MouseEvent) => {
      if (!rectCache) rectCache = container.getBoundingClientRect();
      targetX = (e.clientX - rectCache.left) / rectCache.width - 0.5;
      targetY = (e.clientY - rectCache.top) / rectCache.height - 0.5;
      if (!rafId && isInView) {
        layers = container.querySelectorAll<HTMLElement>('[data-depth]');
        rafId = requestAnimationFrame(updateParallax);
      }
    };

    const handleLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!rafId && isInView) {
        layers = container.querySelectorAll<HTMLElement>('[data-depth]');
        rafId = requestAnimationFrame(updateParallax);
      }
    };

    const handleResize = () => { rectCache = null; };

    /* IntersectionObserver — pause parallax RAF when hero is offscreen */
    const io = new IntersectionObserver(
      ([entry]) => {
        isInView = entry.isIntersecting;
        if (isInView && !rafId && (Math.abs(targetX) > 0.001 || Math.abs(targetY) > 0.001)) {
          layers = container.querySelectorAll<HTMLElement>('[data-depth]');
          rafId = requestAnimationFrame(updateParallax);
        }
      },
      { threshold: 0 }
    );
    io.observe(container);

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handleMove);
    container.addEventListener('mouseleave', handleLeave);

    return () => {
      cancelAnimationFrame(rafId);
      rafId = 0;
      io.disconnect();
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('mouseleave', handleLeave);
    };
  }, [containerRef]);
}

/* ═══════════════════════════════════════════════════════════
   TERMINAL SECTION — clip-path wipe reveal
   ═══════════════════════════════════════════════════════════ */
export function useTerminalReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (shouldAvoidScrollTrigger()) {
      revealImmediately(el);
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(el, {
        y: 30,
      });

      gsap.to(el, {
        y: 0,
        duration: 0.2,
        ease: 'novrix.heavy',
        onComplete: () => gsap.set(el, { clearProps: 'will-change,transform' }),
        scrollTrigger: {
          trigger: el,
          start: 'top 95%',
          toggleActions: 'play none none none',
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return ref;
}

/* ═══════════════════════════════════════════════════════════
   MODULES SECTION — directional card orchestration
   
   Cards enter from 4 different directions creating a
   "convergence" pattern. Header animates with blur-in
   and separator expansion. System terminal uses clip-path.
   ═══════════════════════════════════════════════════════════ */
export function useModulesReveal() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    if (shouldAvoidScrollTrigger()) {
      revealImmediately(el.querySelectorAll('.modules-label, .modules-title, .modules-line, .modules-desc, .module-card, .system-terminal'));
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set('.modules-label', { y: 4, opacity: 1 });
      gsap.set('.modules-title', { y: 4, opacity: 1 });
      gsap.set('.modules-line', { scaleX: 0 });
      gsap.set('.modules-desc', { y: 4, opacity: 1 });

      const headerTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.modules-header',
          start: 'top 95%',
          toggleActions: 'play none none none',
        },
      });

      headerTl
        .to('.modules-label', {
          y: 0, opacity: 1, duration: 0.1, ease: 'novrix.enter',
        })
        .to('.modules-title', {
          y: 0, opacity: 1, duration: 0.12, ease: 'novrix.enter',
        }, '-=0.06')
        .to('.modules-line', {
          scaleX: 1, duration: 0.1, stagger: 0.01, ease: 'novrix.reveal',
        }, '-=0.08')
        .to('.modules-desc', {
          y: 0, opacity: 1, duration: 0.1, ease: 'novrix.enter',
        }, '-=0.06');

      const cards = el.querySelectorAll('.module-card');

      cards.forEach((card, i) => {
        gsap.set(card, { y: 4, opacity: 1 });

        gsap.to(card, {
          y: 0,
          duration: 0.22,
          ease: 'novrix.enter',
          scrollTrigger: {
            trigger: '.modules-grid',
            start: 'top 95%',
            toggleActions: 'play none none none',
          },
          delay: i * 0.015,
        });
      });

      gsap.set('.system-terminal', { y: 4, opacity: 1 });

      gsap.to('.system-terminal', {
        y: 0,
        duration: 0.22,
        ease: 'novrix.enter',
        scrollTrigger: {
          trigger: '.system-terminal',
          start: 'top 95%',
          toggleActions: 'play none none none',
        },
      });
    }, el);

    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(refreshId);
      ctx.revert();
    };
  }, []);

  return sectionRef;
}

/* ═══════════════════════════════════════════════════════════
    HERO SCROLL PARALLAX — depth layers on scroll

    Plays once and stays permanently visible. No reversal on
    scroll up. Elements animate early to avoid blank space.
    ═══════════════════════════════════════════════════════════ */
export function useHeroScrollParallax(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (shouldAvoidScrollTrigger()) {
      gsap.set(container.querySelector('.hero-content'), { opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      /* Whale canvas — background depth, slowest */
      gsap.fromTo('.whale-canvas',
        { y: 0 },
        {
          y: -120,
          ease: 'none',
          scrollTrigger: {
            trigger: container,
            start: 'top 95%',
            toggleActions: 'play none none none',
          },
        }
      );

      /* Corner decorations — mid depth, stays visible */
      gsap.fromTo('.hero-corner',
        { y: 0 },
        {
          y: -80,
          ease: 'none',
          scrollTrigger: {
            trigger: container,
            start: 'top 95%',
            toggleActions: 'play none none none',
          },
        }
      );

    }, container);

    return () => ctx.revert();
  }, [containerRef]);
}

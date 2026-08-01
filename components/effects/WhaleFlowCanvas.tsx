'use client';

import { useEffect, useRef, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════
   WHALE FLOW CANVAS — Particle physics engine
   
   Visualises on-chain capital flows as directional particle
   streams. Each particle = a transaction. Speed, size and
   colour encode transaction weight. Connected by force lines
   that react to scroll velocity via GSAP ScrollTrigger proxy.
   
   120fps GPU-composited. Zero DOM nodes. Pure Canvas 2D.
   ═══════════════════════════════════════════════════════════ */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  hue: number;       // 0 = burgundy, 1 = cyan/steel
  speed: number;
  trail: { x: number; y: number }[];
}

const CONFIG = {
  PARTICLE_COUNT: 40,
  MAX_SPEED: 1.2,
  TRAIL_LENGTH: 5,
  CONNECTION_DISTANCE: 90,
  CONNECTION_DISTANCE_SQ: 90 * 90,
  SPAWN_RATE: 0.25,
  COLORS: {
    burgundy: { r: 194, g: 52, b: 77 },
    cyan: { r: 148, g: 163, b: 184 },
    accent: { r: 217, g: 72, b: 95 },
  },
};

export default function WhaleFlowCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mousePos = useRef({ x: -1000, y: -1000 });
  const scrollVelocity = useRef(0);
  const animFrameId = useRef(0);
  const dpr = useRef(1);
  const isVisible = useRef(true);

  const createParticle = useCallback((w: number, h: number): Particle => {
    const side = Math.random();
    const isBurgundy = Math.random() > 0.35;
    return {
      x: side < 0.5 ? -20 : w + 20,
      y: Math.random() * h,
      vx: (side < 0.5 ? 1 : -1) * (0.3 + Math.random() * CONFIG.MAX_SPEED),
      vy: (Math.random() - 0.5) * 0.4,
      size: 1 + Math.random() * 2.5,
      alpha: 0,
      life: 0,
      maxLife: 400 + Math.random() * 600,
      hue: isBurgundy ? 0 : 1,
      speed: 0.4 + Math.random() * 0.8,
      trail: [],
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    if (!ctx) return;

    const isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    const particleLimit = isMobile ? 20 : CONFIG.PARTICLE_COUNT;

    /* Cap DPR at 1.5 universally — canvas is GPU-expensive at 2× on high-DPI screens */
    dpr.current = Math.min(window.devicePixelRatio || 1, 1.5);

    const applyResize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * dpr.current;
      canvas.height = rect.height * dpr.current;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr.current, 0, 0, dpr.current, 0, 0);
    };
    let resizeFrame = 0;
    const resize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(applyResize);
    };
    applyResize();
    window.addEventListener('resize', resize);

    /* Track scroll velocity for particle acceleration */
    let lastScroll = window.scrollY;
    const trackScroll = () => {
      const delta = Math.abs(window.scrollY - lastScroll);
      scrollVelocity.current = Math.min(delta * 0.15, 4);
      lastScroll = window.scrollY;
    };
    window.addEventListener('scroll', trackScroll, { passive: true });

    /* Track mouse for proximity repulsion */
    const trackMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    if (!isMobile) {
      window.addEventListener('mousemove', trackMouse, { passive: true });
    }

    /* Seed initial particles */
    const w = canvas.width / dpr.current;
    const h = canvas.height / dpr.current;
    for (let i = 0; i < particleLimit * 0.4; i++) {
      const p = createParticle(w, h);
      p.x = Math.random() * w;
      p.alpha = 0.15 + Math.random() * 0.2;
      p.life = Math.random() * p.maxLife * 0.5;
      particles.current.push(p);
    }

    let rafPending = false;
    const visObserver = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = isVisible.current;
        isVisible.current = entry.isIntersecting;
        // Restart loop when becoming visible after being hidden
        if (!wasVisible && entry.isIntersecting && !rafPending) {
          rafPending = true;
          animFrameId.current = requestAnimationFrame(render);
        }
      },
      { threshold: 0 }
    );
    visObserver.observe(canvas);

    const handleVisibility = () => {
      if (document.hidden) {
        isVisible.current = false;
      } else {
        const rect = canvas.getBoundingClientRect();
        isVisible.current = rect.bottom > 0 && rect.top < window.innerHeight;
        if (isVisible.current && !rafPending) {
          rafPending = true;
          animFrameId.current = requestAnimationFrame(render);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const render = () => {
      rafPending = false;
      // Skip rendering when offscreen — do NOT queue another frame
      if (!isVisible.current) return;


      const w = canvas.width / dpr.current;
      const h = canvas.height / dpr.current;

      ctx.clearRect(0, 0, w, h);

      const sv = scrollVelocity.current;
      scrollVelocity.current *= 0.94; // decay

      /* Spawn new particles */
      if (particles.current.length < particleLimit && Math.random() < CONFIG.SPAWN_RATE) {
        particles.current.push(createParticle(w, h));
      }

      /* Draw connections — squared distance (no sqrt), batched path */
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(194, 52, 77, 0.025)';
      ctx.beginPath();
      for (let i = 0; i < particles.current.length; i++) {
        const a = particles.current[i];
        if (a.alpha < 0.08) continue;
        for (let j = i + 1; j < particles.current.length; j++) {
          const b = particles.current[j];
          if (b.alpha < 0.08) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < CONFIG.CONNECTION_DISTANCE_SQ) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
        }
      }
      ctx.stroke();

      /* Update & draw particles */
      const alive: Particle[] = [];
      for (const p of particles.current) {
        p.life++;

        /* Fade in/out lifecycle */
        const fadeIn = Math.min(p.life / 60, 1);
        const fadeOut = Math.max(0, 1 - (p.life - p.maxLife + 80) / 80);
        p.alpha = fadeIn * fadeOut * 0.35;

        /* Movement with scroll boost */
        const boost = 1 + sv * 0.5;
        p.x += p.vx * p.speed * boost;
        p.y += p.vy * p.speed;
        p.vy += (Math.random() - 0.5) * 0.02; // subtle drift

        /* Mouse repulsion — squared distance check avoids sqrt for every particle every frame */
        const mdx = p.x - mousePos.current.x;
        const mdy = p.y - mousePos.current.y;
        const mDistSq = mdx * mdx + mdy * mdy;
        if (mDistSq < 10000 && mDistSq > 0) {
          const mDist = Math.sqrt(mDistSq);
          const force = (100 - mDist) / 100 * 0.8;
          p.vx += (mdx / mDist) * force * 0.15;
          p.vy += (mdy / mDist) * force * 0.15;
        }

        /* Damping */
        p.vx *= 0.998;
        p.vy *= 0.995;

        /* Trail */
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > CONFIG.TRAIL_LENGTH) p.trail.shift();

        /* Draw trail */
        if (p.trail.length > 1 && p.alpha > 0.02) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) {
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
          }
          const c = p.hue === 0 ? CONFIG.COLORS.burgundy : CONFIG.COLORS.cyan;
          ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${p.alpha * 0.4})`;
          ctx.lineWidth = p.size * 0.6;
          ctx.stroke();
        }

        /* Draw particle core (no separate glow — too expensive) */
        if (p.alpha > 0.02) {
          const c = p.hue === 0 ? CONFIG.COLORS.burgundy : CONFIG.COLORS.accent;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${p.alpha})`;
          ctx.fill();
        }

        /* Keep alive or kill */
        if (p.life < p.maxLife && p.x > -100 && p.x < w + 100) {
          alive.push(p);
        }
      }
      particles.current = alive;

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    const handlePageHide = () => {
      cancelAnimationFrame(animFrameId.current);
      rafPending = false;
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      cancelAnimationFrame(animFrameId.current);
      cancelAnimationFrame(resizeFrame);
      visObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', trackScroll);
      if (!isMobile) {
        window.removeEventListener('mousemove', trackMouse);
      }
    };
  }, [createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'screen', opacity: 0.6 }}
      aria-hidden="true"
    />
  );
}

'use client';

import { memo } from 'react';

/* ═══════════════════════════════════════════════════════════
   KINETIC TEXT — Character-level GSAP animation targets
   
   Splits text into individually targetable <span> elements.
   Each character gets .kinetic-char class for GSAP hooks to
   animate per-character with staggers, 3D rotations, etc.
   
   Marker class is applied to the wrapper for scoped targeting:
     <KineticText text="INTELLIGENCE" marker="hero-line-2" />
   
   Then in GSAP:
     gsap.from('.hero-line-2 .kinetic-char', { y: 80, stagger: 0.025 })
   
   Gradient text works: parent bg-clip-text passes through to
   child spans. Characters are inline-block for individual
   transform capability while preserving text flow.
   ═══════════════════════════════════════════════════════════ */

interface KineticTextProps {
  text: string;
  className?: string;
  marker?: string;
  /** CSS gradient string applied per-character for continuous gradient text */
  gradient?: string;
}

function KineticText({ text, className = '', marker = '', gradient }: KineticTextProps) {
  const nonSpaceCount = text.replace(/\s/g, '').length;
  let charIdx = -1;
  const initialColor = marker === 'hero-line-2' ? '#C2344D' : '#C8D8E4';

  return (
    <span
      className={`${marker} kinetic-text-shell ${className}`.trim()}
      aria-label={text}
      style={{
        display: 'inline-block',
        perspective: '1200px',
        transformStyle: 'preserve-3d' as const,
        willChange: 'transform',
        transform: 'translateZ(0)',
        pointerEvents: 'none',
      }}
    >
      {text.split('').map((char, i) => {
        const isSpace = char === ' ';
        if (!isSpace) charIdx++;
        const pct = nonSpaceCount > 1 ? (charIdx / (nonSpaceCount - 1)) * 100 : 0;

        return (
          <span
            key={i}
            className="kinetic-char"
            data-real={char}
            aria-hidden="true"
            style={{
              display: isSpace ? 'inline' : 'inline-block',
              whiteSpace: isSpace ? 'pre' : undefined,
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              pointerEvents: 'none',
              ...(gradient && !isSpace
                ? {
                    backgroundImage: gradient,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: initialColor,
                    WebkitTextFillColor: 'currentColor',
                    backgroundSize: `${nonSpaceCount * 100}% 100%`,
                    backgroundPosition: `${pct}% 0`,
                  }
                : {}),
            }}
          >
            {isSpace ? '\u00A0' : ''}
          </span>
        );
      })}
    </span>
  );
}

export default memo(KineticText);

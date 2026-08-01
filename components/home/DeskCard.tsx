'use client';

import { motion } from 'framer-motion';
import DeskVisual from './DeskVisuals';
import { fadeUp, type DeskItem } from './home-data';
import { openAuthGate } from '@/lib/utils/auth';
import { useAuth } from '@/lib/hooks/useAuth';

export default function DeskCard({ desk }: { desk: DeskItem }) {
  const { user } = useAuth();

  const handleClick = () => {
    if (user) {
      window.location.href = desk.href;
    } else {
      sessionStorage.setItem('novrix-pending-nav', desk.href);
      openAuthGate();
    }
  };

  return (
    <motion.article
      className="group module-card overflow-hidden relative desk-card cursor-pointer"
      variants={fadeUp}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      whileHover={{ y: -10, scale: 1.008, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${desk.label.toLowerCase()}`}
      style={{
        '--accent': desk.accent,
        borderRadius: '14px',
        background: 'linear-gradient(180deg, rgba(18,20,28,0.95) 0%, rgba(8,9,14,0.98) 100%)',
        boxShadow: '0 32px 90px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      } as React.CSSProperties}
    >
      <div className="absolute inset-0 rounded-[14px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
        <span className="absolute top-0 left-0 w-full h-[1.5px] border-trace-h" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />
        <span className="absolute top-0 right-0 w-[1.5px] h-full border-trace-v" style={{ background: 'linear-gradient(180deg, transparent, var(--accent), transparent)' }} />
        <span className="absolute bottom-0 right-0 w-full h-[1.5px] border-trace-h-rev" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />
        <span className="absolute bottom-0 left-0 w-[1.5px] h-full border-trace-v-rev" style={{ background: 'linear-gradient(180deg, transparent, var(--accent), transparent)' }} />
      </div>
      <div className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none desk-card-glow"
        style={{
          animation: 'deskBorderPulse 1.6s ease-in-out infinite',
        }} />
      <div className="absolute left-0 top-6 bottom-6 w-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none desk-card-powerline" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden card-scanline">
        <div className="absolute left-0 right-0 h-[1px] desk-card-scanline" />
      </div>
      <div className="absolute top-0 left-8 right-8 h-[1.5px] group-hover:left-3 group-hover:right-3 transition-all duration-400 pointer-events-none desk-card-topline" />
      <div className="pointer-events-none">
        <DeskVisual accent={desk.accent} />
      </div>
      <div className="cq-card-padding relative z-[2] px-6 py-6 sm:px-7 sm:py-7 2xl:px-10 2xl:py-10 3xl:px-12 3xl:py-12 4xl:px-14 4xl:py-14">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <span className="block w-2 h-2 rotate-45 transition-all duration-300 group-hover:scale-150 desk-card-dot" />
          </div>
          <span className="text-[10px] 2xl:text-xs 3xl:text-sm font-mono uppercase tracking-[0.26em] transition-all duration-300 group-hover:tracking-[0.34em] desk-card-label">{desk.desk}</span>
          <div className="flex-1 h-px transition-all duration-500 group-hover:h-[2px] desk-card-separator" />
        </div>
        <h3 className="cq-card-heading font-black tracking-tight leading-[1.05] mb-3 2xl:mb-4 transition-all duration-500 group-hover:translate-x-1 card-title" style={{ fontSize: 'var(--text-h3)', color: '#F0F2F5' }}>
          {desk.title}
        </h3>
        <p className="leading-relaxed mb-5 2xl:mb-7 transition-all duration-500 group-hover:translate-x-1" style={{ fontSize: 'var(--text-body)', color: '#8A92A0' }}>{desk.lede}</p>
        <div className="space-y-2.5 mb-6 2xl:mb-8">
          {desk.notes.map(note => (
            <div key={note} className="flex items-start gap-3 group/note relative">
              <span className="absolute left-0 top-0 bottom-0 w-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 desk-card-note-border" />
              <span className="text-sm 2xl:text-base 3xl:text-lg leading-relaxed transition-all duration-300 group-hover:translate-x-1" style={{ color: 'rgba(255,255,255,0.48)' }}>{note}</span>
            </div>
          ))}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="desk-card-btn group/btn relative z-[3] inline-flex items-center gap-2.5 text-[10px] 2xl:text-xs 3xl:text-sm font-mono uppercase tracking-[0.18em] transition-all duration-300 px-4 py-2.5 rounded-md cursor-pointer bg-transparent border-none"
        >
          <span className="pointer-events-none">Open {desk.label.toLowerCase()}</span>
          <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-1 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </motion.article>
  );
}

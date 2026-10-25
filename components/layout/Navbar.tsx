'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/insights', label: 'Insights' },
  { href: '/sentiment', label: 'Sentiment' },
  { href: '/documentation', label: 'Docs' },
];

const MONO = 'var(--ff-mono), monospace';
const SANS = 'var(--ff-sans), sans-serif';
const BAR_HEIGHT = '40px';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [utcTime, setUtcTime] = useState<string>('');
  const pathname = usePathname();

  const norm = (pathname || '/').replace(/\/+$/, '') || '/';

  const isActive = (href: string) => {
    if (href === '/') return norm === '/';
    return norm === href || norm.startsWith(href + '/');
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().slice(11, 16));
    };
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <nav
        role="navigation"
        aria-label="Main Navigation"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: BAR_HEIGHT,
          width: '100%',
          boxSizing: 'border-box',
          background: 'rgba(5, 6, 13, 0.98)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          flexShrink: 0,
          boxShadow: '0 1px 0 rgba(0,0,0,0.60)',
        }}
      >
        <div
          className="mx-auto w-full max-w-[2000px] h-full flex items-center justify-between"
          style={{ padding: '0 clamp(12px, 1.6vw, 24px)' }}
        >
          {/* Left: Novrix Brand Mark (no BTC price) */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-decoration-none group shrink-0"
              aria-label="Novrix Home"
            >
              <Image
                src="/logo.png"
                alt=""
                width={20}
                height={20}
                priority
                quality={100}
                className="w-[18px] h-[18px] block opacity-90 group-hover:opacity-100 transition-opacity"
                style={{ pointerEvents: 'none' }}
              />
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: '#F5F1EA',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                NOVRIX
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative px-3 py-1 text-decoration-none transition-colors duration-150"
                    style={{
                      fontFamily: MONO,
                      fontSize: '11px',
                      fontWeight: active ? 600 : 500,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: active ? '#F5F1EA' : 'rgba(245, 241, 234, 0.55)',
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                    {active && (
                      <span
                        className="absolute bottom-[-10px] left-3 right-3 h-[2px]"
                        style={{
                          background: 'var(--accent-novrix, #C2344D)',
                          borderRadius: '1px',
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Clean UTC Clock & Mobile Menu (no 'Live' text) */}
          <div className="flex items-center gap-3">
            {utcTime && (
              <span
                className="hidden sm:inline-block"
                style={{
                  fontFamily: MONO,
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.45)',
                  letterSpacing: '0.12em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {utcTime} UTC
              </span>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-1.5 text-xs text-[#A9A29A] hover:text-[#F5F1EA] transition-colors"
              style={{
                fontFamily: MONO,
                fontSize: '10px',
                letterSpacing: '0.1em',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-label="Open Navigation Menu"
            >
              MENU
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div
        className="fixed inset-0 z-[100] flex flex-col md:hidden transition-opacity duration-200"
        style={{
          background: 'rgba(5, 6, 13, 0.98)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        aria-hidden={!open}
      >
        <div
          className="flex items-center justify-between px-4 border-b border-white/10"
          style={{ height: BAR_HEIGHT }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/logo.png"
              alt=""
              width={18}
              height={18}
              className="w-[18px] h-[18px] block"
              style={{ pointerEvents: 'none' }}
            />
            <span
              style={{
                fontFamily: SANS,
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: '#F5F1EA',
              }}
            >
              NOVRIX
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              fontFamily: MONO,
              fontSize: '11px',
              letterSpacing: '0.1em',
              color: 'rgba(245, 241, 234, 0.65)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>

        <div className="flex flex-col p-6 gap-5">
          {ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="text-lg font-medium tracking-wide transition-colors"
                style={{
                  fontFamily: MONO,
                  color: active ? '#F5F1EA' : 'rgba(245, 241, 234, 0.60)',
                }}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

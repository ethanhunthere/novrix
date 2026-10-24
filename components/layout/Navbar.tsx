'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/',         label: 'Home' },
  { href: '/insights', label: 'Insights' },
  { href: '/sentiment', label: 'Sentiment' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const norm = pathname.replace(/\/+$/, '') || '/';

  const isActive = (href: string) => {
    if (href === '/') return norm === '/';
    return norm === href || norm.startsWith(href + '/');
  };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <style>{`
        .nav {
          position: relative;
          z-index: 50;
          background: rgba(10, 9, 8, 0.72);
          -webkit-backdrop-filter: blur(18px) saturate(1.15);
          backdrop-filter: blur(18px) saturate(1.15);
          border-bottom: 1px solid rgba(245, 241, 234, 0.06);
        }
        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 20px;
        }
        @media (min-width: 768px) { .nav-inner { height: 64px; padding: 0 28px; } }
        @media (min-width: 1280px) { .nav-inner { padding: 0 40px; } }

        .nav-logo { display: inline-flex; align-items: center; text-decoration: none; opacity: 0.92; transition: opacity 0.18s ease; }
        .nav-logo:hover { opacity: 1; }

        .nav-links { display: none; align-items: center; gap: 34px; }
        @media (min-width: 1024px) { .nav-links { display: flex; } }

        .nav-link {
          position: relative;
          font-family: var(--ff-sans);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1;
          color: rgba(245, 241, 234, 0.52);
          text-decoration: none;
          padding: 6px 0;
          transition: color 0.16s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .nav-link:hover,
        .nav-link[aria-current="page"] { color: #F5F1EA; }
        .nav-link:focus-visible { outline: 1px solid rgba(194, 52, 77, 0.6); outline-offset: 4px; }

        .nav-menu {
          font-family: var(--ff-sans);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1;
          color: rgba(245, 241, 234, 0.56);
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px 0;
          transition: color 0.16s ease;
        }
        .nav-menu:hover { color: #F5F1EA; }
        .nav-menu:focus-visible { outline: 1px solid rgba(194, 52, 77, 0.6); outline-offset: 4px; }
        @media (min-width: 1024px) { .nav-menu { display: none; } }

        .sheet {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          background: #0A0908;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s ease;
        }
        .sheet[data-open="1"] { opacity: 1; pointer-events: auto; }
        .sheet-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          padding: 0 20px;
          border-bottom: 1px solid rgba(245, 241, 234, 0.06);
        }
        .sheet-body { padding: 20px 20px 0; }
        .sheet-link {
          display: block;
          font-family: var(--ff-sans);
          font-size: 22px;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1;
          color: rgba(245, 241, 234, 0.56);
          text-decoration: none;
          padding: 18px 0;
          transition: color 0.16s ease;
        }
        .sheet-link:hover,
        .sheet-link[aria-current="page"] { color: #F5F1EA; }
        .sheet-link:focus-visible,
        .sheet-close:focus-visible { outline: 1px solid rgba(194, 52, 77, 0.6); outline-offset: 4px; }
        .sheet-close {
          font-family: var(--ff-sans);
          font-size: 13px;
          font-weight: 500;
          color: rgba(245, 241, 234, 0.56);
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px 0;
        }
        .sheet-close:hover { color: #F5F1EA; }
        @media (min-width: 1024px) { .sheet { display: none; } }

        @media (prefers-reduced-motion: reduce) {
          .nav-logo, .nav-link, .nav-menu, .sheet, .sheet-link, .sheet-close { transition: none; }
        }
      `}</style>

      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" aria-label="Home">
            <Image
              src="/logo.png" alt=""
              width={30} height={30} priority quality={100}
              className="w-[26px] h-[26px] md:w-[30px] md:h-[30px] block"
              style={{ pointerEvents: 'none' }}
            />
          </Link>

          <div className="nav-links">
            {ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <button
            className="nav-menu"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Open menu"
          >
            Menu
          </button>
        </div>
      </nav>

      <div className="sheet" data-open={open ? '1' : '0'} aria-hidden={!open}>
        <div className="sheet-head">
          <Link href="/" className="nav-logo" aria-label="Home" onClick={() => setOpen(false)}>
            <Image
              src="/logo.png" alt=""
              width={26} height={26} className="w-[26px] h-[26px] block"
              style={{ pointerEvents: 'none' }}
            />
          </Link>
          <button className="sheet-close" onClick={() => setOpen(false)}>Close</button>
        </div>

        <div className="sheet-body">
          {ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="sheet-link"
              aria-current={isActive(item.href) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

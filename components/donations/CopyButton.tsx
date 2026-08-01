'use client';

import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: copied ? '#00E5FF' : '#5A5F6A',
        background: 'none',
        border: `1px solid ${copied ? 'rgba(0,229,255,0.30)' : 'rgba(255,255,255,0.10)'}`,
        padding: '8px 16px',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!copied) {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
          e.currentTarget.style.color = '#C8CCD4';
        }
      }}
      onMouseLeave={e => {
        if (!copied) {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
          e.currentTarget.style.color = '#5A5F6A';
        }
      }}
    >
      {copied ? 'COPIED' : 'COPY'}
    </button>
  );
}

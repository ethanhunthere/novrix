'use client';

function MoodVisual({ accent }: { accent: string }) {
  const id = 'mood';
  return (
    <div className="relative h-[210px] sm:h-[240px] lg:h-[260px] 2xl:h-[300px] 3xl:h-[340px] 4xl:h-[400px] overflow-hidden mood-visual">
      <div className="absolute inset-0 opacity-[0.14] group-hover:opacity-[0.32] transition-opacity duration-500" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none cardiac-surge" style={{
        background: `radial-gradient(ellipse 55% 50% at 50% 55%, ${accent}18 0%, transparent 70%)`,
        animation: 'cardiacPulse 0.9s ease-in-out infinite',
      }} />
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 alarm-bar" style={{
        background: `linear-gradient(90deg, transparent, ${accent}CC, ${accent}88, ${accent}CC, transparent)`,
        animation: 'alarmFlash 0.7s ease-in-out infinite',
      }} />
      <div className="absolute inset-0 vignette-layer transition-all duration-500" style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 100%, ${accent}10 0%, transparent 70%)`,
      }} />
      <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 bracket-tl transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 bracket-tr transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 bracket-bl transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 bracket-br transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <svg viewBox="0 0 340 180" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-line`} x1="0" y1="0" x2="340" y2="0">
            <stop offset="0%" stopColor={accent} stopOpacity="0" />
            <stop offset="20%" stopColor={accent} stopOpacity="0.7" />
            <stop offset="50%" stopColor={accent} stopOpacity="1" />
            <stop offset="80%" stopColor={accent} stopOpacity="0.7" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="180">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-glow`}>
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`${id}-glow-hover`}>
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`${id}-glow-intense`}>
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d="M 80 150 A 90 90 0 0 1 260 150" fill="none" stroke={`${accent}18`} strokeWidth="3" strokeLinecap="round" className="gauge-bg" />
        <path d="M 80 150 A 90 90 0 0 1 170 60" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeDasharray="142" strokeDashoffset="35" filter={`url(#${id}-glow)`} className="gauge-active" style={{ animation: 'gaugeSwing 3s ease-in-out infinite alternate' }} />
        <text x="75" y="165" fill="rgba(255,255,255,0.30)" fontSize="7" fontFamily="JetBrains Mono, monospace" letterSpacing="0.15em">FEAR</text>
        <text x="245" y="165" fill="rgba(255,255,255,0.30)" fontSize="7" fontFamily="JetBrains Mono, monospace" letterSpacing="0.15em">GREED</text>
        <path d="M 0 110 L 40 110 L 50 95 L 60 125 L 70 85 L 80 115 L 90 105 L 110 105 L 120 75 L 135 135 L 150 90 L 165 120 L 180 100 L 200 100 L 210 70 L 225 130 L 240 95 L 255 115 L 270 105 L 300 105 L 310 80 L 320 120 L 330 105 L 340 105" fill="none" stroke={`url(#${id}-line)`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}-glow)`} className="ekg-line" style={{ animation: 'ekgPulse 2.8s ease-in-out infinite' }} />
        <path d="M 0 180 L 40 180 L 50 165 L 60 195 L 70 155 L 80 185 L 90 175 L 110 175 L 120 145 L 135 205 L 150 160 L 165 190 L 180 170 L 200 170 L 210 140 L 225 200 L 240 165 L 255 185 L 270 175 L 300 175 L 310 150 L 320 190 L 330 175 L 340 175 L 340 180 Z" fill={`url(#${id}-fill)`} opacity="0.5" className="ekg-fill" style={{ animation: 'ekgPulse 2.8s ease-in-out infinite' }} />
        <path d="M 0 115 L 30 115 L 38 100 L 48 130 L 58 80 L 68 120 L 78 108 L 100 108 L 112 68 L 130 140 L 148 85 L 162 125 L 178 95 L 198 95 L 208 62 L 228 135 L 242 88 L 258 118 L 272 102 L 298 102 L 312 72 L 324 125 L 334 108 L 340 108" fill="none" stroke={accent} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0" className="ekg-surge" filter={`url(#${id}-glow-hover)`} />
      </svg>
      <div className="absolute inset-x-4 top-3.5 flex justify-between items-center">
        <span className="text-[8px] 2xl:text-[9px] font-mono uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.25)' }}>Index</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] 2xl:text-[9px] font-mono uppercase tracking-[0.18em] transition-all duration-300 status-label" style={{ color: accent }}>Streaming</span>
        </div>
      </div>
      <div className="absolute right-4 bottom-3 font-mono text-[9px] 2xl:text-[10px] uppercase tracking-[0.24em]" style={{ color: accent }}>
        <span className="opacity-50">Sentiment</span> <span className="font-bold reading-value" style={{ color: '#E8EAED' }}>Neutral</span>
      </div>
      <style jsx>{`
        @keyframes gaugeSwing { from { stroke-dashoffset: 35; } to { stroke-dashoffset: 115; } }
        @keyframes ekgPulse { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }
        @keyframes cardiacPulse { 0%, 100% { opacity: 0.4; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes alarmFlash { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        .group:hover .mood-visual .gauge-active { filter: url(#${id}-glow-hover); stroke-width: 4; animation-duration: 0.8s; }
        .group:hover .mood-visual .ekg-line { stroke-width: 2.8; filter: url(#${id}-glow-hover); animation-duration: 0.7s; }
        .group:hover .mood-visual .ekg-fill { opacity: 0.85; animation-duration: 0.7s; }
        .group:hover .mood-visual .ekg-surge { opacity: 0.7; animation: ekgSurge 0.55s ease-in-out infinite; }
        @keyframes ekgSurge { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        .group:hover .mood-visual .status-label { color: ${accent}; letter-spacing: 0.24em; font-weight: 700; }
        .group:hover .mood-visual .reading-value { color: #FFFFFF; text-shadow: 0 0 12px ${accent}88; }
        .group:hover .mood-visual .bracket-tl { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .mood-visual .bracket-tr { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .mood-visual .bracket-bl { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .mood-visual .bracket-br { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .mood-visual .vignette-layer { background: radial-gradient(ellipse 70% 60% at 50% 100%, ${accent}35 0%, transparent 70%); }
        .group:hover .mood-visual .cardiac-surge { animation-duration: 0.55s; }
      `}</style>
    </div>
  );
}

function WalletVisual({ accent }: { accent: string }) {
  const id = 'wallet';
  return (
    <div className="relative h-[210px] sm:h-[240px] lg:h-[260px] 2xl:h-[300px] 3xl:h-[340px] 4xl:h-[400px] overflow-hidden wallet-visual">
      <div className="absolute inset-0 opacity-[0.14] group-hover:opacity-[0.30] transition-opacity duration-500" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />
      <div className="absolute inset-0 vignette-layer transition-all duration-500" style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 100%, ${accent}10 0%, transparent 70%)`,
      }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none data-rain">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="absolute top-0 w-px data-stream" style={{
            left: `${8 + i * 9}%`,
            height: `${20 + (i % 4) * 18}%`,
            background: `linear-gradient(180deg, transparent, ${accent}44, ${accent}22, transparent)`,
            animation: `dataRain ${1.2 + (i % 5) * 0.4}s linear ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none packet-burst">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute h-[3px] rounded-sm packet" style={{
            top: `${15 + (i * 13)}%`,
            width: `${8 + (i % 3) * 6}px`,
            background: `${accent}99`,
            boxShadow: `0 0 6px ${accent}66`,
            animation: `packetFly ${1.5 + (i % 3) * 0.4}s linear ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
        <div className="scanline-sweep" style={{ background: `linear-gradient(180deg, transparent, ${accent}14, transparent)`, height: '2px', width: '100%' }} />
      </div>
      <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 bracket-tl transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 bracket-tr transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 bracket-bl transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 bracket-br transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <svg viewBox="0 0 340 180" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-flow`} x1="0" y1="0" x2="340" y2="0">
            <stop offset="0%" stopColor={accent} stopOpacity="0" />
            <stop offset="50%" stopColor={accent} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-glow`}>
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`${id}-glow-hover`}>
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`${id}-glow-intense`}>
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {[30, 55, 80, 105, 130, 155].map((y, i) => (
          <g key={i}>
            <rect x="0" y={y} width="340" height="0.8" fill="rgba(255,255,255,0.035)" />
            <circle cx={30 + i * 50} cy={y} r="2.5" fill={accent} opacity="0.7" filter={`url(#${id}-glow)`} className="flow-particle">
              <animate attributeName="cx" values={`${-20};${360}`} dur={`${2.5 + i * 0.5}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0" dur={`${2.5 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={30 + i * 50} cy={y} r="1.5" fill="#FFFFFF" opacity="0.5" className="flow-particle-trail">
              <animate attributeName="cx" values={`${-20};${360}`} dur={`${2.5 + i * 0.5}s`} begin={`${0.25 + i * 0.15}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={30 + i * 50} cy={y} r="2" fill={accent} opacity="0" className="flow-surge">
              <animate attributeName="cx" values={`${-20};${360}`} dur={`${1.2 + i * 0.3}s`} begin={`${0.5 + i * 0.1}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.8;0" dur={`${1.2 + i * 0.3}s`} begin={`${0.5 + i * 0.1}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
        <rect x="55" y="50" width="58" height="74" rx="4" fill="none" stroke={`${accent}50`} strokeWidth="1.2" className="wallet-block" />
        <rect x="59" y="54" width="50" height="66" rx="2" fill={`${accent}12`} className="wallet-inner" />
        <rect x="67" y="64" width="34" height="4" rx="1" fill={`${accent}60`} className="wallet-bar" />
        <rect x="67" y="74" width="26" height="3" rx="1" fill={`${accent}40`} className="wallet-bar" />
        <rect x="67" y="82" width="30" height="3" rx="1" fill={`${accent}30`} className="wallet-bar" />
        <path d="M 113 87 L 205 87" fill="none" stroke={`${accent}40`} strokeWidth="1" strokeDasharray="4 3" className="connection-line">
          <animate attributeName="stroke-dashoffset" values="0;14" dur="1.2s" repeatCount="indefinite" />
        </path>
        <polygon points="205,83 213,87 205,91" fill={accent} opacity="0.6" className="connection-arrow" />
        <rect x="227" y="50" width="58" height="74" rx="4" fill="none" stroke={`${accent}50`} strokeWidth="1.2" className="wallet-block" />
        <rect x="231" y="54" width="50" height="66" rx="2" fill={`${accent}12`} className="wallet-inner" />
        <rect x="239" y="64" width="34" height="4" rx="1" fill={`${accent}60`} className="wallet-bar" />
        <rect x="239" y="74" width="22" height="3" rx="1" fill={`${accent}40`} className="wallet-bar" />
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <rect key={i} x={138 + i * 7} y={130 - (i % 4) * 8} width="4" height={18 + (i % 4) * 7} rx="1" fill={accent} opacity={0.15 + (i % 3) * 0.12} className="activity-bar">
            <animate attributeName="height" values={`${18 + (i % 4) * 5};${26 + (i % 4) * 9};${18 + (i % 4) * 5}`} dur={`${1.6 + i * 0.25}s`} repeatCount="indefinite" />
            <animate attributeName="y" values={`${130 - (i % 4) * 5};${126 - (i % 4) * 9};${130 - (i % 4) * 5}`} dur={`${1.6 + i * 0.25}s`} repeatCount="indefinite" />
          </rect>
        ))}
        <ellipse cx="170" cy="87" rx="135" ry="58" fill="none" stroke={`${accent}15`} strokeWidth="0.6" strokeDasharray="8 6" className="orbit-ring">
          <animateTransform attributeName="transform" type="rotate" from="0 170 87" to="360 170 87" dur="24s" repeatCount="indefinite" />
        </ellipse>
      </svg>
      <div className="absolute inset-x-4 top-3.5 flex justify-between items-center">
        <span className="text-[8px] 2xl:text-[9px] font-mono uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.25)' }}>Flow Monitor</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] 2xl:text-[9px] font-mono uppercase tracking-[0.18em] transition-all duration-300 status-label" style={{ color: accent }}>Active</span>
        </div>
      </div>
      <div className="absolute right-4 bottom-3 font-mono text-[9px] 2xl:text-[10px] uppercase tracking-[0.24em]" style={{ color: accent }}>
        <span className="opacity-50">Wallets</span> <span className="font-bold reading-value" style={{ color: '#E8EAED' }}>Tracking</span>
      </div>
      <style jsx>{`
        @keyframes scanlineSweep { 0% { transform: translateY(-100%); } 100% { transform: translateY(800%); } }
        .scanline-sweep { animation: scanlineSweep 1.8s linear infinite; }
        @keyframes dataRain { 0% { transform: translateY(-120%); opacity: 0; } 10% { opacity: 0.6; } 90% { opacity: 0.6; } 100% { transform: translateY(500%); opacity: 0; } }
        @keyframes packetFly { 0% { transform: translateX(-20px); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translateX(360px); opacity: 0; } }
        .group:hover .wallet-visual .flow-particle { filter: url(#${id}-glow-hover); }
        .group:hover .wallet-visual .flow-particle-trail { opacity: 0.85; }
        .group:hover .wallet-visual .flow-surge { opacity: 0.9; filter: url(#${id}-glow-hover); }
        .group:hover .wallet-visual .wallet-block { stroke: ${accent}AA; stroke-width: 1.6; filter: url(#${id}-glow-hover); }
        .group:hover .wallet-visual .wallet-inner { fill: ${accent}28; }
        .group:hover .wallet-visual .wallet-bar { filter: url(#${id}-glow-hover); }
        .group:hover .wallet-visual .connection-line { stroke: ${accent}88; stroke-width: 1.4; }
        .group:hover .wallet-visual .connection-arrow { opacity: 1; filter: url(#${id}-glow-hover); }
        .group:hover .wallet-visual .activity-bar { opacity: 0.8; filter: url(#${id}-glow-hover); }
        .group:hover .wallet-visual .orbit-ring { stroke: ${accent}45; }
        .group:hover .wallet-visual .status-label { color: ${accent}; letter-spacing: 0.24em; font-weight: 700; }
        .group:hover .wallet-visual .reading-value { color: #FFFFFF; text-shadow: 0 0 12px ${accent}88; }
        .group:hover .wallet-visual .bracket-tl { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .wallet-visual .bracket-tr { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .wallet-visual .bracket-bl { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .wallet-visual .bracket-br { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .wallet-visual .vignette-layer { background: radial-gradient(ellipse 70% 60% at 50% 100%, ${accent}35 0%, transparent 70%); }
      `}</style>
    </div>
  );
}

function ProtocolVisual({ accent }: { accent: string }) {
  const id = 'protocol';
  return (
    <div className="relative h-[210px] sm:h-[240px] lg:h-[260px] 2xl:h-[300px] 3xl:h-[340px] 4xl:h-[400px] overflow-hidden protocol-visual">
      <div className="absolute inset-0 opacity-[0.14] group-hover:opacity-[0.30] transition-opacity duration-500" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />
      <div className="absolute inset-0 vignette-layer transition-all duration-500" style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 100%, ${accent}10 0%, transparent 70%)`,
      }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none flex items-center justify-center">
        <div className="radar-sweep absolute" style={{
          width: '140%', height: '140%',
          background: `conic-gradient(from 0deg, transparent 0deg, transparent 300deg, ${accent}18 330deg, ${accent}35 360deg)`,
          animation: 'radarSweep 2s linear infinite',
        }} />
      </div>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shield-aura" style={{
        background: `radial-gradient(ellipse 30% 28% at 50% 48%, ${accent}20 0%, transparent 60%)`,
        animation: 'shieldAura 1.5s ease-in-out infinite alternate',
      }} />
      <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 bracket-tl transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 bracket-tr transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 bracket-bl transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 bracket-br transition-all duration-400" style={{ borderColor: `${accent}55` }} />
      <svg viewBox="0 0 340 180" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id={`${id}-glow`}>
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`${id}-glow-hover`}>
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`${id}-glow-intense`}>
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <g opacity="0.10" className="hex-grid">
          {[30,90,150,210,270,330].map((cx, ri) =>
            [40,90,140].map((cy, ci) => {
              const hx = cx + (ci % 2) * 30;
              const points = Array.from({ length: 6 }, (_, i) => {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                return `${hx + 22 * Math.cos(angle)},${cy + 22 * Math.sin(angle)}`;
              }).join(' ');
              return <polygon key={`${ri}-${ci}`} points={points} fill="none" stroke={accent} strokeWidth="0.6" />;
            })
          )}
        </g>
        <g className="shield-group" style={{ transformOrigin: '170px 85px' }}>
          <polygon points="170,50 202,68 202,100 170,118 138,100 138,68" fill={`${accent}10`} stroke={accent} strokeWidth="1.2" filter={`url(#${id}-glow)`} className="shield-outer" />
          <polygon points="170,62 192,75 192,95 170,108 148,95 148,75" fill={`${accent}18`} stroke={`${accent}80`} strokeWidth="0.8" className="shield-inner" />
          <text x="170" y="94" textAnchor="middle" fill="#E8EAED" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="700" opacity="0.85">N</text>
        </g>
        <circle cx="170" cy="85" r="28" fill="none" stroke={accent} strokeWidth="0.7" opacity="0" className="proto-ring" style={{ animation: 'protoRing 3s ease-out infinite' }} />
        <circle cx="170" cy="85" r="42" fill="none" stroke={accent} strokeWidth="0.5" opacity="0" className="proto-ring" style={{ animation: 'protoRing 3s ease-out 1s infinite' }} />
        <circle cx="170" cy="85" r="56" fill="none" stroke={accent} strokeWidth="0.35" opacity="0" className="proto-ring" style={{ animation: 'protoRing 3s ease-out 2s infinite' }} />
        <circle cx="170" cy="85" r="20" fill="none" stroke={accent} strokeWidth="0.8" opacity="0" className="lock-ring" style={{ animation: 'protoRing 1.2s ease-out infinite' }} />
        <circle cx="170" cy="85" r="34" fill="none" stroke={accent} strokeWidth="0.5" opacity="0" className="lock-ring" style={{ animation: 'protoRing 1.2s ease-out 0.4s infinite' }} />
        <circle cx="170" cy="85" r="48" fill="none" stroke={accent} strokeWidth="0.35" opacity="0" className="lock-ring" style={{ animation: 'protoRing 1.2s ease-out 0.8s infinite' }} />
        <circle cx="170" cy="85" r="62" fill="none" stroke={accent} strokeWidth="0.2" opacity="0" className="lock-ring" style={{ animation: 'protoRing 1.2s ease-out 1.2s infinite' }} />
        <g transform="translate(38, 128)">
          <rect x="0" y="0" width="82" height="5" rx="2.5" fill="rgba(255,255,255,0.05)" />
          <rect x="0" y="0" width="68" height="5" rx="2.5" fill={`url(#${id}-bar)`} filter={`url(#${id}-glow)`} className="status-bar">
            <animate attributeName="width" values="62;72;65;68" dur="4s" repeatCount="indefinite" />
          </rect>
          <text x="0" y="16" fill="rgba(255,255,255,0.30)" fontSize="6" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em">LIQUIDITY</text>
        </g>
        <g transform="translate(38, 150)">
          <rect x="0" y="0" width="82" height="5" rx="2.5" fill="rgba(255,255,255,0.05)" />
          <rect x="0" y="0" width="58" height="5" rx="2.5" fill={`url(#${id}-bar)`} filter={`url(#${id}-glow)`} opacity="0.8" className="status-bar">
            <animate attributeName="width" values="54;62;58;60" dur="3.5s" repeatCount="indefinite" />
          </rect>
          <text x="0" y="16" fill="rgba(255,255,255,0.30)" fontSize="6" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em">YIELD</text>
        </g>
        <g transform="translate(220, 128)">
          <rect x="0" y="0" width="82" height="5" rx="2.5" fill="rgba(255,255,255,0.05)" />
          <rect x="0" y="0" width="74" height="5" rx="2.5" fill={`url(#${id}-bar)`} filter={`url(#${id}-glow)`} className="status-bar">
            <animate attributeName="width" values="70;78;72;76" dur="5s" repeatCount="indefinite" />
          </rect>
          <text x="0" y="16" fill="rgba(255,255,255,0.30)" fontSize="6" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em">USAGE</text>
        </g>
        <g transform="translate(220, 150)">
          <rect x="0" y="0" width="82" height="5" rx="2.5" fill="rgba(255,255,255,0.05)" />
          <rect x="0" y="0" width="48" height="5" rx="2.5" fill={`url(#${id}-bar)`} filter={`url(#${id}-glow)`} opacity="0.65" className="status-bar">
            <animate attributeName="width" values="44;52;46;50" dur="4.5s" repeatCount="indefinite" />
          </rect>
          <text x="0" y="16" fill="rgba(255,255,255,0.30)" fontSize="6" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em">FEES</text>
        </g>
      </svg>
      <div className="absolute inset-x-4 top-3.5 flex justify-between items-center">
        <span className="text-[8px] 2xl:text-[9px] font-mono uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.25)' }}>Protocol Node</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] 2xl:text-[9px] font-mono uppercase tracking-[0.18em] transition-all duration-300 status-label" style={{ color: accent }}>Online</span>
        </div>
      </div>
      <div className="absolute right-4 bottom-3 font-mono text-[9px] 2xl:text-[10px] uppercase tracking-[0.24em]" style={{ color: accent }}>
        <span className="opacity-50">Health</span> <span className="font-bold reading-value" style={{ color: '#E8EAED' }}>Strong</span>
      </div>
      <style jsx>{`
        @keyframes protoRing { 0% { opacity: 0.5; transform: scale(0.7); } 100% { opacity: 0; transform: scale(1.4); } }
        @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shieldAura { 0% { opacity: 0.3; transform: scale(0.95); } 100% { opacity: 0.8; transform: scale(1.1); } }
        @keyframes hexRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .group:hover .protocol-visual .hex-grid { opacity: 0.45; animation: hexRotate 20s linear infinite; transform-origin: 170px 85px; }
        .group:hover .protocol-visual .shield-group { animation: shieldLock 0.6s ease-out forwards; }
        @keyframes shieldLock { 0% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.18) rotate(3deg); } 100% { transform: scale(1.12) rotate(0deg); } }
        .group:hover .protocol-visual .shield-outer { stroke: ${accent}DD; stroke-width: 1.8; filter: url(#${id}-glow-hover); fill: ${accent}22; }
        .group:hover .protocol-visual .shield-inner { stroke: ${accent}CC; fill: ${accent}40; filter: url(#${id}-glow-hover); }
        .group:hover .protocol-visual .proto-ring { animation-duration: 1.5s; }
        .group:hover .protocol-visual .lock-ring { opacity: 0.7; }
        .group:hover .protocol-visual .status-bar { filter: url(#${id}-glow-hover); }
        .group:hover .protocol-visual .status-label { color: ${accent}; letter-spacing: 0.24em; font-weight: 700; }
        .group:hover .protocol-visual .reading-value { color: #FFFFFF; text-shadow: 0 0 12px ${accent}88; }
        .group:hover .protocol-visual .bracket-tl { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .protocol-visual .bracket-tr { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .protocol-visual .bracket-bl { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .protocol-visual .bracket-br { width: 32px; height: 32px; border-color: ${accent}BB; }
        .group:hover .protocol-visual .vignette-layer { background: radial-gradient(ellipse 70% 60% at 50% 100%, ${accent}35 0%, transparent 70%); }
      `}</style>
    </div>
  );
}

export default function DeskVisual({ accent }: { accent: string }) {
  if (accent === '#C2344D') return <MoodVisual accent={accent} />;
  if (accent === '#00C8EE') return <WalletVisual accent={accent} />;
  return <ProtocolVisual accent={accent} />;
}

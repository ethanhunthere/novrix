import Link from 'next/link';

const INK = '#FAF7F2';
const BODY = '#D8D2C7';
const MUTED = '#A8A196';
const HAIRLINE = 'rgba(250, 247, 242, 0.10)';

export default function TerminalTelemetryCard() {
  return (
    <Link
      href="/sentiment"
      className="group block text-decoration-none min-w-0"
      style={{
        background: '#14110E',
        border: '1px solid rgba(250, 247, 242, 0.12)',
        borderTop: '1px solid rgba(250, 247, 242, 0.22)',
        borderRadius: '4px',
        padding: 'clamp(18px, 2.2vw, 26px)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.50)',
        transition: 'border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease',
      }}
      aria-label="Novrix Terminal Telemetry preview. Click to open sentiment workspace."
    >
      <style>{`
        .group:hover {
          border-color: rgba(250, 247, 242, 0.26) !important;
          transform: translateY(-2px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.65) !important;
        }
      `}</style>

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
        <div className="flex items-center gap-2">
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: INK,
            }}
          >
            NOVRIX / TERMINAL
          </span>
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: '10px',
              color: MUTED,
            }}
          >
            CYCLE REGIME
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#10B981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)' }}
          />
          <span
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#10B981',
            }}
          >
            LIVE ONCHAIN
          </span>
        </div>
      </div>

      {/* Cycle Stage Bar */}
      <div className="py-3" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: MUTED }}>
            CYCLE V PROGRESS
          </span>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: BODY }}>
            POST-HALVING ACCUMULATION
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[
            { phase: 'Capitulation', active: false, done: true },
            { phase: 'Accumulation', active: true, done: false },
            { phase: 'Expansion', active: false, done: false },
            { phase: 'Euphoria', active: false, done: false },
          ].map((item) => (
            <div
              key={item.phase}
              style={{
                background: item.active
                  ? 'rgba(250, 247, 242, 0.12)'
                  : item.done
                  ? 'rgba(250, 247, 242, 0.05)'
                  : 'rgba(250, 247, 242, 0.02)',
                border: item.active
                  ? '1px solid rgba(250, 247, 242, 0.35)'
                  : '1px solid rgba(250, 247, 242, 0.06)',
                padding: '4px 6px',
                borderRadius: '2px',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.04em',
                  color: item.active ? INK : item.done ? BODY : MUTED,
                  fontWeight: item.active ? 600 : 400,
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.phase}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2x2 Telemetry Metric Matrix */}
      <div className="grid grid-cols-2 gap-2 py-3" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
        <div
          style={{
            background: 'rgba(250, 247, 242, 0.02)',
            border: `1px solid ${HAIRLINE}`,
            borderRadius: '2px',
            padding: '8px 10px',
          }}
        >
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: MUTED }}>
            MVRV Z-Score
          </div>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: '15px',
              fontWeight: 600,
              color: INK,
              fontVariantNumeric: 'tabular-nums',
              marginTop: '2px',
            }}
          >
            2.14
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: '#10B981', marginTop: '1px' }}>
            Fair Value Band
          </div>
        </div>

        <div
          style={{
            background: 'rgba(250, 247, 242, 0.02)',
            border: `1px solid ${HAIRLINE}`,
            borderRadius: '2px',
            padding: '8px 10px',
          }}
        >
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: MUTED }}>
            Realized Price
          </div>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: '15px',
              fontWeight: 600,
              color: INK,
              fontVariantNumeric: 'tabular-nums',
              marginTop: '2px',
            }}
          >
            $34,920
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: BODY, marginTop: '1px' }}>
            2.02x Market Multiple
          </div>
        </div>

        <div
          style={{
            background: 'rgba(250, 247, 242, 0.02)',
            border: `1px solid ${HAIRLINE}`,
            borderRadius: '2px',
            padding: '8px 10px',
          }}
        >
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: MUTED }}>
            NUPL Ratio
          </div>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: '15px',
              fontWeight: 600,
              color: INK,
              fontVariantNumeric: 'tabular-nums',
              marginTop: '2px',
            }}
          >
            0.52
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: BODY, marginTop: '1px' }}>
            Belief / Pre-Euphoria
          </div>
        </div>

        <div
          style={{
            background: 'rgba(250, 247, 242, 0.02)',
            border: `1px solid ${HAIRLINE}`,
            borderRadius: '2px',
            padding: '8px 10px',
          }}
        >
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: MUTED }}>
            US Net Liquidity
          </div>
          <div
            style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: '15px',
              fontWeight: 600,
              color: INK,
              fontVariantNumeric: 'tabular-nums',
              marginTop: '2px',
            }}
          >
            $6.42T
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: '#10B981', marginTop: '1px' }}>
            Expanding Trend
          </div>
        </div>
      </div>

      {/* Hairline Historical Cycle Trajectory Curve */}
      <div className="py-2.5">
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: MUTED }}>
            HISTORICAL CYCLE TRAJECTORY
          </span>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '9.5px', color: MUTED }}>
            LOG PRICE vs REALIZED BASE
          </span>
        </div>

        <svg
          viewBox="0 0 380 74"
          className="w-full h-auto block"
          style={{ maxHeight: '74px', overflow: 'visible' }}
          aria-hidden="true"
        >
          {/* Subtle grid lines */}
          <line x1="0" y1="12" x2="380" y2="12" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />
          <line x1="0" y1="36" x2="380" y2="36" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />
          <line x1="0" y1="60" x2="380" y2="60" stroke="rgba(250,247,242,0.05)" strokeDasharray="2 3" />

          {/* Halving cycle epoch vertical dividers */}
          <line x1="80" y1="4" x2="80" y2="68" stroke="rgba(250,247,242,0.08)" strokeDasharray="1 2" />
          <line x1="165" y1="4" x2="165" y2="68" stroke="rgba(250,247,242,0.08)" strokeDasharray="1 2" />
          <line x1="255" y1="4" x2="255" y2="68" stroke="rgba(250,247,242,0.08)" strokeDasharray="1 2" />
          <line x1="335" y1="4" x2="335" y2="68" stroke="rgba(250,247,242,0.08)" strokeDasharray="1 2" />

          {/* Epoch labels */}
          <text x="76" y="72" fill="rgba(250,247,242,0.3)" fontSize="7" fontFamily="var(--ff-mono)" textAnchor="end">H1</text>
          <text x="161" y="72" fill="rgba(250,247,242,0.3)" fontSize="7" fontFamily="var(--ff-mono)" textAnchor="end">H2</text>
          <text x="251" y="72" fill="rgba(250,247,242,0.3)" fontSize="7" fontFamily="var(--ff-mono)" textAnchor="end">H3</text>
          <text x="331" y="72" fill="rgba(250,247,242,0.3)" fontSize="7" fontFamily="var(--ff-mono)" textAnchor="end">H4</text>

          {/* Realized Price step curve (stepped baseline in warm amber/cream hairline) */}
          <path
            d="M 5 66 L 40 65 L 75 60 L 85 54 L 120 52 L 160 48 L 175 42 L 210 38 L 250 33 L 270 24 L 310 22 L 335 18 L 375 16"
            fill="none"
            stroke="rgba(255, 160, 40, 0.70)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Market Price cyclical waves (white hairline) */}
          <path
            d="M 5 67 Q 25 58 45 42 Q 60 22 75 32 Q 95 62 115 50 Q 145 10 168 28 Q 190 56 220 38 Q 245 4 268 20 Q 295 50 325 32 Q 350 8 375 12"
            fill="none"
            stroke="#FAF7F2"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current cycle point */}
          <circle cx="375" cy="12" r="2.5" fill="#10B981" />
        </svg>
      </div>

      {/* Bottom Footer Affordance */}
      <div
        className="flex items-center justify-between pt-2.5"
        style={{ borderTop: `1px solid ${HAIRLINE}` }}
      >
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: MUTED }}>
          94 indicators active
        </span>

        <span
          className="inline-flex items-center gap-1.5"
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: '10.5px',
            fontWeight: 600,
            color: INK,
            letterSpacing: '0.04em',
          }}
        >
          <span>OPEN TERMINAL</span>
          <span className="transition-transform duration-160 group-hover:translate-x-1" style={{ fontSize: '12px' }}>
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

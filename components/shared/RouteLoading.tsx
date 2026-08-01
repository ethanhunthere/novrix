/**
 * Shared loading skeleton for heavy data routes.
 * Rendered by Next.js while the route's client bundle hydrates and
 * the initial data fetch resolves. Keeps the screen non-blank so
 * users perceive instant navigation. Pure HTML/CSS — zero JS.
 */
export default function RouteLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#71717A',
        fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
        fontSize: 11,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ opacity: 0.6 }}>Loading…</span>
    </div>
  );
}

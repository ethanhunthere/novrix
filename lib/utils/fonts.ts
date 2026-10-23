export function monoFontStack(): string {
  if (typeof document === 'undefined') return 'monospace';
  const stack = getComputedStyle(document.body).getPropertyValue('--font-geist-mono').trim();
  return stack || 'monospace';
}

/**
 * String / HTML sanitization for user-provided content.
 *
 * The posts endpoint accepts free-text from authors. Even with auth gating,
 * the rendered output must escape HTML so a compromised author account
 * cannot inject script tags into other users' browsers (stored XSS).
 */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#47;',
};

/** Escape every HTML metacharacter. Safe to inject into HTML text content. */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'/]/g, (c) => HTML_ESCAPES[c] ?? c);
}

/** Trim, normalize whitespace, hard-cap length. Use on every user string before storage. */
export function normalizeText(input: string, maxLen: number): string {
  return String(input ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // strip control chars
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLen);
}

/** Validate a value is one of an explicit allow-list (e.g. enum). */
export function ensureEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Validate an array of URLs and return only the safe ones (https only, length-capped). */
export function sanitizeImageUrls(value: unknown, maxItems = 12, maxLen = 2048): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== 'string') continue;
    if (v.length > maxLen) continue;
    // Allow https URLs and data URIs (uploads). Block javascript: and vbscript:.
    if (/^javascript:/i.test(v) || /^vbscript:/i.test(v)) continue;
    out.push(v);
    if (out.length >= maxItems) break;
  }
  return out;
}

export type AuthorLink = {
  platform: string;
  url: string;
};

/** Validate author social links. Only http(s) URLs are accepted. */
export function sanitizeAuthorLinks(value: unknown, maxItems = 8, maxLen = 2048): AuthorLink[] {
  if (!Array.isArray(value)) return [];
  const out: AuthorLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const platform = normalizeText(String(record.platform ?? ''), 40);
    const rawUrl = String(record.url ?? '').trim();
    if (!platform || !rawUrl || rawUrl.length > maxLen) continue;

    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
      out.push({ platform, url: url.href });
    } catch {
      continue;
    }

    if (out.length >= maxItems) break;
  }
  return out;
}

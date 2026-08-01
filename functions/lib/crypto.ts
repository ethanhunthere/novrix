/**
 * NOVRIX Auth — Cryptographic utilities
 * Uses Web Crypto API (available in Cloudflare Workers runtime)
 * No external dependencies.
 */

// ─── Token generation ────────────────────────────────────────────────────────

/** Cryptographically random UUID — Cloudflare Workers has crypto.randomUUID() */
export function generateToken(): string {
  return crypto.randomUUID();
}

// ─── NOVRIX ID Generation ────────────────────────────────────────────────────

/**
 * Character set for NOVRIX ID generation.
 * - Uppercase letters (A-Z): 26
 * - Lowercase letters (a-z): 26
 * - Numbers (0-9):           10
 * - Symbols (URL-safe):       5  (`-` `_` `.` `!` `*`)
 * Total: 67 characters → 67^15 ≈ 4.3 × 10^27 combinations.
 *
 * NOTE: The legacy charset included `#`, `%`, `@` which break in URLs and
 * SMS deep-links. The new charset stays the same size so the collision
 * math is unchanged, but every character is safe to interpolate into a
 * URL path/query without percent-encoding.
 *
 * Exported so `auth.ts` consumes a single source of truth.
 */
export const NOVRIX_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!*';

if (NOVRIX_CHARSET.length !== 67) {
  throw new Error('NOVRIX_CHARSET must remain 67 characters to preserve combinatorial math');
}

/**
 * Generates a 15-character cryptographically secure NOVRIX ID.
 *
 * Uses **rejection sampling** to avoid the modulo bias of the previous
 * implementation. With a 67-char alphabet sampled from 0..255, accepting
 * only bytes < 67 * floor(256/67) = 67*3 = 201 yields a perfectly uniform
 * distribution over the alphabet.
 */
export function generateNovrixId(): string {
  const charsetLen = NOVRIX_CHARSET.length; // 67
  const cutoff = Math.floor(256 / charsetLen) * charsetLen; // 201

  const out: string[] = [];
  while (out.length < 15) {
    const chunk = crypto.getRandomValues(new Uint8Array(32));
    for (let i = 0; i < chunk.length && out.length < 15; i++) {
      const b = chunk[i] as number;
      if (b < cutoff) {
        out.push(NOVRIX_CHARSET[b % charsetLen] as string);
      }
    }
  }
  return out.join('');
}

// ─── Credential Hashing ──────────────────────────────────────────────────────

/**
 * Deterministic, peppered hash of a NOVRIX ID. Used for *lookup* (the column
 * is unique-indexed) so the plaintext credential never lands in D1.
 *
 * The pepper is a server-side secret (`env.AUTH_PEPPER`, set via
 * `wrangler pages secret put AUTH_PEPPER`). A DB-only compromise cannot
 * brute-force IDs without also stealing the pepper.
 *
 * NOTE: HMAC-SHA-256 is preferred over Argon2id here because:
 *   1. The credential carries ~89 bits of entropy (67^15) — an attacker
 *      without the pepper cannot enumerate it in any reasonable time.
 *   2. PBKDF2/Argon2 require a per-user salt which makes server-side
 *      lookup impossible without a separate plaintext column — defeating
 *      the whole point.
 *   3. Web Crypto in Workers exposes HMAC-SHA-256 natively, no polyfill.
 */
export async function hashNovrixId(novrixId: string, pepper: string): Promise<string> {
  if (!pepper) {
    throw new Error('AUTH_PEPPER is not configured. Set via `wrangler pages secret put AUTH_PEPPER`.');
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(novrixId));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time string comparison. Use whenever comparing two secrets
 * (shared admin tokens, computed hashes, session tokens).
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Structured logger for Pages Functions and Workers.
 *
 * Emits JSON-line records to `console` so Cloudflare's log stream and any
 * downstream aggregator (Logpush, Axiom, Datadog) can index them. Includes
 * a request id when available so a single user error can be traced across
 * an entire request lifecycle.
 *
 * Usage:
 *   const log = createLogger('btc-price', { reqId });
 *   log.info('cache_hit', { source: 'd1' });
 *   log.error('upstream_failed', { status: 503 }, err);
 */

export type Level = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  reqId?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(event: string, fields?: Record<string, unknown>): void;
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>, err?: unknown): void;
  error(event: string, fields?: Record<string, unknown>, err?: unknown): void;
  child(extra: LogContext): Logger;
}

function safeErr(err: unknown): Record<string, unknown> | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return {
      err_name: err.name,
      err_message: err.message,
      // Stack is intentionally truncated — we never want to ship multi-KB stacks.
      err_stack: typeof err.stack === 'string' ? err.stack.slice(0, 1024) : undefined,
    };
  }
  return { err_message: String(err) };
}

function emit(level: Level, scope: string, ctx: LogContext, event: string,
              fields?: Record<string, unknown>, err?: unknown): void {
  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    scope,
    event,
    ...ctx,
    ...fields,
    ...safeErr(err),
  };
  // One JSON object per line — friendly to log shippers.
  const line = JSON.stringify(record);
  if (level === 'error' || level === 'warn') console.error(line);
  else console.info(line);
}

export function createLogger(scope: string, ctx: LogContext = {}): Logger {
  return {
    debug: (event, fields) => emit('debug', scope, ctx, event, fields),
    info:  (event, fields) => emit('info',  scope, ctx, event, fields),
    warn:  (event, fields, err) => emit('warn',  scope, ctx, event, fields, err),
    error: (event, fields, err) => emit('error', scope, ctx, event, fields, err),
    child: (extra) => createLogger(scope, { ...ctx, ...extra }),
  };
}

/** Generate or extract a per-request id (for X-Request-Id and log correlation). */
export function requestId(request: Request): string {
  const raw = request.headers.get('X-Request-Id')
      ?? request.headers.get('CF-Ray')
      ?? crypto.randomUUID();
  // Sanitize: strip control chars, newlines, and limit length to prevent log injection
  return raw
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .slice(0, 128);
}

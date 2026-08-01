/**
 * NOVRIX News Aggregation Cron Worker — Tiered High-Frequency Architecture
 *
 * Schedule: every 1 minute (see wrangler.toml)
 *
 * Sources are tiered by update speed:
 *   HIGH  (every 60s)  — CoinTelegraph
 *   MED   (every 5m)   — Investing.com
 *
 * Each cron run queries feed_sources for sources whose last_fetched_at is
 * older than their designated interval, then fetches all of them IN PARALLEL.
 * Sources that aren't due are skipped — no wasted requests.
 *
 * Budget at 1-min schedule: ~1,440 cron invocations/day.
 * HIGH sources fetch 1,440×/day, MED 288×/day.
 * Total RSS fetches ≈ 1×1440 + 1×288 = ~1,728/day.
 * Well within Cloudflare free tier (100,000 requests/day).
 */

interface Env {
  INSIGHTS_DB: D1Database;
}

interface SourceDef {
  url: string;
  name: string;
  category: string;
  interval: number; // seconds
}

interface ParsedItem {
  title: string;
  url: string;
  summary: string;
  published_at: string;
  image_url: string;
}

const SOURCE_DEFS: SourceDef[] = [
  // HIGH — every 60 seconds
  { url: 'https://cointelegraph.com/rss',                                  name: 'CoinTelegraph',   category: 'crypto',     interval: 60  },
  // MEDIUM macro — every 5 minutes
  { url: 'https://www.investing.com/rss/news_14.rss',                     name: 'Investing.com',   category: 'macro',      interval: 300 },
];

function logWarn(...args: unknown[]): void {
  console.warn(...args);
}

function decodeEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g,          (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function stripHtml(str: string): string {
  return decodeEntities(
    str
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function extractField(block: string, ...tags: string[]): string {
  for (const tag of tags) {
    const cdataRe = new RegExp(
      `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i'
    );
    const cdataMatch = block.match(cdataRe);
    if (cdataMatch) return stripHtml(cdataMatch[1]).trim();

    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = block.match(re);
    if (m) return stripHtml(m[1]).trim();
  }
  return '';
}

function extractLink(block: string): string {
  const atomHref = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  if (atomHref) return atomHref[1].trim();
  const rssLink = block.match(/<link[^>]*>(https?:\/\/[^<]+)<\/link>/i);
  if (rssLink) return rssLink[1].trim();
  const guid = block.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i);
  if (guid) return guid[1].trim();
  return '';
}

function cleanImageUrl(url: string): string {
  // Decode HTML entities that appear in XML attribute values
  return url.trim()
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractImage(block: string): string {
  // media:content — Investing.com (quoted URL)
  const mc = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (mc) return cleanImageUrl(mc[1]);
  // media:content — unquoted URL (some WordPress-style builds)
  const mcu = block.match(/<media:content[^>]+url=([^\s"'>][^\s>]+)/i);
  if (mcu) return cleanImageUrl(mcu[1]);
  // media:thumbnail — CoinTelegraph (quoted)
  const mt = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (mt) return cleanImageUrl(mt[1]);
  // media:thumbnail — unquoted URL
  const mtu = block.match(/<media:thumbnail[^>]+url=([^\s"'>][^\s>]+)/i);
  if (mtu) return cleanImageUrl(mtu[1]);
  // enclosure — url attr first, with type
  const ea = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i);
  if (ea) return cleanImageUrl(ea[1]);
  // enclosure — (type attr first)
  const eb = block.match(/<enclosure[^>]+type=["']image\/[^"']+["'][^>]*url=["']([^"']+)["']/i);
  if (eb) return cleanImageUrl(eb[1]);
  // enclosure — any enclosure with an image URL extension (no explicit type)
  const ec = block.match(/<enclosure[^>]+url=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*?)["']/i);
  if (ec) return cleanImageUrl(ec[1]);
  // WordPress jetpack:featured_media_url
  const wpfm = block.match(/<jetpack:featured_media_url[^>]*>([^<]+)<\/jetpack:featured_media_url>/i);
  if (wpfm && wpfm[1].startsWith('http')) return cleanImageUrl(wpfm[1].trim());
  // WordPress/Atom featured image extension
  // img src inside CDATA content (WordPress-style feeds)
  const img = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img && img[1].startsWith('http')) return cleanImageUrl(img[1]);
  // img src in entity-encoded content (some feeds encode < > inside CDATA)
  const imgEnc = block.match(/&lt;img[^&]+src=["']([^"']+)["']/i);
  if (imgEnc && imgEnc[1].startsWith('http')) return cleanImageUrl(imgEnc[1]);
  return '';
}

function parseDate(str: string): string {
  if (!str) return new Date().toISOString();
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch { /* ignore */ }
  return new Date().toISOString();
}

function parseRss(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const isAtom = /<feed[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  const blockTag = isAtom ? 'entry' : 'item';
  const blockRe = new RegExp(`<${blockTag}[\\s>]([\\s\\S]*?)<\\/${blockTag}>`, 'gi');

  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[1];
    const title   = extractField(block, 'title');
    const url     = extractLink(block);
    const rawDesc = extractField(block, 'description', 'summary', 'content:encoded', 'content');
    const pubDate = extractField(block, 'pubDate', 'published', 'updated', 'dc:date');

    if (!title || !url || !url.startsWith('http')) continue;
    items.push({
      title:        title.slice(0, 500),
      url,
      summary:      rawDesc.slice(0, 300),
      published_at: parseDate(pubDate),
      image_url:    extractImage(block),
    });
  }
  return items;
}

async function makeId(url: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 20);
}

async function ensureSchema(db: D1Database): Promise<void> {
  // 1. feed_sources table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS feed_sources (
      url             TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      category        TEXT NOT NULL,
      fetch_interval  INTEGER NOT NULL,
      last_fetched_at TEXT,
      last_error      TEXT,
      total_inserted  INTEGER NOT NULL DEFAULT 0
    )
  `).run();

  // 2. inserted_at column on articles (one-time migration; safe to re-run)
  try {
    await db.prepare('ALTER TABLE articles ADD COLUMN inserted_at TEXT').run();
  } catch (e) {
    const msg = String((e as Error).message || e);
    if (!msg.toLowerCase().includes('duplicate column') && !msg.toLowerCase().includes('already exists')) {
      logWarn('[news-cron] ALTER TABLE inserted_at warning:', msg);
    }
  }

  // 3. image_url column on articles (one-time migration; safe to re-run)
  try {
    await db.prepare('ALTER TABLE articles ADD COLUMN image_url TEXT').run();
  } catch (e) {
    const msg = String((e as Error).message || e);
    if (!msg.toLowerCase().includes('duplicate column') && !msg.toLowerCase().includes('already exists')) {
      logWarn('[news-cron] ALTER TABLE image_url warning:', msg);
    }
  }

  // 4. Keep source definitions exactly aligned with SOURCE_DEFS.
  //    Removed feeds must be deleted or they would remain schedulable from D1.
  try {
    const placeholders = SOURCE_DEFS.map(() => '?').join(',');
    await db.prepare(`DELETE FROM feed_sources WHERE url NOT IN (${placeholders})`).bind(...SOURCE_DEFS.map((s) => s.url)).run();

    const stmt = db.prepare(`
      INSERT INTO feed_sources (url, name, category, fetch_interval)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        name           = excluded.name,
        category       = excluded.category,
        fetch_interval = excluded.fetch_interval
    `);
    await db.batch(SOURCE_DEFS.map((s) => stmt.bind(s.url, s.name, s.category, s.interval)));
  } catch { /* table may not exist yet; next run will retry */ }
}

async function getDueSources(db: D1Database): Promise<SourceDef[]> {
  const result = await db.prepare(`
    SELECT url, name, category, fetch_interval
    FROM feed_sources
    WHERE last_fetched_at IS NULL
       OR (
            CAST(strftime('%s', 'now') AS REAL) -
            CAST(strftime('%s', last_fetched_at) AS REAL)
          ) >= fetch_interval
    ORDER BY COALESCE(last_fetched_at, '1970-01-01') ASC
  `).all<SourceDef>();
  return result.results || [];
}

async function processSource(
  db: D1Database,
  source: SourceDef
): Promise<{ name: string; inserted: number; error: string | null }> {
  const fetchedAt = new Date().toISOString();
  let error: string | null = null;
  let inserted = 0;

  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'NOVRIX-News-Bot/1.0 (+https://novrix.io)' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const xml   = await res.text();
    const items = parseRss(xml);

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const fresh  = items.filter(i => new Date(i.published_at).getTime() > cutoff);

    if (fresh.length > 0) {
      // Compute IDs first so we can deduplicate against D1 in bulk (reads are free)
      const itemIds: { id: string; item: ParsedItem }[] = [];
      for (const item of fresh) {
        itemIds.push({ id: await makeId(item.url), item });
      }

      const existing = new Set<string>();
      try {
        const placeholders = itemIds.map(() => '?').join(',');
        const rows = await db
          .prepare(`SELECT id FROM articles WHERE id IN (${placeholders})`)
          .bind(...itemIds.map((x) => x.id))
          .all<{ id: string }>();
        for (const r of rows.results ?? []) existing.add(r.id);
      } catch {
        /* if D1 read fails, fall through to individual inserts */
      }

      const newItems = itemIds.filter((x) => !existing.has(x.id));
      if (newItems.length > 0) {
        const stmt = db.prepare(
          `INSERT INTO articles
             (id, title, url, summary, source_name, category, published_at, inserted_at, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
        );
        const batch: D1PreparedStatement[] = [];
        for (const { id, item } of newItems) {
          batch.push(
            stmt.bind(
              id, item.title, item.url, item.summary,
              source.name, source.category, item.published_at,
              item.image_url || null
            )
          );
        }
        // D1 batch limit: 100 statements at a time
        for (let i = 0; i < batch.length; i += 100) {
          const chunk = await db.batch(batch.slice(i, i + 100));
          for (const r of chunk) inserted += r.meta.changes ?? 0;
        }
      }
    }
  } catch (e) {
    error = String((e as Error).message).slice(0, 200);
  }

  // Always update tracking state, even on failure (prevents retry storms)
  await db.prepare(`
    UPDATE feed_sources
    SET last_fetched_at = ?,
        last_error      = ?,
        total_inserted  = total_inserted + ?
    WHERE url = ?
  `).bind(fetchedAt, error, inserted, source.url).run();

  return { name: source.name, inserted, error };
}

async function cleanup(db: D1Database): Promise<number> {
  const stale = await db
    .prepare(`DELETE FROM articles WHERE published_at < datetime('now', '-30 days')`)
    .run();
  const removedSources = await db
    .prepare(`DELETE FROM articles WHERE source_name NOT IN ('CoinTelegraph', 'Investing.com')`)
    .run();
  return (stale.meta.changes ?? 0) + (removedSources.meta.changes ?? 0);
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    // Bootstrap schema (idempotent)
    await ensureSchema(env.INSIGHTS_DB);

    // Determine which sources need fetching this run
    const due = await getDueSources(env.INSIGHTS_DB);

    if (due.length === 0) {
      return;
    }

    // Fetch all due sources concurrently — not sequentially
    const results = await Promise.allSettled(due.map(s => processSource(env.INSIGHTS_DB, s)));

    let totalInserted = 0;
    const errors: string[] = [];

    for (const r of results) {
      if (r.status === 'fulfilled') {
        totalInserted += r.value.inserted;
        if (r.value.error) errors.push(`[${r.value.name}] ${r.value.error}`);
      } else {
        errors.push(`[rejected] ${String(r.reason)}`);
      }
    }

    // Cleanup old articles and rows from removed sources once per hour (at minute :00)
    if (new Date().getMinutes() === 0) {
      await cleanup(env.INSIGHTS_DB);
    }

    if (errors.length > 0) {
      console.error('[news-cron] errors:', errors.join(' | '));
    }
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      const checks: Record<string, { ok: boolean; detail?: string }> = {};
      let healthy = true;
      try {
        await env.INSIGHTS_DB.prepare('SELECT 1').first();
        checks.d1 = { ok: true };
      } catch (e) {
        checks.d1 = { ok: false, detail: String(e) };
        healthy = false;
      }
      const status = healthy ? 200 : 503;
      return Response.json(
        { success: healthy, checks, timestamp: new Date().toISOString() },
        { status }
      );
    }

    // Manual trigger
    const t0 = Date.now();
    await ensureSchema(env.INSIGHTS_DB);
    const due = await getDueSources(env.INSIGHTS_DB);
    const results = await Promise.allSettled(due.map(s => processSource(env.INSIGHTS_DB, s)));
    let totalInserted = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') totalInserted += r.value.inserted;
    }
    return Response.json({
      success: true,
      inserted: totalInserted,
      sources: due.length,
      duration_ms: Date.now() - t0,
    });
  },
};

interface Env {
  DB?: D1Database;
  FRED_API_KEY?: string;
  ASSETS?: { fetch: typeof fetch };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const CACHE = "public, s-maxage=3600, stale-while-revalidate=7200";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const staticUrl = new URL("/data/fred/mabmm301usm189s.json", request.url);
    const assetRes = env?.ASSETS
      ? await env.ASSETS.fetch(staticUrl)
      : await fetch(staticUrl);
    if (assetRes.ok) {
      const json = await assetRes.json();
      return new Response(JSON.stringify(json), {
        headers: { ...CORS, "Cache-Control": CACHE, "Content-Type": "application/json" },
      });
    }
  } catch { /* proceed */ }

  return new Response(JSON.stringify({ success: false, error: "Not available" }), {
    status: 503,
    headers: CORS,
  });
};

import { requireSeedAdmin } from '../../lib/admin';
import { ensureKnownAddresses } from '../../../lib/trackingSeed';

interface Env {
  TRACKING_DB: D1Database;
  SEED_ADMIN_SECRET?: string;
}

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request, env } = context;

  const auth = requireSeedAdmin(request, env);
  if (auth) return auth;

  try {
    await ensureKnownAddresses(env.TRACKING_DB);

    const count = await env.TRACKING_DB
      .prepare('SELECT COUNT(*) as cnt FROM known_addresses')
      .first<{ cnt: number }>();

    return new Response(
      JSON.stringify({
        success: true,
        totalAddresses: count?.cnt || 0,
        message: 'Reseed complete',
      }),
      { status: 200, headers: HEADERS },
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ success: false, error }),
      { status: 500, headers: HEADERS },
    );
  }
};

export const onRequest = async (context: {
  request: Request;
}): Promise<Response> => {
  if (context.request.method === 'POST') {
    return onRequestPost(context as { request: Request; env: Env });
  }
  return new Response(
    JSON.stringify({ success: false, error: 'Method not allowed' }),
    { status: 405, headers: HEADERS },
  );
};

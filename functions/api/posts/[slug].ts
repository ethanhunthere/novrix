/**
 * NOVRIX Posts — Single post by slug
 * GET /api/posts/:slug
 */

interface Env {
  INSIGHTS_DB: D1Database;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

interface PostRow {
  id: string;
  title: string;
  content: string;
  images: string;
  cover_image: string | null;
  author_links?: string | null;
  category: string;
  author: string;
  published_at: string;
  slug: string;
}

function parseStoredJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: CORS }
    );
  }

  const slug = params.slug as string;

  try {
    const post = await env.INSIGHTS_DB.prepare(
      `SELECT * FROM novrix_posts WHERE slug = ?`
    ).bind(slug).first<PostRow>();

    if (!post) {
      return new Response(
        JSON.stringify({ success: false, error: 'Post not found' }),
        { status: 404, headers: CORS }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...post,
          images: parseStoredJsonArray(post.images),
          author_links: parseStoredJsonArray(post.author_links),
        },
      }),
      { headers: { ...CORS, 'Cache-Control': 'public, s-maxage=60' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Database error' }),
      { status: 500, headers: CORS }
    );
  }
};

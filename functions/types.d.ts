// Cloudflare Pages Functions TypeScript types

declare global {
  /**
   * Base Cloudflare environment bindings shared across all Pages Functions.
   * Endpoint-specific secrets should be declared via intersection at the
   * call site rather than redeclaring the whole interface:
   *
   *   type MyEnv = Env & { MY_SECRET?: string };
   *   export const onRequest: PagesFunction<MyEnv> = async (context) => { ... };
   */
  interface Env {
    DB: D1Database;
    AUTH_DB: D1Database;
    INSIGHTS_DB: D1Database;
    TRACKING_DB: D1Database;
    METRILYTICS_DB: D1Database;
    ALLOWED_ORIGIN?: string;
  }

  type PagesFunction<Env = unknown> = (context: EventContext<Env, string, unknown>) => Response | Promise<Response>;
}

export {};

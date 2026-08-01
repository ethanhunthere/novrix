# Novrix D1 Migrations

Migrations are grouped by the Cloudflare D1 database they target. Keep new
schema changes inside the folder for the owning database.

| Folder | D1 database | Binding | Ownership |
|---|---|---|---|
| `sentiment/` | `novrix-sentiment-db` | `DB` | BGeometrics sentiment indicators, FRED macro series, and shared rate-limit state |
| `auth/` | `novrix-auth-db` | `AUTH_DB` | Users and sessions |
| `insights/` | `novrix-insights-db` | `INSIGHTS_DB` | News, posts, insights, picks, and post idempotency |
| `tracking/` | `novrix-tracking-db` | `TRACKING_DB` | Whale transactions, known addresses, entity holdings, and tracking API rate logs |
| `metrilytics/` | `novrix-metrilytics-db` | `METRILYTICS_DB` | DeFi macro, TVL, fees, DEX, stablecoin, derivatives, summary, and yield data |

Apply a migration with:

```bash
npx wrangler d1 execute <database-name> --remote --file=database/migrations/<folder>/<file>.sql
```

The root of this directory intentionally contains only this README and database
folders. Old mixed-module migrations were removed after the codebase moved to
separate D1 bindings.

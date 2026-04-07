# Supabase Migrations

The base schema for this project is managed via the Supabase project (`yaljntgjtfcyyfligvmy`)
and was applied as `20260309233805_create_mvp_schema`. The historical SQL files for that
schema live inside the Supabase project, not in this repo.

Subsequent schema changes are applied via the Supabase MCP `apply_migration` tool and
documented here for traceability.

## Applied migrations

| Date | Name | Purpose |
|------|------|---------|
| 2026-03-09 | `create_mvp_schema` | Base tables: organizations, products, sales_daily, ad_daily_spend, demand_forecasts, sync_logs, api_credentials, etc. |
| 2026-04-07 | `add_credential_value_to_api_credentials` | Adds `credential_value TEXT` column + unique index for OAuth token storage. |

## Live schema reference

Always check the actual deployed schema before writing code:

```ts
// Use the Supabase MCP
mcp__supabase__list_tables({ project_id: "yaljntgjtfcyyfligvmy", schemas: ["public"], verbose: true })
```

The deployed `products` and `sales_daily` are **base tables**, not views. Earlier
versions of this folder contained migration files for a different schema (skus,
shopify_orders, sales_daily as a view) that was never applied — those have been
removed to avoid confusion.

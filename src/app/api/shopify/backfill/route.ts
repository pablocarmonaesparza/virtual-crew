import { NextRequest, NextResponse, after } from "next/server";
import { validateShopifyToken, getOrders, getProducts, getCustomers } from "@/lib/shopify/client";
import { transformRawOrders } from "@/lib/shopify/transform";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopifyOrder } from "@/types";

type SupabaseAdmin = NonNullable<ReturnType<typeof createAdminClient>>;

// Simple lock to prevent concurrent backfill jobs
let backfillRunning = false;

/**
 * POST /api/shopify/backfill
 * Fetches historical Shopify orders (up to 24 months) and aggregates them
 * into the existing sales_daily / products schema in Supabase.
 *
 * Auth: requires CRON_SECRET header. Dashboard "Sync Now" goes through /api/shopify/trigger-backfill.
 * Always validates the Shopify token is actually valid before starting.
 * The actual work runs in after() so the response returns immediately.
 */
export async function POST(request: NextRequest) {
  // Backfill is gated behind /api/shopify/trigger-backfill for dashboard use.
  // Direct calls REQUIRE the cron secret in production.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Validate the Shopify token is actually valid (not just present)
  const shopName = await validateShopifyToken();
  if (!shopName) {
    return NextResponse.json({ error: "Shopify token invalid or expired" }, { status: 503 });
  }

  // CRITICAL: Set the lock BEFORE any awaits to prevent race conditions.
  // Two simultaneous requests that both passed `if (backfillRunning)` would
  // otherwise both schedule a backfill.
  if (backfillRunning) {
    return NextResponse.json({ error: "Backfill already in progress" }, { status: 409 });
  }
  backfillRunning = true;

  // Wrap setup in try/catch to guarantee the in-memory lock is released
  // if any await throws (e.g., Supabase network failure).
  let supabase: ReturnType<typeof createAdminClient>;
  let orgId: string;
  try {
    supabase = createAdminClient();
    if (!supabase) {
      backfillRunning = false;
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    // Get organization ID
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (!org) {
      backfillRunning = false;
      return NextResponse.json({ error: "No organization found in database" }, { status: 500 });
    }

    orgId = org.id;
  } catch (setupErr) {
    backfillRunning = false;
    console.error("[backfill] Setup error:", setupErr);
    return NextResponse.json(
      { error: setupErr instanceof Error ? setupErr.message : "Setup failed" },
      { status: 500 }
    );
  }

  // ── Atomic cross-instance lock via sync_logs ──
  // The DB has a partial unique index:
  //   sync_logs_one_running_per_workflow ON (workflow_name, source) WHERE status='running'
  // So the INSERT below will fail with a unique constraint violation if any
  // other instance already holds the lock. This is atomic — no read-then-insert race.
  //
  // Step 1: Expire stale locks. We use 4 hours (longer than any plausible
  // legitimate backfill, even for very large catalogs) to avoid stealing
  // a still-running job's lock. Vercel function timeout is 800s for hobby/
  // 900s for pro, so 4h is well above any realistic completion time and
  // gives generous slack for retries.
  const STALE_LOCK_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours
  let syncLogId: string;
  try {
    const staleCutoff = new Date(Date.now() - STALE_LOCK_AGE_MS).toISOString();
    await supabase
      .from("sync_logs")
      .update({
        status: "error",
        error_message: "Lock expired (>4h) — likely crashed",
        completed_at: new Date().toISOString(),
      })
      .eq("source", "shopify")
      .eq("workflow_name", "Shopify Backfill")
      .eq("status", "running")
      .lt("started_at", staleCutoff);

    // Step 2: Atomically insert the lock row.
    const startedAt = new Date().toISOString();
    const { data: createdLog, error: logErr } = await supabase
      .from("sync_logs")
      .insert({
        organization_id: orgId,
        workflow_name: "Shopify Backfill",
        source: "shopify",
        status: "running",
        started_at: startedAt,
      })
      .select("id")
      .single();

    if (logErr) {
      backfillRunning = false;
      // 23505 = Postgres unique_violation
      if (logErr.code === "23505") {
        return NextResponse.json(
          { error: "A backfill is already running" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Failed to create sync log: ${logErr.message}` },
        { status: 500 }
      );
    }

    if (!createdLog) {
      backfillRunning = false;
      return NextResponse.json(
        { error: "Failed to create sync log: no data returned" },
        { status: 500 }
      );
    }

    syncLogId = createdLog.id;
  } catch (lockErr) {
    backfillRunning = false;
    console.error("[backfill] Lock acquisition error:", lockErr);
    return NextResponse.json(
      { error: lockErr instanceof Error ? lockErr.message : "Lock failed" },
      { status: 500 }
    );
  }

  // Schedule the heavy work to run after the response is sent
  after(async () => {

    const results = {
      orders: { fetched: 0, daily_rows: 0 },
      products: { fetched: 0, upserted: 0 },
      customers: { fetched: 0 },
      errors: [] as string[],
    };

    // Track whether the product map is complete enough to safely run
    // the destructive stale-bucket cleanup. If anything failed during
    // the product sync, we MUST skip cleanup to avoid deleting valid history.
    let productMapComplete = true;

    try {
      // ── 1. Sync products FIRST so we have product_id mappings ──
      const productIdBySku = new Map<string, string>();
      try {
        console.log("[backfill] Fetching products from Shopify...");
        const products = await getProducts();
        results.products.fetched = products.length;
        console.log(`[backfill] Got ${products.length} products`);

        // Deduplicate by SKU (Shopify doesn't enforce uniqueness across
        // active/draft/archived variants). Prefer active over inactive.
        const skuMap = new Map<string, {
          organization_id: string;
          sku: string;
          name: string;
          product_line: string;
          category: string;
          unit_price: number;
          unit_cost: number;
          is_active: boolean;
          metadata: Record<string, unknown>;
          updated_at: string;
        }>();
        for (const p of products) {
          for (const v of p.variants) {
            const row = {
              organization_id: orgId,
              sku: v.sku || `UNKNOWN-${p.id}-${v.id}`,
              name: `${p.title}${v.title !== "Default Title" ? ` - ${v.title}` : ""}`,
              product_line: p.product_type || "Other",
              category: categorizeProduct(p.product_type),
              unit_price: parseFloat(v.price) || 0,
              unit_cost: 0,
              is_active: p.status === "active",
              metadata: {
                shopify_product_id: p.id,
                shopify_variant_id: v.id,
                variant_title: v.title,
                inventory_quantity: v.inventory_quantity,
              },
              updated_at: new Date().toISOString(),
            };
            const existing = skuMap.get(row.sku);
            if (!existing || (row.is_active && !existing.is_active)) {
              skuMap.set(row.sku, row);
            }
          }
        }
        const productRows = Array.from(skuMap.values());

        if (productRows.length > 0) {
          // Upsert in batches of 500 to handle large catalogs
          const CHUNK = 500;
          for (let i = 0; i < productRows.length; i += CHUNK) {
            const batch = productRows.slice(i, i + CHUNK);
            const { data: upserted, error } = await supabase
              .from("products")
              .upsert(batch, { onConflict: "organization_id,sku" })
              .select("id, sku");

            if (error) {
              productMapComplete = false;
              results.errors.push(`Products batch ${i / CHUNK}: ${error.message}`);
              console.error("[backfill] Products upsert error:", error);
              continue;
            }
            results.products.upserted += upserted?.length ?? 0;
            for (const row of upserted ?? []) {
              productIdBySku.set(row.sku, row.id);
            }
          }
          console.log(`[backfill] Upserted ${results.products.upserted} product variants`);
        }

        // Fetch ALL existing products (paginated with stable order)
        const PAGE_SIZE = 1000;
        let from = 0;
        while (true) {
          const { data: page, error: pageErr } = await supabase
            .from("products")
            .select("id, sku")
            .eq("organization_id", orgId)
            .order("id")
            .range(from, from + PAGE_SIZE - 1);
          if (pageErr) {
            productMapComplete = false;
            results.errors.push(`Products page ${from / PAGE_SIZE}: ${pageErr.message}`);
            break;
          }
          if (!page || page.length === 0) break;
          for (const p of page) {
            if (!productIdBySku.has(p.sku)) productIdBySku.set(p.sku, p.id);
          }
          if (page.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
      } catch (err) {
        productMapComplete = false;
        const msg = err instanceof Error ? err.message : "unknown";
        results.errors.push(`Products fetch: ${msg}`);
        console.error("[backfill] Products fetch error:", err);
      }

      // ── 2. Backfill orders → sales_daily aggregation ──
      //
      // CRITICAL constraint: Shopify's `read_orders` scope only returns
      // the last ~60 days. The `read_all_orders` scope (which would unlock
      // 24 months) is a "sensitive scope" that requires Shopify approval.
      // We currently only request `read_orders` in the OAuth flow.
      //
      // Therefore the CLEANUP window must NOT exceed what we can fetch.
      // If we tried to clean up 24 months, the fetch would only return 60
      // days, and the cleanup would delete every older row as "stale" —
      // catastrophic data loss.
      //
      // Strategy:
      //   - Fetch attempts 24 months (Shopify will return what it can).
      //   - Cleanup is limited to a SAFE window (60 days minus a buffer).
      //
      // Separate FETCH window from CLEANUP window. Fetch is wider to cover
      // timezone offsets so the stale cleanup never deletes a row whose
      // order was fetched back into dailyRows.
      try {
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        // FETCH window: try 24 months back. Shopify with read_orders will
        // cap at ~60 days; we still ask for the full range so that if the
        // app later gets read_all_orders, no code change is needed.
        const fetchSinceRaw = new Date();
        fetchSinceRaw.setMonth(fetchSinceRaw.getMonth() - 24);
        const since = new Date(Date.UTC(
          fetchSinceRaw.getUTCFullYear(),
          fetchSinceRaw.getUTCMonth(),
          fetchSinceRaw.getUTCDate(),
          0, 0, 0, 0
        ));

        // CLEANUP window: 50 days back (well within the 60-day read_orders
        // limit, with a 10-day safety margin for timezone offsets and
        // any pending order corrections).
        const CLEANUP_WINDOW_DAYS = 50;
        const cleanupRaw = new Date();
        cleanupRaw.setDate(cleanupRaw.getDate() - CLEANUP_WINDOW_DAYS);
        const cleanupSince = new Date(Date.UTC(
          cleanupRaw.getUTCFullYear(),
          cleanupRaw.getUTCMonth(),
          cleanupRaw.getUTCDate(),
          0, 0, 0, 0
        ));
        console.log(`[backfill] Fetching orders since ${since.toISOString()}...`);
        const rawOrders = await getOrders({
          created_at_min: since.toISOString(),
          status: "any",
        });
        results.orders.fetched = rawOrders.length;
        console.log(`[backfill] Got ${rawOrders.length} orders`);

        const transformed = transformRawOrders(rawOrders);

        // Create placeholder products for retired/archived SKUs.
        // CRITICAL: Only run this if the product map is COMPLETE. If
        // productMapComplete is false, productIdBySku may be missing real
        // products (e.g., because /products.json failed) — in that case
        // creating placeholders would overwrite legitimate catalog rows
        // with `Archived:*` zero-priced placeholders.
        const unmappedSkus = new Set<string>();
        for (const order of transformed) {
          if (!productIdBySku.has(order.sku_id)) unmappedSkus.add(order.sku_id);
        }
        if (unmappedSkus.size > 0 && !productMapComplete) {
          results.errors.push(
            `Refusing to create ${unmappedSkus.size} placeholders: product map incomplete`
          );
          console.error(
            `[backfill] Skipping placeholder creation — product sync had errors`
          );
        } else if (unmappedSkus.size > 0) {
          console.log(`[backfill] Creating placeholders for ${unmappedSkus.size} retired SKUs`);
          const placeholders = Array.from(unmappedSkus).map((sku) => ({
            organization_id: orgId,
            sku,
            name: `Archived: ${sku}`,
            product_line: "Archived",
            category: "health_products",
            unit_price: 0,
            unit_cost: 0,
            is_active: false,
            metadata: { archived: true, source: "shopify_sales_only" },
            updated_at: new Date().toISOString(),
          }));

          const { data: upserted, error: phErr } = await supabase
            .from("products")
            .upsert(placeholders, { onConflict: "organization_id,sku" })
            .select("id, sku");

          if (phErr) {
            productMapComplete = false;
            results.errors.push(`Placeholder products: ${phErr.message}`);
            console.error("[backfill] Placeholder upsert error:", phErr);
          } else {
            for (const row of upserted ?? []) {
              productIdBySku.set(row.sku, row.id);
            }
          }
        }

        // Aggregate orders into daily sales by product+channel
        const aggregations = aggregateOrdersToDaily(transformed);
        const dailyRows = [];
        const affectedDates = new Set<string>();

        for (const agg of aggregations) {
          const productId = productIdBySku.get(agg.sku);
          if (!productId) {
            productMapComplete = false;
            results.errors.push(`Unmapped SKU dropped: ${agg.sku} on ${agg.date}`);
            continue;
          }
          affectedDates.add(agg.date);
          dailyRows.push({
            organization_id: orgId,
            product_id: productId,
            sale_date: agg.date,
            channel: agg.channel,
            units_sold: agg.units,
            gross_revenue: agg.gross_revenue,
            net_revenue: agg.net_revenue,
            discounts: agg.discounts,
            currency: "GBP",
            source_order_ids: agg.order_ids,
          });
        }

        // 1. Atomic upsert in batches of 500 (skipped if dailyRows is empty)
        let upsertOk = true;
        if (dailyRows.length > 0) {
          for (let i = 0; i < dailyRows.length; i += 500) {
            const batch = dailyRows.slice(i, i + 500);
            const { error } = await supabase
              .from("sales_daily")
              .upsert(batch, {
                onConflict: "organization_id,product_id,sale_date,channel",
              });
            if (error) {
              upsertOk = false;
              results.errors.push(`Sales batch ${i}: ${error.message}`);
              console.error(`[backfill] Sales upsert error at batch ${i}:`, error);
            } else {
              results.orders.daily_rows += batch.length;
            }
          }
          console.log(`[backfill] Upserted ${results.orders.daily_rows} daily sales rows`);
        }

        // 2. Stale cleanup runs UNCONDITIONALLY (even when dailyRows is empty),
        // so a window that previously had orders but now refetches as empty
        // gets its old rows removed. Only skipped if upsert failed or
        // product map is incomplete (would risk false-positive deletes).
        {
          if (upsertOk && productMapComplete) {
            const newKeys = new Set(
              dailyRows.map((r) => `${r.product_id}|${r.sale_date}|${r.channel}`)
            );
            const sinceDate = cleanupSince.toISOString().split("T")[0];

            // Paginate through ALL existing rows (Supabase default cap is 1000)
            const PAGE = 1000;
            let pageStart = 0;
            const staleIds: string[] = [];
            while (true) {
              const { data: page, error: pageErr } = await supabase
                .from("sales_daily")
                .select("id, product_id, sale_date, channel")
                .eq("organization_id", orgId)
                .eq("channel", "shopify")
                .gte("sale_date", sinceDate)
                .order("id")
                .range(pageStart, pageStart + PAGE - 1);

              if (pageErr) {
                results.errors.push(`Stale query page ${pageStart / PAGE}: ${pageErr.message}`);
                break;
              }
              if (!page || page.length === 0) break;

              for (const row of page) {
                if (!newKeys.has(`${row.product_id}|${row.sale_date}|${row.channel}`)) {
                  staleIds.push(row.id);
                }
              }

              if (page.length < PAGE) break;
              pageStart += PAGE;
            }

            if (staleIds.length > 0) {
              console.log(`[backfill] Deleting ${staleIds.length} stale sales_daily rows`);
              for (let i = 0; i < staleIds.length; i += 500) {
                const { error: delErr } = await supabase
                  .from("sales_daily")
                  .delete()
                  .in("id", staleIds.slice(i, i + 500));
                if (delErr) {
                  results.errors.push(`Stale delete ${i}: ${delErr.message}`);
                }
              }
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        results.errors.push(`Orders fetch: ${msg}`);
        console.error("[backfill] Orders fetch error:", err);
      }

      // ── 3. Customer count (informational only — no dedicated table in current schema) ──
      try {
        const since = new Date();
        since.setMonth(since.getMonth() - 24);
        const customers = await getCustomers({ created_at_min: since.toISOString() });
        results.customers.fetched = customers.length;
        console.log(`[backfill] Got ${customers.length} customers`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        results.errors.push(`Customers fetch: ${msg}`);
        console.error("[backfill] Customers fetch error:", err);
      }

      // ── 4. Update sync log ──
      const completedAt = new Date().toISOString();
      const status = results.errors.length > 0 ? "partial" : "success";
      const totalFetched = results.orders.fetched + results.products.fetched + results.customers.fetched;
      const totalInserted = results.orders.daily_rows + results.products.upserted;

      if (syncLogId) {
        await supabase
          .from("sync_logs")
          .update({
            status,
            records_fetched: totalFetched,
            records_inserted: totalInserted,
            records_updated: 0,
            error_message: results.errors.length > 0 ? results.errors.join("; ") : null,
            completed_at: completedAt,
            metadata: results,
          })
          .eq("id", syncLogId);
      }

      console.log("[backfill] Complete:", JSON.stringify(results));
    } catch (error) {
      console.error("[backfill] Fatal error:", error);
      if (syncLogId) {
        await supabase
          .from("sync_logs")
          .update({
            status: "error",
            error_message: error instanceof Error ? error.message : String(error),
            completed_at: new Date().toISOString(),
          })
          .eq("id", syncLogId);
      }
    } finally {
      backfillRunning = false;
    }
  });

  return NextResponse.json({ status: "started", message: "Backfill running in background" });
}

// ── Helpers ──

interface DailyAggregation {
  date: string;
  sku: string;
  channel: string;
  units: number;
  gross_revenue: number;
  net_revenue: number;
  discounts: number;
  order_ids: string[];
}

function aggregateOrdersToDaily(orders: ShopifyOrder[]): DailyAggregation[] {
  // JSON-encoded tuple keys handle SKUs containing any character.
  const map = new Map<string, DailyAggregation>();

  for (const order of orders) {
    const date = order.order_date.split("T")[0];
    const channel = order.channel.toLowerCase();
    const sku = order.sku_id;
    const key = JSON.stringify([date, sku, channel]);

    let agg = map.get(key);
    if (!agg) {
      agg = {
        date,
        sku,
        channel,
        units: 0,
        gross_revenue: 0,
        net_revenue: 0,
        discounts: 0,
        order_ids: [],
      };
      map.set(key, agg);
    }

    agg.units += order.quantity;
    agg.gross_revenue += order.gross_revenue;
    agg.net_revenue += order.net_revenue;
    agg.discounts += order.discount_amount;
    if (!agg.order_ids.includes(order.order_id)) {
      agg.order_ids.push(order.order_id);
    }
  }

  return Array.from(map.values());
}

function categorizeProduct(productType: string): string {
  const type = (productType || "").toLowerCase();
  if (type.includes("tea") || type.includes("infusion")) return "tea";
  if (type.includes("kefir") || type.includes("drink") || type.includes("shot")) return "drinks";
  return "health_products";
}

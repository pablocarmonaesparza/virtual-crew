import { NextRequest, NextResponse } from "next/server";
import { validateShopifyToken, getOrders, getProducts } from "@/lib/shopify/client";
import { transformRawOrders } from "@/lib/shopify/transform";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ShopifyOrder } from "@/types";

type SupabaseAdmin = NonNullable<ReturnType<typeof createAdminClient>>;

// In-memory lock (only protects a single function instance — DB constraint
// provides the cross-instance guarantee).
let syncRunning = false;

/**
 * GET /api/shopify/sync
 * Incremental daily sync: fetches orders since last successful sync and
 * aggregates them into the existing sales_daily schema.
 *
 * Configured as Vercel Cron in vercel.json (daily at 5am UTC).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (syncRunning) {
    return NextResponse.json({ error: "Sync already in progress" }, { status: 409 });
  }
  syncRunning = true;

  try {
  const shopName = await validateShopifyToken();
  if (!shopName) {
    return NextResponse.json({ error: "Shopify token invalid or expired" }, { status: 503 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .single();

  if (!org) {
    return NextResponse.json({ error: "No organization found" }, { status: 500 });
  }

  const orgId = org.id;

  // STEP 1: Expire stale sync locks (>1 hour). The partial unique index
  // sync_logs_one_running_per_workflow blocks concurrent inserts, so a
  // crashed sync that left a `running` row would deadlock all future syncs
  // until manually cleaned up. Marking stale rows as 'error' frees the index.
  const SYNC_STALE_AGE_MS = 60 * 60 * 1000; // 1 hour (sync should take seconds)
  const syncStaleCutoff = new Date(Date.now() - SYNC_STALE_AGE_MS).toISOString();
  await supabase
    .from("sync_logs")
    .update({
      status: "error",
      error_message: "Sync lock expired (>1h) — likely crashed",
      completed_at: new Date().toISOString(),
    })
    .eq("source", "shopify")
    .eq("workflow_name", "Shopify Daily Sync")
    .eq("status", "running")
    .lt("started_at", syncStaleCutoff);

  // STEP 2: DB-level lock check (catches still-active cross-instance syncs).
  const { data: dbRunning } = await supabase
    .from("sync_logs")
    .select("id, started_at")
    .eq("source", "shopify")
    .eq("workflow_name", "Shopify Daily Sync")
    .eq("status", "running")
    .limit(1)
    .maybeSingle();

  if (dbRunning) {
    return NextResponse.json(
      { error: "A sync is already running", started_at: dbRunning.started_at },
      { status: 409 }
    );
  }

  // STEP 3: Insert a "running" sync_log row (atomic via partial unique index)
  const { data: lockRow, error: lockErr } = await supabase
    .from("sync_logs")
    .insert({
      organization_id: orgId,
      workflow_name: "Shopify Daily Sync",
      source: "shopify",
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (lockErr) {
    // 23505 = Postgres unique_violation = another instance won the race
    if (lockErr.code === "23505") {
      return NextResponse.json(
        { error: "A sync is already running" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: `Failed to acquire sync lock: ${lockErr.message}` },
      { status: 500 }
    );
  }
  if (!lockRow) {
    return NextResponse.json(
      { error: "Failed to acquire sync lock: no row returned" },
      { status: 500 }
    );
  }
  const syncLockId = lockRow.id;

  try {
    // Find last successful sync timestamp
    const { data: lastSync } = await supabase
      .from("sync_logs")
      .select("completed_at")
      .eq("source", "shopify")
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // CRITICAL: Separate the FETCH window from the CLEANUP window.
    //
    // The fetch window must include all orders whose LOCAL sale_date falls
    // inside the cleanup window. For a store at +14h offset (the maximum
    // positive timezone), an order with local sale_date D can have UTC
    // timestamp as early as (D-1) at 10:00Z. So the fetch must start at
    // least 24 hours BEFORE the cleanup window in UTC.
    //
    // We use:
    //   cleanupSinceDate = utc_midnight(last_sync) - 2 days   (in YYYY-MM-DD)
    //   fetchSince       = cleanupSinceDate - 1 extra day     (UTC midnight)
    // Result: Fetch covers 1 full extra day BEFORE cleanup, so any positive-
    // offset store's local-day orders are guaranteed to be re-fetched before
    // their existing rows are deleted.
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const CLEANUP_BUFFER_DAYS = 2;   // How many days before last sync we clean up
    const FETCH_EXTRA_DAYS = 1;      // Extra days to fetch (covers TZ offset)

    let cleanupSince: Date;
    if (lastSync?.completed_at) {
      const lastSyncDate = new Date(lastSync.completed_at);
      const utcMidnight = new Date(Date.UTC(
        lastSyncDate.getUTCFullYear(),
        lastSyncDate.getUTCMonth(),
        lastSyncDate.getUTCDate(),
        0, 0, 0, 0
      ));
      cleanupSince = new Date(utcMidnight.getTime() - CLEANUP_BUFFER_DAYS * ONE_DAY_MS);
    } else {
      // No previous sync — go back 7 days
      const d = new Date(Date.now() - 7 * ONE_DAY_MS);
      cleanupSince = new Date(Date.UTC(
        d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0
      ));
    }

    // Fetch window starts 1 day before cleanup window
    const since = new Date(cleanupSince.getTime() - FETCH_EXTRA_DAYS * ONE_DAY_MS);

    const rawOrders = await getOrders({
      created_at_min: since.toISOString(),
      status: "any",
    });

    const transformed = transformRawOrders(rawOrders);

    // Build product_id lookup, refreshing from Shopify if needed
    const { map: productIdBySku, errors: mapErrors } = await buildProductMap(
      supabase,
      orgId,
      transformed
    );

    if (mapErrors.length > 0) {
      const msg = `buildProductMap failed: ${mapErrors.join("; ")}`;
      console.error("[sync]", msg);
      // UPDATE the existing lock row, do NOT insert a new one
      await supabase
        .from("sync_logs")
        .update({
          status: "error",
          records_fetched: rawOrders.length,
          records_inserted: 0,
          records_updated: 0,
          error_message: msg,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLockId);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Aggregate to daily sales rows
    const aggregations = aggregateOrdersToDaily(transformed);
    const dailyRows = [];
    const affectedDates = new Set<string>();
    const unmappedSkus = new Set<string>();
    let droppedRowCount = 0;

    for (const agg of aggregations) {
      const productId = productIdBySku.get(agg.sku);
      if (!productId) {
        unmappedSkus.add(agg.sku);
        droppedRowCount++;
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

    let inserted = 0;
    let staleDeleted = 0;
    let writeError: string | null = null;
    let staleCleanupError: string | null = null;

    // 1. Upsert new rows (if any)
    if (dailyRows.length > 0) {
      const { error: upErr } = await supabase
        .from("sales_daily")
        .upsert(dailyRows, {
          onConflict: "organization_id,product_id,sale_date,channel",
        });
      if (upErr) {
        writeError = `upsert: ${upErr.message}`;
      } else {
        inserted = dailyRows.length;
      }
    }

    // 2. Stale cleanup — runs UNCONDITIONALLY (even when dailyRows is empty)
    // because a window that previously had orders but now refetches as empty
    // still needs its old rows removed. Only skipped if upsert failed.
    //
    // NOTE: We use cleanupSince (NOT since), because the fetch window is
    // intentionally wider than the cleanup window to cover timezone offsets.
    // Cleaning up the wider window would risk deleting orders that were
    // legitimately fetched but are outside the cleanup boundary.
    if (!writeError) {
      const newKeys = new Set(
        dailyRows.map((r) => `${r.product_id}|${r.sale_date}|${r.channel}`)
      );

      const sinceDate = cleanupSince.toISOString().split("T")[0];

      const PAGE = 1000;
      let pageStart = 0;
      const staleIds: string[] = [];
      let queryFailed = false;

      while (true) {
        const { data: page, error: existErr } = await supabase
          .from("sales_daily")
          .select("id, product_id, sale_date, channel")
          .eq("organization_id", orgId)
          .eq("channel", "shopify")
          .gte("sale_date", sinceDate)
          .order("id")
          .range(pageStart, pageStart + PAGE - 1);

        if (existErr) {
          staleCleanupError = `query: ${existErr.message}`;
          console.error("[sync] Stale bucket query failed:", existErr.message);
          queryFailed = true;
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

      if (!queryFailed && staleIds.length > 0) {
        for (let i = 0; i < staleIds.length; i += 500) {
          const { error: delErr } = await supabase
            .from("sales_daily")
            .delete()
            .in("id", staleIds.slice(i, i + 500));
          if (delErr) {
            staleCleanupError = `delete: ${delErr.message}`;
            console.error("[sync] Stale bucket delete failed:", delErr.message);
            break;
          }
          staleDeleted += Math.min(500, staleIds.length - i);
        }
      }
    }

    // Determine final status. Unmapped SKUs OR stale cleanup failures are
    // partial failures — data loss/inconsistency without visibility is unacceptable.
    let status: "success" | "partial" | "error";
    let errorMessage: string | null = writeError;
    if (writeError) {
      status = "error";
    } else if (unmappedSkus.size > 0 || staleCleanupError) {
      status = "partial";
      const parts: string[] = [];
      if (unmappedSkus.size > 0) {
        parts.push(
          `Dropped ${droppedRowCount} rows for ${unmappedSkus.size} unmapped SKUs: ${Array.from(unmappedSkus).slice(0, 10).join(", ")}${unmappedSkus.size > 10 ? "..." : ""}`
        );
      }
      if (staleCleanupError) {
        parts.push(`Stale cleanup ${staleCleanupError}`);
      }
      errorMessage = parts.join(" | ");
      console.error("[sync] Partial failure:", errorMessage);
    } else {
      status = "success";
    }

    // UPDATE the existing lock row (don't insert a new one)
    await supabase
      .from("sync_logs")
      .update({
        status,
        records_fetched: rawOrders.length,
        records_inserted: inserted,
        records_updated: staleDeleted,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        metadata: {
          unmapped_skus: Array.from(unmappedSkus),
          dropped_rows: droppedRowCount,
          stale_deleted: staleDeleted,
        },
      })
      .eq("id", syncLockId);

    if (writeError) {
      console.error("[sync] sales_daily write failed:", writeError);
      return NextResponse.json(
        {
          fetched: rawOrders.length,
          inserted,
          since: since.toISOString(),
          error: writeError,
        },
        { status: 500 }
      );
    }

    if (status === "partial") {
      // Use 500 (not 207) so cron monitors and Vercel's deployment health
      // checks treat partial failures as failures and surface alerts.
      // 207 is technically 2xx and many monitors silently swallow it.
      return NextResponse.json(
        {
          fetched: rawOrders.length,
          inserted,
          dropped: droppedRowCount,
          unmapped_skus: Array.from(unmappedSkus),
          since: since.toISOString(),
          error: errorMessage,
          status: "partial",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      fetched: rawOrders.length,
      inserted,
      since: since.toISOString(),
    });
  } catch (error) {
    console.error("Shopify sync error:", error);
    // Mark the lock row as errored so the next sync can run
    await supabase
      .from("sync_logs")
      .update({
        status: "error",
        error_message: error instanceof Error ? error.message : String(error),
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncLockId);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
  } finally {
    syncRunning = false;
  }
}

interface ProductMapResult {
  map: Map<string, string>;
  errors: string[];
}

/**
 * Build a SKU → product_id map. If any SKUs from new orders are missing,
 * fetch fresh products from Shopify and upsert any missing ones (including
 * archived placeholders for retired SKUs).
 *
 * Returns both the map and any errors encountered. Callers MUST check
 * `errors` and treat a non-empty result as a hard failure.
 */
async function buildProductMap(
  supabase: SupabaseAdmin,
  orgId: string,
  orders: ShopifyOrder[]
): Promise<ProductMapResult> {
  const map = new Map<string, string>();
  const errors: string[] = [];

  // 1. Load existing products (paginated with stable order to bypass Supabase's
  //    1000-row default limit)
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku")
      .eq("organization_id", orgId)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      errors.push(`products load (page ${from / PAGE_SIZE}): ${error.message}`);
      return { map, errors };
    }
    if (!data || data.length === 0) break;
    for (const p of data) map.set(p.sku, p.id);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // 2. Find SKUs in incoming orders that have no mapping
  const missingSkus = new Set<string>();
  for (const order of orders) {
    if (!map.has(order.sku_id)) missingSkus.add(order.sku_id);
  }

  if (missingSkus.size === 0) return { map, errors };

  // 3. Fetch fresh products from Shopify and upsert any missing ones
  try {
    const shopifyProducts = await getProducts();
    // Deduplicate by SKU (active variants take precedence over archived/draft)
    const skuRowMap = new Map<string, {
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
    for (const p of shopifyProducts) {
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
        const existing = skuRowMap.get(row.sku);
        if (!existing || (row.is_active && !existing.is_active)) {
          skuRowMap.set(row.sku, row);
        }
      }
    }
    const productRows = Array.from(skuRowMap.values());

    if (productRows.length > 0) {
      // Upsert in chunks to stay under Supabase's row limits
      const CHUNK = 500;
      for (let i = 0; i < productRows.length; i += CHUNK) {
        const batch = productRows.slice(i, i + CHUNK);
        const { data: upserted, error: upErr } = await supabase
          .from("products")
          .upsert(batch, { onConflict: "organization_id,sku" })
          .select("id, sku");
        if (upErr) {
          errors.push(`products upsert (batch ${i / CHUNK}): ${upErr.message}`);
          continue;
        }
        for (const row of upserted ?? []) {
          map.set(row.sku, row.id);
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    errors.push(`shopify products fetch: ${msg}`);
    console.error("[sync] Failed to refresh product catalog:", err);
  }

  // 4. For any SKUs STILL unmapped (deleted/archived in Shopify),
  // create placeholder products so we don't lose sales data.
  // CRITICAL: Only do this if the product map fetch/upsert above SUCCEEDED.
  // If errors occurred, the map could be missing real products and creating
  // placeholders would overwrite them with `Archived:*` rows.
  if (errors.length > 0) {
    return { map, errors };
  }
  const stillMissing = Array.from(missingSkus).filter((sku) => !map.has(sku));
  if (stillMissing.length > 0) {
    const placeholders = stillMissing.map((sku) => ({
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
      errors.push(`placeholder products upsert: ${phErr.message}`);
    } else {
      for (const row of upserted ?? []) {
        map.set(row.sku, row.id);
      }
    }
  }

  return { map, errors };
}

function categorizeProduct(productType: string): string {
  const type = (productType || "").toLowerCase();
  if (type.includes("tea") || type.includes("infusion")) return "tea";
  if (type.includes("kefir") || type.includes("drink") || type.includes("shot")) return "drinks";
  return "health_products";
}

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
  // Use a Map keyed by JSON-encoded tuple. Since SKUs can contain ANY
  // character (including pipes, colons, etc.), we use JSON.stringify which
  // is unambiguous for any string input.
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

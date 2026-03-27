import { NextRequest, NextResponse } from "next/server";
import { isShopifyConnected, getOrders } from "@/lib/shopify/client";
import { transformRawOrders } from "@/lib/shopify/transform";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/shopify/sync
 * Incremental sync: fetches orders since last sync and upserts to Supabase.
 * Designed to run as a Vercel Cron job daily.
 *
 * Configure in vercel.json:
 *   { "path": "/api/shopify/sync", "schedule": "0 5 * * *" }
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connected = await isShopifyConnected();
  if (!connected) {
    return NextResponse.json({ error: "Shopify not connected" }, { status: 503 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    // Find last sync timestamp
    const { data: lastSync } = await supabase
      .from("sync_logs")
      .select("completed_at")
      .eq("source", "shopify")
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    // Default to 7 days ago if no previous sync
    const since = lastSync?.completed_at
      ? new Date(lastSync.completed_at)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const rawOrders = await getOrders({
      created_at_min: since.toISOString(),
      status: "any",
    });

    const transformed = transformRawOrders(rawOrders);
    let upserted = 0;

    if (transformed.length > 0) {
      for (let i = 0; i < transformed.length; i += 500) {
        const batch = transformed.slice(i, i + 500).map((o) => ({
          order_id: o.order_id,
          line_item_id: o.sku_id,
          order_date: o.order_date,
          sku_id: o.sku_id,
          quantity: o.quantity,
          gross_revenue: o.gross_revenue,
          net_revenue: o.net_revenue,
          discount_amount: o.discount_amount,
          customer_type: o.customer_type,
          subscription_type: o.subscription_type,
          channel: o.channel,
          synced_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from("shopify_orders")
          .upsert(batch, { onConflict: "order_id,line_item_id" });

        if (!error) upserted += batch.length;
      }
    }

    // Log sync
    await supabase.from("sync_logs").insert({
      workflow_name: "Shopify Daily Sync",
      source: "shopify",
      status: "success",
      records_fetched: rawOrders.length,
      records_inserted: upserted,
      records_updated: 0,
      started_at: since.toISOString(),
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      fetched: rawOrders.length,
      upserted,
      since: since.toISOString(),
    });
  } catch (error) {
    console.error("Shopify sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

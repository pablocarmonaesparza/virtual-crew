import { NextRequest, NextResponse } from "next/server";
import { isShopifyConnected, getOrders, getProducts, getCustomers } from "@/lib/shopify/client";
import { transformRawOrders } from "@/lib/shopify/transform";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/shopify/backfill
 * Fetches historical Shopify orders (up to 24 months) and upserts them to Supabase.
 * Also syncs products and customers.
 *
 * This endpoint should be called once after connecting Shopify to populate the DB.
 * Rate-limited by the Shopify client (2 req/sec max).
 */
export async function POST(request: NextRequest) {
  // Verify auth (cron secret or simple check)
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

  const results = {
    orders: { fetched: 0, upserted: 0 },
    products: { fetched: 0, upserted: 0 },
    customers: { fetched: 0, upserted: 0 },
    errors: [] as string[],
  };

  try {
    // 1. Backfill orders (24 months)
    const since = new Date();
    since.setMonth(since.getMonth() - 24);
    const rawOrders = await getOrders({
      created_at_min: since.toISOString(),
      status: "any",
    });
    results.orders.fetched = rawOrders.length;

    const transformed = transformRawOrders(rawOrders);
    if (transformed.length > 0) {
      // Batch upsert in chunks of 500
      for (let i = 0; i < transformed.length; i += 500) {
        const batch = transformed.slice(i, i + 500).map((o) => ({
          order_id: o.order_id,
          line_item_id: o.sku_id, // composite PK
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

        if (error) {
          results.errors.push(`Orders batch ${i}: ${error.message}`);
        } else {
          results.orders.upserted += batch.length;
        }
      }
    }

    // 2. Sync products
    try {
      const products = await getProducts();
      results.products.fetched = products.length;

      const productRows = products.flatMap((p) =>
        p.variants.map((v) => ({
          sku_id: v.sku || `${p.id}-${v.id}`,
          sku_title: `${p.title}${v.title !== "Default Title" ? ` - ${v.title}` : ""}`,
          product_type: p.product_type || "Other",
          category: categorizeProduct(p.product_type),
          is_active: p.status === "active",
          price: parseFloat(v.price),
          inventory_quantity: v.inventory_quantity,
          updated_at: new Date().toISOString(),
        }))
      );

      if (productRows.length > 0) {
        const { error } = await supabase
          .from("products")
          .upsert(productRows, { onConflict: "sku_id" });

        if (error) {
          results.errors.push(`Products: ${error.message}`);
        } else {
          results.products.upserted = productRows.length;
        }
      }
    } catch (err) {
      results.errors.push(`Products fetch: ${err instanceof Error ? err.message : "unknown"}`);
    }

    // 3. Sync customers
    try {
      const customers = await getCustomers({
        created_at_min: since.toISOString(),
      });
      results.customers.fetched = customers.length;

      const customerRows = customers.map((c) => ({
        customer_id: String(c.id),
        email: c.email,
        first_name: c.first_name,
        last_name: c.last_name,
        orders_count: c.orders_count,
        total_spent: parseFloat(c.total_spent),
        created_at: c.created_at,
        tags: c.tags,
        synced_at: new Date().toISOString(),
      }));

      if (customerRows.length > 0) {
        for (let i = 0; i < customerRows.length; i += 500) {
          const batch = customerRows.slice(i, i + 500);
          const { error } = await supabase
            .from("shopify_customers")
            .upsert(batch, { onConflict: "customer_id" });

          if (error) {
            results.errors.push(`Customers batch ${i}: ${error.message}`);
          } else {
            results.customers.upserted += batch.length;
          }
        }
      }
    } catch (err) {
      results.errors.push(`Customers fetch: ${err instanceof Error ? err.message : "unknown"}`);
    }

    // Log sync activity
    try {
      await supabase.from("sync_logs").insert({
        workflow_name: "Shopify Backfill",
        source: "shopify",
        status: results.errors.length > 0 ? "partial" : "success",
        records_fetched: results.orders.fetched + results.products.fetched + results.customers.fetched,
        records_inserted: results.orders.upserted + results.products.upserted + results.customers.upserted,
        records_updated: 0,
        error_message: results.errors.length > 0 ? results.errors.join("; ") : null,
        started_at: since.toISOString(),
        completed_at: new Date().toISOString(),
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Shopify backfill error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backfill failed", partial_results: results },
      { status: 500 }
    );
  }
}

function categorizeProduct(productType: string): string {
  const type = (productType || "").toLowerCase();
  if (type.includes("tea") || type.includes("infusion")) return "tea";
  if (type.includes("kefir") || type.includes("drink") || type.includes("shot")) return "drinks";
  return "health_products";
}

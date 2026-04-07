import { NextRequest, NextResponse } from "next/server";
import { validateShopifyToken, getProducts } from "@/lib/shopify/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/shopify/products
 * Syncs Shopify products to the existing Supabase products table.
 */
export async function GET(request: NextRequest) {
  // Require cron secret when configured (no anonymous access in production)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

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

  try {
    const products = await getProducts();

    // Build SKU → row map. When the same SKU appears on multiple variants
    // (Shopify doesn't enforce uniqueness), prefer ACTIVE variants over
    // archived/draft. This prevents `ON CONFLICT DO UPDATE command cannot
    // affect row a second time` errors from the upsert.
    const skuMap = new Map<string, ReturnType<typeof buildRow>>();

    function buildRow(p: typeof products[0], v: typeof products[0]["variants"][0]) {
      return {
        organization_id: org!.id,
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
    }

    for (const p of products) {
      for (const v of p.variants) {
        const row = buildRow(p, v);
        const existing = skuMap.get(row.sku);
        // Prefer active over inactive when there's a SKU collision
        if (!existing || (row.is_active && !existing.is_active)) {
          skuMap.set(row.sku, row);
        }
      }
    }
    const productRows = Array.from(skuMap.values());

    if (productRows.length === 0) {
      return NextResponse.json({ products: 0, persisted: 0 });
    }

    // Upsert in batches of 500 to handle large catalogs (matches the
    // backfill/buildProductMap paths so behavior stays consistent).
    const CHUNK = 500;
    let persisted = 0;
    const errors: string[] = [];
    for (let i = 0; i < productRows.length; i += CHUNK) {
      const batch = productRows.slice(i, i + CHUNK);
      const { error, count } = await supabase
        .from("products")
        .upsert(batch, { onConflict: "organization_id,sku", count: "exact" });

      if (error) {
        errors.push(`batch ${i / CHUNK}: ${error.message}`);
        console.error(`[products] Batch ${i / CHUNK} upsert error:`, error);
        continue;
      }
      persisted += count ?? batch.length;
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          products: products.length,
          variants: productRows.length,
          persisted,
          errors,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({
      products: products.length,
      variants: productRows.length,
      persisted,
    });
  } catch (error) {
    console.error("Products sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product sync failed" },
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

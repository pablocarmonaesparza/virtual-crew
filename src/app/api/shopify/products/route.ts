import { NextRequest, NextResponse } from "next/server";
import { isShopifyConnected, getProducts } from "@/lib/shopify/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/shopify/products
 * Syncs Shopify products to Supabase products table.
 * Can be called manually or via cron.
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

  try {
    const products = await getProducts();

    const supabase = createAdminClient();
    if (!supabase) {
      // Return products without persisting
      return NextResponse.json({ products: products.length, persisted: false });
    }

    const productRows = products.flatMap((p) =>
      p.variants.map((v) => ({
        sku_id: v.sku || `${p.id}-${v.id}`,
        sku_title: `${p.title}${v.title !== "Default Title" ? ` - ${v.title}` : ""}`,
        product_type: p.product_type || "Other",
        category: categorizeProduct(p.product_type),
        is_active: p.status === "active",
        updated_at: new Date().toISOString(),
      }))
    );

    if (productRows.length > 0) {
      const { error } = await supabase
        .from("products")
        .upsert(productRows, { onConflict: "sku_id" });

      if (error) {
        console.error("Products upsert error:", error.message);
        return NextResponse.json({ products: products.length, persisted: false, error: error.message });
      }
    }

    return NextResponse.json({
      products: products.length,
      variants: productRows.length,
      persisted: true,
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

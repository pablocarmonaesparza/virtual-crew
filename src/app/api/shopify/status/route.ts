import { NextResponse } from "next/server";
import { isShopifyConnected, getShopInfo, validateShopifyToken } from "@/lib/shopify/client";

export async function GET() {
  try {
    const hasToken = await isShopifyConnected();
    if (!hasToken) {
      return NextResponse.json({ connected: false, shop: null });
    }

    // Validate the token actually works against the Shopify API
    const shopName = await validateShopifyToken();
    if (!shopName) {
      return NextResponse.json({
        connected: false,
        shop: null,
        error: "Token exists but is invalid or expired",
      });
    }

    const shop = await getShopInfo();
    return NextResponse.json({ connected: true, shop: shop || shopName });
  } catch (error) {
    console.error("Shopify status check error:", error);
    return NextResponse.json({ connected: false, shop: null });
  }
}

import { NextResponse } from "next/server";
import { isShopifyConnected, getShopInfo } from "@/lib/shopify/client";

export async function GET() {
  try {
    const connected = await isShopifyConnected();
    const shop = connected ? await getShopInfo() : null;

    return NextResponse.json({
      connected,
      shop,
    });
  } catch (error) {
    console.error("Shopify status check error:", error);
    return NextResponse.json({
      connected: false,
      shop: null,
    });
  }
}

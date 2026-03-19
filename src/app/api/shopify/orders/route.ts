import { NextRequest, NextResponse } from "next/server";
import {
  isShopifyConnected,
  getOrders,
} from "@/lib/shopify/client";
import { transformRawOrders } from "@/lib/shopify/transform";

export async function GET(request: NextRequest) {
  const connected = await isShopifyConnected();

  if (!connected) {
    return NextResponse.json(
      { error: "Shopify is not connected", orders: [] },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(request.url);
  const dateMin = searchParams.get("date_min") || undefined;
  const dateMax = searchParams.get("date_max") || undefined;
  const limit = searchParams.get("limit") || "50";

  try {
    const rawOrders = await getOrders({
      created_at_min: dateMin,
      created_at_max: dateMax,
      limit,
      status: "any",
    });

    const orders = transformRawOrders(rawOrders);

    return NextResponse.json({
      orders,
      count: orders.length,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Shopify orders API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Shopify orders", orders: [] },
      { status: 500 }
    );
  }
}

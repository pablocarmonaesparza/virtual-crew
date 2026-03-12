import { NextRequest, NextResponse } from "next/server";
import { MOCK_FORECAST_TABLE, MOCK_SKU_TABLE } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level") || "overall";
  const channel = searchParams.get("channel") || "all";
  const category = searchParams.get("category") || "all";

  if (level === "sku") {
    let data = MOCK_SKU_TABLE;
    if (category !== "all") {
      data = data.filter((s) => s.category === category);
    }
    return NextResponse.json({ data, level: "sku" });
  }

  return NextResponse.json({ data: MOCK_FORECAST_TABLE, level: "overall" });
}

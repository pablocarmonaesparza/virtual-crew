import { NextRequest, NextResponse } from "next/server";
import { getForecastData, getSKUData } from "@/lib/data/service";
import type { DashboardFilters } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level") || "overall";
  const channel = (searchParams.get("channel") || "all") as DashboardFilters["channel"];
  const category = (searchParams.get("category") || "all") as DashboardFilters["category"];
  const selectedMonth = searchParams.get("month") || undefined;
  const timeRange = (searchParams.get("timeRange") || "6m") as DashboardFilters["timeRange"];

  const filters: Partial<DashboardFilters> = {
    channel,
    category,
    timeRange,
    ...(selectedMonth ? { selectedMonth } : {}),
  };

  try {
    if (level === "sku") {
      const data = await getSKUData(filters);
      return NextResponse.json({ data, level: "sku" });
    }

    const data = await getForecastData(filters);
    return NextResponse.json({ data, level: "overall" });
  } catch (error) {
    console.error("Forecast API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch forecast data" },
      { status: 500 }
    );
  }
}

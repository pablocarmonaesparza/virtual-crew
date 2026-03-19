import { NextRequest, NextResponse } from "next/server";
import { getSKUData } from "@/lib/data/service";
import { getMonthsForTimeRange } from "@/lib/utils/filters";
import type { DashboardFilters } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const selectedMonth = searchParams.get("month") || "2026-03";
  const timeRange = (searchParams.get("timeRange") || "6m") as DashboardFilters["timeRange"];
  const category = (searchParams.get("category") || "all") as DashboardFilters["category"];
  const channel = (searchParams.get("channel") || "all") as DashboardFilters["channel"];

  const filters: Partial<DashboardFilters> = {
    selectedMonth,
    timeRange,
    category,
    channel,
  };

  try {
    const rows = await getSKUData(filters);
    const months = getMonthsForTimeRange(selectedMonth, timeRange);

    return NextResponse.json({ rows, months });
  } catch (error) {
    console.error("Inventory API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory data" },
      { status: 500 }
    );
  }
}

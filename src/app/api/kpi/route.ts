import { NextRequest, NextResponse } from "next/server";
import { getKPIData } from "@/lib/data/service";
import type { DashboardFilters } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const selectedMonth = searchParams.get("month") || undefined;
  const channel = (searchParams.get("channel") || "all") as DashboardFilters["channel"];
  const adsPlatform = (searchParams.get("platform") || "all") as DashboardFilters["adsPlatform"];
  const timeRange = (searchParams.get("timeRange") || "6m") as DashboardFilters["timeRange"];

  const filters: Partial<DashboardFilters> = {
    channel,
    adsPlatform,
    timeRange,
    ...(selectedMonth ? { selectedMonth } : {}),
  };

  try {
    const kpi = await getKPIData(filters);

    // Map from internal KPIData shape to the shape KPIBar.tsx expects
    return NextResponse.json({
      totalRevenue: kpi.total_revenue,
      revenueMom: kpi.revenue_mom_change,
      forecastAccuracy: kpi.forecast_accuracy,
      accuracyMom: kpi.accuracy_mom_change,
      totalAdSpend: kpi.total_ad_spend,
      adSpendMom: kpi.ad_spend_mom_change,
      averageCAC: kpi.average_cac,
      cacMom: kpi.cac_mom_change,
      gapBaseline: kpi.gap_to_baseline,
      gapAmbitious: kpi.gap_to_ambitious,
    });
  } catch (error) {
    console.error("KPI API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch KPI data" },
      { status: 500 }
    );
  }
}

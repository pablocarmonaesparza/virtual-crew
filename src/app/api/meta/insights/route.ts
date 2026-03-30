import { NextRequest, NextResponse } from "next/server";
import { getMonthlyInsights, getCampaignInsights, isMetaConnected } from "@/lib/meta/client";
import { transformMetaToAdSpendRows, getMetaKPISummary } from "@/lib/meta/transform";

export async function GET(request: NextRequest) {
  try {
    const connected = await isMetaConnected();
    if (!connected) {
      return NextResponse.json(
        { error: "Meta Ads API not connected or account inactive" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") || "account"; // "account" or "campaign"

    // Support month + timeRange filters from dashboard
    const month = searchParams.get("month");
    const timeRange = searchParams.get("timeRange") || "6m";
    let since: string;
    let until: string;

    if (month && searchParams.has("month")) {
      // Compute date range from month + timeRange
      const [y, m] = month.split("-").map(Number);
      const rangeMonths = timeRange === "3m" ? 3 : timeRange === "12m" ? 12 : timeRange === "ytd" ? m : 6;
      const startDate = new Date(y, m - rangeMonths, 1);
      const endDate = new Date(y, m, 0); // last day of selected month
      since = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-01`;
      until = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    } else {
      since = searchParams.get("since") || getDefaultSince();
      until = searchParams.get("until") || getDefaultUntil();
    }

    if (level === "campaign") {
      const campaigns = await getCampaignInsights(since, until);
      return NextResponse.json({
        source: "meta_ads_api",
        level: "campaign",
        date_range: { since, until },
        data: campaigns,
      });
    }

    const insights = await getMonthlyInsights(since, until);
    const adSpendRows = transformMetaToAdSpendRows(insights);
    const kpiSummary = getMetaKPISummary(insights);

    return NextResponse.json({
      source: "meta_ads_api",
      level: "account",
      date_range: { since, until },
      insights,
      ad_spend_rows: adSpendRows,
      kpi_summary: kpiSummary,
    });
  } catch (error) {
    console.error("Meta insights API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Meta insights" },
      { status: 500 }
    );
  }
}

function getDefaultSince(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getDefaultUntil(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

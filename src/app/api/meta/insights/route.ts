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
    const since = searchParams.get("since") || getDefaultSince();
    const until = searchParams.get("until") || getDefaultUntil();
    const level = searchParams.get("level") || "account"; // "account" or "campaign"

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

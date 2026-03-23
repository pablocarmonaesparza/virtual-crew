/**
 * Meta (Facebook) Ads API Client
 *
 * Uses the Marketing API v21.0 to fetch ad account insights.
 * Token is a long-lived token (~60 days) stored in META_ACCESS_TOKEN env var.
 * Ad Account ID is stored in META_AD_ACCOUNT_ID env var.
 */

const META_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaInsightsRow {
  spend: string;
  impressions: string;
  clicks: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
  ctr: string;
  cpc: string;
  cpm: string;
  date_start: string;
  date_stop: string;
}

interface MetaInsightsResponse {
  data: MetaInsightsRow[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

export interface MetaMonthlyInsight {
  month: string; // YYYY-MM
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchase_value: number;
  add_to_cart: number;
  landing_page_views: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cac: number; // spend / purchases
  roas: number; // purchase_value / spend
}

interface MetaCampaignInsight extends MetaMonthlyInsight {
  campaign_id: string;
  campaign_name: string;
}

function getCredentials() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    throw new Error("Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID environment variables");
  }

  return { accessToken, adAccountId };
}

/**
 * Check if Meta Ads API is configured and accessible
 */
export async function isMetaConnected(): Promise<boolean> {
  try {
    const { accessToken, adAccountId } = getCredentials();
    const url = `${BASE_URL}/${adAccountId}?fields=id,name,account_status&access_token=${accessToken}`;
    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
    if (!res.ok) return false;
    const data = await res.json();
    return data.account_status === 1; // 1 = ACTIVE
  } catch {
    return false;
  }
}

/**
 * Fetch monthly ad spend insights from Meta Ads API
 */
export async function getMonthlyInsights(
  since: string, // YYYY-MM-DD
  until: string  // YYYY-MM-DD
): Promise<MetaMonthlyInsight[]> {
  const { accessToken, adAccountId } = getCredentials();

  const params = new URLSearchParams({
    fields: "spend,impressions,clicks,actions,action_values,ctr,cpc,cpm",
    time_range: JSON.stringify({ since, until }),
    time_increment: "monthly",
    access_token: accessToken,
  });

  const url = `${BASE_URL}/${adAccountId}/insights?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 600 } }); // cache 10 min

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error("Meta Ads API error:", error);
    throw new Error(`Meta Ads API error: ${res.status} ${res.statusText}`);
  }

  const response: MetaInsightsResponse = await res.json();
  return response.data.map(parseInsightsRow);
}

/**
 * Fetch campaign-level insights (for detailed breakdown)
 */
export async function getCampaignInsights(
  since: string,
  until: string,
  limit = 50
): Promise<MetaCampaignInsight[]> {
  const { accessToken, adAccountId } = getCredentials();

  const params = new URLSearchParams({
    fields: "campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,ctr,cpc,cpm",
    time_range: JSON.stringify({ since, until }),
    time_increment: "monthly",
    level: "campaign",
    limit: String(limit),
    access_token: accessToken,
  });

  const url = `${BASE_URL}/${adAccountId}/insights?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 600 } });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error("Meta Ads API campaign error:", error);
    throw new Error(`Meta Ads API error: ${res.status}`);
  }

  const response = await res.json();
  return response.data.map((row: MetaInsightsRow & { campaign_id: string; campaign_name: string }) => ({
    ...parseInsightsRow(row),
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
  }));
}

/**
 * Parse a raw Meta insights row into our typed format
 */
function parseInsightsRow(row: MetaInsightsRow): MetaMonthlyInsight {
  const spend = parseFloat(row.spend) || 0;
  const impressions = parseInt(row.impressions) || 0;
  const clicks = parseInt(row.clicks) || 0;
  const ctr = parseFloat(row.ctr) || 0;
  const cpc = parseFloat(row.cpc) || 0;
  const cpm = parseFloat(row.cpm) || 0;

  // Extract specific actions
  let purchases = 0;
  let purchaseValue = 0;
  let addToCart = 0;
  let landingPageViews = 0;

  for (const action of row.actions || []) {
    switch (action.action_type) {
      case "purchase":
      case "omni_purchase":
        purchases = Math.max(purchases, parseInt(action.value) || 0);
        break;
      case "add_to_cart":
      case "omni_add_to_cart":
        addToCart = Math.max(addToCart, parseInt(action.value) || 0);
        break;
      case "landing_page_view":
      case "omni_landing_page_view":
        landingPageViews = Math.max(landingPageViews, parseInt(action.value) || 0);
        break;
    }
  }

  for (const av of row.action_values || []) {
    if (av.action_type === "purchase" || av.action_type === "omni_purchase") {
      purchaseValue = Math.max(purchaseValue, parseFloat(av.value) || 0);
    }
  }

  // Extract month from date_start
  const month = row.date_start.substring(0, 7); // YYYY-MM

  return {
    month,
    spend,
    impressions,
    clicks,
    purchases,
    purchase_value: purchaseValue,
    add_to_cart: addToCart,
    landing_page_views: landingPageViews,
    ctr,
    cpc,
    cpm,
    cac: purchases > 0 ? spend / purchases : 0,
    roas: spend > 0 ? purchaseValue / spend : 0,
  };
}

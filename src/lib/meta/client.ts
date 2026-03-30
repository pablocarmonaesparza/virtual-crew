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

/**
 * Get Meta credentials. Priority:
 * 1. Supabase api_credentials table (OAuth tokens from /api/auth/meta)
 * 2. Environment variables (manual configuration)
 */
async function getCredentialsFromDB(): Promise<{ accessToken: string; adAccountId: string } | null> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    if (!supabase) return null;

    const { data } = await supabase
      .from("api_credentials")
      .select("credential_name, credential_value")
      .eq("platform", "meta_ads")
      .eq("is_active", true);

    if (!data || data.length === 0) return null;

    const creds = Object.fromEntries(data.map((r: { credential_name: string; credential_value: string }) => [r.credential_name, r.credential_value]));
    if (creds.access_token && creds.ad_account_id) {
      return { accessToken: creds.access_token, adAccountId: creds.ad_account_id };
    }
    return null;
  } catch {
    return null;
  }
}

function getCredentials() {
  // Sync fallback: environment variables
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    throw new Error("Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID environment variables");
  }

  return { accessToken, adAccountId };
}

/**
 * Get credentials with Supabase-first priority (async).
 * Falls back to env vars if Supabase has no stored OAuth tokens.
 */
async function getCredentialsAsync() {
  const dbCreds = await getCredentialsFromDB();
  if (dbCreds) return dbCreds;
  return getCredentials();
}

/**
 * Check if Meta Ads API is configured and accessible
 */
export async function isMetaConnected(): Promise<boolean> {
  try {
    const { accessToken, adAccountId } = await getCredentialsAsync();
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
  const { accessToken, adAccountId } = await getCredentialsAsync();

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
  const { accessToken, adAccountId } = await getCredentialsAsync();

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
  const results: MetaCampaignInsight[] = response.data.map(
    (row: MetaInsightsRow & { campaign_id: string; campaign_name: string }) => ({
      ...parseInsightsRow(row),
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
    })
  );

  // Follow pagination
  let nextUrl = response.paging?.next;
  while (nextUrl && results.length < limit) {
    const nextRes = await fetch(nextUrl);
    if (!nextRes.ok) break;
    const nextPage = await nextRes.json();
    for (const row of nextPage.data || []) {
      results.push({
        ...parseInsightsRow(row),
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
      });
    }
    nextUrl = nextPage.paging?.next;
  }

  return results;
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

import { NextResponse } from "next/server";
import { isShopifyConnected, validateShopifyToken } from "@/lib/shopify/client";
import { isMetaConnected } from "@/lib/meta/client";
import { getTableCounts, getApiCredentialsFromDB } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const result: Record<string, unknown> = {};

  // ── Supabase status ──
  try {
    const admin = createAdminClient();
    if (admin) {
      const counts = await getTableCounts();
      result.supabase = {
        connected: true,
        region: "EU West 2 (London)",
        tables: counts,
      };
    } else {
      // Try with anon key — if env vars are set it should work
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      result.supabase = {
        connected: !!url,
        region: url ? "EU West 2 (London)" : null,
        tables: {},
      };
    }
  } catch {
    result.supabase = { connected: false, region: null, tables: {} };
  }

  // ── Shopify status (validates token against API) ──
  try {
    const hasToken = await isShopifyConnected();
    if (hasToken) {
      const shopName = await validateShopifyToken();
      result.shopify = { connected: !!shopName };
    } else {
      result.shopify = { connected: false };
    }
  } catch {
    result.shopify = { connected: false };
  }

  // ── N8N status ──
  const n8nUrl = process.env.N8N_WEBHOOK_URL || "https://pblcrmn.app.n8n.cloud";
  result.n8n = {
    configured: true,
    url: n8nUrl,
  };

  // ── Anthropic ──
  result.anthropic = {
    configured: !!process.env.ANTHROPIC_API_KEY,
  };

  // ── Meta Ads status ──
  try {
    const metaConnected = await isMetaConnected();
    result.meta_ads = {
      connected: metaConnected,
      ad_account_id: process.env.META_AD_ACCOUNT_ID || null,
    };
  } catch {
    result.meta_ads = { connected: false };
  }

  // ── API credentials from Supabase ──
  try {
    const credentials = await getApiCredentialsFromDB();
    const platforms = new Set(credentials.filter((c) => c.is_active).map((c) => c.platform));

    result.amazon_sp = {
      configured: platforms.has("amazon_sp"),
    };
    result.amazon_ads = {
      configured: platforms.has("amazon_ads"),
    };
  } catch {
    result.amazon_sp = { configured: false };
    result.amazon_ads = { configured: false };
  }

  return NextResponse.json(result);
}

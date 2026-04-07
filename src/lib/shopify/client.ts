import { promises as fs } from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";

const API_VERSION = "2026-01";

interface ShopifyTokenData {
  access_token: string;
  scope: string;
  shop: string;
  created_at: string;
}

interface ShopifyRequestOptions {
  endpoint: string;
  params?: Record<string, string>;
}

// ── Shopify raw response types ──

export interface ShopifyRawOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  financial_status: string;
  customer: {
    id: number;
    orders_count: number;
    email: string;
  } | null;
  line_items: ShopifyRawLineItem[];
  tags: string;
}

export interface ShopifyRawLineItem {
  id: number;
  product_id: number;
  variant_id: number;
  title: string;
  sku: string;
  quantity: number;
  price: string;
  total_discount: string;
}

export interface ShopifyRawProduct {
  id: number;
  title: string;
  product_type: string;
  status: string;
  variants: {
    id: number;
    sku: string;
    price: string;
    inventory_quantity: number;
    title: string;
  }[];
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface ShopifyRawCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  total_spent: string;
  created_at: string;
  tags: string;
}

export interface ShopifyRawInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number;
  updated_at: string;
}

// ── Token management ──

async function getTokenFromFile(): Promise<ShopifyTokenData | null> {
  try {
    const tokenFilePath = path.join(process.cwd(), ".shopify-token.json");
    const content = await fs.readFile(tokenFilePath, "utf-8");
    return JSON.parse(content) as ShopifyTokenData;
  } catch {
    return null;
  }
}

function getTokenFromEnv(): string | null {
  return process.env.SHOPIFY_ACCESS_TOKEN || null;
}

async function getTokenFromSupabase(): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("api_credentials")
      .select("credential_value")
      .eq("platform", "shopify")
      .eq("credential_name", "access_token")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (error || !data?.credential_value) return null;
    return data.credential_value as string;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  // Priority order:
  //   1. SHOPIFY_ACCESS_TOKEN env var  — explicit operator override (local dev,
  //                                      emergency rollback, debugging).
  //                                      Note: /api/shopify/connect-token REFUSES
  //                                      to operate when this env var is set,
  //                                      so the UI flow and the env var don't
  //                                      compete in the same environment.
  //   2. Supabase api_credentials      — primary store in production. Updated
  //                                      by OAuth callback AND the manual
  //                                      /api/shopify/connect-token flow.
  //   3. File fallback                 — legacy local dev only.
  const envToken = getTokenFromEnv();
  if (envToken) return envToken;

  const supabaseToken = await getTokenFromSupabase();
  if (supabaseToken) return supabaseToken;

  const fileData = await getTokenFromFile();
  if (fileData?.access_token) return fileData.access_token;

  return null;
}

async function getShopUrl(): Promise<string> {
  // 1. Prefer env variable
  if (process.env.SHOPIFY_STORE_URL) return process.env.SHOPIFY_STORE_URL;

  // 2. Try Supabase api_credentials (matches token storage)
  try {
    const supabase = createAdminClient();
    if (supabase) {
      const { data } = await supabase
        .from("api_credentials")
        .select("credential_value")
        .eq("platform", "shopify")
        .eq("credential_name", "store_url")
        .eq("is_active", true)
        .limit(1)
        .single();
      if (data?.credential_value) return data.credential_value as string;
    }
  } catch {
    // Fall through
  }

  return "";
}

// ── Rate limiter ──
// Shopify allows 2 requests/second for REST API (bucket of 40, leak rate 2/s).
// We use a simple delay-based approach to stay under the limit.

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 520; // ~1.9 req/sec to stay safely under 2/sec

async function rateLimitedFetch(
  url: string,
  options: RequestInit
): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed)
    );
  }
  lastRequestTime = Date.now();

  const response = await fetch(url, options);

  // If we hit the rate limit, wait and retry once
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : 2000;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastRequestTime = Date.now();
    return fetch(url, options);
  }

  return response;
}

// ── Core request function ──

async function shopifyRequest<T>(options: ShopifyRequestOptions): Promise<T> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("No Shopify access token available");
  }

  const shopUrl = await getShopUrl();
  if (!shopUrl) {
    throw new Error("SHOPIFY_STORE_URL is not configured");
  }

  const url = new URL(
    `https://${shopUrl}/admin/api/${API_VERSION}/${options.endpoint}`
  );
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await rateLimitedFetch(url.toString(), {
    method: "GET",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Shopify API error ${response.status}: ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}

// ── Pagination helper ──
// Shopify uses Link-header based cursor pagination.

async function shopifyPaginatedRequest<T extends Record<string, unknown>>(
  options: ShopifyRequestOptions,
  resourceKey: string
): Promise<unknown[]> {
  const allItems: unknown[] = [];
  let nextUrl: string | null = null;

  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("No Shopify access token available");

  const shopUrl = await getShopUrl();
  if (!shopUrl) throw new Error("SHOPIFY_STORE_URL is not configured");

  // First request
  const initialUrl = new URL(
    `https://${shopUrl}/admin/api/${API_VERSION}/${options.endpoint}`
  );
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      initialUrl.searchParams.set(key, value);
    }
  }
  // Set a reasonable limit per page
  if (!initialUrl.searchParams.has("limit")) {
    initialUrl.searchParams.set("limit", "250");
  }

  nextUrl = initialUrl.toString();

  while (nextUrl) {
    const response = await rateLimitedFetch(nextUrl, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Shopify API error ${response.status}: ${errorBody}`
      );
    }

    const data = (await response.json()) as T;
    const items = data[resourceKey] as unknown[];
    if (items && Array.isArray(items)) {
      allItems.push(...items);
    }

    // Parse Link header for next page
    const linkHeader = response.headers.get("Link");
    nextUrl = null;
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        nextUrl = nextMatch[1];
      }
    }
  }

  return allItems;
}

// ── Public API methods ──

export async function isShopifyConnected(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null && token.length > 0;
}

/**
 * Validate the token by making a lightweight API call to Shopify.
 * Returns the shop name if valid, null if invalid/expired.
 */
export async function validateShopifyToken(): Promise<string | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const shopUrl = await getShopUrl();
    if (!shopUrl) return null;

    const url = `https://${shopUrl}/admin/api/${API_VERSION}/shop.json`;
    const res = await rateLimitedFetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.shop?.name ?? shopUrl;
  } catch {
    return null;
  }
}

export async function getShopInfo(): Promise<string | null> {
  const connected = await isShopifyConnected();
  if (!connected) return null;
  return (await getShopUrl()) || null;
}

export async function getOrders(params?: {
  created_at_min?: string;
  created_at_max?: string;
  status?: string;
  limit?: string;
}): Promise<ShopifyRawOrder[]> {
  const requestParams: Record<string, string> = {
    status: params?.status || "any",
    limit: params?.limit || "250",
  };
  if (params?.created_at_min) {
    requestParams.created_at_min = params.created_at_min;
  }
  if (params?.created_at_max) {
    requestParams.created_at_max = params.created_at_max;
  }

  const items = await shopifyPaginatedRequest<{ orders: ShopifyRawOrder[] }>(
    { endpoint: "orders.json", params: requestParams },
    "orders"
  );

  return items as ShopifyRawOrder[];
}

export async function getProducts(
  options: { includeArchived?: boolean } = {}
): Promise<ShopifyRawProduct[]> {
  // Default: include active, archived AND draft so historical sales for
  // archived SKUs map to real product data instead of placeholders.
  // Pass `includeArchived: false` to limit to active only.
  const status = options.includeArchived === false ? "active" : "any";
  const items = await shopifyPaginatedRequest<{
    products: ShopifyRawProduct[];
  }>({ endpoint: "products.json", params: { status } }, "products");

  return items as ShopifyRawProduct[];
}

export async function getCustomers(params?: {
  created_at_min?: string;
  created_at_max?: string;
  limit?: string;
}): Promise<ShopifyRawCustomer[]> {
  const requestParams: Record<string, string> = {
    limit: params?.limit || "250",
  };
  if (params?.created_at_min) {
    requestParams.created_at_min = params.created_at_min;
  }
  if (params?.created_at_max) {
    requestParams.created_at_max = params.created_at_max;
  }

  const items = await shopifyPaginatedRequest<{
    customers: ShopifyRawCustomer[];
  }>({ endpoint: "customers.json", params: requestParams }, "customers");

  return items as ShopifyRawCustomer[];
}

export async function getInventory(): Promise<ShopifyRawInventoryLevel[]> {
  // First get inventory locations
  const locationsData = await shopifyRequest<{
    locations: { id: number }[];
  }>({ endpoint: "locations.json" });

  const allLevels: ShopifyRawInventoryLevel[] = [];

  for (const location of locationsData.locations) {
    const items = await shopifyPaginatedRequest<{
      inventory_levels: ShopifyRawInventoryLevel[];
    }>(
      {
        endpoint: "inventory_levels.json",
        params: { location_ids: location.id.toString() },
      },
      "inventory_levels"
    );
    allLevels.push(...(items as ShopifyRawInventoryLevel[]));
  }

  return allLevels;
}

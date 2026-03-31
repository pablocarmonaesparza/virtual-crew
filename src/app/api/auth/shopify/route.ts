import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Shopify OAuth initiation.
 * Single-tenant: always uses SHOPIFY_STORE_URL env var.
 * No ?shop= override — store is fixed server-side.
 */
export async function GET(_request: NextRequest) {
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  // Single-tenant: always use the configured store — no ?shop= override allowed
  const shopUrl = (process.env.SHOPIFY_STORE_URL || "").trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();

  if (!clientId || !shopUrl) {
    return NextResponse.json(
      { error: "Missing Shopify configuration" },
      { status: 400 }
    );
  }

  // Validate shop URL format
  if (!shopUrl.endsWith(".myshopify.com")) {
    return NextResponse.json(
      { error: "Invalid shop URL. Must be in format: yourstore.myshopify.com" },
      { status: 400 }
    );
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${appUrl}/api/auth/shopify/callback`;
  const scopes = "read_orders,read_products,read_inventory,read_customers";

  const authUrl = new URL(`https://${shopUrl}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", nonce);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("shopify_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  // Store the shop URL in cookie so callback knows which shop to use
  response.cookies.set("shopify_oauth_shop", shopUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}

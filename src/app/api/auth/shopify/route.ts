import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const shopUrl = process.env.SHOPIFY_STORE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId || !shopUrl) {
    return NextResponse.json(
      { error: "Missing Shopify configuration" },
      { status: 500 }
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
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}

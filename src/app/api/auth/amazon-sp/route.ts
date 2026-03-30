import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Amazon SP-API OAuth initiation.
 * Redirects the seller to Amazon Seller Central to authorize the app.
 * Uses Login with Amazon (LWA) for OAuth 2.0.
 */
export async function GET() {
  // application_id is the SP-API app ID (amzn1.sellerapps.app...), NOT the LWA client ID
  const appId = process.env.AMAZON_SP_APP_ID || process.env.AMAZON_SP_LWA_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!appId) {
    return NextResponse.json(
      { error: "Amazon SP-API not configured. Set AMAZON_SP_APP_ID (or AMAZON_SP_LWA_CLIENT_ID)." },
      { status: 400 }
    );
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${appUrl}/api/auth/amazon-sp/callback`;

  // Amazon Seller Central UK authorization URL
  const authUrl = new URL("https://sellercentral.amazon.co.uk/apps/authorize/consent");
  authUrl.searchParams.set("application_id", appId);
  authUrl.searchParams.set("state", nonce);
  authUrl.searchParams.set("redirect_uri", redirectUri);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("amazon_sp_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}

import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Amazon Ads API OAuth initiation.
 * Redirects advertiser to Login with Amazon to authorize ad account access.
 */
export async function GET() {
  const clientId = process.env.AMAZON_ADS_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId) {
    return NextResponse.json(
      {
        error: "Amazon Ads API not configured yet",
        detail: "Set AMAZON_ADS_CLIENT_ID and AMAZON_ADS_CLIENT_SECRET from the Amazon Advertising developer console.",
      },
      { status: 400 }
    );
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${appUrl}/api/auth/amazon-ads/callback`;

  // Login with Amazon OAuth URL (UK region)
  const authUrl = new URL("https://www.amazon.co.uk/ap/oa");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "advertising::campaign_management");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", nonce);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("amazon_ads_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}

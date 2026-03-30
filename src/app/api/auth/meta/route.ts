import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Meta (Facebook) Ads OAuth initiation.
 * Redirects the user to Facebook OAuth dialog to authorize ads_read access.
 * Exchanges for a long-lived token in the callback.
 */
export async function GET() {
  const clientId = process.env.META_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId) {
    return NextResponse.json(
      { error: "Meta Ads not configured. Set META_APP_ID environment variable." },
      { status: 400 }
    );
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${appUrl}/api/auth/meta/callback`;

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "ads_read");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", nonce);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("meta_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}

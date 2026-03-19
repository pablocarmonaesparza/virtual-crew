import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shop = searchParams.get("shop");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Verify CSRF state
  const storedState = request.cookies.get("shopify_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json(
      { error: "Invalid state parameter — possible CSRF attack" },
      { status: 403 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 }
    );
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  const shopUrl = shop || process.env.SHOPIFY_STORE_URL;

  if (!clientId || !clientSecret || !shopUrl) {
    return NextResponse.json(
      { error: "Missing Shopify configuration" },
      { status: 500 }
    );
  }

  try {
    // Exchange code for permanent access token
    const tokenResponse = await fetch(
      `https://${shopUrl}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Shopify token exchange failed:", errorText);
      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 500 }
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      scope: string;
    };

    // Store token in JSON file at project root
    const tokenFilePath = path.join(process.cwd(), ".shopify-token.json");
    await fs.writeFile(
      tokenFilePath,
      JSON.stringify(
        {
          access_token: tokenData.access_token,
          scope: tokenData.scope,
          shop: shopUrl,
          created_at: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf-8"
    );

    // Clear the state cookie and redirect to settings
    const redirectUrl = new URL(
      "/dashboard/settings?shopify=connected",
      appUrl
    );
    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete("shopify_oauth_state");

    return response;
  } catch (error) {
    console.error("Shopify OAuth callback error:", error);
    return NextResponse.json(
      { error: "Internal server error during OAuth callback" },
      { status: 500 }
    );
  }
}

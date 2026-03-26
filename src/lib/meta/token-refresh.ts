/**
 * Meta Token Auto-Refresh
 *
 * Long-lived Meta tokens expire after ~60 days.
 * This module exchanges a current long-lived token for a new one.
 * Should be called weekly via Vercel Cron.
 */

const META_API_VERSION = "v21.0";

/**
 * Exchange a current long-lived token for a new long-lived token.
 * Returns the new token or throws on failure.
 */
export async function refreshLongLivedToken(
  currentToken: string,
  appId?: string,
  appSecret?: string
): Promise<{ access_token: string; token_type: string; expires_in?: number }> {
  const metaAppId = appId || process.env.META_APP_ID;
  const metaAppSecret = appSecret || process.env.META_APP_SECRET;

  if (!metaAppId || !metaAppSecret) {
    throw new Error("Missing META_APP_ID or META_APP_SECRET for token refresh");
  }

  const url = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${metaAppId}&` +
    `client_secret=${metaAppSecret}&` +
    `fb_exchange_token=${currentToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Token refresh failed: ${res.status} - ${JSON.stringify(error)}`);
  }

  return res.json();
}

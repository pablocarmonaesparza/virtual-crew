# Shopify Install Link — Agua de Madre

**Generated:** 2026-04-07
**App:** Virtual Crew S&OP (`ef95b074d1842790a1025357839436a9`)
**Target store:** `aguademadre.myshopify.com`
**Distribution type:** Custom Distribution (single click for the merchant)

## The link

```
https://admin.shopify.com/oauth/install_custom_app?client_id=ef95b074d1842790a1025357839436a9&no_redirect=true&signature=eyJleHBpcmVzX2F0IjoxNzc1NTcxNDg2LCJwZXJtYW5lbnRfZG9tYWluIjoiYWd1YWRlbWFkcmUubXlzaG9waWZ5LmNvbSIsImNsaWVudF9pZCI6ImVmOTViMDc0ZDE4NDI3OTBhMTAyNTM1NzgzOTQzNmE5IiwicHVycG9zZSI6ImN1c3RvbV9hcHAiLCJtZXJjaGFudF9vcmdhbml6YXRpb25faWQiOjMxNzYyMjY0fQ%3D%3D--39bd24a63a85424060593c848d1e20eee84d9b4d
```

## Flow when Nicola clicks it
1. Shopify checks she's logged into a Shopify account that has access to `aguademadre.myshopify.com`
2. Shows the consent screen: "Install Virtual Crew S&OP on aguademadre — read_orders, read_products, read_inventory, read_customers"
3. She clicks **Install app**
4. Shopify redirects to `https://virtual-crew.vercel.app/api/auth/shopify/callback?code=…&hmac=…&shop=aguademadre.myshopify.com&state=…`
5. Callback verifies HMAC + state, exchanges code for permanent access token, atomically upserts `access_token`, `store_url`, `scope` into Supabase `api_credentials` table
6. `after()` triggers `/api/shopify/backfill` automatically — first historical sync runs in the background
7. Nicola is redirected to `/dashboard/settings?shopify=connected`
8. Real Shopify data appears in the dashboard within minutes

## WhatsApp message ready to send to Nicola

> Hi Nicola — to connect Agua de Madre's Shopify to the new dashboard, just click this link from a browser where you're logged into your Shopify admin and approve the install. One click, no setup. Thanks!
>
> https://admin.shopify.com/oauth/install_custom_app?client_id=ef95b074d1842790a1025357839436a9&no_redirect=true&signature=eyJleHBpcmVzX2F0IjoxNzc1NTcxNDg2LCJwZXJtYW5lbnRfZG9tYWluIjoiYWd1YWRlbWFkcmUubXlzaG9waWZ5LmNvbSIsImNsaWVudF9pZCI6ImVmOTViMDc0ZDE4NDI3OTBhMTAyNTM1NzgzOTQzNmE5IiwicHVycG9zZSI6ImN1c3RvbV9hcHAiLCJwdXJwb3NlIjoiY3VzdG9tX2FwcCIsIm1lcmNoYW50X29yZ2FuaXphdGlvbl9pZCI6MzE3NjIyNjR9%3D%3D--39bd24a63a85424060593c848d1e20eee84d9b4d

## Verification after she clicks
- Hit `https://virtual-crew.vercel.app/api/status` → expect `shopify.connected: true`
- Open `/dashboard/settings` → "Shopify" card should show the green "Connected" badge
- Open the Forecast / SKU tabs → should populate with real orders within ~5 min of the backfill completing

## Regenerating the link
If the link ever errors out as expired, log into Shopify Partners → Beta AI → Virtual Crew S&OP → Distribución → Distribución personalizada → copy the (auto-refreshed) install link.

# API Access Checklist

This checklist converts the project notes into a practical onboarding reference for the ADM integrations.

## Global communication rule

- Use only `info@virtualcrew.co.uk` for client-facing API requests and credential coordination.

## Shopify Admin API

### Client steps

1. Go to `sutienda.myshopify.com/admin`.
2. Open **Settings -> Apps and sales channels -> Develop apps**.
3. Enable custom app development if it is not already enabled.
4. Create an app named `S&OP Integration`.
5. Add read-only Admin API scopes:
   - `read_orders`
   - `read_products`
   - `read_inventory`
   - `read_locations`
6. Save and install the app.
7. Copy the Admin API access token immediately because Shopify shows it once.

### Data required

- Store URL
- Admin API access token
- Client ID / API key
- Client secret / API secret key

### Verification

- Run a read-only request against `/admin/api/2024-01/orders.json`.

## Amazon SP-API

### Expected flow

1. Register through the Amazon Solution Provider Portal.
2. Send the client an authorisation request.
3. Client authorises the app inside Seller Central.
4. Confirm the correct marketplace and roles.

### Data required

- Marketplace ID
- Seller ID / Merchant ID

### Verification

- Run a read-only request against `/orders/v0/orders`.

## Amazon Ads API

### Expected flow

1. Apply for access at `advertising.amazon.com/about-api`.
2. After approval, send the OAuth authorisation link to the client.
3. Client authorises the relevant advertising profiles.

### Data required

- Advertising account email
- Marketplace / region
- Profile IDs

### Verification

- Run a read-only request against `/v2/profiles`.

## Meta Marketing API

### Client steps

1. Create a Business app in `developers.facebook.com`.
2. Add the Marketing API product.
3. Open Graph API Explorer.
4. Generate an access token with the required scopes.
5. Copy the token and share it through the approved secure channel.

### Required permissions

- `ads_read`
- `ads_management` only if campaign editing becomes necessary

### Data required

- App ID
- App secret
- Access token
- Ad account ID

### Verification

- Run a read-only request against `/act_{AD_ACCOUNT_ID}/insights`.

## Google Workspace

### Expected access model

- Use delegated Google Workspace access for Sheets and Presentations.
- Do not request or store direct client passwords.

### Data required

- Shared documents list
- Historical spreadsheet locations
- Access confirmation for the operations team

## Operational readiness checklist

- [ ] Secure channel confirmed
- [ ] Credentials received and stored in a vault
- [ ] Environment variables configured
- [ ] Verification call completed
- [ ] Source ownership documented
- [ ] Expiry or refresh requirements recorded

# Shopify Connection — Instructions for Nicola

## What we need

An **Admin API access token** from your Shopify store. This lets our dashboard read your products, orders, inventory, and customer data (read-only — we never modify anything).

## Steps (5 minutes)

### 1. Go to your Shopify admin
Open: **https://admin.shopify.com/store/aguademadre/settings/apps/development**

### 2. Enable custom app development (one-time)
- Click **"Allow custom app development"**
- On the confirmation page, click **"Allow custom app development"** again

### 3. Create the app
- Click **"Create an app"**
- Name it: **Virtual Crew Dashboard**
- Click **"Create app"**

### 4. Configure API permissions
- Click the **"Configuration"** tab
- Under "Admin API integration", click **"Configure"**
- Check these 4 boxes:
  - `read_customers`
  - `read_inventory`
  - `read_orders`
  - `read_products`
- Click **"Save"**

### 5. Install the app
- Go back to the **"Overview"** tab
- Click **"Install app"** (green button, top right)
- Confirm by clicking **"Install"**

### 6. Copy the token
- Go to the **"API credentials"** tab
- Under "Admin API access token", click **"Reveal token once"**
- **IMPORTANT:** Copy the token immediately — it starts with `shpat_` and Shopify only shows it once
- Send the token to Pablo

That's it! Once we have the token, the dashboard will show your real Shopify data within minutes.

# Shopify merchant setup

Use Shopify's OAuth installation flow for merchant onboarding. Do not ask a
merchant to copy or send an Admin API access token through email, chat, a ticket,
or a repository.

## Merchant-facing steps

1. Open the fresh custom-distribution link sent through the approved private
   channel.
2. Confirm the expected app, store, and read-only scopes on Shopify's consent
   screen.
3. Select **Install app**.
4. Return to the application's settings page and confirm that Shopify reports
   the connection as active.

## Operator checks

- Generate the link immediately before the handoff and confirm its expiry.
- Confirm that the callback uses state and HMAC validation.
- Store the resulting access token only in the production secret store.
- Review Shopify activity if an installation link was ever posted publicly.

For client-specific local notes, use `SHOPIFY_MERCHANT_SETUP.md`; that filename
is ignored by Git.

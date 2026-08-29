# Shopify custom install link

Generated Shopify custom-distribution links are credentials and must not be
committed, pasted into tickets, or stored in shared documentation.

## Safe process

1. Generate a fresh link in Shopify Partners immediately before installation.
2. Send it to the authorized merchant through an approved private channel.
3. Confirm the expected store, scopes, callback domain, and expiry before use.
4. Verify the connection from the application settings after installation.
5. Let the link expire and remove it from local notes when no longer needed.

## Local-only note

If a temporary local handoff document is required, save it as
`SHOPIFY_INSTALL_LINK.md`. That filename is ignored by Git.

Never include the signed install URL, OAuth callback parameters, access tokens,
merchant contact details, or production database values in this repository.

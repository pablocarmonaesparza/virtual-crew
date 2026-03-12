# Security and Data Protection

## Non-negotiable constraints

These rules come from the March 2026 meetings and must shape every implementation decision:

- Martin rejected the use of third-party APIs for moving ADM data.
- Gmail must not be used for credential exchange or client communication.
- The only approved email for API and credential coordination is `info@virtualcrew.co.uk`.
- Credentials must never be shared through personal email, WhatsApp, or chat.
- Google and Microsoft access must use delegate features only, never direct password sharing.

## Approved handling patterns

### Credential storage

- Store API tokens in environment variables, not in source code.
- Keep a secure credential inventory with:
  - system name
  - owner
  - date received
  - expiry date
  - rotation status
- Use a secure vault such as 1Password or Bitwarden, or a restricted-access document only if vault access is not available.

### Data storage

- Supabase is the approved central database for synced operational data.
- Only the minimum required data should be stored for reporting, forecasting, and auditability.
- Source system identifiers should be preserved to support traceability and re-sync logic.

### Access verification

- Verify every new credential with a read-only API call before enabling scheduled workflows.
- Use least-privilege scopes:
  - Shopify: read-only scopes for orders, products, inventory, and locations
  - Amazon SP-API: orders and inventory roles only
  - Meta Marketing API: `ads_read` unless `ads_management` becomes necessary

## Prohibited practices

- No hardcoded secrets in repository files.
- No production data copied into screenshots committed to git.
- No forwarding credentials from `info@virtualcrew.co.uk` to personal inboxes.
- No unapproved middleware used to bridge platform data.

## Implementation implications

- n8n credentials must be stored in the platform credential store rather than inline in nodes.
- Vercel and Supabase environment variables should be scoped per deployment environment.
- Logging must exclude secrets and redact tokens.
- Error notifications should include operational context but not payload data with sensitive identifiers when avoidable.

## Pre-launch checklist

- [ ] Confirm secure receipt channel for each API credential
- [ ] Add environment variables to deployment targets
- [ ] Validate read-only access against each source system
- [ ] Confirm data retention expectations with EXL/ADM
- [ ] Document token rotation expectations
- [ ] Review Supabase policies before introducing additional internal users

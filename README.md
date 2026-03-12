# ADM S&OP Platform Foundation

Repository foundation for the Agua de Madre (ADM) Sales and Operations Planning platform commissioned by VirtualCrew Ltd for EXL Partners.

## Current scope

This repository now contains the first implementation slice derived from the March 2026 project notes:

- project documentation and delivery roadmap
- security and API onboarding guidance
- an initial Supabase schema migration
- a deterministic Python forecasting module

The production portal, workflow automation, and hosted integrations are still pending implementation.

## Repository structure

```text
.
|-- .cursorrules
|-- docs/
|   |-- adm-implementation-roadmap.md
|   |-- api-access-checklist.md
|   `-- security-and-data-protection.md
|-- pyproject.toml
|-- src/
|   `-- adm_sop/
|       |-- __init__.py
|       `-- forecasting.py
|-- supabase/
|   `-- migrations/
|       `-- 0001_initial_schema.sql
`-- tests/
    `-- test_forecasting.py
```

## Quick start

Python 3.11+ is recommended.

```bash
python3 -m unittest discover -s tests -v
```

## Project priorities captured in this repo

1. Respect strict data protection constraints.
2. Model the Supabase schema for sales, inventory, ads, forecasting, and recommendations.
3. Encode the agreed deterministic forecasting formula before adding AI-driven features.
4. Keep the dashboard implementation aligned with the approved EXL white-theme design direction.

## Key documents

- `docs/security-and-data-protection.md`
- `docs/api-access-checklist.md`
- `docs/adm-implementation-roadmap.md`
- `supabase/migrations/0001_initial_schema.sql`

## Next implementation milestones

1. Scaffold the portal frontend and data access layer.
2. Build API ingestion workflows for Shopify, Amazon Seller Central, Meta Ads, and Amazon Ads.
3. Connect Supabase storage to daily sync workflows.
4. Expose forecast outputs and recommendations through the dashboard.

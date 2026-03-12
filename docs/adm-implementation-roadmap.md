# ADM S&OP Implementation Roadmap

## Objective

Build the first production version of the Agua de Madre Sales and Operations Planning platform with:

- secure first-party data ingestion
- Supabase-backed operational storage
- deterministic demand forecasting
- LLM-generated operational recommendations
- a web dashboard deployable to Vercel

## What is implemented in this repository today

- Cursor development rules for the project
- security and API onboarding documentation
- an initial Supabase schema migration
- a Python forecasting module with tests

## Delivery phases

### Phase 0: Access and environment readiness

- Secure receipt of source-system credentials
- Supabase project creation
- Vercel project creation
- n8n environment setup
- Environment variable management

### Phase 1: Data model

- Create master SKU catalog
- Store Shopify and Amazon orders
- Snapshot Shopify and Amazon inventory
- Track Meta and Amazon Ads performance
- Persist forecast outputs, recommendation history, and planning targets

### Phase 2: Automation workflows

Four workflows are planned:

1. Shopify daily sync
2. Amazon Seller Central daily sync
3. Ads daily sync for Meta and Amazon Ads
4. Forecast generation and recommendation generation

### Phase 3: Portal delivery

- White EXL-branded dashboard theme
- KPI top rail
- Forecast, ads, CAC, and recommendation views
- CSV and PDF export
- Embedded data chatbot

### Phase 4: Production planning logic

- Map forecast outputs to production runs
- Incorporate lead times
- Enforce capacity constraints once provided by ADM

## Open blockers

| Blocker | Owner | Status |
| --- | --- | --- |
| 20 months of historical data | Yatin | Pending |
| Lead times by SKU and month | Martin / Leon / ADM | Pending |
| Production max capacity | ADM | Pending |
| Ambitious output format | Martin | Pending |
| Amazon and Shopify portal access | Martin / Yatin | Pending |
| Meta SKU attribution approach | Pablo / VirtualCrew | Pending |
| EXL logo PNG | Yatin | Pending |

## Immediate next build steps

1. Load the initial schema into Supabase.
2. Finalise a mock dataset for dashboard development.
3. Scaffold the frontend shell that matches the approved design system.
4. Build Shopify and Amazon ingestion workflows against sandbox or test credentials.
5. Define the first ad-spend uplift calibration method with stakeholders.

## Definition of done for the next milestone

The next milestone should be considered complete when:

- the database schema is deployed
- at least one daily ingestion workflow writes real data into Supabase
- the dashboard reads from Supabase rather than static mocks
- forecast outputs are persisted with versioned records
- a documented security procedure exists for every credentialed integration

# S&OP Dashboard — Agua de Madre

**Sales & Operations Planning Platform** by EXL Partners

A comprehensive dashboard for Agua de Madre (ADM) that provides real-time sales forecasting, ad spend tracking, customer acquisition analysis, and AI-powered recommendations.

> **Full technical documentation:** [DOCUMENTATION.md](./DOCUMENTATION.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) |
| State | Zustand + TanStack Query |
| AI | Claude Sonnet 4.6 (Anthropic API) |
| Automation | N8N (external workflows) |
| Hosting | Vercel |

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Fill in your Supabase and Anthropic API keys

# Run development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── app/
│   ├── dashboard/          # Main dashboard page
│   └── api/                # API routes (chat, forecast, recommendations)
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── charts/             # Recharts visualizations
│   ├── tables/             # Data tables with sort/filter/export
│   ├── kpi/                # KPI card components
│   ├── filters/            # Filter bar
│   ├── chat/               # AI chatbot panel
│   ├── recommendations/    # LLM recommendations panel
│   └── layout/             # Header, Providers
├── lib/
│   ├── supabase/           # Supabase client
│   ├── forecast/           # Deterministic forecasting engine
│   ├── utils/              # Formatters, CSV export
│   └── mock-data.ts        # Realistic mock data for development
├── types/                  # TypeScript interfaces
├── stores/                 # Zustand stores
supabase/
└── migrations/             # SQL migration files
```

## Dashboard Features

### KPI Bar
Five key metrics always visible: Total Revenue, Forecast Accuracy, Ad Spend, Avg CAC, Gap to Baseline.

### Forecast Tab
- Line chart: Forecast Baseline vs Ambitious vs Actual
- Table with sorting, accuracy badges, MoM trends

### SKU Detail Tab
- Per-SKU breakdown with conditional formatting (green/red)
- Pagination for 30+ SKUs

### Ad Spend Tab
- Grouped bar chart: Meta + Amazon actual vs budget
- Table with variance calculations

### CAC Tab
- Stacked area chart: New vs Returning customers
- Dual-axis chart: CAC trend vs New Customer count
- Detailed CAC table by channel

### AI Insights Tab
- Executive summary, trends, anomalies
- Prioritized actionable recommendations
- Baseline and ambitious plan comparisons

### Chatbot
- Floating chat panel powered by Claude
- Context-aware responses about S&OP data
- Suggested queries for quick access

## Design System

- **Theme:** White background with EXL Partners Dark Blue (#1a2b4a) accents
- **Fonts:** Lora (headings), Inter (body/data)
- **Colors:** Green (positive), Red (negative), Amber (warning)
- **Currency:** GBP (£) — UK format

## Database Schema

Run the migration in Supabase SQL editor:

```bash
# Apply to Supabase
supabase/migrations/001_initial_schema.sql
```

13 tables covering: SKUs, Shopify/Amazon orders, inventory, Meta/Amazon ads, forecasts, customer metrics, production plans, LLM recommendations, and ambitious targets.

## Forecasting Engine

Deterministic formula (no AI/ML):

```
Forecast = Baseline × Seasonality × Marketing Uplift × Price Impact × Channel Effects
```

- **Baseline:** 8-week moving average or exponential smoothing
- **Seasonality:** UK seasonal patterns (tea in winter, drinks in summer)
- **Marketing Uplift:** Ad spend elasticity
- **Price Impact:** Price change elasticity
- **Channel Effects:** Conversion rate adjustments

## Environment Variables

| Variable | Description |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |

## Security Notes

- No third-party APIs beyond Supabase and Anthropic
- No Gmail for credential sharing
- All secrets in environment variables, never hardcoded
- Communication only via `info@virtualcrew.co.uk`

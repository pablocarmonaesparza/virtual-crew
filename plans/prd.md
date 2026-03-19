# S&OP Dashboard — PRD (Ralph Wiggum Loop)

## Project Context
ADM S&OP Dashboard for Agua de Madre / Flor de Madre (UK health drinks brand).
Next.js 16 + React 19 + TypeScript 5 + Tailwind 4 + Zustand 5 + Recharts 3 + Supabase.
Data fallback chain: Supabase → Shopify → Mock data.

---

## Phase 1: Critical Bugs (Data Pipeline Broken)

### Task 1.1 — Fix live data field mismatches
- [ ] `ForecastTable.tsx` expects `liveForecast.rows` but `/api/forecast` returns `{ data: [...] }` → fix field name
- [ ] `KPIBar.tsx` expects `liveKPI.totalRevenue` from `/api/shopify/orders?summary=true` but that route returns raw orders → create `/api/kpi` route OR add summary logic to orders route
- [ ] `SKUTable.tsx` fetches from `/api/shopify/inventory` which does NOT exist (404) → create the route using `getProducts()` + `getOrders()` from Shopify client

### Task 1.2 — Fix customerType filter (wired in UI but never applied)
- [ ] `customerType` filter exists in FilterBar and store but NO table/chart uses it
- [ ] Wire it to `NewVsRepeatChart.tsx` to filter by new/returning
- [ ] Wire it to `CACTable.tsx` to show only new or returning CAC

### Task 1.3 — Expose timeRange filter in UI
- [ ] `timeRange` exists in store (defaults "6m") but FilterBar never shows it
- [ ] Add a time range selector (3m / 6m / 12m / YTD) to FilterBar
- [ ] Verify all tables and charts respond to timeRange changes

---

## Phase 2: Security & Auth

### Task 2.1 — Add auth middleware
- [ ] Create `src/middleware.ts` protecting `/dashboard/*` and `/api/*` (except `/api/auth/*`)
- [ ] Redirect unauthenticated users to `/login`
- [ ] Verify Supabase session cookie is checked

### Task 2.2 — Add logout button
- [ ] Add logout option in sidebar (bottom) and/or header
- [ ] Call `supabase.auth.signOut()` and redirect to `/login`

### Task 2.3 — Add error boundaries
- [ ] Create `src/app/error.tsx` global error boundary
- [ ] Create `src/app/not-found.tsx` custom 404 page
- [ ] Create `src/app/dashboard/error.tsx` dashboard-specific error boundary

---

## Phase 3: Dark Mode & Visual Consistency

### Task 3.1 — Fix login page dark mode
- [ ] Replace ALL hardcoded `bg-white`, `text-gray-*`, `border-gray-*` with semantic tokens
- [ ] Test login page in both light and dark mode

### Task 3.2 — Replace hardcoded brand color `#1a2b4a`
- [ ] Search for ALL instances of `#1a2b4a` and `bg-[#1a2b4a]`
- [ ] Replace with `bg-primary` / `text-primary` / `border-primary` CSS variable classes
- [ ] Locations: Login, Sidebar logo, Header Run Analysis, ChatPanel bot icon/user messages/send button

### Task 3.3 — Fix dark mode on remaining components
- [ ] `DataSourceIndicator.tsx` — add `dark:` variants for green/muted states
- [ ] `Settings page SyncLogRow` — add dark variants for status badges
- [ ] `Sidebar.tsx` and `Header.tsx` — use `bg-card` instead of `bg-white dark:bg-card`
- [ ] `SKU modal` — verify all colors work in dark mode
- [ ] Chart tooltip backgrounds — verify visibility on dark backgrounds
- [ ] `brandLight` color `rgba(26,43,74,0.4)` — check visibility on dark backgrounds

### Task 3.4 — Remove all black borders/outlines (user feedback)
- [ ] Audit ALL components for `border-black`, `border-gray-900`, `ring-black`, `outline-black`
- [ ] Replace with `border-border` (uses CSS variable that adapts to light/dark)
- [ ] Cards, tables, modals, buttons — all should use subtle `border-border` only

---

## Phase 4: UX Polish

### Task 4.1 — Empty states for filtered data
- [ ] When filters produce zero rows in ANY table, show a friendly "No data matches your filters" message
- [ ] When charts have no data, show a centered empty state instead of blank space

### Task 4.2 — Wire PDF export
- [ ] `lib/utils/pdf.ts` exists but is unused → add "Export PDF" button next to CSV buttons
- [ ] Add PDF export to Forecast tab (captures chart + table)

### Task 4.3 — Settings page functional buttons
- [ ] "Export CSV" button on Settings → wire onClick to export sync logs as CSV
- [ ] "Configure" buttons on Amazon/Meta cards → show instructions modal (what OAuth steps are needed)

### Task 4.4 — Toast/notification system
- [ ] Add a simple toast component (success/error/info)
- [ ] Show toast on: successful CSV export, Run Analysis complete, filter reset, Shopify connection success
- [ ] Replace the animated banner in Settings with a toast

---

## Phase 5: Code Cleanup

### Task 5.1 — Remove duplicate cn() functions
- [ ] `Header.tsx` defines local `cn()` → import from `@/lib/utils/cn`
- [ ] `Settings page` defines local `cn()` → import from `@/lib/utils/cn`

### Task 5.2 — Remove unused dependencies
- [ ] `@anthropic-ai/sdk` — using raw fetch instead → remove from package.json
- [ ] `react-hook-form` + `@hookform/resolvers` + `zod` — never imported → remove
- [ ] `@radix-ui/react-accordion`, `@radix-ui/react-dialog`, `@radix-ui/react-popover` — never imported → remove
- [ ] `@tanstack/react-table` — tables are hand-rolled → remove
- [ ] Run `npm prune` after cleanup

### Task 5.3 — Wire the forecast engine
- [ ] `lib/forecast/engine.ts` is well-written but completely unused
- [ ] Use it in the Recommendations API to provide data-driven forecasts
- [ ] OR use it in the dashboard when Supabase/Shopify have no forecast data

---

## Phase 6: Testing & Feedback Loops

### Task 6.1 — Set up Vitest
- [ ] Install vitest + @testing-library/react + @testing-library/jest-dom
- [ ] Create `vitest.config.ts`
- [ ] Add `"test"` script to package.json

### Task 6.2 — Critical path tests
- [ ] Test data service fallback chain (Supabase → Shopify → Mock)
- [ ] Test filter utils (filterForecastByTimeRange, filterSKUByCategory, etc.)
- [ ] Test format utils (formatCurrency, formatPercent, etc.)
- [ ] Test Shopify transform functions
- [ ] Test forecast engine calculations

### Task 6.3 — Build verification
- [ ] `npm run build` must pass with zero errors
- [ ] `npx tsc --noEmit` must pass with zero type errors
- [ ] All tests must pass

---

## Success Criteria
- [ ] All Phase 1-5 tasks complete
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] All tests in Phase 6 pass
- [ ] Dark mode works on every page without hardcoded colors
- [ ] All filters actually filter data in tables AND charts
- [ ] Live data pipeline works when Shopify is connected
- [ ] No unused dependencies in package.json

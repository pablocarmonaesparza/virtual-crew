# S&OP Dashboard — PRD (Ralph Wiggum Loop)

## Project Context
ADM S&OP Dashboard for Agua de Madre / Flor de Madre (UK health drinks brand).
Next.js 16 + React 19 + TypeScript 5 + Tailwind 4 + Zustand 5 + Recharts 3 + Supabase.
Data fallback chain: Supabase → Shopify → Mock data.

---

## Phase 1: Critical Bugs (Data Pipeline Broken) ✅ COMPLETE

### Task 1.1 — Fix live data field mismatches
- [x] `ForecastTable.tsx` expects `liveForecast.rows` but `/api/forecast` returns `{ data: [...] }` → fix field name
- [x] `KPIBar.tsx` expects `liveKPI.totalRevenue` from `/api/shopify/orders?summary=true` but that route returns raw orders → create `/api/kpi` route OR add summary logic to orders route
- [x] `SKUTable.tsx` fetches from `/api/shopify/inventory` which does NOT exist (404) → create the route using `getProducts()` + `getOrders()` from Shopify client

### Task 1.2 — Fix customerType filter (wired in UI but never applied)
- [x] `customerType` filter exists in FilterBar and store but NO table/chart uses it
- [x] Wire it to `NewVsRepeatChart.tsx` to filter by new/returning
- [x] Wire it to `CACTable.tsx` to show only new or returning CAC

### Task 1.3 — Expose timeRange filter in UI
- [x] `timeRange` exists in store (defaults "6m") but FilterBar never shows it
- [x] Add a time range selector (3m / 6m / 12m / YTD) to FilterBar
- [x] Verify all tables and charts respond to timeRange changes

---

## Phase 2: Security & Auth ✅ COMPLETE

### Task 2.1 — Add auth middleware
- [x] Create `src/middleware.ts` protecting `/dashboard/*` and `/api/*` (except `/api/auth/*`)
- [x] Redirect unauthenticated users to `/login`
- [x] Verify Supabase session cookie is checked

### Task 2.2 — Add logout button
- [x] Add logout option in sidebar (bottom) and/or header
- [x] Call `supabase.auth.signOut()` and redirect to `/login`

### Task 2.3 — Add error boundaries
- [x] Create `src/app/error.tsx` global error boundary
- [x] Create `src/app/not-found.tsx` custom 404 page
- [x] Create `src/app/dashboard/error.tsx` dashboard-specific error boundary

---

## Phase 3: Dark Mode & Visual Consistency ✅ COMPLETE

### Task 3.1 — Fix login page dark mode
- [x] Replace ALL hardcoded `bg-white`, `text-gray-*`, `border-gray-*` with semantic tokens
- [x] Test login page in both light and dark mode

### Task 3.2 — Replace hardcoded brand color `#1a2b4a`
- [x] Search for ALL instances of `#1a2b4a` and `bg-[#1a2b4a]`
- [x] Replace with `bg-primary` / `text-primary` / `border-primary` CSS variable classes
- [x] Locations: Login, Sidebar logo, Header Run Analysis, ChatPanel bot icon/user messages/send button

### Task 3.3 — Fix dark mode on remaining components
- [x] `DataSourceIndicator.tsx` — add `dark:` variants for green/muted states
- [x] `Settings page SyncLogRow` — add dark variants for status badges
- [x] `Sidebar.tsx` and `Header.tsx` — use `bg-card` instead of `bg-white dark:bg-card`
- [x] `SKU modal` — verify all colors work in dark mode
- [x] Chart tooltip backgrounds — verify visibility on dark backgrounds
- [x] `brandLight` color `rgba(26,43,74,0.4)` — check visibility on dark backgrounds

### Task 3.4 — Remove all black borders/outlines (user feedback)
- [x] Audit ALL components for `border-black`, `border-gray-900`, `ring-black`, `outline-black`
- [x] Replace with `border-border` (uses CSS variable that adapts to light/dark)
- [x] Cards, tables, modals, buttons — all should use subtle `border-border` only

---

## Phase 4: UX Polish ✅ COMPLETE

### Task 4.1 — Empty states for filtered data
- [x] When filters produce zero rows in ANY table, show a friendly "No data matches your filters" message
- [x] When charts have no data, show a centered empty state instead of blank space

### Task 4.2 — Wire PDF export
- [x] `lib/utils/pdf.ts` exists but is unused → add "Export PDF" button next to CSV buttons
- [x] Add PDF export to Forecast tab (captures chart + table)

### Task 4.3 — Settings page functional buttons
- [x] "Export CSV" button on Settings → wire onClick to export sync logs as CSV
- [x] "Configure" buttons on Amazon/Meta cards → show instructions modal (what OAuth steps are needed)

### Task 4.4 — Toast/notification system
- [x] Add a simple toast component (success/error/info)
- [x] Show toast on: successful CSV export, Run Analysis complete, filter reset, Shopify connection success
- [x] Replace the animated banner in Settings with a toast

---

## Phase 5: Code Cleanup ✅ COMPLETE

### Task 5.1 — Remove duplicate cn() functions
- [x] `Header.tsx` defines local `cn()` → import from `@/lib/utils/cn`
- [x] `Settings page` defines local `cn()` → import from `@/lib/utils/cn`

### Task 5.2 — Remove unused dependencies
- [x] `@anthropic-ai/sdk` — using raw fetch instead → remove from package.json
- [x] `react-hook-form` + `@hookform/resolvers` + `zod` — never imported → remove
- [x] `@radix-ui/react-accordion`, `@radix-ui/react-dialog`, `@radix-ui/react-popover` — never imported → remove
- [x] `@tanstack/react-table` — tables are hand-rolled → remove
- [x] Run `npm prune` after cleanup

### Task 5.3 — Wire the forecast engine
- [x] `lib/forecast/engine.ts` is well-written but completely unused
- [x] Use it in the Recommendations API to provide data-driven forecasts
- [x] OR use it in the dashboard when Supabase/Shopify have no forecast data

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
- [x] `npm run build` must pass with zero errors
- [x] `npx tsc --noEmit` must pass with zero type errors
- [ ] All tests must pass

---

## Success Criteria
- [x] All Phase 1-5 tasks complete
- [x] `npm run build` passes
- [x] `npx tsc --noEmit` passes
- [ ] All tests in Phase 6 pass
- [x] Dark mode works on every page without hardcoded colors
- [x] All filters actually filter data in tables AND charts
- [x] Live data pipeline works when Shopify is connected
- [x] No unused dependencies in package.json

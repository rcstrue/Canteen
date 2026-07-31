# Task R4-A — Low-Stock Alert Banner + Activity Timeline

## What was built

### 1. New API endpoint: `/api/activity/route.ts`
- Queries the last 10 of each: purchases (with items + supplier), daily_meals (with recipe), expenses, and stock_movements (WASTAGE or ADJUSTMENT only — PURCHASE shows up via the purchases stream and CONSUMPTION is auto-generated from meal logs so it would only create noise).
- Merges, sorts by `createdAt` desc, limits to 8 results.
- Returns JSON shape: `{ data: Array<{ id, type, description, amount, createdAt, ingredientName, supplierName, recipeName }> }`.
- Descriptions are human-readable (e.g. `Purchased 25 kg Rice + 2 more from ABC Supplier`, `Served 200 lunch portions of Dal Tadka`, `Wasted 3 kg of Tomato (Spoiled)`).

### 2. LowStockAlertBanner component (dashboard-view.tsx)
- Dismissible, prominent banner shown at the very top of the dashboard (above the welcome section).
- Conditionally rendered only when `lowStockItems.length > 0`.
- Uses amber→orange→rose gradient background, AlertTriangle warning icon.
- Headline: "N items need restocking", plus a Critical/Low Stock badge.
- Shows top 3 ingredient chips with current/min stock + unit.
- "View Stock" button → `onNavigate('stock')`.
- "Dismiss" (X icon) button → sets `sessionStorage['rcs-dashboard-lowstock-dismissed'] = "true"` and hides the banner.
- Persistence implemented with `useSyncExternalStore` (SSR-safe, no `setState` in `useEffect` — passes the React 19 `react-hooks/set-state-in-effect` lint rule).
- Slide-down entrance/exit animation via framer-motion `AnimatePresence`.
- Fully responsive — stacks vertically on mobile, horizontal layout on lg+.

### 3. ActivityTimeline component (dashboard-view.tsx)
- Vertical timeline showing the 8 most recent activities fetched from `/api/activity`.
- Color-coded icon circles per activity type:
  - PURCHASE → ShoppingCart (amber)
  - MEAL → UtensilsCrossed (emerald)
  - WASTAGE → Trash2 (rose)
  - EXPENSE → Receipt (blue)
  - ADJUSTMENT → Package (stone)
- Each entry shows: icon, description, relative time (via `date-fns formatDistanceToNow`), type label, and amount in ₹ where applicable.
- Vertical connecting rail between entries (last item has no rail).
- Loading skeleton (6 placeholder rows) and empty state.
- Scrollable container with custom scrollbar (`max-h-[460px] overflow-y-auto`).

### 4. QuickStatsSidebar component (dashboard-view.tsx)
- Shows 4 operational metrics in colored tiles:
  1. Today's Purchases (₹) — amber ShoppingCart
  2. This Week's Meals (count) — emerald UtensilsCrossed
  3. This Month's Wastage (₹) — rose Trash2
  4. Active Suppliers (count) — orange Users
- Loading skeleton (4 placeholder tiles) and loaded state.
- Tiles use amber/orange gradient borders, hover effects.
- Responsive grid: 1 col on mobile, 2 cols on sm, 1 col on lg.

### 5. Dashboard integration
- Layout: `lg:grid-cols-3` with the ActivityTimeline taking `lg:col-span-2` (left) and QuickStatsSidebar taking 1 col (right).
- Falls back to single-column stack on mobile and tablet.
- Placed between the Monthly Comparison section and the Meals Summary + Budget Status section.
- Quick-stats data computed in parallel via `Promise.all` over `/api/purchases`, `/api/daily-meals`, `/api/stock-movements?type=WASTAGE`, and `/api/suppliers`.
- Activity feed fetched from the new `/api/activity` endpoint with a cancel flag to avoid setState after unmount.

## Files changed
- `/home/z/my-project/src/app/api/activity/route.ts` — **NEW** (~190 lines)
- `/home/z/my-project/src/components/module-views/dashboard-view.tsx` — added 3 new components + state hooks + 2 useEffects + 2 new JSX sections (banner + timeline/sidebar grid)

## Verification
- `bun run lint` → 0 errors, 0 warnings ✅
- All API endpoints return 200: `/api/activity`, `/api/dashboard`, `/api/purchases?startDate=...`, `/api/daily-meals?startDate=...`, `/api/stock-movements?type=WASTAGE`, `/api/suppliers` ✅
- agent-browser screenshots captured:
  - `r4-a-dashboard-top.png` — full-page desktop view with banner visible
  - `r4-a-after-dismiss.png` — banner gone after dismiss click
  - `r4-a-after-reload.png` — banner still gone after page reload (sessionStorage persisted)
  - `r4-a-banner-restored.png` — banner back after clearing sessionStorage
  - `r4-a-timeline-quickstats.png` — desktop view of timeline + sidebar
  - `r4-a-mobile-banner.png` — mobile (390×844) banner layout
  - `r4-a-mobile-timeline.png` — mobile stacked timeline + sidebar
- Snapshot confirms all expected text rendered: "1 item needs restocking", "View Stock", "Dismiss low stock alert", "Recent Activity", "Quick Stats", "Today's Purchases ₹5,700.00", "This Week's Meals 16,353", "This Month's Wastage ₹300.00", "Active Suppliers 6".

## Acceptance criteria checklist
- [x] Low-stock banner shows when there are critical items
- [x] Banner can be dismissed and stays dismissed during session (verified via sessionStorage + reload)
- [x] "View Stock" button navigates to stock view (wired via `onNavigate('stock')`)
- [x] Activity timeline shows 8 most recent activities with correct icons/colors
- [x] Each activity has relative time and amount
- [x] New `/api/activity` endpoint returns correct data
- [x] Quick stats sidebar shows 4 metrics
- [x] Layout is responsive (mobile 1-col, lg 2/3 + 1/3)
- [x] Lint passes

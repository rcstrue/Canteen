# Task R7-A — Enhance Dashboard with Interactive Charts + Animated Counters

**Agent**: full-stack-developer
**Task ID**: R7-A
**Date**: 2026-07-31
**Project**: RCS Canteen (Next.js 16 + App Router + TypeScript + Tailwind v4 + shadcn/ui + Prisma SQLite + Recharts)

## Previous Agent Context

Read before starting:
- `/home/z/my-project/worklog.md` tail (R6 complete: Audit Log, Supplier Performance, Stock Movement History — all 9 views VLM-scored 8.5–9/10)
- `/home/z/my-project/src/components/module-views/dashboard-view.tsx` (2528 lines, 5 sections: low-stock banner, welcome, KPI cards, monthly comparison, activity timeline, today's meals, top consuming + expense breakdown)
- `/home/z/my-project/src/app/api/dashboard/route.ts` (existing GET endpoint with costToday/Week/Month, mealsToday/Month, costPerMeal, lowStockAlerts, topConsumingIngredients, todayMeals, expenses, costTrend)
- `/home/z/my-project/src/app/globals.css` (chart CSS variables `var(--chart-1..5)`, dark mode overrides, card-hover/metric-tile/scroll-fade utilities)
- `/home/z/my-project/prisma/schema.prisma` (10 models — no schema changes needed for R7-A)

## Files Created

### 1. `/home/z/my-project/src/app/api/dashboard/charts/route.ts` (~205 lines)
GET handler returning 4 aggregated datasets:
- `weeklyConsumption` — last 7 days `{ day, date, cost, meals }`. Cost = SUM(StockMovement.totalAmount) WHERE type IN ['CONSUMPTION','WASTAGE']. Meals = SUM(DailyMealServed.mealsServed).
- `topIngredientsByCost` — top 5 by SUM(PurchaseItem.totalAmount) where `purchase.date >= monthStart`. Returns `{ name, totalSpend, currentStock, unit, percentage }` (percentage relative to #1).
- `categorySpending` — groups by `ingredient.category`. Returns `{ category, amount, percentage }` sorted desc.
- `monthlyKpiTrend` — last 6 months `{ month, foodCost, operatingCost, totalSpend }` via 3 parallel aggregates per month (PURCHASE, Expense, CONSUMPTION+WASTAGE).
- Empty-data safe: returns empty arrays on failure.
- Verified via curl: 7 days populated, top 5 = Chicken/Cooking Oil/Ghee/Toor Dal/Rice (Basmati), 8 categories, 6-month trend shows data in Jun/Jul. 226ms response.

### 2. `/home/z/my-project/src/components/animated-counter.tsx` (~110 lines, 'use client')
- Props: `value, duration=1200, decimals=0, prefix, suffix, className`.
- `requestAnimationFrame` + `easeOutExpo` (1 - 2^(-10*progress)).
- `Intl.NumberFormat('en-IN', { minimumFractionDigits, maximumFractionDigits })` for lakh/crore grouping.
- **Lint-safe architecture**: uses `progress` state (0→1) updated only inside rAF callback (async, satisfies `react-hooks/set-state-in-effect`). Display value derived: `progress >= 1 ? value : initialValue * easeOutExpo(progress)`. Initial target frozen via `useState(value)`. Avoids both synchronous setState in effect body AND ref-access-during-render (two React 19 strict rules that required refactor iterations).

### 3. `/home/z/my-project/src/components/sparkline.tsx` (~85 lines, 'use client')
- Props: `data: number[], color='var(--chart-1)', height?, width?, type='line'`.
- Recharts `<LineChart>` or `<AreaChart>` with `<ResponsiveContainer>`. No axes/tooltip/grid.
- 'area' type: linearGradient fill opacity 0.35→0.02.
- Stable gradient id derived from `type+color` to avoid collisions.
- Fixed-size mode (both width+height passed) OR fluid mode (fills parent).

## Files Modified

### 4. `/home/z/my-project/src/components/module-views/dashboard-view.tsx` (2528 → 3155 lines)
- **Imports**: added `AreaChart, Area` (recharts), `toast` (sonner), `AnimatedCounter`, `Sparkline`.
- **New chart configs**: `weeklyConsumptionConfig`, `topIngredientsConfig`, `categorySpendingConfig`.
- **New constant**: `CATEGORY_CHART_COLORS = ['var(--chart-1)',...,'var(--chart-5)','var(--chart-1)']` (theme-aware).
- **New type**: `DashboardChartsData` (4 datasets).
- **New state**: `chartsData`, `chartsLoading`.
- **New useEffect**: parallel fetch of `/api/dashboard/charts` with toast on error (non-blocking). Defensive `Array.isArray` parsing.
- **MetricCard extended**: optional `valueNode` (overrides string value) + `sparkline` (24px slot). Added `hover:scale-[1.01]` for subtle lift.
- **4 KPI cards upgraded** to use `<AnimatedCounter prefix="₹" decimals={2} />` + area Sparkline of `monthlyKpiTrend.foodCost` (cards 1-3) or `operatingCost` (card 4). Each sparkline uses a different `var(--chart-N)` color. Conditionally rendered when data available.
- **New section: Weekly Consumption Trend** (full-width, 280px):
  - Dual-axis AreaChart: `cost` (orange `#f97316`) on left YAxis, `meals` (emerald `#10b981`) on right YAxis.
  - XAxis shows weekday labels. CartesianGrid horizontal-only.
  - Custom tooltip: full date + Cost (₹) OR Meals count depending on hovered series.
  - Skeleton while loading, Activity icon empty state.
- **New section: Top 5 Ingredients by Spend** (left, 2-col grid):
  - Vertical BarChart with horizontal linearGradient bars (amber-400 `#fbbf24` → orange-600 `#ea580c`).
  - YAxis: ingredient names (truncated to 12 chars). XAxis hidden. LabelList shows ₹ amount.
  - Below chart: list with index, name, relative-% progress bar, ₹ amount.
- **New section: Spending by Category** (right, 2-col grid):
  - Donut PieChart (innerRadius 50, outerRadius 80, paddingAngle 2). Top 5 categories, slices use `CATEGORY_CHART_COLORS`.
  - Center overlay: "TOTAL" label + total spend via `formatCurrencyShort`.
  - Right legend: color dot + category + % + ₹ amount (up to 6 categories).
- **Loading skeleton**: added 1 extra LargeCardSkeleton + 2-col grid for new sections.

## Lint Result

```
$ bun run lint
$ eslint .
```
✅ **PASS** — 0 errors, 0 warnings on the full project.

## Dev Server Verification

- `GET /api/dashboard/charts` → 200 in 226ms (compile: 187ms, render: 39ms).
- `GET /` (dashboard) → 200 in 597ms (compile: 51ms, render: 546ms).
- All Prisma queries firing correctly (verified in dev.log):
  - Weekly: StockMovement WHERE type IN ('CONSUMPTION','WASTAGE') + DailyMealServed for last 7 days.
  - Top 5: PurchaseItem LEFT JOIN Purchase WHERE purchase.date >= monthStart, plus Ingredient relation.
  - Monthly trend: 3 parallel aggregates per month × 6 months = 18 queries.
- No compile errors, no runtime errors.

## Issues Encountered

1. **React 19 strict lint rules on `animated-counter.tsx`** — initial implementation called `setDisplayValue(value)` synchronously in the effect body, triggering `react-hooks/set-state-in-effect`. First refactor used a ref to track animation state, but accessing `ref.current` during render triggered `react-hooks/refs`. Final solution: derive the displayed value from a `progress` state (0→1) that's only updated inside the rAF callback. Display = `progress >= 1 ? value : initialValue * easeOutExpo(progress)`. Initial value frozen via `useState(value)`. This avoids both anti-patterns entirely.

2. **Empty initial directory for `/api/dashboard/charts`** — had to `mkdir -p` before Write could create the route file.

3. **Recharts dual-axis AreaChart** — needed explicit `yAxisId` props on both `<YAxis>` and `<Area>` components to bind cost to left axis and meals to right axis. Without this, recharts defaults all series to the first axis.

## Recommended Follow-up

1. **Add an "All Time" or "Custom Range" date picker** to the chart cards — currently hardcoded to last 7 days / current month / last 6 months.
2. **Make Top 5 Ingredients chart clickable** — clicking a bar could navigate to the ingredient detail in Stock view (similar to how the existing Top Consuming Ingredients section could be).
3. **Add comparison vs previous period** for the weekly consumption chart (e.g., overlay last week's cost as a faint dashed line).
4. **Cache the `/api/dashboard/charts` response** with a short TTL (e.g., 60s) — the 6-month trend involves 18 aggregate queries and could become slow as data grows.
5. **Consider WebSocket push** for real-time chart updates when new stock movements / meals are recorded (the project already has socket.io infrastructure).
6. **Add print/PDF export** for the dashboard — useful for monthly review meetings.
7. **Mobile optimization**: the dual-axis Weekly Consumption chart may be cramped on very narrow screens; consider hiding the right YAxis below `sm:` breakpoint.

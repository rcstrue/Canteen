# QA-2: Dashboard View Enhancement Work Record

## Task
Significantly improve the Dashboard view's styling, visual quality, and add new features for the RCS Canteen Stock & Cost Management app.

## Files Modified
- `src/components/module-views/dashboard-view.tsx` — Complete rewrite (~1100 lines)
- `src/app/page.tsx` — Wired up `onNavigate` prop from `Home` → `ViewRenderer` → `DashboardView`

## QA Issues Fixed
1. **Top Consuming Ingredients chart** — Added thicker bars (`barSize={22}`), value labels at bar ends via `<LabelList>`, and color differentiation by ingredient category (Grains→amber, Vegetables→emerald, Dairy→violet, Spices→rose, etc.)
2. **Inconsistent accent colors** — All metric cards now use a cohesive amber/orange gradient theme (`from-amber-50 to-orange-50` in light, `from-amber-950/30 to-orange-950/20` in dark). The lone green card has been removed.
3. **Low Stock Alerts whitespace** — Added "View All Stock" button at the bottom that navigates to the stock view. Each alert now shows min/max (par) context: `current / min` badge, `%` of par, and explicit "Par level: X unit" footer. Used `flex flex-col` + `flex-1` so the button sticks to the bottom regardless of item count.
4. **Card heights** — All cards in the same row now use `h-full` (via `motion.div className="h-full"` wrappers and `Card className="flex h-full flex-col"`), with inner `CardContent className="flex flex-1 flex-col"`.
5. **Hover effects** — Every card now has `transition-all hover:shadow-lg hover:-translate-y-0.5`.
6. **Trend indicators** — Added a reusable `TrendBadge` component. Cards compute real ratios from existing data:
   - Today's food cost: `(today − week/7) / (week/7) × 100` → "vs avg day (week)"
   - Week's food cost: `(week − month/4.33) / (month/4.33) × 100` → "vs avg week (month)"
   - Color logic is direction-aware (for cost metrics, "up is bad" → red; "down is good" → green)
7. **Donut/pie percentage labels** — Expense breakdown is now a donut (`PieChart` with `innerRadius={60}`) with custom `renderPiePercentLabel` that draws `%` labels INSIDE each slice (skips slices <5%).
8. **Progress bar labels** — Low stock items show explicit `stockPercent%` next to the bar; the meals card shows percentage against daily average with a numeric label.

## New Features Added
1. **Trend comparison mini-cards** — `TrendBadge` under every metric card with up/down arrow, colored percentage, and comparison label.
2. **Cost per employee card** — Prominent 4th metric card: `totalOperatingCost / 600 employees`, with sub-value showing daily cost per employee.
3. **Quick action buttons** — "Record Today's Meals" (calls `onNavigate('daily-entry')`) and "New Purchase" (`onNavigate('purchases')`) in the welcome banner. Also a "Record Now" button in the empty state for today's meals.
4. **Stock health indicator** — Custom SVG `CircularGauge` component with animated stroke. Color shifts based on health (emerald ≥80%, amber ≥60%, rose <60%). Fetches `/api/ingredients` in parallel to compute `(abovePar / total) × 100`. Includes "Manage Stock" navigation button.
5. **Today's summary banner** — Full-width gradient banner with greeting, today's date, quick actions, and 4 inline mini-stats (today's food cost, today's meals, cost per meal, monthly cost per employee).

## Styling Requirements Met
- ✅ Gradient backgrounds on metric cards (`from-amber-50 to-orange-50`)
- ✅ `transition-all hover:shadow-lg hover:-translate-y-0.5` on all cards
- ✅ Consistent icon backgrounds with `rounded-xl` and colored bg (amber-100/orange-100/etc.)
- ✅ Cohesive chart palette: amber-500, orange-500, rose-500, emerald-500, violet-500
- ✅ Value labels at end of horizontal bars via `<LabelList position="right">`
- ✅ Percentage labels inside donut slices
- ✅ `tabular-nums` on all financial figures (prevents digit jitter)
- ✅ Subtle `border-t` separators between sections (banner mini-stats, expense legend, low stock action)
- ✅ Equal-height cards via `h-full` + flex layouts
- ✅ Loading skeletons matching card shapes (`BannerSkeleton`, `MetricCardSkeleton`, `LargeCardSkeleton`)
- ✅ Framer-motion entrance animations (fade-in + slide-up, staggered via `containerVariants`/`itemVariants` with 60ms stagger)

## Layout Structure (matches spec)
1. **Welcome banner** (full width) — greeting, today's date, quick action buttons, 4 inline mini-stats
2. **4 metric cards** — Today's Food Cost, Week's Food Cost, Month's Food Cost, Cost Per Employee (all gradient bg, hover effect, trend indicator)
3. **2 cards** — Meals served summary (with progress bar) + Stock health gauge
4. **2 cards** — Low stock alerts (with "View All Stock" action) + Today's meals table (with empty-state CTA)
5. **2 cards** — Top consuming ingredients (improved bar chart with category colors + value labels) + Expense breakdown (donut with % labels + legend list with %)

## Technical Notes
- Component accepts optional `onNavigate?: (view: ViewId) => void` prop (imports `ViewId` type from `app-sidebar.tsx`).
- All existing functionality preserved (currency formatting, meal type labels, chart configs, loading/error states).
- `'use client'` directive retained.
- Uses shadcn/ui (Card, Button, Badge, Progress, Table, Skeleton, Chart), recharts (BarChart, PieChart, LabelList), lucide-react, framer-motion.
- `useMemo` removed after early returns to comply with `react-hooks/rules-of-hooks`.
- Lint clean for `dashboard-view.tsx` and `page.tsx` (1 pre-existing parse error remains in unrelated `meals-view.tsx`).

## Verification
- `bun run lint` — clean for dashboard-view.tsx and page.tsx
- Dev log shows `GET /api/ingredients 200 in 39ms` (new parallel fetch for stock health gauge) and dashboard rendering successfully
- curl `/api/dashboard` returns valid JSON with all expected fields

## Status
✅ Complete — all 8 QA issues fixed, all 5 new features added, all 9 styling requirements met, layout structure matches spec exactly.

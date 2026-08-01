# Task QA-4 — Reports View Improvements

**Agent:** qa-reports-improver
**Task:** Improve Reports view styling, fix bugs, add export functionality (CSV export, Print, summary header, comparison mode, chart type toggle).

## Files Modified
- `/home/z/my-project/src/components/module-views/reports-view.tsx` — full rewrite (~1300 lines)
- `/home/z/my-project/src/lib/export-utils.ts` — new `downloadCSV()` utility
- `/home/z/my-project/src/app/layout.tsx` — added Sonner Toaster alongside legacy Toaster (so `toast.success/error` calls in reports-view render correctly)

## QA Issues Fixed
1. **Cost-per-meal labeling bug**: Now shows two clearly labelled KPI cards — "Food Cost / Meal" (raw ingredient cost ÷ meals) and "Operating Cost / Meal" (food + expenses ÷ meals). No more ambiguous "Per Meal" label.
2. **Donut chart missing labels**: Added `renderPiePercentLabel` custom recharts label renderer that draws the percentage inside each slice in white bold text (slices <4% are skipped to avoid clutter). Applied to both cost-breakdown and consumption-by-category donuts.
3. **Date format**: `formatDate` and `formatShortDate` now produce DD/MM/YYYY (and DD/MM for axis labels) — Indian format. All table dates, tooltip labels, and summary header dates use this format.
4. **Chart axis alignment**: Line/bar charts now use `interval="preserveStartEnd"`, `angle={-15}` or `-20`, `textAnchor="end"`, `tickMargin={8}` and a fixed `height` so date labels fit cleanly without overlap.
5. **Visual hierarchy**: Removed the disconnected "Total Operating Cost" banner. The operating cost is now the headline metric of the gradient `ReportSummaryHeader` at the top of the tab, and per-meal operating cost is one of the four KPI cards.

## New Features
1. **CSV Export**: `downloadCSV(filename, rows)` utility at `/src/lib/export-utils.ts`. Each tab has its own "Export CSV" button on the gradient summary header that maps the report's table data to a flat record array and triggers a browser download. Adds UTF-8 BOM so Excel detects encoding properly. Triggers sonner toast on success.
2. **Print button**: Global "Print" button in the period selector toolbar calls `window.print()`.
3. **Report summary header**: Gradient `ReportSummaryHeader` at the top of each tab showing the key metric, metric label, formatted date range, and Export CSV button. Tab-specific accent colors (amber/orange/rose gradients).
4. **Comparison mode**: "Compare" Switch in the period selector toolbar. When enabled, fires off three parallel fetches for the previous-period date range (same duration immediately before the current period's start). Each KPI card shows the previous-period value plus the % delta (green = good direction, red = bad direction, based on `goodWhenDown` flag for cost metrics).
5. **Chart type toggle**: Pill-style Line/Bar toggle in the header of the trend charts (cost trend, consumption trend). Switches between LineChart and BarChart for the same data on the fly.

## Styling Improvements
- Cohesive chart palette: amber-500 / orange-500 / rose-500 / emerald-500 / violet-500 / cyan-500 (via `PALETTE` constant and `CATEGORY_COLORS` map).
- `tabular-nums` font variant on all financial figures (currency, percentages, qtys).
- All cards: `transition-all hover:shadow-md`.
- Variance status badges: Normal=emerald, Warning=amber, Critical=rose with appropriate icons.
- Period selector: pill style with `bg-primary text-primary-foreground` for active state.
- Subtle grid lines: `strokeDasharray="3 3"` on every CartesianGrid.
- Responsive grids: 4 cols desktop (`lg:grid-cols-4`), 2 tablet (`sm:grid-cols-2`), 1 mobile.
- Loading skeletons for all three report tabs.
- Framer Motion `AnimatePresence` + `motion.div` for smooth tab transition animations (fade + slide).

## Lint Status
- `bun run lint` reports zero issues in my touched files (`reports-view.tsx`, `export-utils.ts`, `layout.tsx`).
- The 3 lint errors reported by `bun run lint` are pre-existing issues in `dashboard-view.tsx` (useMemo after early return) and `meals-view.tsx` (parse error) — not part of this task's scope.

## Dev Server Verification
- All three report APIs return HTTP 200: `/api/reports/cost`, `/api/reports/consumption`, `/api/reports/variance` (confirmed via curl and dev.log).
- Root page renders without errors after the layout change (Sonner Toaster added).
- No runtime errors in dev.log related to reports-view.

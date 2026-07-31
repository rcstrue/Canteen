# R7-B: Budget vs Actual Analysis View

**Agent:** full-stack-developer
**Task ID:** R7-B
**Parent Task:** R7 (Budget vs Actual analysis view)
**Date:** 2026-07-31

## Scope

Built a dedicated **Budget vs Actual** analysis view (sidebar nav item "Budget") that tracks monthly budget vs actual spend, with category breakdown, projected end-of-month spend, and 6-month budget history. This is a NEW dedicated view (not part of Reports).

## Files Created

1. **`/home/z/my-project/src/app/api/budgets/analysis/route.ts`** (~275 lines) — GET handler.
2. **`/home/z/my-project/src/components/module-views/budget-view.tsx`** (~1440 lines, 'use client').

## Files Modified

1. **`/home/z/my-project/src/components/app-sidebar.tsx`** — Added `Wallet` icon import, added `"budget"` to `ViewId` union, added nav item between "reports" and "expenses".
2. **`/home/z/my-project/src/app/page.tsx`** — Added `BudgetView` import, `budget: "Budget"` in viewLabels, `case "budget"` in ViewRenderer switch.

## API Endpoint Contract

`GET /api/budgets/analysis?month=YYYY-MM` (defaults to current month) returns:

```ts
{
  month: string;                  // "2026-07"
  monthLabel: string;             // "July 2026"
  budget: BudgetRow | null;       // null if not set
  actuals: {
    foodCost: number;             // SUM(PurchaseItem.totalAmount) for month
    expenseTotal: number;         // SUM(Expense.amount) for month
    operatingCost: number;        // foodCost + expenseTotal
    totalSpend: number;           // alias for operatingCost
  };
  projectedSpend: number;         // handles day-1 edge case
  daysElapsed: number;            // capped at daysInMonth; 0 for future months
  daysInMonth: number;
  utilization: { foodPct; operatingPct; totalPct; projectedPct };
  categoryBreakdown: Array<{ category, budgeted: 0, actual, variance, pct }>;
  dailySpend: Array<{ day, date: 'YYYY-MM-DD', foodCost, operatingCost }>;
  history: Array<{ month: 'Jul', monthFull: 'July 2026', monthCode: '2026-07', budget, actual, variance }>;  // 6 entries
}
```

## Frontend Component Layout

```
[Header: Title + Month picker + Set Budget + Export CSV]

[4 KPI cards]: Total Budget | Actual Spend | Projected Spend | Variance
  - Projected badge: red if >100% of budget, green otherwise
  - Variance badge: green if under budget, red if over

[Budget Utilization section]: 3 custom horizontal gradient bars (Food/Operating/Total)
  - Color band: emerald <60% / amber 60-80% / orange 80-100% / red >100%
  - Vertical dashed "projected marker" on Total bar
  - Band legend

[2-col grid]:
  Left: Daily Spend Trend — ComposedChart (Bar=foodCost, Line=operatingCost)
        + ReferenceLine at average daily spend
  Right: Category Breakdown — Table (top 10 by actual, colored variance badges)

[Full-width]: 6-Month Budget History — ComposedChart (Bar=budget, Line=actual)
              + history table below

[Set Budget Dialog]: Form with month + foodBudget + operatingBudget
                     + totalBudget (auto-calculated, read-only)
                     + alertThreshold (default 80)
                     POST /api/budgets (new) or PUT /api/budgets/{id} (existing)
```

## Key Implementation Decisions

1. **No schema changes** — The existing Budget model (id, month, foodBudget, operatingBudget, totalBudget, alertThreshold, timestamps) already had everything needed.
2. **Projection edge cases** — Per spec, on day 1 the projection = actuals (avoids multiplying one day's spend by total days). Also handles future months (projected=0) and whole-month-elapsed (projected=actuals).
3. **Category breakdown `budgeted=0`** — Per spec, no per-category budgets exist yet. Variance = `-actual` (always negative, indicating over the implicit zero budget).
4. **Set Budget Dialog lint-safe architecture** — Initial implementation used `useEffect(() => { if (open) setX(...) })` to reset form fields when dialog opened. React 19's `react-hooks/set-state-in-effect` rule flagged this. Refactored to extract form into a child `SetBudgetForm` component that mounts only when `open === true`, using lazy `useState(() => ...)` initializers + a `key={existingBudget?.id ?? 'new-${month}'}` to force remount when the budget changes after a save.
5. **Custom progress bars instead of Recharts** — For utilization bars, custom divs with gradient backgrounds give finer control over the projected marker (absolutely positioned vertical dashed line). Recharts' BarChart doesn't support inline markers cleanly.
6. **Single API call** — The analysis endpoint does all aggregation server-side (foodCost via PurchaseItem findMany with relation filter, expenseTotal via aggregate, categoryBreakdown via findMany+Map, dailySpend via two findMany+Map, history via Promise.all of 6 parallel computeMonthActuals calls). Frontend gets one JSON response.
7. **SQLite compatibility** — Used `findMany` with relation filter on `purchase.date` for PurchaseItem aggregation (Prisma `aggregate` doesn't support relation filters as cleanly on SQLite). Used native Date objects for `gte`/`lte` comparisons.

## Verification

- `bun run lint` passes cleanly (0 errors, 0 warnings) on the FULL project.
- Dev server stable on port 3000.
- API tests via curl:
  - `GET ?month=2026-07` → 200 in 53ms (current month with budget ₹750K, actuals ₹72,645, 8 categories, 31 daily entries, 6-month history Feb-Jul)
  - `GET ?month=2026-08` → 200 (future month, daysElapsed=0, projectedSpend=0)
  - `GET ?month=2026-06` → 200 (past month, daysElapsed=30, projectedSpend=actuals)
  - `GET ?month=invalid` → 400 with clear error message
  - `GET` (no param) → 200, defaults to current month
  - `POST /api/budgets` → 201 (upsert)
  - `DELETE /api/budgets/{id}` → 200
- `GET /` returns 200 authenticated. The `budget-view_tsx` client chunk (242 KB) compiles cleanly and is referenced in the authenticated page HTML.

## Known Limitations / Follow-up

- `categoryBreakdown.budgeted` is always 0 (no per-category budget model yet). To enable per-category budgets, would need to add a `CategoryBudget` model or a JSON column on Budget.
- `dailySpend` only includes days up to today (or full month if past). Days in the future within the current month are not included in the array.
- `history` only fetches last 6 months relative to the SELECTED month (not current month). So if user picks March, history shows Oct-Mar. This is intentional but worth noting.
- No projected-category breakdown yet (only projected total spend).
- `onNavigate` prop is wired but only used in the empty state's "View Purchases" button. Could be extended to "Review Expenses" when over budget.

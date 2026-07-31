# R7-C: Recipe Cost History Tracking + Variance Alerts

**Agent:** full-stack-developer
**Task ID:** R7-C
**Parent Task:** R7 (Recipe cost history tracking + variance alerts)
**Date:** 2026-07-31

## Scope

Added full **Recipe Cost History** tracking to the RCS Canteen app — every
recipe can now have its cost-per-serving snapshotted (manually via a button,
or automatically on every recipe edit), and the meals view shows:

1. A trend mini-chart of cost-per-serving over time.
2. A variance badge comparing the latest two snapshots.
3. A history table with trigger badges.
4. An amber alert banner when cost increased > 10% since the last snapshot.
5. A compact variance badge on each recipe card/row in the list view.

## Files Created

1. **`/home/z/my-project/src/lib/recipe-cost.ts`** (~110 lines) —
   `calculateRecipeCost(recipeId)` and `recordRecipeCost(recipeId, trigger,
   notes?, request?)` helpers. Both are non-throwing; `recordRecipeCost` also
   writes an audit log entry.

2. **`/home/z/my-project/src/app/api/recipes/[id]/cost-snapshot/route.ts`**
   (~115 lines) — `GET` returns the latest snapshot + live breakdown; `POST`
   records a new manual snapshot and returns 201 with the snapshot + breakdown.

3. **`/home/z/my-project/src/app/api/recipes/[id]/cost-history/route.ts`**
   (~125 lines) — `GET` returns `{ current, previous, variance, history, trend }`
   with variance computed via `computeVariance()` (±0.5% noise threshold).

## Files Modified

1. **`/home/z/my-project/prisma/schema.prisma`** — Added `RecipeCostHistory`
   model + back-relation `costHistory RecipeCostHistory[]` on `Recipe`.

2. **`/home/z/my-project/src/lib/audit.ts`** — Added `"RecipeCostHistory"` to
   the `EntityType` union.

3. **`/home/z/my-project/src/app/api/recipes/route.ts`** (GET) — Now issues
   one extra `recipeCostHistory.findMany` query (take = recipeCount × 2) to
   attach `latestCostVariance: { current, previous, absolute, percentage,
   direction, recordedAt } | null` per recipe. Avoids N+1 by grouping in JS.

4. **`/home/z/my-project/src/app/api/recipes/[id]/route.ts`** (PUT) — After
   a successful update + audit log, fires `void recordRecipeCost(recipe.id,
   'recipe_edit', undefined, request)` — non-blocking, non-throwing.

5. **`/home/z/my-project/src/components/module-views/meals-view.tsx`** —
   Added types (`LatestCostVariance`, `CostHistoryData`, etc.), state
   (`costHistory`, `costHistoryLoading`, `recordingSnapshot`), handlers
   (`fetchCostHistory`, `handleRecordSnapshot`), helpers (`formatDateShort`,
   `formatDateTime`, `TRIGGER_STYLES`, `getTriggerStyle`), and two new
   sub-components:
   - `LatestCostVarianceBadge` — compact pill shown on each recipe card/row.
   - `CostHistorySection` — full section in the recipe detail dialog with
     alert banner, current cost card, trend mini-chart, history table.

## API Endpoint Contracts

### `GET /api/recipes/[id]/cost-history`

```ts
{
  recipeId: string;
  recipeName: string;
  current: {
    id, cost, costPerServing, servings, trigger, notes, recordedAt
  } | null;
  previous: { ... } | null;
  variance: {
    absolute: number;       // current.costPerServing - previous.costPerServing
    percentage: number;     // (absolute / previous.costPerServing) * 100
    direction: 'up' | 'down' | 'none';  // ±0.5% noise threshold
  };
  history: Array<{          // last 30, sorted desc by createdAt
    id, cost, costPerServing, servings, trigger, notes, createdAt
  }>;
  trend: Array<{            // history reversed (oldest first) for charting
    date: string; cost: number; servings: number; trigger: string;
  }>;
}
```

### `POST /api/recipes/[id]/cost-snapshot`

Request body (optional):
```ts
{ notes?: string }
```
Response (201):
```ts
{
  recipeId: string;
  recipeName: string;
  snapshot: {
    id, cost, costPerServing, servings, trigger: 'manual', notes, createdAt
  };
  breakdown: {
    totalCost: number;
    costPerServing: number;
    servings: number;
    ingredients: Array<{ name, quantity, unit, unitPrice, lineCost }>;
  };
}
```

### `GET /api/recipes` (extended)

Each recipe now includes:
```ts
latestCostVariance: {
  current: number;
  previous: number | null;
  absolute: number;
  percentage: number;
  direction: 'up' | 'down' | 'none';
  recordedAt: string;  // ISO
} | null;
```

## Frontend Layout (CostHistorySection)

```
┌─ Alert banner (motion slide-in, only when variance > 10% up) ──────┐
│ ⚠ Cost increased by X% since last snapshot                         │
│ ₹Y → ₹Z per serving. Review ingredient prices.                     │
└────────────────────────────────────────────────────────────────────┘
┌─ Cost History card ────────────────────────────────────────────────┐
│ [History icon] Cost History               [Record Snapshot button] │
│ ┌─ Current Cost / Serving (gradient orange/amber) ───────────────┐ │
│ │ ₹XX.XX   [+₹Y.YY (+Z.%)] (variance badge, red/green/slate)    │ │
│ │ Last snapshot DD Mon YYYY, HH:MM      Previous: ₹YY.YY         │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ ┌─ Trend mini-chart (AreaChart, 200px, orange gradient fill) ────┐ │
│ │     ╱╲                                                          │ │
│ │   ╱   ╲___                                                      │ │
│ │  ╱        ╲╲                                                    │ │
│ │ 01/07  02/07  03/07  04/07  05/07  06/07                       │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ ┌─ History table (max-h-72, sticky header, scrollable) ─────────┐ │
│ │ Date | Cost/Serving | Total Cost | Servings | Trigger | Notes │ │
│ │ ...   | ₹10.40      | ₹1,040     | 100      | Manual  | —     │ │
│ │ ...   | ₹10.60      | ₹1,060     | 100      | Recipe  | —     │ │
│ │                                              Edit              │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

## LatestCostVarianceBadge (recipe list/grid)

- ⬆ red badge `+X%` when variance.percentage > +5% (direction === 'up')
- ⬇ green badge `-X%` when variance.percentage < -5% (direction === 'down')
- Nothing rendered if within ±5% or no history (previous === null)
- Tooltip: "Cost changed from ₹X to ₹Y on DD/MM"

## Verification

- `bun run lint` passes (exit 0, 0 errors, 0 warnings) on the FULL project.
- `bun run db:push` applied the new model cleanly (no data loss).
- API endpoints verified via curl:
  - `GET /api/recipes` returns 200 with `latestCostVariance` per recipe.
  - `POST /api/recipes/[id]/cost-snapshot` returns 201 with snapshot + breakdown + triggers an audit log INSERT.
  - `GET /api/recipes/[id]/cost-history` returns 200 with current/previous/variance/history/trend.
  - `PUT /api/recipes/[id]` triggers an auto `recipe_edit` snapshot (verified: history grew from 1 → 2 entries after a PUT).
- Dev server stable on port 3000; `GET /` returns 200.

## Notes / Gotchas

- **PrismaClient HMR cache issue**: After `prisma db push` regenerated the
  Prisma Client with the new `RecipeCostHistory` model, the dev server's
  HMR-preserved `globalThis.prisma` singleton kept using the pre-schema-change
  PrismaClient class — so `db.recipeCostHistory` was `undefined` and
  `GET /api/recipes` returned 500. Several in-process workarounds were tried
  (schema-version tracking + `globalForPrisma.prisma = undefined` reset,
  `require.cache` cleanup, version-tagged dynamic
  `import('@prisma/client?v=...')`, Proxy-based `db` export) but Turbopack
  rejects query strings on bare module specifiers and doesn't expose its own
  module cache. The fix was restarting the dev server. `db.ts` was reverted
  to its original simple form. Future schema changes should pick up
  automatically if the system's normal restart flow handles them.
- The dev server was restarted via `setsid nohup bun run dev </dev/null
  >/tmp/dev-detached.log 2>&1 &` from a subshell so it survives across
  Bash tool invocations (PPID becomes 1).
- Trigger badges use `sky` for `manual` (per spec's "blue" → mapped to sky
  to stay within Tailwind's color system without using primary blue),
  `amber` for `ingredient_price_change`, `emerald` for `recipe_edit`.
- The trend chart uses literal `#f97316` (Tailwind orange-500) for the
  gradient stops rather than `var(--chart-1)` because it's built directly
  on Recharts primitives (no `ChartContainer` wrapper), keeping the
  implementation simple and self-contained.

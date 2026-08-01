# R4-B — Monthly Cost Trend Chart + Purchase Invoice Print

Agent: full-stack-developer
Task: Add Monthly Cost Trend Chart (6-month combo) + Purchase Invoice Print dialog

## Summary

This task adds two features to the RCS Canteen app:

1. **Monthly Cost Trend Analysis** — A new section at the top of the Reports view
   that displays a 6-month combo chart (bars for food cost, line for operating cost)
   plus four summary cards (avg, MoM change, highest, lowest).

2. **Purchase Invoice Print** — A "Print Invoice" button next to each purchase row
   (and inside the detail dialog) that opens a printable invoice modal with the
   RCS Canteen header, supplier details, items table, totals, and signature lines,
   plus a print button that uses `window.print()` with print-specific CSS.

## Files Changed

### New file: `/src/app/api/reports/monthly-trend/route.ts`

- `GET /api/reports/monthly-trend`
- Returns the last 6 months (current month + 5 previous) of:
  - `month` (`YYYY-MM` format)
  - `monthLabel` (e.g. `"Jul 2026"`)
  - `foodCost` (sum of `purchase.totalAmount` for the month)
  - `operatingCost` (sum of `expense.amount` for the month)
- Uses Prisma `findMany` with a 6-month date range filter, then groups by
  `YYYY-MM` key client-side (avoids raw SQL for SQLite portability).
- Returns `{ generatedAt, months: [...] }`.
- Local-time date helpers (`getYearMonth`, `getMonthLabel`) avoid UTC off-by-one
  bugs that occur with `toISOString()`.

### Modified: `/src/components/module-views/reports-view.tsx`

- Added imports:
  - `ComposedChart` from `recharts`
  - `Flame`, `Sparkles` from `lucide-react`
- Added types:
  - `MonthlyTrendPoint`
  - `MonthlyTrendResponse`
- Added state:
  - `trendData`, `trendLoading`, `trendError`
- Added `fetchMonthlyTrend` callback + `useEffect` to load on mount.
- Added `monthlyTrendConfig` chart config (amber food cost, emerald operating cost).
- Added `MonthlyTrendSection` component placed between the period selector Card
  and the existing Tabs:
  - Header with gradient icon (Sparkles) and date-range Badge
  - ComposedChart with amber Bar (foodCost) + emerald Line (operatingCost),
    CartesianGrid, XAxis (month labels), YAxis (₹k format), ChartTooltip with
    ₹ values, Legend (top-right)
  - 4 `MonthlyTrendStatCard` summary cards below:
    - Avg Monthly Cost (food + operating, last 6 mo)
    - MoM Change (latest vs previous month, with up/down icon, color-coded)
    - Highest Cost Month (rose icon, month label subtitle)
    - Lowest Cost Month (emerald icon, month label subtitle)
  - Loading skeleton (`MonthlyTrendSkeleton`)
  - Error state with retry
  - Empty state
- The section is independent of the period filter (always shows last 6 months).

### Modified: `/src/components/module-views/purchases-view.tsx`

- Added imports: `Printer`, `Flame` from `lucide-react`
- Added helper `getInvoiceNumber(purchase)`:
  - Returns `purchase.invoiceNo` if set, otherwise derives a `PUR-XXXX`
    identifier from the purchase id (last 6 alphanumeric chars uppercased).
- Added state: `invoiceOpen` (bool) for the invoice dialog.
- Added handlers:
  - `handleViewInvoice(purchase)` — fetches full purchase detail (with items)
    then opens the invoice dialog.
  - `handlePrintInvoice()` — calls `window.print()`.
- Added a "View / Print Invoice" ghost button (Printer icon, amber color)
  in the Actions column of every desktop table row, between the Eye (view
  detail) and Trash2 (delete) buttons.
- Added the same Printer button in the mobile card view.
- Added a "Print Invoice" primary amber button in the detail dialog footer
  (next to Close) — closes the detail dialog and opens the invoice dialog.
- Added a new invoice Dialog component with class `printable-invoice`:
  - Header: Flame icon (gradient amber→orange), "RCS Canteen" title,
    "Dahej, Gujarat, India" subtitle, "Purchase Invoice" title on the right,
    invoice number (PUR-XXXX or actual), date in DD/MM/YYYY format.
  - Two-column meta block:
    - Supplier card: supplier name, ref invoice, notes
    - Payment Summary card: items count, status Badge
  - Items Table with columns: #, Ingredient, Qty, Unit, Unit Price, Total
    (alternating row backgrounds, ₹ formatted values)
  - Totals section (right-aligned, 72 width): Subtotal, Discount (₹0.00),
    Grand Total in an amber box
  - Signature footer: "Received by: ___" and "Authorized by: ___" lines
  - System-generated footer note with today's date
  - DialogHeader and DialogFooter both marked `.no-print`
  - "Print Invoice" amber primary button triggers `handlePrintInvoice`

### Modified: `/src/app/globals.css`

Added a `@media print` block at the end of the file:

- `body *` → `visibility: hidden !important` (hides everything by default)
- `.printable-invoice, .printable-invoice *` → `visibility: visible !important`
- `.printable-invoice` positioned absolute at top-left, 100% width, white
  background, black text, no border/shadow/radius — overrides any dark-mode
  styling so the printed invoice is always on white paper.
- `.no-print, .no-print *` → hidden (`display: none`)
- `-webkit-print-color-adjust: exact` to preserve amber header colors
- `@page { margin: 14mm; size: A4 portrait; }`

## Verification

### API endpoint

```bash
curl -s "http://localhost:3000/api/reports/monthly-trend"
```

Returns (July 2026 is current month):

```json
{
  "generatedAt": "2026-07-31T14:02:01.203Z",
  "months": [
    { "month": "2026-02", "monthLabel": "Feb 2026", "foodCost": 0, "operatingCost": 0 },
    { "month": "2026-03", "monthLabel": "Mar 2026", "foodCost": 0, "operatingCost": 0 },
    { "month": "2026-04", "monthLabel": "Apr 2026", "foodCost": 0, "operatingCost": 0 },
    { "month": "2026-05", "monthLabel": "May 2026", "foodCost": 0, "operatingCost": 0 },
    { "month": "2026-06", "monthLabel": "Jun 2026", "foodCost": 0, "operatingCost": 29300 },
    { "month": "2026-07", "monthLabel": "Jul 2026", "foodCost": 27145, "operatingCost": 41500 }
  ]
}
```

### UI verification (agent-browser)

Logged in as `admin@rcs.com` / `admin123`, navigated to Reports and Purchases.

**Reports view — Cost Trend Analysis section**

- The "Cost Trend Analysis" Card renders at the top of the page, above the
  existing Cost / Consumption / Variance tabs.
- The ComposedChart renders at 926×340 px with amber bars (food cost) and an
  emerald line (operating cost) for 6 months.
- Summary card values verified (computed from the API response above):
  - Avg Monthly Cost: `₹16,324.17` — `(0+0+0+0+29300+68645)/6 = 97945/6 = 16324.17` ✓
  - MoM Change: `+134.3%` — `(68645-29300)/29300 = 134.3%` ✓
  - Highest Cost Month: `₹68,645` — Jul 2026 (27145+41500) ✓
  - Lowest Cost Month: `₹0` — Feb 2026 ✓

**Purchases view — Print Invoice**

- Every purchase row in the desktop table has 3 action buttons:
  View Details (Eye), View / Print Invoice (Printer, amber), Delete (Trash2).
- The same 3 buttons render on mobile card view (5 desktop + 5 mobile = 10
  Printer buttons total — verified via `document.querySelectorAll`).
- Clicking the Printer button opens a modal titled "Purchase Invoice" containing:
  - "RCS Canteen" header with Flame icon and "Dahej, Gujarat, India" subtitle
  - "Purchase Invoice" title and invoice number (e.g. `INV-2024-001`)
  - Date in DD/MM/YYYY format (e.g. `31/07/2026`)
  - Supplier card with name, ref invoice, notes
  - Payment Summary card with items count + status badge
  - Items table (#, Ingredient, Qty, Unit, Unit Price, Total) with 3 rows:
    Rice (Basmati) 50 kg ₹45.00 ₹2,250.00 / Wheat Flour 30 kg ₹35.00 ₹1,050.00
    / Toor Dal 20 kg ₹120.00 ₹2,400.00
  - Subtotal: ₹5,700.00 / Discount: ₹0.00 / Grand Total: ₹5,700.00
  - "Received by: ___" and "Authorized by: ___" signature lines
  - System-generated footer note
- The detail dialog now has a "Print Invoice" amber button in its footer that
  closes the detail dialog and opens the invoice dialog.
- The invoice dialog has a "Print Invoice" button in its footer that calls
  `window.print()` — clicking it produces no console errors.
- `.printable-invoice` and `.no-print` classes are present in the DOM as
  expected (1 printable-invoice element, 2 no-print elements for the dialog
  header and footer).

### Lint

```bash
bun run lint
```

Exit code 0 — no errors, no warnings in modified files.

## Acceptance Criteria

- [x] New `/api/reports/monthly-trend` endpoint returns 6 months of data
- [x] Combo chart shows bars (food cost) and line (operating cost) for 6 months
- [x] 4 summary cards below chart show avg, MoM change, highest, lowest
- [x] "Print Invoice" button visible on each purchase row/dialog
- [x] Invoice dialog shows all required fields with proper ₹ formatting
- [x] Print button triggers browser print with only invoice visible
- [x] Print CSS added to globals.css
- [x] Lint passes
- [x] Appended to worklog.md

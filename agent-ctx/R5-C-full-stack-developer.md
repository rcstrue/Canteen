---
Task ID: R5-C
Agent: full-stack-developer
Task: Polish Empty States + Add Bulk Actions to Purchases + Fix Reports 6-month chart empty data

# Files Modified
- `/src/app/api/reports/monthly-trend/route.ts` — added `hasData` boolean field to each month
- `/src/components/module-views/dashboard-view.tsx` — replaced sparse Budget & Today's Meals empty states with rich gradient versions (BudgetEmptyState, MealsEmptyState components)
- `/src/components/module-views/reports-view.tsx` — chart uses hatched pattern + "No data" badges + tooltip; summary cards filter out empty months
- `/src/components/module-views/purchases-view.tsx` — checkbox column, sticky animated bulk actions bar, bulk delete/print/export

# Acceptance Criteria Status
- [x] Budget Status empty state is visually rich with gradient, icon, CTA
- [x] Today's Meals empty state (when applicable) is similarly polished
- [x] Monthly trend API returns `hasData` field
- [x] Reports chart shows empty months differently (hatched pattern + "No data" badge)
- [x] Summary cards filter out empty months for highest/lowest calculations
- [x] Note about missing data shown below chart
- [x] Purchases table has checkbox column + select all
- [x] Bulk actions bar appears when 1+ items selected
- [x] Bulk delete with confirmation works
- [x] Bulk CSV export works
- [x] Bulk print invoices (opens first invoice dialog + choose-from-list dialog)
- [x] Lint passes (exit 0)
- [x] Appended to worklog.md

# Screenshots in agent-ctx/
- r5c-dashboard-top.png — full dashboard showing new BudgetEmptyState
- r5c-dashboard-budget-empty.png — budget empty state card
- r5c-dashboard-budget-empty-final.png — final budget empty state
- r5c-dashboard-meals.png — meals card
- r5c-reports-trend.png — reports trend chart with empty months
- r5c-reports-trend-with-note.png — full reports trend section with note + badges
- r5c-reports-tooltip-empty.png — tooltip showing "No data recorded this month"
- r5c-purchases-default.png — purchases table with checkbox column
- r5c-purchases-bulk-bar.png — bulk actions bar (1 row selected)
- r5c-purchases-all-selected.png — all 5 rows selected via select-all
- r5c-bulk-delete-dialog.png — bulk delete confirmation dialog with list
- r5c-bulk-print-list.png — choose invoice dialog
- r5c-bulk-print-invoice-opened.png — invoice dialog opened via bulk print
- r5c-bulk-export-toast.png — sonner toast "Export complete"

# Implementation Notes
- Budget empty state uses framer-motion `emptyStateVariants` (fade-in + scale + slide up)
- "Skip for now" button is a plain `<button>` with hover:underline styling
- "Set Budget →" button uses `bg-gradient-to-r from-amber-500 to-orange-600` + `hover:shadow-lg`
- Today's Meals empty state has matching treatment but with UtensilsCrossed icon
- Chart uses SVG `<pattern id="empty-month-hatch">` with diagonal amber lines for empty months
- Tooltip formatter checks `item.payload.hasData` and shows italic "No data recorded this month" once (hides operating cost entry)
- Below the chart, a row of amber "No data" badges shows each empty month with a hatched CSS background swatch
- Summary cards: Avg now uses only `withData` months; Highest/Lowest only consider `hasData === true` months; if no data at all, value shows "N/A"
- Bulk actions: Set<string> for selectedIds, useMemo for selectedPurchases
- Sticky `top-0 z-20` bulk bar with `motion.div` slide-down animation (initial y=-12, animate y=0)
- Per-row action buttons (Eye, Printer, Trash2) are disabled when isSelectionMode
- Row click behavior switches: in selection mode → toggleSelect; otherwise → handleViewDetail
- Selection auto-clears on page/filter change via useEffect dependency
- Bulk delete: sequential DELETE calls, success/failure counters, sonner toast
- Bulk CSV export: reuses `downloadCSV` from `@/lib/export-utils`, columns: Date, Supplier, Invoice No, Items Count, Total Amount, Status
- Bulk print: opens a "choose invoice" Dialog with numbered list, clicking any invoice opens the printable invoice Dialog; "Open First Invoice" button at the bottom

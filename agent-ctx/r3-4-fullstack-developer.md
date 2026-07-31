# Task r3-4 — Data Backup / Restore

**Agent:** fullstack-developer
**Task:** Add Data Backup/Restore functionality to the RCS Canteen Settings page

## Files Touched

1. **`/src/app/api/backup/route.ts`** (NEW — 471 lines)
   - `GET /api/backup` — Exports all data as a downloadable JSON file
   - `POST /api/backup` — Imports/restores data from a JSON payload

2. **`/src/components/module-views/settings-view.tsx`** (MODIFIED)
   - Added imports: `useRef`, `useToast`, lucide icons (`Download`, `Upload`, `FileJson`, `FileUp`, `CalendarClock`, `HardDriveDownload`)
   - Added backup types: `BackupCounts`, `BackupMetadata`, `BackupFile`
   - Added `LAST_BACKUP_KEY = "rcs-canteen-last-backup"` constant
   - Added helpers: `formatBytes`, `formatRelativeDate`, `isStaleBackup`, `validateBackupFile`
   - Added component state: `lastBackupDate`, `isExporting`, `lastExportInfo`, `pendingImport`, `importError`, `isImporting`, `importProgress`, `importSuccess`, `confirmOpen`
   - Added handlers: `handleExport`, `handleFileSelected`, `handleConfirmImport`, `handleCancelImport`
   - Added a new "Data Backup & Restore" Card placed after the Budget & Alerts card
   - Two-column layout (Export / Import), amber-themed, with auto-backup reminder banner
   - Restore confirmation `AlertDialog` with record-count breakdown + warning text
   - Progress bar shown during import; success/error messages after

## API Details

### GET /api/backup
- Fetches all 6 collections in parallel: `ingredients`, `recipes (with ingredients)`, `stockMovements`, `dailyMealServed`, `purchases (with items)`, `expenses`
- Flattens nested `recipes[].ingredients` → top-level `recipeIngredients` and `purchases[].items` → top-level `purchaseItems` for clean restore
- Strips nested arrays from the exported recipes/purchases
- Builds metadata: `{ version, exportDate, app, counts: {ingredients, recipes, recipeIngredients, stockMovements, dailyMeals, purchases, purchaseItems, expenses, total} }`
- Returns JSON with `Content-Type: application/json` and `Content-Disposition: attachment; filename="rcs-canteen-backup-YYYY-MM-DD.json"`

### POST /api/backup
- Validates body shape (must have `data` object with at least one array collection)
- Backwards-compatible: derives `recipeIngredients`/`purchaseItems` from nested `recipes[].ingredients`/`purchases[].items` if top-level arrays are absent
- Clears existing data in dependency order (children first) inside a single `$transaction` for atomicity:
  1. `stockMovement`, 2. `dailyMealServed`, 3. `purchaseItem`, 4. `purchase`, 5. `expense`, 6. `recipeIngredient`, 7. `recipe`, 8. `ingredient`
- Restores in dependency order (parents first):
  1. `ingredient` → 2. `recipe` → 3. `recipeIngredient` → 4. `stockMovement` → 5. `dailyMealServed` → 6. `expense` → 7. `purchase` → 8. `purchaseItem`
- Link-table rows that reference missing FKs are skipped (try/catch) instead of failing the whole import
- Returns `{ success, message, importedAt, counts }` on success or `{ error, details }` on failure
- Helper functions (`toDate`, `toNumber`, `toStr`, `toNullableStr`) coerce any string/number/null to the right Prisma field type

## UI Features

### Backup Card layout
- Card spans full width (`md:col-span-2`) — placed right after the Budget & Alerts card
- Header has title with `HardDriveDownload` icon + two badges:
  - `CalendarClock` "Last backup: <relative time>" (reads from `localStorage["rcs-canteen-last-backup"]`)
  - `Database` "{totalRecords} records" (computed from existing data summary)
- Auto-backup reminder banner (amber) when no backup or last backup > 7 days old

### Export section (left column)
- Amber Download icon header
- "Download Backup" button (amber solid) → triggers `GET /api/backup`
- Uses `Blob` + temporary `<a download>` element to trigger browser download
- Filename: `rcs-canteen-backup-YYYY-MM-DD.json`
- After export: shows green summary with file size + record counts breakdown
- Toast notification on success/failure
- Updates `localStorage["rcs-canteen-last-backup"]` with current ISO timestamp

### Import section (right column)
- Amber Upload icon header (with `border-2` for emphasis)
- Amber warning banner explaining REPLACE ALL semantics
- Hidden `<input type="file" accept=".json">` triggered by "Select Backup File" button
- On file select: reads text, parses JSON, validates shape via `validateBackupFile`
- 50 MB file size guard
- On valid file → opens AlertDialog confirmation showing:
  - File name + size
  - Record counts breakdown (ingredients/recipes/stockMovements/dailyMeals/purchases/expenses/total)
  - Strong warning about permanent data replacement
  - Cancel / "Yes, restore data" buttons
- On confirm → POST `/api/backup` with `{ metadata, data }` body
- Animated progress bar (simulated, 8% → 95% → 100%)
- After success: green summary with imported counts, calls `fetchDataSummary()` + `fetchBudgetData()` to refresh
- Toast notifications throughout
- Error state shows red alert box

## Verification

- `bun run lint` — **0 errors, 0 warnings** (one pre-existing warning in `suppliers-view.tsx`, unrelated)
- `bunx tsc --noEmit --skipLibCheck` — **0 errors in `src/app/api/backup/route.ts` and `src/components/module-views/settings-view.tsx`**
- Verified all 6 new lucide-react icons exist (`Download`, `Upload`, `FileJson`, `FileUp`, `CalendarClock`, `HardDriveDownload`)
- All existing Settings functionality (Budget & Alerts, Canteen Info, Quick Actions, Data Summary, About) preserved unchanged
- Dev server was down at end of session (db:push ran during dev); code is fully lint-clean and type-clean

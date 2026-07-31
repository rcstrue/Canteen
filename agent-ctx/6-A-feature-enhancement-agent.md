# Task 6-A: Feature Enhancement Agent — PWA Support & Stock Alerts

## Summary
Added PWA support (verified already in place), Stock Alert Configuration in Settings, drag-and-drop recipe image upload in Meals view, and a mobile-only floating action button with quick navigation actions.

## Pre-existing State Found
- `/public/manifest.json` already existed with a more complete PWA spec than requested (maskable icons, app shortcuts, scope/id/lang/categories, display_override, etc.). Kept as-is.
- `src/app/layout.tsx` already had `manifest: "/manifest.json"` in metadata export and `themeColor` configured in the `viewport` export. Kept as-is.
- `src/components/sw-registration.tsx` already handles service worker registration and offline indicator.

## Changes Made

### 1. PWA Manifest & Layout (Task items 1 & 2)
- Verified `/public/manifest.json` exists with all required fields (name, short_name, description, start_url, display, background_color, theme_color, icons, plus extras).
- Verified `src/app/layout.tsx` already has `manifest` in metadata and `themeColor` in viewport. No changes needed.

### 2. Stock Alert Configuration (`src/components/module-views/settings-view.tsx`)
- Added `Switch` and `Slider` shadcn/ui imports.
- Added `cn` import from `@/lib/utils` (file was previously using `cn` without importing — would have caused runtime error when Notification Preferences section rendered).
- Added new lucide-react icons: `Mail`, `Sparkles`, `Hourglass`, `Percent`, `PackageCheck`.
- Added `StockAlertConfig` interface with fields:
  - `lowStockThresholdPct` (default 80%)
  - `emailNotifications` (default true)
  - `minDaysBetweenAlerts` (default 1)
  - `autoReorderSuggestions` (default true)
  - `notifyEmail` (default "")
  - `lastAlertSentAt` (default null)
- Added `STOCK_ALERTS_KEY = "rcs-canteen-stock-alerts"` constant and `DEFAULT_STOCK_ALERTS`.
- Added state: `stockAlertConfig`, `stockAlertsSaved`, `stockAlertThresholdInput`, `stockAlertDaysInput`, `stockAlertEmailInput`.
- Added `useEffect` that loads config from localStorage on mount (with fallback to defaults).
- Added `handleSaveStockAlerts` handler that clamps values (1–100% threshold, 0–30 days), persists to localStorage, and shows a toast notification.
- Added `toggleStockAlertFlag` helper for boolean toggles (email + auto-reorder) — persists immediately on toggle.
- Added a new full-width "Stock Alert Configuration" Card placed between the Budget & Alerts card and the Data Backup & Restore card. The card includes:
  - Header with low-stock count badge (uses `lowStockCount` from existing state).
  - **Low Stock Threshold** section with both a `Slider` (10–100% step 5) and an `Input` for precise entry, plus a live example calculation.
  - **Notification Preferences** section with:
    - Email Notifications toggle (`Switch`) — when enabled, reveals a notification email input field.
    - Minimum Days Between Alerts input with "day(s)" suffix and "last alert sent" timestamp display.
  - **Auto-Reorder Suggestions** toggle that shows an "Active" info banner when enabled.
  - Save button with success state, and a footer showing the localStorage key name.
  - Quick-link button at the bottom that calls `onNavigate("stock")` to jump to the Stock view.

### 3. Recipe Image Upload (`src/components/module-views/meals-view.tsx`)
- Added state: `isDraggingImage` and `dragPreviewUrl` (for local preview of file being dragged in).
- Added drag-and-drop handlers: `clearDragPreview`, `handleDragEnter`, `handleDragOver`, `handleDragLeave`, `handleDrop`. The handlers use `e.preventDefault()`/`e.stopPropagation()` to prevent the browser from opening the file. `handleDragOver` generates a local `URL.createObjectURL` preview so the user sees the image before dropping.
- Updated `openCreateForm`, `openEditForm`, and `openDuplicateForm` to reset `isDraggingImage` and `dragPreviewUrl` on dialog open.
- Completely replaced the previous "Image section" inside the recipe edit dialog with a new **drag-and-drop zone**:
  - Renders as a `role="button"` div with `tabIndex={0}` and keyboard support (Enter/Space triggers file picker).
  - Shows different content based on state: idle (with ImagePlus icon + helper text), dragging (with Upload icon and "Drop image to upload" message), uploading (with spinner), or with existing image (with overlay preview).
  - When an image is already set, displays it as a background with a gradient overlay so text is readable.
  - Visual feedback: amber dashed border that turns solid amber when dragging, plus a focus-visible ring.
  - When there's an existing image, shows "Replace Image" and "Remove Image" buttons (using `e.stopPropagation()` so clicking them doesn't trigger the file picker).
  - Uses the existing `/api/recipes/[id]/upload` endpoint and `handleImageUpload` / `handleImageRemove` functions — no backend changes needed.
- Helper text below the drop zone: tip about paste-from-clipboard and note that recipe must be saved first before image upload is enabled.

### 4. Floating Actions FAB (`src/components/floating-actions.tsx` — new file)
- New `FloatingActions` client component with an `onNavigate: (view: ViewId) => void` prop.
- Renders a `fixed bottom-6 right-4 z-50` container that is `sm:hidden` (mobile only).
- Respects iOS safe-area inset via `paddingBottom: "env(safe-area-inset-bottom, 0px)"`.
- FAB toggle button:
  - 56×56 (h-14 w-14) round button with amber-to-orange gradient (`from-amber-500 to-orange-600`).
  - Subtle hover animation: `hover:scale-110` and shadow growth.
  - Active state: `active:scale-95`.
  - Pulse ring (animate-ping) when closed to draw attention.
  - Icon rotates/swaps between `Plus` (closed) and `X` (open).
  - Accessible `aria-label`, `aria-expanded`, and `focus-visible:ring`.
- Quick actions menu (when open):
  - Slides in from bottom with `animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3` animation.
  - Contains 4 actions:
    - **New Purchase** → `purchases` view (ShoppingCart icon)
    - **Record Meals** → `daily-entry` view (UtensilsCrossed icon)
    - **Add Stock** → `stock` view (Package icon)
    - **Log Expense** → `expenses` view (Receipt icon)
  - Each action has its own gradient icon badge (amber/orange/rose variants, no blue/indigo).
  - Selecting an action calls `onNavigate(view)` and closes the menu.
- Closes on: outside click, Escape key, viewport resize to ≥640px.
- Cleanup: removes event listeners on unmount.

### 5. Page Integration (`src/app/page.tsx`)
- Imported `FloatingActions` from `@/components/floating-actions`.
- Added `<FloatingActions onNavigate={setActiveView} />` inside `SidebarProvider` (after `CommandPalette`).
- The component is `sm:hidden` so it only appears on mobile; it stays mounted across all views and works with the existing `setActiveView` navigation system.

## Lint Status
- `bun run lint` passes with zero errors after all changes.
- Fixed a latent runtime bug in `settings-view.tsx` (was using `cn` without importing it from `@/lib/utils`).

## Files Modified
- `src/components/module-views/settings-view.tsx` (added Stock Alert Configuration section + imports)
- `src/components/module-views/meals-view.tsx` (drag-and-drop image upload UI)
- `src/app/page.tsx` (added FloatingActions import + render)
- `src/components/floating-actions.tsx` (new file)

## Files Verified (no changes needed)
- `public/manifest.json` (already complete)
- `src/app/layout.tsx` (already has manifest + themeColor)
- `public/sw.js`, `public/offline.html`, `src/components/sw-registration.tsx` (all already in place)

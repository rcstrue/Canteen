# Task 5: Budget Tracking System with Alerts

## Summary
Added a comprehensive Budget Tracking system with visual alerts to the RCS Canteen management app.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)
- Added `Budget` model with: id, month (unique YYYY-MM), foodBudget, operatingBudget, totalBudget, alertThreshold (default 80%), createdAt, updatedAt

### 2. API Endpoints
- `/src/app/api/budgets/route.ts` - GET (list all budgets) + POST (create/upsert budget for a month)
- `/src/app/api/budgets/[id]/route.ts` - GET + PUT + DELETE for individual budget records

### 3. Budget Status Component (`src/components/budget-status.tsx`)
- `BudgetStatus` component: Full mode (settings) and compact mode (dashboard)
- `BudgetGauge` component: Circular SVG gauge for budget utilization
- Color coding: green < 60%, amber 60-80%, red > 80% (configurable)
- Indian Rupee (₹) formatting

### 4. Settings View Updates (`src/components/module-views/settings-view.tsx`)
- Added `BudgetRecord` type for DB-backed budget data
- Budget data fetched from `/api/budgets` API with localStorage fallback
- Added Total Budget input field (3-column grid: Food, Operating, Total)
- Added Default Alert Threshold input field saved to DB
- Budget save persists to both localStorage and DB via POST /api/budgets
- Alert save persists to both localStorage and DB
- Added Total Budget row in budget history table with status indicators
- Added Past Months Budget History section showing previous months' budgets from DB

### 5. Dashboard View Updates (`src/components/module-views/dashboard-view.tsx`)
- Added Budget Overview card replacing Stock Health Gauge in the 2-column grid
- Shows food budget, operating budget, and total budget utilization with compact BudgetStatus
- "No Budget Set" empty state with link to Settings
- "Manage" button linking to Settings for budget management
- Stock Health Gauge moved to its own grid section

## Files Created
- `/src/app/api/budgets/route.ts`
- `/src/app/api/budgets/[id]/route.ts`
- `/src/components/budget-status.tsx`

## Files Modified
- `/prisma/schema.prisma` - Added Budget model
- `/src/components/module-views/settings-view.tsx` - DB-backed budget tracking
- `/src/components/module-views/dashboard-view.tsx` - Budget status card

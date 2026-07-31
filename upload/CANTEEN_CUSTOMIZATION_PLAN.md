# RCS Canteen – Customization Plan
**Repo:** https://github.com/rcstrue/Canteen  
**Base:** nrbnayon/restaurant-management-system (React 19 + TypeScript + Vite + Tailwind + Redux)

---

## 1. Your Requirement (Summary)

| Item | Detail |
|------|--------|
| Location | Dahej (industrial contract) |
| Scale | ~600 employees |
| Purpose | **Internal only** – Food Stock Management + Cost Management |
| Not needed | Employee ordering app, customer menu, tables, kitchen display, online orders |
| Goal | Control raw material stock, calculate cost per meal / daily / monthly, track wastage & purchases |

---

## 2. What the Current App Already Has (Useful)

| Feature | Status | Keep / Modify |
|---------|--------|---------------|
| Dashboard | Analytics & metrics | **Modify** → Cost & Stock focused |
| Inventory Management | Stock levels, supplies | **Keep & Expand** (core) |
| Menu Management | Items & categories | **Modify** → Treat as “Meal / Recipe” |
| Expense Tracking | Record expenses | **Keep & Expand** |
| Reports | Sales, inventory, performance | **Modify** → Cost & consumption reports |
| User Role Management | Role-based access | **Keep** (Admin / Store / Kitchen) |
| React + Vite + TypeScript + Tailwind + Redux | Full frontend | **Keep** |

---

## 3. What Must Be Removed / Hidden

These features are restaurant/POS oriented and **not needed** for pure internal stock + cost:

| Feature | Action | Reason |
|---------|--------|--------|
| Order Management | Remove or hide completely | No customer orders |
| Table Management | Remove | No seating |
| Kitchen Display System (KDS) | Remove | No real-time order kitchen |
| Customer-facing menu / cart | Remove | Internal only |
| Sales / Revenue focused charts | Replace | Focus on Cost, not Sales |

**Files / folders to clean (typical structure):**
- `src/Pages/Orders/` or similar
- `src/Pages/Tables/`
- `src/Pages/Kitchen/` or KDS related
- Related Redux slices, routes in `src/Routers/`, mock data in `src/data/`

---

## 4. What Must Be Added / Changed

### A. Core Modules to Build / Strengthen

#### 1. Ingredient / Raw Material Master
- Name, unit (kg, litre, pcs, etc.), category (Vegetables, Grains, Oil, Spices…)
- Current stock, minimum / par level
- Last purchase price & average cost
- Supplier link (optional)

#### 2. Recipe / Meal Costing (Most Important)
- Create standard meals (e.g. “Lunch Thali”, “Breakfast”, “Dinner”)
- Attach ingredients with exact quantities
- Auto-calculate **Cost per Meal**
- Support batch size (e.g. for 100 / 600 portions)

#### 3. Daily Production / Consumption Entry
- Enter number of meals served per day (or per shift)
- System auto-deducts theoretical ingredient consumption from recipes
- Manual stock adjustment for actual count / wastage

#### 4. Stock Movements
- Purchase entry (inward)
- Issue / consumption (outward)
- Wastage / spoilage entry
- Adjustment (physical count)

#### 5. Cost Dashboard & Reports
- Total food cost today / this week / this month
- Cost per meal (actual vs theoretical)
- Cost per employee (optional – total cost ÷ 600)
- Low stock alerts
- Top consuming ingredients
- Variance report (Theoretical vs Actual consumption)

#### 6. Expense Module (Enhance existing)
- Link expenses to food cost (purchase invoices)
- Utility costs (gas, electricity, water) – optional allocation to food cost

### B. UI / Branding Changes
- Change title from “Restaurant Management System” → **RCS Canteen – Stock & Cost**
- Update logo, favicon, sidebar labels
- Remove restaurant language (“Tables”, “Orders”, “Kitchen Display”)
- Use industrial/canteen language:
  - Inventory → **Stock / Raw Materials**
  - Menu → **Meals / Recipes**
  - Expenses → **Purchases & Expenses**
  - Reports → **Cost & Consumption Reports**

### C. Data Layer (Critical)
Current app uses **mock data** (`src/data/`).

For real use you must add a backend:

| Option | Recommendation | Notes |
|--------|----------------|-------|
| **Option A** | Firebase / Supabase | Fastest for MVP, real-time, free tier |
| **Option B** | Node.js + Express + MongoDB/PostgreSQL | Full control |
| **Option C** | PHP + MySQL (Laravel / plain) | If team prefers PHP |

**Minimum tables needed:**
```
ingredients
recipes
recipe_ingredients
stock_movements
daily_meals_served
purchases
expenses
users
```

---

## 5. Recommended New Sidebar Structure

```
Dashboard          → Cost overview, low stock, today’s meals
Stock              → Raw materials list + current quantity
Meals / Recipes    → Recipe costing (cost per meal)
Daily Entry        → Meals served today + stock adjustment
Purchases          → Inward stock + invoices
Wastage            → Spoilage / waste entry
Reports            → Cost reports, variance, consumption
Expenses           → Other expenses
Users / Settings   → Roles & configuration
```

---

## 6. Step-by-Step Implementation Plan

### Phase 1 – Cleanup (1–2 days)
1. Fork is already done → https://github.com/rcstrue/Canteen
2. Remove Order, Table, Kitchen Display pages & routes
3. Update README, package.json name, index.html title
4. Change branding (logo, app name, sidebar)

### Phase 2 – Strengthen Existing Inventory (2–3 days)
1. Expand Inventory page → full CRUD for ingredients
2. Add unit, par level, current cost fields
3. Add low-stock visual indicators

### Phase 3 – Recipe Costing (3–5 days)
1. New “Meals / Recipes” page
2. Link ingredients with quantities
3. Auto calculate cost per portion
4. Support scaling for 600 employees

### Phase 4 – Daily Operations (3–4 days)
1. Daily Meals Served entry form
2. Auto stock deduction based on recipes
3. Manual adjustment + wastage entry
4. Stock movement history

### Phase 5 – Cost Reports & Dashboard (2–3 days)
1. Redesign Dashboard (cost focused)
2. Reports: daily cost, monthly cost, cost/meal, variance
3. Export to Excel/PDF (optional)

### Phase 6 – Backend Integration (ongoing)
1. Replace mock data with real API
2. Authentication (keep existing role system)
3. Deploy (Vercel for frontend + backend of choice)

---

## 7. Quick Wins You Can Do Immediately

| Change | File(s) to touch | Effort |
|--------|------------------|--------|
| Change app title | `index.html`, `package.json`, sidebar component | 10 min |
| Hide Orders / Tables menu items | Sidebar / Router | 30 min |
| Rename “Menu” → “Meals” | Sidebar + page titles | 15 min |
| Update README | `README.md` | 20 min |
| Add “Cost per Meal” column in inventory/menu | Inventory / Menu page | 1–2 hrs |

---

## 8. Suggested New README Title

```md
# RCS Canteen – Stock & Cost Management

Internal canteen management system for industrial contracts.
Focused on food stock control and accurate cost management for ~600 employees at Dahej.

Built on React + TypeScript + Vite.
```

---

## 9. Priority Order for Development

1. **Highest** → Ingredient Master + Recipe Costing (cost per meal)
2. **High** → Daily meals served + auto stock deduction
3. **High** → Cost Dashboard & Reports
4. **Medium** → Purchases & Wastage
5. **Later** → Backend + multi-user + export

---

## 10. Notes for 600 Employees Scale

- Enter **number of meals served** daily (not individual employee orders).
- System calculates theoretical consumption = (meals × recipe quantity).
- Physical stock count (weekly/monthly) gives actual vs theoretical variance → wastage / leakage control.
- Cost per meal = Total food cost of period ÷ Total meals served.
- Optional: Cost per employee = Total food cost ÷ 600.

---

**Document prepared for:** rcstrue/Canteen  
**Date:** 31 July 2026  
**Purpose:** Convert restaurant POS app into pure internal Canteen Stock + Cost system

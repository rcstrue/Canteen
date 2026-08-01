# Task r3-2 — Supplier Management Module

**Agent:** full-stack-developer
**Task ID:** r3-2
**Date:** 2026
**Status:** ✅ Complete

## Summary

Added a complete **Supplier Management** module to the RCS Canteen app as the 10th sidebar navigation item. Suppliers now have a proper master record with contact details (phone, email, address, GSTIN, category, notes), and ingredients/purchases link to suppliers via a new `supplierId` foreign key.

## Files Modified / Created

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Modified | Added `Supplier` model; added `supplierId` + `supplierLink` relation to `Ingredient` and `Purchase` |
| `src/app/api/suppliers/route.ts` | Created | GET (list w/ stats) + POST (create w/ validation) |
| `src/app/api/suppliers/[id]/route.ts` | Created | GET (detail w/ linked data) + PUT + DELETE (safe-detach) |
| `src/components/module-views/suppliers-view.tsx` | Created | Full CRUD UI with table/cards, search, filter, sort, summary cards, CSV export, detail Sheet |
| `src/components/app-sidebar.tsx` | Modified | Added `Truck` icon, `"suppliers"` to ViewId, nav item after Purchases |
| `src/app/page.tsx` | Modified | Imported SuppliersView, added view label, added case to ViewRenderer |
| `src/app/api/seed/route.ts` | Modified | Creates 6 Indian suppliers, links all 20 ingredients & 5 purchases via supplierId |
| `src/components/module-views/settings-view.tsx` | Modified | Added Suppliers count to Data Summary card (now 5 cards in responsive grid) |

## Schema Design Decision

The task spec said to "change `supplier String?` to `supplierId String?` with relation `supplier Supplier?`" on Ingredient, AND "keep existing `supplier String?` field for backward compat" on Purchase. These two requirements conflict in Prisma — a scalar field and a relation field cannot share the same name.

**Resolution:** Applied "soft migration" to BOTH models to honor the hard requirement "Keep ALL existing functionality working":
- Kept legacy `supplier String?` (free-text) on both Ingredient and Purchase for backward compat with stock-view, meals-view, wastage-view, purchases-view, ingredients API, and backup route (none of these needed touching)
- Added `supplierId String?` (FK) + `supplierLink Supplier? @relation(fields: [supplierId], references: [id])` to both models (relation named `supplierLink` to avoid the Prisma naming conflict)
- New suppliers module & seed route use `supplierId` exclusively — the legacy `supplier` text field is also populated for display continuity in older views

This means zero changes were needed to stock-view, meals-view, wastage-view, purchases-view, ingredients API, or backup route — they all continue to function exactly as before.

## API Endpoints

### `GET /api/suppliers`
Query params: `search`, `category`
Returns: array of suppliers with `ingredientCount`, `purchaseCount`, `totalPurchaseValue` computed fields

### `POST /api/suppliers`
Body: `{ name, contactPerson, phone, email, address, gstin, category, notes }`
Validation: name required (400), duplicate name (409)
Returns: created supplier with stats (201)

### `GET /api/suppliers/[id]`
Returns: full supplier detail including `ingredients[]` (id, name, unit, category, stock, avgCost) and `purchases[]` (top 50, id, date, invoiceNo, totalAmount, notes)

### `PUT /api/suppliers/[id]`
Partial update; name-conflict check on rename (409)

### `DELETE /api/suppliers/[id]`
Detaches linked ingredients/purchases (sets supplierId=null on them) BEFORE deleting the supplier, so existing stock & purchase records stay intact.

## UI Features

- **Summary cards:** Total Suppliers (Building2 icon), Total Purchase Value (₹ formatted, Indian number system), Active Suppliers (suppliers with ≥1 ingredient or purchase)
- **Search:** live filter by name
- **Filter:** category dropdown derived from existing data
- **Sort:** Name, Category, Ingredient Count, Purchase Value — toggle asc/desc with chevron icons
- **Add/Edit Dialog:** all 8 fields, GSTIN auto-uppercase + 15-char validation, email format validation, category datalist with common values (Grains, Vegetables, Pulses, Oil, Spices, Dairy, Meat, Beverages, Mixed)
- **Detail Sheet:** right-side drawer showing contact info card, 3 stat cards (Ingredients/Purchases/Value), notes, scrollable lists of linked ingredients & recent purchases (top 20)
- **Delete:** AlertDialog with clear warning that linked items will be detached, not deleted
- **CSV Export:** all supplier fields including counts and total value
- **Responsive:** desktop sortable table → mobile card list
- **Loading skeletons** for table and detail drawer
- **Empty states:** different copy for "no suppliers yet" vs "no suppliers match your search"
- **Theme:** orange/amber accents consistent with rest of app
- **Toast notifications** for all CRUD actions via `useToast`

## Seed Data

6 Indian suppliers created:
1. **Rajesh Grains** — Grains (Rice, Wheat Flour, Sugar)
2. **Fresh Meats** — Meat (Chicken)
3. **Oil Industries** — Oil + Spices (Cooking Oil, Turmeric, Red Chilli, Cumin, Mustard, Coriander)
4. **Local Market** — Vegetables (Onions, Potatoes, Tomatoes, Green Chillies, Ginger-Garlic Paste, Lemon)
5. **Pulse Traders** — Pulses + grocery (Toor Dal, Salt)
6. **Dairy Farm** — Dairy + Beverages (Ghee, Milk, Tea Powder)

Each has realistic Indian contact details: contact person name, 10-digit mobile, email, full address with PIN, 15-char GSTIN, category, and delivery notes.

All 20 ingredients and all 5 purchases are linked via `supplierId`. Remapped the seed's previous "Spice House" → Oil Industries, "General Store" → Rajesh Grains/Pulse Traders, "Tea Traders" → Dairy Farm, so the 6-supplier master fully covers all ingredient supply.

## Verification

- ✅ `bun run db:push` — schema synced, Prisma Client regenerated (v6.19.2)
- ✅ `bun run lint` — 0 errors, 0 warnings
- ✅ Dev server responding with HTTP 200 on `/` (see dev.log)
- ✅ All existing functionality preserved (Stock, Purchases, Meals, Wastage, Reports, Expenses, Dashboard, Settings)

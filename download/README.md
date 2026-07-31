# RCS Canteen — Stock & Cost Management

A production-ready Next.js 16 application for managing **ingredient inventory**, **food cost**, and **operating expenses** of an internal canteen serving ~600 employees at the Dahej Industrial Contract site.

> 🍛 **Focus:** Stock & Cost only — no POS, no order taking, no kitchen display.

---

## ✨ Key Features

### 10 Functional Modules

| # | Module | What it does |
|---|--------|--------------|
| 1 | **Dashboard** | Live KPIs, 7-day cost trend, low-stock banner, activity timeline, quick stats, budget status, stock health gauge, today's meals |
| 2 | **Stock / Raw Materials** | Ingredient inventory with min/par levels, stock health badges (OK/LOW/CRITICAL), progress bars, add/edit/delete |
| 3 | **Meals / Recipes** | Recipe library with ingredients, cost-per-meal, meal-type categorization (Breakfast/Lunch/Dinner/Snack) |
| 4 | **Daily Entry** | Log daily meals served + auto stock deduction, stock adjustment entries |
| 5 | **Purchases** | Purchase records with multiple line items, supplier linking, status indicators, **printable invoices** |
| 6 | **Suppliers** | Supplier directory with contact info, category, total purchase value, active status |
| 7 | **Wastage** | Log wastage with severity badges, 7-day trend chart, top wasted items ranking |
| 8 | **Reports** | Cost/consumption/variance analysis, **6-month cost trend combo chart**, MoM comparisons |
| 9 | **Expenses** | Operating expense tracking with monthly trend, category breakdown, dd/mm/yyyy dates |
| 10 | **Settings** | User management (CRUD), budget & alerts, data backup/restore (JSON), past months budget history |

### Cross-Cutting Features

- 🔐 **Authentication** — NextAuth.js v4 with role-based access (Admin, Store, Kitchen, Staff)
- 💰 **Budget Tracking** — Monthly food/operating/total budgets with 80% alert threshold
- 📊 **Charts** — Recharts visualizations across dashboard, reports, wastage, expenses
- 📤 **CSV Export** — All tabular data exportable as CSV
- 💾 **JSON Backup/Restore** — Full data export/import via Settings
- 🖨️ **Print Invoices** — Purchase invoices printable with print-specific CSS
- 🌗 **Dark Mode** — Full light/dark theme support via next-themes
- 📱 **Responsive** — Mobile-first design, all views work on phone/tablet/desktop
- 🎨 **Orange/Amber Theme** — Canteen-themed warm palette throughout
- 🇮🇳 **Indian Format** — ₹ (INR) currency, DD/MM/YYYY dates, Indian number formatting
- ♿ **Accessibility** — ARIA labels, semantic HTML, keyboard navigation, focus-visible styling

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) · TypeScript 5
- **Styling**: Tailwind CSS v4 with shadcn/ui (New York style) · Lucide icons · Framer Motion
- **Database**: Prisma ORM + SQLite (`db/custom.db`)
- **Auth**: NextAuth.js v4 (Credentials provider, bcryptjs password hashing)
- **Charts**: Recharts (Bar/Line/Pie/Composed charts)
- **State**: React hooks + TanStack Query-ready API layer
- **Icons**: lucide-react

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Initialize database
bun run db:push

# 4. Start dev server
bun run dev

# 5. Visit http://localhost:3000
# Login: admin@rcs.com / admin123
```

---

## 🔑 Default Users

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@rcs.com` | `admin123` |
| Store | `store@rcs.com` | `store123` |
| Kitchen | `kitchen@rcs.com` | `kitchen123` |

> ⚠️ **Change these immediately in production** via Settings → User Management.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                    # 20+ API routes (REST)
│   │   ├── auth/[...nextauth]  # NextAuth endpoints
│   │   ├── auth/seed           # Seed default users
│   │   ├── ingredients/        # CRUD
│   │   ├── recipes/            # CRUD with ingredients
│   │   ├── stock-movements/    # Purchase/Wastage/Adjustment
│   │   ├── daily-meals/        # Daily meals served
│   │   ├── purchases/          # Purchase records + items
│   │   ├── suppliers/          # CRUD
│   │   ├── expenses/           # CRUD
│   │   ├── users/              # User management
│   │   ├── budgets/            # Budget tracking
│   │   ├── reports/            # cost/consumption/variance/monthly-trend
│   │   ├── dashboard/          # Aggregated dashboard data
│   │   ├── activity/           # Recent activity timeline
│   │   ├── backup/             # JSON export/import
│   │   └── seed/               # Demo data seeder
│   ├── globals.css             # Theme + custom CSS utilities
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Single-page app entry
├── components/
│   ├── app-sidebar.tsx         # Sidebar navigation
│   ├── budget-status.tsx       # Budget gauge widget
│   ├── notifications-dropdown.tsx
│   ├── auth/
│   │   ├── auth-provider.tsx   # NextAuth context
│   │   └── login-view.tsx      # Login page
│   ├── module-views/
│   │   ├── dashboard-view.tsx
│   │   ├── stock-view.tsx
│   │   ├── meals-view.tsx
│   │   ├── daily-entry-view.tsx
│   │   ├── purchases-view.tsx
│   │   ├── suppliers-view.tsx
│   │   ├── wastage-view.tsx
│   │   ├── reports-view.tsx
│   │   ├── expenses-view.tsx
│   │   └── settings-view.tsx
│   └── ui/                     # Complete shadcn/ui set
├── lib/
│   ├── db.ts                   # Prisma client
│   ├── export-utils.ts         # CSV export utilities
│   └── utils.ts                # cn() helper
├── hooks/                      # use-mobile, use-toast
└── types/                      # TypeScript declarations

prisma/
└── schema.prisma               # 9 models (User, Ingredient, Recipe, etc.)

db/
└── custom.db                   # SQLite database
```

---

## 📊 Database Schema (9 Models)

- **User** — Auth users (admin/store/kitchen/staff roles)
- **Ingredient** — Stock items with min/par levels, avg cost, last purchase price
- **Recipe** — Meal recipes with meal type, servings, instructions
- **RecipeIngredient** — Many-to-many join with quantity
- **StockMovement** — Purchase/Consumption/Wastage/Adjustment ledger
- **DailyMealServed** — Daily meal counts per type
- **Purchase** — Purchase header (supplier, invoice, total)
- **PurchaseItem** — Purchase line items
- **Expense** — Operating expenses (utilities, salary, etc.)
- **Supplier** — Vendor directory
- **Budget** — Monthly budget targets (food/operating/total)

---

## 🧪 QA Results (VLM)

Latest VLM scoring round (Round 3):

| View | Score | Notes |
|------|-------|-------|
| Dashboard | 8.5/10 | Low-stock banner + activity timeline + quick stats |
| Stock | 8.5/10 | Progress bars, health badges, hover effects |
| Meals | 8.5/10 | Color-coded meal types, cost trends |
| Daily Entry | 8.5/10 | Stock impact preview |
| Purchases | 8.5/10 | Status badges, timeline, **print invoices** |
| Suppliers | 8.5/10 | Hover cards, summary metrics |
| Wastage | 8.5/10 | 7-day trend chart, severity badges |
| Reports | 8/10 | **6-month cost trend combo chart** |
| Expenses | 8.5/10 | Monthly trend, dd/mm/yyyy dates |
| Settings | 8/10 | User management, budgets, backup/restore |

---

## 🚢 Deployment

See **[DEPLOY.md](./DEPLOY.md)** for comprehensive Linux shared hosting / VPS deployment guide including:
- cPanel Node.js app setup
- Apache reverse proxy (`.htaccess`)
- Nginx reverse proxy config
- PM2 process management
- SSL/HTTPS setup
- Backup strategy (cron)
- Security hardening
- PostgreSQL migration path

---

## 📝 License

Internal use only — RCS Canteen, Dahej Industrial Contract.

**v1.1.0 · © 2026**

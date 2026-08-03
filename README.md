# RCS Canteen Management System

Comprehensive canteen management system for the Dahej industrial contract (~600 employees). Built with Next.js 16, Prisma ORM, and SQLite.

## Features

- **Dashboard** - Real-time overview of food costs, meals served, stock alerts, and budget status
- **Stock Management** - Track ingredients with current stock, minimum levels, average cost, and supplier links
- **Recipe Management** - Define recipes with ingredients, automatically calculate costs per serving
- **Daily Entry** - Record meals served, auto-deduct stock based on recipe ingredients
- **Purchase Tracking** - Multi-item purchases with auto stock updates and cost averaging
- **Supplier Management** - Vendor master with contact info, purchase history, and performance tracking
- **Wastage Tracking** - Record and monitor ingredient wastage
- **Budget Management** - Monthly budgets with utilization alerts
- **Expense Tracking** - Operating expenses (Gas, Electricity, Water, Maintenance, Other)
- **Reports** - Cost trends, consumption analysis, expense breakdowns
- **Audit Log** - Complete activity tracking for all changes
- **User Management** - Role-based access (admin, store, kitchen, staff)
- **Backup/Export** - Full JSON backup of all data

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite via Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Auth**: JWT (jose + bcryptjs)
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ (tested with v20+)
- npm or bun

### Installation

```bash
# Clone the repo
git clone https://github.com/rcstrue/Canteen.git
cd Canteen

# Install dependencies
npm install

# Setup database
npx prisma db push

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

### First Login

1. Open http://localhost:3000
2. The app auto-seeds default data on first load
3. Login with: **admin@rcs-canteen.com** / **admin123**

### Default Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rcs-canteen.com | admin123 |
| Kitchen | staff@rcs-canteen.com | staff123 |
| Store | store@rcs-canteen.com | store123 |

## Production Deployment

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Shared Hosting (DirectAdmin)
```bash
# Build locally
npm run build

# Upload to server
scp -r .next/standalone/ user@server:~/canteen/
scp -r .next/static/ user@server:~/canteen/.next/
scp -r public/ user@server:~/canteen/
scp -r db/ user@server:~/canteen/
scp -r prisma/ user@server:~/canteen/
scp package.json user@server:~/canteen/

# On server (with NVM)
cd ~/canteen
npm install --production
npx prisma generate
PORT=3001 node server.js
```

### Auto-start with PM2
```bash
npm install -g pm2
pm2 start server.js --name canteen -- --port 3001
pm2 save
# Add to crontab for auto-restart:
# @reboot /home/user/.nvm/versions/node/v20.20.2/bin/pm2 resurrect
```

## Project Structure

```
├── prisma/
│   └── schema.prisma       # Database schema (13 models)
├── db/
│   └── custom.db           # SQLite database file
├── src/
│   ├── app/
│   │   ├── page.tsx        # Main app (single-page with sidebar)
│   │   ├── layout.tsx      # Root layout with theme provider
│   │   ├── globals.css     # Global styles + CSS variables
│   │   └── api/            # API routes
│   │       ├── auth/       # Login, seed
│   │       ├── dashboard/  # Dashboard aggregation
│   │       ├── ingredients/ # CRUD
│   │       ├── recipes/    # CRUD
│   │       ├── daily-meals/ # Record meals
│   │       ├── purchases/  # CRUD with stock update
│   │       ├── suppliers/  # CRUD
│   │       ├── expenses/   # CRUD
│   │       ├── budgets/    # CRUD with upsert
│   │       ├── stock-movements/ # Stock tracking
│   │       ├── audit-logs/ # Activity log
│   │       ├── users/      # User management
│   │       └── backup/     # Full data export
│   ├── components/
│   │   └── ui/             # shadcn/ui components
│   └── lib/
│       ├── db.ts           # Prisma client
│       ├── auth-jwt.ts     # JWT auth utilities
│       ├── auth-store.ts   # Zustand auth state
│       ├── audit.ts        # Audit logging
│       ├── recipe-cost.ts  # Recipe cost calculator
│       └── utils.ts        # Utility functions
├── public/                 # Static assets
└── .env                    # Environment variables
```

## Key Design Decisions

1. **SQLite over MySQL** - No database server needed, file-based, works on any shared hosting
2. **JWT over NextAuth** - Simpler, no session database needed, works with standalone output
3. **Standalone output** - Self-contained production build, no node_modules needed on server
4. **Single-page app** - All views rendered client-side, API routes for data

## License

Private - RCS Canteen Team

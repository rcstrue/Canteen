#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# RCS Canteen - MySQL Shared Hosting Deployment Script
# ═══════════════════════════════════════════════════════════════
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║   RCS Canteen - Deployment Setup              ║"
echo "║   MySQL + Shared Hosting                      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── Step 1: Check .env ───
if [ ! -f .env ]; then
  echo "❌ No .env file found!"
  echo "📝 Creating .env from template..."
  cp .env.example .env
  echo ""
  echo "⚠️  IMPORTANT: Edit .env with your MySQL credentials:"
  echo "   nano .env"
  echo ""
  echo "   DATABASE_URL format:"
  echo "   mysql://USERNAME:PASSWORD@localhost:3306/DATABASE_NAME"
  echo ""
  echo "   Example for cPanel:"
  echo "   mysql://rcsfaxhz_canteen:MyPass123@localhost:3306/rcsfaxhz_canteen"
  echo ""
  read -p "Press Enter after you've edited .env..."
fi

# ─── Step 2: Install dependencies ───
echo "📦 Installing dependencies..."
bun install 2>/dev/null || npm install

# ─── Step 3: Generate Prisma Client ───
echo "⚙️  Generating Prisma Client..."
bun run db:generate 2>/dev/null || npx prisma generate

# ─── Step 4: Push schema to MySQL ───
echo "🗄️  Pushing database schema to MySQL..."
echo "   (This will create all tables in your MySQL database)"
bun run db:push 2>/dev/null || npx prisma db push --accept-data-loss

# ─── Step 5: Seed initial data ───
echo "🌱 Seeding initial data (admin user, suppliers, ingredients)..."
curl -s -X POST http://localhost:3000/api/seed > /dev/null 2>&1 || echo "   (Seed will run after server starts)"

# ─── Step 6: Build ───
echo "🏗️  Building production app..."
bun run build 2>/dev/null || npm run build

# ─── Step 7: Start with PM2 ───
echo "🚀 Starting application with PM2..."
pm2 delete rcs-canteen 2>/dev/null || true
pm2 start "bun run start" --name rcs-canteen 2>/dev/null || pm2 start "npm run start" --name rcs-canteen
pm2 save

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   ✅  RCS Canteen deployed successfully!       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "📍 App running at: http://localhost:3000"
echo "📊 PM2 status: pm2 status"
echo "📋 PM2 logs:   pm2 logs rcs-canteen"
echo "🔄 Restart:    pm2 restart rcs-canteen"
echo ""

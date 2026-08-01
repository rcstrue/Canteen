import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// All 25 canteen items as requested
const items = [
  { name: 'Rice', unit: 'kg', category: 'Grains', currentStock: 0, minStock: 50, lastPurchasePrice: 45, avgCost: 43 },
  { name: 'Atta', unit: 'kg', category: 'Grains', currentStock: 0, minStock: 30, lastPurchasePrice: 35, avgCost: 34 },
  { name: 'Oil', unit: 'litre', category: 'Oil', currentStock: 0, minStock: 15, lastPurchasePrice: 150, avgCost: 145 },
  { name: 'Dal (Toor)', unit: 'kg', category: 'Pulses', currentStock: 0, minStock: 20, lastPurchasePrice: 120, avgCost: 115 },
  { name: 'Salt', unit: 'kg', category: 'Spices', currentStock: 0, minStock: 5, lastPurchasePrice: 10, avgCost: 10 },
  { name: 'Mirch-P', unit: 'kg', category: 'Spices', currentStock: 0, minStock: 1, lastPurchasePrice: 350, avgCost: 340 },
  { name: 'Haldi-P', unit: 'kg', category: 'Spices', currentStock: 0, minStock: 1, lastPurchasePrice: 400, avgCost: 380 },
  { name: 'Jeera', unit: 'kg', category: 'Spices', currentStock: 0, minStock: 0.5, lastPurchasePrice: 500, avgCost: 480 },
  { name: 'Sukha Mirch', unit: 'kg', category: 'Spices', currentStock: 0, minStock: 1, lastPurchasePrice: 300, avgCost: 290 },
  { name: 'Tej Patta', unit: 'kg', category: 'Spices', currentStock: 0, minStock: 0.5, lastPurchasePrice: 600, avgCost: 580 },
  { name: 'Akha Masala', unit: 'kg', category: 'Spices', currentStock: 0, minStock: 0.5, lastPurchasePrice: 500, avgCost: 480 },
  { name: 'Rai', unit: 'kg', category: 'Spices', currentStock: 0, minStock: 0.5, lastPurchasePrice: 300, avgCost: 290 },
  { name: 'Dhania P', unit: 'kg', category: 'Spices', currentStock: 0, minStock: 0.5, lastPurchasePrice: 350, avgCost: 340 },
  { name: 'Garam Masala', unit: 'kg', category: 'Spices', currentStock: 0, minStock: 0.5, lastPurchasePrice: 450, avgCost: 430 },
  { name: 'EGG', unit: 'pcs', category: 'Dairy', currentStock: 0, minStock: 100, lastPurchasePrice: 7, avgCost: 6.5 },
  { name: 'FISH', unit: 'kg', category: 'Meat', currentStock: 0, minStock: 5, lastPurchasePrice: 300, avgCost: 290 },
  { name: 'CHICKEN', unit: 'kg', category: 'Meat', currentStock: 0, minStock: 10, lastPurchasePrice: 240, avgCost: 235 },
  { name: 'Aloo', unit: 'kg', category: 'Vegetables', currentStock: 0, minStock: 15, lastPurchasePrice: 20, avgCost: 22 },
  { name: 'Galka', unit: 'kg', category: 'Vegetables', currentStock: 0, minStock: 5, lastPurchasePrice: 25, avgCost: 23 },
  { name: 'Tomato', unit: 'kg', category: 'Vegetables', currentStock: 0, minStock: 10, lastPurchasePrice: 30, avgCost: 32 },
  { name: 'Onion', unit: 'kg', category: 'Vegetables', currentStock: 0, minStock: 10, lastPurchasePrice: 25, avgCost: 28 },
  { name: 'Adrak', unit: 'kg', category: 'Vegetables', currentStock: 0, minStock: 2, lastPurchasePrice: 60, avgCost: 55 },
  { name: 'Lehsun', unit: 'kg', category: 'Vegetables', currentStock: 0, minStock: 2, lastPurchasePrice: 80, avgCost: 75 },
  { name: 'Hari Mirch', unit: 'kg', category: 'Vegetables', currentStock: 0, minStock: 2, lastPurchasePrice: 40, avgCost: 38 },
]

async function main() {
  console.log(`🌱 Seeding ${items.length} canteen ingredients into MySQL...`)
  
  let created = 0
  let skipped = 0
  
  for (const item of items) {
    const existing = await prisma.ingredient.findFirst({ where: { name: item.name } })
    if (existing) {
      console.log(`  ⚠️  "${item.name}" already exists, skipping`)
      skipped++
      continue
    }
    const result = await prisma.ingredient.create({ data: item })
    console.log(`  ✅ "${result.name}" (${result.category}, ${result.unit})`)
    created++
  }
  
  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`)
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())

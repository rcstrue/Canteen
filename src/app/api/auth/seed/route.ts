import { db } from '@/lib/db'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Check if admin already exists
    const existing = await db.user.findUnique({ where: { email: 'admin@rcs-canteen.com' } })
    if (existing) {
      return NextResponse.json({ message: 'Seed data already exists', seeded: false })
    }

    // Create admin user
    const hashedPassword = await hash('admin123', 10)
    const admin = await db.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@rcs-canteen.com',
        role: 'admin',
        password: hashedPassword,
      },
    })

    // Create staff user
    const staffPassword = await hash('staff123', 10)
    const staff = await db.user.create({
      data: {
        name: 'Kitchen Staff',
        email: 'staff@rcs-canteen.com',
        role: 'kitchen',
        password: staffPassword,
      },
    })

    // Create store user
    const storePassword = await hash('store123', 10)
    const storeUser = await db.user.create({
      data: {
        name: 'Store Manager',
        email: 'store@rcs-canteen.com',
        role: 'store',
        password: storePassword,
      },
    })

    // Create suppliers
    const suppliers = await Promise.all([
      db.supplier.create({
        data: {
          name: 'Rajesh Grains',
          contactPerson: 'Rajesh Patel',
          phone: '9825012345',
          email: 'rajesh@rajeshgrains.in',
          address: 'Shop 12, Grain Market, Dahej, Gujarat 392130',
          gstin: '24ABCDE1234F1Z5',
          category: 'Grains',
          notes: 'Weekly delivery on Mondays. 15-day credit terms.',
        },
      }),
      db.supplier.create({
        data: {
          name: 'Fresh Meats',
          contactPerson: 'Imran Khan',
          phone: '9825023456',
          email: 'orders@freshmeats.in',
          address: 'Plot 5, Meat Market, Dahej, Gujarat 392130',
          gstin: '24FGHIJ5678K1Z2',
          category: 'Meat',
          notes: 'Daily delivery before 7 AM. Cash on delivery.',
        },
      }),
      db.supplier.create({
        data: {
          name: 'Green Valley Vegetables',
          contactPerson: 'Suresh Patel',
          phone: '9825034567',
          email: 'info@greenvalley.in',
          address: 'Farm 8, Village Jhagadiya, Bharuch 392110',
          category: 'Vegetables',
          notes: 'Fresh produce daily. 7-day credit terms.',
        },
      }),
      db.supplier.create({
        data: {
          name: 'Amul Dairy Distributor',
          contactPerson: 'Mehul Shah',
          phone: '9825045678',
          category: 'Dairy',
          notes: 'Daily milk and dairy delivery. Monthly billing.',
        },
      }),
      db.supplier.create({
        data: {
          name: 'Spice World',
          contactPerson: 'Kamal Merchant',
          phone: '9825056789',
          category: 'Spices',
          notes: 'Monthly bulk supply. Good quality.',
        },
      }),
    ])

    // Create ingredients
    const ingredients = await Promise.all([
      db.ingredient.create({ data: { name: 'Rice (Basmati)', unit: 'kg', category: 'Grains', currentStock: 150, minStock: 50, lastPurchasePrice: 65, avgCost: 62, supplierId: suppliers[0].id } }),
      db.ingredient.create({ data: { name: 'Wheat Flour', unit: 'kg', category: 'Grains', currentStock: 200, minStock: 80, lastPurchasePrice: 40, avgCost: 38, supplierId: suppliers[0].id } }),
      db.ingredient.create({ data: { name: 'Toor Dal', unit: 'kg', category: 'Grains', currentStock: 80, minStock: 30, lastPurchasePrice: 120, avgCost: 115, supplierId: suppliers[0].id } }),
      db.ingredient.create({ data: { name: 'Chicken', unit: 'kg', category: 'Meat', currentStock: 40, minStock: 15, lastPurchasePrice: 220, avgCost: 210, supplierId: suppliers[1].id } }),
      db.ingredient.create({ data: { name: 'Eggs', unit: 'pcs', category: 'Meat', currentStock: 500, minStock: 200, lastPurchasePrice: 7, avgCost: 6.5, supplierId: suppliers[1].id } }),
      db.ingredient.create({ data: { name: 'Onion', unit: 'kg', category: 'Vegetables', currentStock: 60, minStock: 20, lastPurchasePrice: 30, avgCost: 28, supplierId: suppliers[2].id } }),
      db.ingredient.create({ data: { name: 'Potato', unit: 'kg', category: 'Vegetables', currentStock: 80, minStock: 30, lastPurchasePrice: 25, avgCost: 22, supplierId: suppliers[2].id } }),
      db.ingredient.create({ data: { name: 'Tomato', unit: 'kg', category: 'Vegetables', currentStock: 40, minStock: 15, lastPurchasePrice: 35, avgCost: 32, supplierId: suppliers[2].id } }),
      db.ingredient.create({ data: { name: 'Milk', unit: 'litre', category: 'Dairy', currentStock: 100, minStock: 40, lastPurchasePrice: 52, avgCost: 50, supplierId: suppliers[3].id } }),
      db.ingredient.create({ data: { name: 'Ghee', unit: 'kg', category: 'Dairy', currentStock: 15, minStock: 5, lastPurchasePrice: 550, avgCost: 540, supplierId: suppliers[3].id } }),
      db.ingredient.create({ data: { name: 'Cooking Oil', unit: 'litre', category: 'Oil', currentStock: 50, minStock: 20, lastPurchasePrice: 150, avgCost: 145 } }),
      db.ingredient.create({ data: { name: 'Turmeric Powder', unit: 'kg', category: 'Spices', currentStock: 5, minStock: 2, lastPurchasePrice: 280, avgCost: 270, supplierId: suppliers[4].id } }),
      db.ingredient.create({ data: { name: 'Red Chilli Powder', unit: 'kg', category: 'Spices', currentStock: 4, minStock: 2, lastPurchasePrice: 320, avgCost: 310, supplierId: suppliers[4].id } }),
      db.ingredient.create({ data: { name: 'Salt', unit: 'kg', category: 'Spices', currentStock: 20, minStock: 8, lastPurchasePrice: 20, avgCost: 18 } }),
      db.ingredient.create({ data: { name: 'Sugar', unit: 'kg', category: 'Grains', currentStock: 50, minStock: 20, lastPurchasePrice: 45, avgCost: 42 } }),
      db.ingredient.create({ data: { name: 'Tea Leaves', unit: 'kg', category: 'Beverages', currentStock: 8, minStock: 3, lastPurchasePrice: 400, avgCost: 380 } }),
    ])

    // Create recipes
    const recipes = await Promise.all([
      db.recipe.create({
        data: {
          name: 'Chicken Curry Rice',
          description: 'Chicken curry with steamed basmati rice',
          mealType: 'Lunch',
          baseServings: 100,
          instructions: 'Cook rice separately. Prepare chicken curry with spices. Serve together.',
          ingredients: {
            create: [
              { ingredientId: ingredients[0].id, quantity: 25, unit: 'kg' },
              { ingredientId: ingredients[3].id, quantity: 20, unit: 'kg' },
              { ingredientId: ingredients[5].id, quantity: 8, unit: 'kg' },
              { ingredientId: ingredients[7].id, quantity: 5, unit: 'kg' },
              { ingredientId: ingredients[10].id, quantity: 3, unit: 'litre' },
              { ingredientId: ingredients[11].id, quantity: 0.5, unit: 'kg' },
              { ingredientId: ingredients[12].id, quantity: 0.3, unit: 'kg' },
              { ingredientId: ingredients[13].id, quantity: 0.5, unit: 'kg' },
            ],
          },
        },
        include: { ingredients: true },
      }),
      db.recipe.create({
        data: {
          name: 'Dal Chawal',
          description: 'Toor dal with rice and tadka',
          mealType: 'Lunch',
          baseServings: 100,
          instructions: 'Cook toor dal with turmeric. Prepare rice. Make tadka with ghee and spices.',
          ingredients: {
            create: [
              { ingredientId: ingredients[0].id, quantity: 20, unit: 'kg' },
              { ingredientId: ingredients[2].id, quantity: 12, unit: 'kg' },
              { ingredientId: ingredients[9].id, quantity: 1, unit: 'kg' },
              { ingredientId: ingredients[10].id, quantity: 2, unit: 'litre' },
              { ingredientId: ingredients[11].id, quantity: 0.2, unit: 'kg' },
              { ingredientId: ingredients[12].id, quantity: 0.2, unit: 'kg' },
              { ingredientId: ingredients[13].id, quantity: 0.3, unit: 'kg' },
            ],
          },
        },
        include: { ingredients: true },
      }),
      db.recipe.create({
        data: {
          name: 'Tea with Snacks',
          description: 'Masala tea with biscuits',
          mealType: 'Breakfast',
          baseServings: 100,
          instructions: 'Boil tea with milk and spices. Serve with biscuits.',
          ingredients: {
            create: [
              { ingredientId: ingredients[8].id, quantity: 15, unit: 'litre' },
              { ingredientId: ingredients[15].id, quantity: 1.5, unit: 'kg' },
              { ingredientId: ingredients[14].id, quantity: 3, unit: 'kg' },
            ],
          },
        },
        include: { ingredients: true },
      }),
      db.recipe.create({
        data: {
          name: 'Egg Curry Rice',
          description: 'Boiled egg curry with rice',
          mealType: 'Dinner',
          baseServings: 100,
          instructions: 'Boil eggs. Prepare curry with onion-tomato base. Serve with rice.',
          ingredients: {
            create: [
              { ingredientId: ingredients[0].id, quantity: 22, unit: 'kg' },
              { ingredientId: ingredients[4].id, quantity: 200, unit: 'pcs' },
              { ingredientId: ingredients[5].id, quantity: 6, unit: 'kg' },
              { ingredientId: ingredients[7].id, quantity: 4, unit: 'kg' },
              { ingredientId: ingredients[10].id, quantity: 2, unit: 'litre' },
              { ingredientId: ingredients[11].id, quantity: 0.3, unit: 'kg' },
              { ingredientId: ingredients[12].id, quantity: 0.2, unit: 'kg' },
              { ingredientId: ingredients[13].id, quantity: 0.3, unit: 'kg' },
            ],
          },
        },
        include: { ingredients: true },
      }),
    ])

    // Create a budget for current month
    const currentMonth = new Date().toISOString().slice(0, 7)
    await db.budget.create({
      data: {
        month: currentMonth,
        foodBudget: 450000,
        operatingBudget: 500000,
        totalBudget: 500000,
        alertThreshold: 80,
      },
    })

    return NextResponse.json({
      message: 'Seed data created successfully',
      seeded: true,
      users: [admin, staff, storeUser].length,
      suppliers: suppliers.length,
      ingredients: ingredients.length,
      recipes: recipes.length,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// POST /api/seed - Seed sample data for testing
export async function POST() {
  try {
    // Clean up existing data (in reverse order of dependencies)
    await db.stockMovement.deleteMany()
    await db.dailyMealServed.deleteMany()
    await db.purchaseItem.deleteMany()
    await db.purchase.deleteMany()
    await db.expense.deleteMany()
    await db.recipeIngredient.deleteMany()
    await db.recipe.deleteMany()
    await db.ingredient.deleteMany()
    await db.supplier.deleteMany()
    await db.user.deleteMany()

    // 1. Create admin user
    const admin = await db.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@rcs-canteen.com',
        role: 'admin',
        password: 'admin123',
      },
    })

    // 1b. Create suppliers (vendor master)
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
          notes: 'Daily morning delivery by 7 AM. Cash on delivery.',
        },
      }),
      db.supplier.create({
        data: {
          name: 'Oil Industries',
          contactPerson: 'Suresh Shah',
          phone: '9825034567',
          email: 'sales@oilindustries.in',
          address: 'Industrial Area, Plot 28, Dahej, Gujarat 392130',
          gstin: '24KLMNO9012P1Z9',
          category: 'Oil',
          notes: 'Bulk oil + spices supply. Monthly billing.',
        },
      }),
      db.supplier.create({
        data: {
          name: 'Local Market',
          contactPerson: 'Mukesh Vegetablewala',
          phone: '9825045678',
          email: null,
          address: 'APMC Market, Bharuch, Gujarat 392001',
          gstin: null,
          category: 'Vegetables',
          notes: 'Fresh vegetables daily. Negotiable rates.',
        },
      }),
      db.supplier.create({
        data: {
          name: 'Pulse Traders',
          contactPerson: 'Anil Jain',
          phone: '9825056789',
          email: 'anil@pulsetraders.in',
          address: 'Shop 8, APMC Market, Bharuch, Gujarat 392001',
          gstin: '24PQRST3456U1Z6',
          category: 'Pulses',
          notes: 'Pulses & dry groceries. 30-day credit.',
        },
      }),
      db.supplier.create({
        data: {
          name: 'Dairy Farm',
          contactPerson: 'Mahesh Patel',
          phone: '9825067890',
          email: 'dairy@maheshfarm.in',
          address: 'Village Suvali, Surat, Gujarat 394510',
          gstin: '24VWXYZ7890A1Z3',
          category: 'Dairy',
          notes: 'Fresh milk + ghee daily. Weekly billing.',
        },
      }),
    ])

    // Helper to find supplier by name
    const findSupplier = (name: string) => suppliers.find((s) => s.name === name)!

    // 2. Create ingredients (linked to suppliers via supplierId)
    const ingredients = await Promise.all([
      db.ingredient.create({
        data: {
          name: 'Rice (Basmati)',
          unit: 'kg',
          category: 'Grains',
          currentStock: 150,
          minStock: 50,
          lastPurchasePrice: 45,
          avgCost: 43,
          supplier: 'Rajesh Grains',
          supplierId: findSupplier('Rajesh Grains').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Wheat Flour',
          unit: 'kg',
          category: 'Grains',
          currentStock: 100,
          minStock: 30,
          lastPurchasePrice: 35,
          avgCost: 34,
          supplier: 'Rajesh Grains',
          supplierId: findSupplier('Rajesh Grains').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Toor Dal',
          unit: 'kg',
          category: 'Pulses',
          currentStock: 60,
          minStock: 20,
          lastPurchasePrice: 120,
          avgCost: 115,
          supplier: 'Pulse Traders',
          supplierId: findSupplier('Pulse Traders').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Cooking Oil',
          unit: 'litre',
          category: 'Oil',
          currentStock: 40,
          minStock: 15,
          lastPurchasePrice: 150,
          avgCost: 145,
          supplier: 'Oil Industries',
          supplierId: findSupplier('Oil Industries').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Onions',
          unit: 'kg',
          category: 'Vegetables',
          currentStock: 30,
          minStock: 10,
          lastPurchasePrice: 25,
          avgCost: 28,
          supplier: 'Local Market',
          supplierId: findSupplier('Local Market').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Potatoes',
          unit: 'kg',
          category: 'Vegetables',
          currentStock: 50,
          minStock: 15,
          lastPurchasePrice: 20,
          avgCost: 22,
          supplier: 'Local Market',
          supplierId: findSupplier('Local Market').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Tomatoes',
          unit: 'kg',
          category: 'Vegetables',
          currentStock: 8,
          minStock: 10,
          lastPurchasePrice: 30,
          avgCost: 32,
          supplier: 'Local Market',
          supplierId: findSupplier('Local Market').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Green Chillies',
          unit: 'kg',
          category: 'Vegetables',
          currentStock: 5,
          minStock: 2,
          lastPurchasePrice: 40,
          avgCost: 38,
          supplier: 'Local Market',
          supplierId: findSupplier('Local Market').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Turmeric Powder',
          unit: 'kg',
          category: 'Spices',
          currentStock: 3,
          minStock: 1,
          lastPurchasePrice: 400,
          avgCost: 380,
          supplier: 'Oil Industries',
          supplierId: findSupplier('Oil Industries').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Red Chilli Powder',
          unit: 'kg',
          category: 'Spices',
          currentStock: 4,
          minStock: 1,
          lastPurchasePrice: 350,
          avgCost: 340,
          supplier: 'Oil Industries',
          supplierId: findSupplier('Oil Industries').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Cumin Seeds',
          unit: 'kg',
          category: 'Spices',
          currentStock: 2,
          minStock: 0.5,
          lastPurchasePrice: 500,
          avgCost: 480,
          supplier: 'Oil Industries',
          supplierId: findSupplier('Oil Industries').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Salt',
          unit: 'kg',
          category: 'Spices',
          currentStock: 15,
          minStock: 5,
          lastPurchasePrice: 10,
          avgCost: 10,
          supplier: 'Pulse Traders',
          supplierId: findSupplier('Pulse Traders').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Ghee',
          unit: 'kg',
          category: 'Dairy',
          currentStock: 10,
          minStock: 3,
          lastPurchasePrice: 550,
          avgCost: 540,
          supplier: 'Dairy Farm',
          supplierId: findSupplier('Dairy Farm').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Milk',
          unit: 'litre',
          category: 'Dairy',
          currentStock: 20,
          minStock: 10,
          lastPurchasePrice: 60,
          avgCost: 58,
          supplier: 'Dairy Farm',
          supplierId: findSupplier('Dairy Farm').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Chicken',
          unit: 'kg',
          category: 'Meat',
          currentStock: 25,
          minStock: 10,
          lastPurchasePrice: 240,
          avgCost: 235,
          supplier: 'Fresh Meats',
          supplierId: findSupplier('Fresh Meats').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Sugar',
          unit: 'kg',
          category: 'Grains',
          currentStock: 40,
          minStock: 15,
          lastPurchasePrice: 45,
          avgCost: 44,
          supplier: 'Rajesh Grains',
          supplierId: findSupplier('Rajesh Grains').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Tea Powder',
          unit: 'kg',
          category: 'Beverages',
          currentStock: 5,
          minStock: 2,
          lastPurchasePrice: 600,
          avgCost: 580,
          supplier: 'Dairy Farm',
          supplierId: findSupplier('Dairy Farm').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Mustard Seeds',
          unit: 'kg',
          category: 'Spices',
          currentStock: 1.5,
          minStock: 0.5,
          lastPurchasePrice: 300,
          avgCost: 290,
          supplier: 'Oil Industries',
          supplierId: findSupplier('Oil Industries').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Coriander Powder',
          unit: 'kg',
          category: 'Spices',
          currentStock: 2,
          minStock: 0.5,
          lastPurchasePrice: 350,
          avgCost: 340,
          supplier: 'Oil Industries',
          supplierId: findSupplier('Oil Industries').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Ginger-Garlic Paste',
          unit: 'kg',
          category: 'Spices',
          currentStock: 3,
          minStock: 1,
          lastPurchasePrice: 200,
          avgCost: 190,
          supplier: 'Local Market',
          supplierId: findSupplier('Local Market').id,
        },
      }),
      db.ingredient.create({
        data: {
          name: 'Lemon',
          unit: 'kg',
          category: 'Vegetables',
          currentStock: 5,
          minStock: 2,
          lastPurchasePrice: 80,
          avgCost: 75,
          supplier: 'Local Market',
          supplierId: findSupplier('Local Market').id,
        },
      }),
    ])

    // Helper to find ingredient by name
    const findIngredient = (name: string) => ingredients.find((i) => i.name === name)!

    // 3. Create recipes
    const dalRice = await db.recipe.create({
      data: {
        name: 'Dal Rice',
        description: 'Classic dal rice with tadka',
        mealType: 'Lunch',
        baseServings: 100,
        instructions: 'Cook rice and dal separately. Prepare tadka and mix.',
        ingredients: {
          create: [
            { ingredientId: findIngredient('Rice (Basmati)').id, quantity: 15, unit: 'kg' },
            { ingredientId: findIngredient('Toor Dal').id, quantity: 8, unit: 'kg' },
            { ingredientId: findIngredient('Cooking Oil').id, quantity: 2, unit: 'litre' },
            { ingredientId: findIngredient('Onions').id, quantity: 3, unit: 'kg' },
            { ingredientId: findIngredient('Tomatoes').id, quantity: 3, unit: 'kg' },
            { ingredientId: findIngredient('Turmeric Powder').id, quantity: 0.1, unit: 'kg' },
            { ingredientId: findIngredient('Red Chilli Powder').id, quantity: 0.15, unit: 'kg' },
            { ingredientId: findIngredient('Cumin Seeds').id, quantity: 0.1, unit: 'kg' },
            { ingredientId: findIngredient('Salt').id, quantity: 0.5, unit: 'kg' },
            { ingredientId: findIngredient('Mustard Seeds').id, quantity: 0.05, unit: 'kg' },
            { ingredientId: findIngredient('Ghee').id, quantity: 0.5, unit: 'kg' },
          ],
        },
      },
      include: { ingredients: true },
    })

    const chickenCurryRice = await db.recipe.create({
      data: {
        name: 'Chicken Curry Rice',
        description: 'Chicken curry served with steamed rice',
        mealType: 'Lunch',
        baseServings: 100,
        instructions: 'Marinate chicken. Cook curry with spices. Serve with rice.',
        ingredients: {
          create: [
            { ingredientId: findIngredient('Rice (Basmati)').id, quantity: 15, unit: 'kg' },
            { ingredientId: findIngredient('Chicken').id, quantity: 20, unit: 'kg' },
            { ingredientId: findIngredient('Cooking Oil').id, quantity: 3, unit: 'litre' },
            { ingredientId: findIngredient('Onions').id, quantity: 5, unit: 'kg' },
            { ingredientId: findIngredient('Tomatoes').id, quantity: 4, unit: 'kg' },
            { ingredientId: findIngredient('Ginger-Garlic Paste').id, quantity: 1, unit: 'kg' },
            { ingredientId: findIngredient('Turmeric Powder').id, quantity: 0.1, unit: 'kg' },
            { ingredientId: findIngredient('Red Chilli Powder').id, quantity: 0.2, unit: 'kg' },
            { ingredientId: findIngredient('Coriander Powder').id, quantity: 0.15, unit: 'kg' },
            { ingredientId: findIngredient('Cumin Seeds').id, quantity: 0.1, unit: 'kg' },
            { ingredientId: findIngredient('Salt').id, quantity: 0.5, unit: 'kg' },
            { ingredientId: findIngredient('Ghee').id, quantity: 0.3, unit: 'kg' },
          ],
        },
      },
      include: { ingredients: true },
    })

    const rotiSabzi = await db.recipe.create({
      data: {
        name: 'Roti Sabzi',
        description: 'Wheat roti with mixed vegetable curry',
        mealType: 'Lunch',
        baseServings: 100,
        instructions: 'Make roti dough. Prepare vegetable curry. Serve together.',
        ingredients: {
          create: [
            { ingredientId: findIngredient('Wheat Flour').id, quantity: 20, unit: 'kg' },
            { ingredientId: findIngredient('Potatoes').id, quantity: 8, unit: 'kg' },
            { ingredientId: findIngredient('Onions').id, quantity: 4, unit: 'kg' },
            { ingredientId: findIngredient('Tomatoes').id, quantity: 3, unit: 'kg' },
            { ingredientId: findIngredient('Cooking Oil').id, quantity: 2, unit: 'litre' },
            { ingredientId: findIngredient('Turmeric Powder').id, quantity: 0.1, unit: 'kg' },
            { ingredientId: findIngredient('Red Chilli Powder').id, quantity: 0.15, unit: 'kg' },
            { ingredientId: findIngredient('Coriander Powder').id, quantity: 0.1, unit: 'kg' },
            { ingredientId: findIngredient('Cumin Seeds').id, quantity: 0.1, unit: 'kg' },
            { ingredientId: findIngredient('Salt').id, quantity: 0.4, unit: 'kg' },
            { ingredientId: findIngredient('Green Chillies').id, quantity: 0.5, unit: 'kg' },
          ],
        },
      },
      include: { ingredients: true },
    })

    const breakfastPoha = await db.recipe.create({
      data: {
        name: 'Poha',
        description: 'Flattened rice with peanuts and spices',
        mealType: 'Breakfast',
        baseServings: 100,
        instructions: 'Wash poha. Prepare tempering. Mix and serve.',
        ingredients: {
          create: [
            { ingredientId: findIngredient('Rice (Basmati)').id, quantity: 8, unit: 'kg' },
            { ingredientId: findIngredient('Cooking Oil').id, quantity: 1.5, unit: 'litre' },
            { ingredientId: findIngredient('Onions').id, quantity: 2, unit: 'kg' },
            { ingredientId: findIngredient('Turmeric Powder').id, quantity: 0.05, unit: 'kg' },
            { ingredientId: findIngredient('Mustard Seeds').id, quantity: 0.05, unit: 'kg' },
            { ingredientId: findIngredient('Salt').id, quantity: 0.3, unit: 'kg' },
            { ingredientId: findIngredient('Green Chillies').id, quantity: 0.3, unit: 'kg' },
            { ingredientId: findIngredient('Lemon').id, quantity: 2, unit: 'kg' },
          ],
        },
      },
      include: { ingredients: true },
    })

    const tea = await db.recipe.create({
      data: {
        name: 'Chai',
        description: 'Indian masala tea',
        mealType: 'Snack',
        baseServings: 100,
        instructions: 'Boil water with tea powder and spices. Add milk and sugar.',
        ingredients: {
          create: [
            { ingredientId: findIngredient('Tea Powder').id, quantity: 0.5, unit: 'kg' },
            { ingredientId: findIngredient('Milk').id, quantity: 10, unit: 'litre' },
            { ingredientId: findIngredient('Sugar').id, quantity: 3, unit: 'kg' },
            { ingredientId: findIngredient('Ginger-Garlic Paste').id, quantity: 0.2, unit: 'kg' },
          ],
        },
      },
      include: { ingredients: true },
    })

    const dinnerKhichdi = await db.recipe.create({
      data: {
        name: 'Khichdi',
        description: 'Comforting rice and lentil dish',
        mealType: 'Dinner',
        baseServings: 100,
        instructions: 'Cook rice and dal together. Prepare tadka.',
        ingredients: {
          create: [
            { ingredientId: findIngredient('Rice (Basmati)').id, quantity: 12, unit: 'kg' },
            { ingredientId: findIngredient('Toor Dal').id, quantity: 6, unit: 'kg' },
            { ingredientId: findIngredient('Cooking Oil').id, quantity: 1.5, unit: 'litre' },
            { ingredientId: findIngredient('Onions').id, quantity: 2, unit: 'kg' },
            { ingredientId: findIngredient('Tomatoes').id, quantity: 2, unit: 'kg' },
            { ingredientId: findIngredient('Turmeric Powder').id, quantity: 0.1, unit: 'kg' },
            { ingredientId: findIngredient('Cumin Seeds').id, quantity: 0.1, unit: 'kg' },
            { ingredientId: findIngredient('Salt').id, quantity: 0.4, unit: 'kg' },
            { ingredientId: findIngredient('Ghee').id, quantity: 0.5, unit: 'kg' },
          ],
        },
      },
      include: { ingredients: true },
    })

    // 4. Create some purchases for the past month
    const today = new Date()
    const dates = [
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3),
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14),
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 21),
    ]

    const purchases = []

    // Purchase 1: Weekly groceries
    const purchase1 = await db.purchase.create({
      data: {
        date: dates[0],
        supplier: 'Rajesh Grains',
        supplierId: findSupplier('Rajesh Grains').id,
        invoiceNo: 'INV-2024-001',
        totalAmount: 0,
        notes: 'Weekly grains purchase',
        items: {
          create: [
            { ingredientId: findIngredient('Rice (Basmati)').id, quantity: 50, unitPrice: 45, totalAmount: 2250 },
            { ingredientId: findIngredient('Wheat Flour').id, quantity: 30, unitPrice: 35, totalAmount: 1050 },
            { ingredientId: findIngredient('Toor Dal').id, quantity: 20, unitPrice: 120, totalAmount: 2400 },
          ],
        },
      },
      include: { items: true },
    })
    await db.purchase.update({
      where: { id: purchase1.id },
      data: { totalAmount: purchase1.items.reduce((s, i) => s + i.totalAmount, 0) },
    })
    purchases.push(purchase1)

    // Purchase 2: Vegetables
    const purchase2 = await db.purchase.create({
      data: {
        date: dates[1],
        supplier: 'Local Market',
        supplierId: findSupplier('Local Market').id,
        invoiceNo: 'INV-2024-002',
        totalAmount: 0,
        notes: 'Vegetable supply',
        items: {
          create: [
            { ingredientId: findIngredient('Onions').id, quantity: 20, unitPrice: 25, totalAmount: 500 },
            { ingredientId: findIngredient('Potatoes').id, quantity: 25, unitPrice: 20, totalAmount: 500 },
            { ingredientId: findIngredient('Tomatoes').id, quantity: 15, unitPrice: 30, totalAmount: 450 },
            { ingredientId: findIngredient('Green Chillies').id, quantity: 3, unitPrice: 40, totalAmount: 120 },
          ],
        },
      },
      include: { items: true },
    })
    await db.purchase.update({
      where: { id: purchase2.id },
      data: { totalAmount: purchase2.items.reduce((s, i) => s + i.totalAmount, 0) },
    })
    purchases.push(purchase2)

    // Purchase 3: Oil & Spices
    const purchase3 = await db.purchase.create({
      data: {
        date: dates[2],
        supplier: 'Oil Industries',
        supplierId: findSupplier('Oil Industries').id,
        invoiceNo: 'INV-2024-003',
        totalAmount: 0,
        notes: 'Oil and spices',
        items: {
          create: [
            { ingredientId: findIngredient('Cooking Oil').id, quantity: 20, unitPrice: 150, totalAmount: 3000 },
            { ingredientId: findIngredient('Turmeric Powder').id, quantity: 2, unitPrice: 400, totalAmount: 800 },
            { ingredientId: findIngredient('Red Chilli Powder').id, quantity: 2, unitPrice: 350, totalAmount: 700 },
            { ingredientId: findIngredient('Cumin Seeds').id, quantity: 1, unitPrice: 500, totalAmount: 500 },
            { ingredientId: findIngredient('Coriander Powder').id, quantity: 1.5, unitPrice: 350, totalAmount: 525 },
            { ingredientId: findIngredient('Mustard Seeds').id, quantity: 1, unitPrice: 300, totalAmount: 300 },
          ],
        },
      },
      include: { items: true },
    })
    await db.purchase.update({
      where: { id: purchase3.id },
      data: { totalAmount: purchase3.items.reduce((s, i) => s + i.totalAmount, 0) },
    })
    purchases.push(purchase3)

    // Purchase 4: Meat & Dairy
    const purchase4 = await db.purchase.create({
      data: {
        date: dates[3],
        supplier: 'Fresh Meats',
        supplierId: findSupplier('Fresh Meats').id,
        invoiceNo: 'INV-2024-004',
        totalAmount: 0,
        notes: 'Meat and dairy',
        items: {
          create: [
            { ingredientId: findIngredient('Chicken').id, quantity: 30, unitPrice: 240, totalAmount: 7200 },
            { ingredientId: findIngredient('Ghee').id, quantity: 5, unitPrice: 550, totalAmount: 2750 },
            { ingredientId: findIngredient('Milk').id, quantity: 15, unitPrice: 60, totalAmount: 900 },
          ],
        },
      },
      include: { items: true },
    })
    await db.purchase.update({
      where: { id: purchase4.id },
      data: { totalAmount: purchase4.items.reduce((s, i) => s + i.totalAmount, 0) },
    })
    purchases.push(purchase4)

    // Purchase 5: Beverages & Grocery (remapped from "Tea Traders" to Dairy Farm which now supplies beverages)
    const purchase5 = await db.purchase.create({
      data: {
        date: dates[4],
        supplier: 'Dairy Farm',
        supplierId: findSupplier('Dairy Farm').id,
        invoiceNo: 'INV-2024-005',
        totalAmount: 0,
        notes: 'Beverages and sugar',
        items: {
          create: [
            { ingredientId: findIngredient('Tea Powder').id, quantity: 3, unitPrice: 600, totalAmount: 1800 },
            { ingredientId: findIngredient('Sugar').id, quantity: 20, unitPrice: 45, totalAmount: 900 },
            { ingredientId: findIngredient('Salt').id, quantity: 10, unitPrice: 10, totalAmount: 100 },
            { ingredientId: findIngredient('Ginger-Garlic Paste').id, quantity: 2, unitPrice: 200, totalAmount: 400 },
          ],
        },
      },
      include: { items: true },
    })
    await db.purchase.update({
      where: { id: purchase5.id },
      data: { totalAmount: purchase5.items.reduce((s, i) => s + i.totalAmount, 0) },
    })
    purchases.push(purchase5)

    // 5. Create PURCHASE stock movements for all purchase items
    for (const purchase of purchases) {
      const purchaseWithItems = await db.purchase.findUnique({
        where: { id: purchase.id },
        include: { items: true },
      })

      if (purchaseWithItems) {
        for (const item of purchaseWithItems.items) {
          await db.stockMovement.create({
            data: {
              ingredientId: item.ingredientId,
              type: 'PURCHASE',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              date: purchaseWithItems.date,
              notes: `Purchase ${purchaseWithItems.invoiceNo || ''}`,
              referenceId: purchaseWithItems.id,
            },
          })
        }
      }
    }

    // 6. Create daily meals for the past week
    const mealRecipes = [
      { recipe: breakfastPoha, mealType: 'Breakfast' },
      { recipe: dalRice, mealType: 'Lunch' },
      { recipe: chickenCurryRice, mealType: 'Lunch' },
      { recipe: rotiSabzi, mealType: 'Lunch' },
      { recipe: tea, mealType: 'Snack' },
      { recipe: dinnerKhichdi, mealType: 'Dinner' },
    ]

    // Create meals for the past 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const mealDate = new Date(today)
      mealDate.setDate(mealDate.getDate() - dayOffset)

      // Vary servings between 450-600
      const baseServings = 450 + Math.floor(Math.random() * 150)

      for (const mealRecipe of mealRecipes) {
        const servings = mealRecipe.mealType === 'Snack' ? baseServings : Math.floor(baseServings * 0.8)
        const meal = await db.dailyMealServed.create({
          data: {
            date: mealDate,
            mealType: mealRecipe.mealType,
            mealsServed: servings,
            recipeId: mealRecipe.recipe.id,
          },
        })

        // Create CONSUMPTION stock movements for each ingredient
        const recipe = await db.recipe.findUnique({
          where: { id: mealRecipe.recipe.id },
          include: { ingredients: { include: { ingredient: true } } },
        })

        if (recipe) {
          const ratio = servings / recipe.baseServings
          for (const ri of recipe.ingredients) {
            const consumedQty = ratio * ri.quantity
            await db.stockMovement.create({
              data: {
                ingredientId: ri.ingredientId,
                type: 'CONSUMPTION',
                quantity: consumedQty,
                unitPrice: ri.ingredient.avgCost,
                totalAmount: consumedQty * ri.ingredient.avgCost,
                date: mealDate,
                notes: `${mealRecipe.mealType} - ${recipe.name} (${servings} servings)`,
                referenceId: meal.id,
              },
            })
          }
        }
      }
    }

    // Create meals + consumption for PREVIOUS month (15 days spread) so Monthly Comparison works
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    for (let dayOffset = 0; dayOffset < 15; dayOffset++) {
      const mealDate = new Date(prevMonth)
      mealDate.setDate(mealDate.getDate() + dayOffset * 2) // spread across the month

      const baseServings = 440 + Math.floor(Math.random() * 160)

      for (const mealRecipe of mealRecipes) {
        const servings = mealRecipe.mealType === 'Snack' ? baseServings : Math.floor(baseServings * 0.78)
        const meal = await db.dailyMealServed.create({
          data: {
            date: mealDate,
            mealType: mealRecipe.mealType,
            mealsServed: servings,
            recipeId: mealRecipe.recipe.id,
          },
        })

        const recipe = await db.recipe.findUnique({
          where: { id: mealRecipe.recipe.id },
          include: { ingredients: { include: { ingredient: true } } },
        })

        if (recipe) {
          const ratio = servings / recipe.baseServings
          for (const ri of recipe.ingredients) {
            const consumedQty = ratio * ri.quantity
            await db.stockMovement.create({
              data: {
                ingredientId: ri.ingredientId,
                type: 'CONSUMPTION',
                quantity: consumedQty,
                unitPrice: ri.ingredient.avgCost,
                totalAmount: consumedQty * ri.ingredient.avgCost,
                date: mealDate,
                notes: `${mealRecipe.mealType} - ${recipe.name} (${servings} servings)`,
                referenceId: meal.id,
              },
            })
          }
        }
      }
    }

    // Create PURCHASE stock movements for previous month (so food cost has data)
    const prevMonthPurchases = [
      { ingredient: 'Rice (Basmati)', qty: 200, price: 44 },
      { ingredient: 'Wheat Flour', qty: 150, price: 36 },
      { ingredient: 'Toor Dal', qty: 80, price: 118 },
      { ingredient: 'Cooking Oil', qty: 60, price: 152 },
      { ingredient: 'Onions', qty: 100, price: 28 },
      { ingredient: 'Tomatoes', qty: 80, price: 30 },
      { ingredient: 'Chicken', qty: 40, price: 238 },
      { ingredient: 'Milk', qty: 200, price: 58 },
    ]
    for (const p of prevMonthPurchases) {
      const ing = findIngredient(p.ingredient)
      if (ing) {
        await db.stockMovement.create({
          data: {
            ingredientId: ing.id,
            type: 'PURCHASE',
            quantity: p.qty,
            unitPrice: p.price,
            totalAmount: p.qty * p.price,
            date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 10 + Math.floor(Math.random() * 15)),
            notes: `Previous month purchase - ${p.ingredient}`,
          },
        })
      }
    }

    // Create expenses for previous month
    const prevMonthExpenses = [
      { category: 'Gas', amount: 7500, description: 'LPG cylinders - prev month' },
      { category: 'Electricity', amount: 14000, description: 'Electricity bill - prev month' },
      { category: 'Water', amount: 4800, description: 'Water supply - prev month' },
      { category: 'Maintenance', amount: 3000, description: 'Equipment maintenance - prev month' },
    ]
    for (const e of prevMonthExpenses) {
      await db.expense.create({
        data: {
          date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 5 + Math.floor(Math.random() * 20)),
          category: e.category,
          amount: e.amount,
          description: e.description,
        },
      })
    }

    // 7. Create some wastage entries
    const wastageItems = [
      { ingredient: findIngredient('Onions'), qty: 2, reason: 'Spoiled' },
      { ingredient: findIngredient('Tomatoes'), qty: 1.5, reason: 'Overripe' },
      { ingredient: findIngredient('Potatoes'), qty: 1, reason: 'Sprouted' },
      { ingredient: findIngredient('Milk'), qty: 3, reason: 'Expired' },
    ]

    for (const w of wastageItems) {
      await db.stockMovement.create({
        data: {
          ingredientId: w.ingredient.id,
          type: 'WASTAGE',
          quantity: w.qty,
          unitPrice: w.ingredient.avgCost,
          totalAmount: w.qty * w.ingredient.avgCost,
          date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
          notes: w.reason,
        },
      })
    }

    // 8. Create expenses for the month
    const expenses = await Promise.all([
      db.expense.create({
        data: {
          date: new Date(today.getFullYear(), today.getMonth(), 5),
          category: 'Gas',
          amount: 8000,
          description: 'LPG cylinders - monthly',
        },
      }),
      db.expense.create({
        data: {
          date: new Date(today.getFullYear(), today.getMonth(), 1),
          category: 'Electricity',
          amount: 15000,
          description: 'Kitchen electricity bill',
        },
      }),
      db.expense.create({
        data: {
          date: new Date(today.getFullYear(), today.getMonth(), 10),
          category: 'Water',
          amount: 5000,
          description: 'Water supply',
        },
      }),
      db.expense.create({
        data: {
          date: new Date(today.getFullYear(), today.getMonth(), 15),
          category: 'Maintenance',
          amount: 3500,
          description: 'Kitchen equipment repair',
        },
      }),
      db.expense.create({
        data: {
          date: new Date(today.getFullYear(), today.getMonth(), 20),
          category: 'Gas',
          amount: 8000,
          description: 'LPG cylinders - mid-month',
        },
      }),
      db.expense.create({
        data: {
          date: new Date(today.getFullYear(), today.getMonth(), 25),
          category: 'Other',
          amount: 2000,
          description: 'Cleaning supplies',
        },
      }),
    ])

    // 9. Create a stock adjustment
    await db.stockMovement.create({
      data: {
        ingredientId: findIngredient('Rice (Basmati)').id,
        type: 'ADJUSTMENT',
        quantity: 150,
        unitPrice: 0,
        totalAmount: 0,
        date: new Date(),
        notes: 'Stock adjustment after physical count',
      },
    })

    return NextResponse.json({
      message: 'Sample data seeded successfully',
      data: {
        user: admin.id,
        suppliers: suppliers.length,
        ingredients: ingredients.length,
        recipes: 6,
        purchases: purchases.length,
        meals: '7 days of meal data',
        expenses: expenses.length,
        wastage: wastageItems.length,
      },
    })
  } catch (error) {
    console.error('Error seeding data:', error)
    return NextResponse.json(
      { error: 'Failed to seed data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

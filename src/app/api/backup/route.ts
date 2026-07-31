import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BackupMetadata {
  version: string
  exportDate: string
  app: string
  counts: {
    ingredients: number
    recipes: number
    recipeIngredients: number
    stockMovements: number
    dailyMeals: number
    purchases: number
    purchaseItems: number
    expenses: number
    total: number
  }
}

interface BackupPayload {
  metadata: BackupMetadata
  data: {
    ingredients: Array<Record<string, unknown>>
    recipes: Array<Record<string, unknown>> & { ingredients?: Array<Record<string, unknown>> }
    stockMovements: Array<Record<string, unknown>>
    dailyMeals: Array<Record<string, unknown>>
    purchases: Array<Record<string, unknown>> & { items?: Array<Record<string, unknown>> }
    expenses: Array<Record<string, unknown>>
  }
}

const APP_VERSION = '1.0.0'
const APP_NAME = 'RCS Canteen - Stock & Cost Management'

// ─── GET /api/backup — Export all data as JSON ───────────────────────────────

export async function GET() {
  try {
    const [
      ingredients,
      recipes,
      stockMovements,
      dailyMeals,
      purchases,
      expenses,
    ] = await Promise.all([
      db.ingredient.findMany(),
      db.recipe.findMany({ include: { ingredients: true } }),
      db.stockMovement.findMany(),
      db.dailyMealServed.findMany(),
      db.purchase.findMany({ include: { items: true } }),
      db.expense.findMany(),
    ])

    // Flatten nested recipe.ingredients & purchase.items into top-level arrays
    // so the restore step can manage relationships cleanly.
    const recipeIngredients = recipes.flatMap((r) =>
      (r.ingredients ?? []).map((ri) => ({
        id: ri.id,
        recipeId: ri.recipeId,
        ingredientId: ri.ingredientId,
        quantity: ri.quantity,
        unit: ri.unit,
      }))
    )
    const purchaseItems = purchases.flatMap((p) =>
      (p.items ?? []).map((pi) => ({
        id: pi.id,
        purchaseId: pi.purchaseId,
        ingredientId: pi.ingredientId,
        quantity: pi.quantity,
        unitPrice: pi.unitPrice,
        totalAmount: pi.totalAmount,
      }))
    )

    // Strip nested arrays from recipes/purchases (they're now in recipeIngredients/purchaseItems)
    const cleanRecipes = recipes.map(({ ingredients: _ingredients, ...rest }) => rest)
    const cleanPurchases = purchases.map(({ items: _items, ...rest }) => rest)

    const counts: BackupMetadata['counts'] = {
      ingredients: ingredients.length,
      recipes: cleanRecipes.length,
      recipeIngredients: recipeIngredients.length,
      stockMovements: stockMovements.length,
      dailyMeals: dailyMeals.length,
      purchases: cleanPurchases.length,
      purchaseItems: purchaseItems.length,
      expenses: expenses.length,
      total:
        ingredients.length +
        cleanRecipes.length +
        recipeIngredients.length +
        stockMovements.length +
        dailyMeals.length +
        cleanPurchases.length +
        purchaseItems.length +
        expenses.length,
    }

    const backup: BackupPayload = {
      metadata: {
        version: APP_VERSION,
        exportDate: new Date().toISOString(),
        app: APP_NAME,
        counts,
      },
      data: {
        ingredients: ingredients as unknown as Array<Record<string, unknown>>,
        recipes: cleanRecipes as unknown as Array<Record<string, unknown>>,
        stockMovements: stockMovements as unknown as Array<Record<string, unknown>>,
        dailyMeals: dailyMeals as unknown as Array<Record<string, unknown>>,
        purchases: cleanPurchases as unknown as Array<Record<string, unknown>>,
        expenses: expenses as unknown as Array<Record<string, unknown>>,
        // Extra keys to support the flattened relational data
        ...(recipeIngredients.length > 0
          ? { recipeIngredients: recipeIngredients as unknown as Array<Record<string, unknown>> }
          : {}),
        ...(purchaseItems.length > 0
          ? { purchaseItems: purchaseItems as unknown as Array<Record<string, unknown>> }
          : {}),
      } as BackupPayload['data'],
    }

    const filename = `rcs-canteen-backup-${new Date().toISOString().split('T')[0]}.json`
    const jsonBody = JSON.stringify(backup, null, 2)

    return new NextResponse(jsonBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(jsonBody, 'utf-8').toString(),
      },
    })
  } catch (error) {
    console.error('Error exporting backup:', error)
    return NextResponse.json(
      { error: 'Failed to export backup', details: String(error) },
      { status: 500 }
    )
  }
}

// ─── POST /api/backup — Import/restore data from JSON ────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asArray(v: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(v)) return []
  return v.filter(isPlainObject)
}

function toDate(v: unknown): Date {
  if (v instanceof Date) return v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && !isNaN(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (!isNaN(n)) return n
  }
  return fallback
}

function toStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : v == null ? fallback : String(v)
}

function toNullableStr(v: unknown): string | null {
  if (typeof v === 'string' && v.length > 0) return v
  if (v == null) return null
  return String(v)
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body. Please upload a valid backup file.' },
        { status: 400 }
      )
    }

    if (!isPlainObject(body)) {
      return NextResponse.json(
        { error: 'Invalid backup format: expected a JSON object.' },
        { status: 400 }
      )
    }

    const data = (body as { data?: unknown }).data
    if (!isPlainObject(data)) {
      return NextResponse.json(
        { error: 'Invalid backup format: missing "data" object.' },
        { status: 400 }
      )
    }

    const ingredients = asArray(data.ingredients)
    const recipes = asArray(data.recipes)
    // recipeIngredients may be present in v1.0.0 backups; older exports may nest them in recipes[].ingredients
    let recipeIngredients = asArray(data.recipeIngredients)
    let purchaseItems = asArray(data.purchaseItems)

    // Backwards-compatibility: if recipeIngredients missing, derive from recipes[].ingredients
    if (recipeIngredients.length === 0) {
      recipeIngredients = (recipes as Array<Record<string, unknown>>)
        .flatMap((r) => {
          const nested = r.ingredients
          if (!Array.isArray(nested)) return []
          return nested.filter(isPlainObject)
        })
        .map((ri) => ({
          id: toStr(ri.id),
          recipeId: toStr(ri.recipeId),
          ingredientId: toStr(ri.ingredientId),
          quantity: toNumber(ri.quantity),
          unit: toStr(ri.unit),
        }))
    }

    if (purchaseItems.length === 0) {
      purchaseItems = (asArray(data.purchases) as Array<Record<string, unknown>>)
        .flatMap((p) => {
          const nested = p.items
          if (!Array.isArray(nested)) return []
          return nested.filter(isPlainObject)
        })
        .map((pi) => ({
          id: toStr(pi.id),
          purchaseId: toStr(pi.purchaseId),
          ingredientId: toStr(pi.ingredientId),
          quantity: toNumber(pi.quantity),
          unitPrice: toNumber(pi.unitPrice),
          totalAmount: toNumber(pi.totalAmount),
        }))
    }

    const stockMovements = asArray(data.stockMovements)
    const dailyMeals = asArray(data.dailyMeals)
    const purchases = asArray(data.purchases)
    const expenses = asArray(data.expenses)

    // Sanity-check: at least one collection must have data
    const totalIncoming =
      ingredients.length +
      recipes.length +
      stockMovements.length +
      dailyMeals.length +
      purchases.length +
      expenses.length
    if (totalIncoming === 0) {
      return NextResponse.json(
        { error: 'Backup file contains no data to import.' },
        { status: 400 }
      )
    }

    // Wipe existing data in dependency order (children first).
    // Use a transaction for atomicity.
    await db.$transaction([
      db.stockMovement.deleteMany(),
      db.dailyMealServed.deleteMany(),
      db.purchaseItem.deleteMany(),
      db.purchase.deleteMany(),
      db.expense.deleteMany(),
      db.recipeIngredient.deleteMany(),
      db.recipe.deleteMany(),
      db.ingredient.deleteMany(),
    ])

    // 1. Ingredients
    for (const ing of ingredients) {
      await db.ingredient.create({
        data: {
          id: toStr(ing.id),
          name: toStr(ing.name),
          unit: toStr(ing.unit),
          category: toStr(ing.category),
          currentStock: toNumber(ing.currentStock),
          minStock: toNumber(ing.minStock),
          lastPurchasePrice: toNumber(ing.lastPurchasePrice),
          avgCost: toNumber(ing.avgCost),
          supplier: toNullableStr(ing.supplier),
          createdAt: toDate(ing.createdAt),
          updatedAt: toDate(ing.updatedAt),
        },
      })
    }

    // 2. Recipes (without ingredients)
    for (const r of recipes) {
      const { ingredients: _ignoredNested, ...rest } = r
      void _ignoredNested
      await db.recipe.create({
        data: {
          id: toStr(rest.id),
          name: toStr(rest.name),
          description: toNullableStr(rest.description),
          mealType: toStr(rest.mealType),
          baseServings: toNumber(rest.baseServings, 100),
          instructions: toNullableStr(rest.instructions),
          createdAt: toDate(rest.createdAt),
          updatedAt: toDate(rest.updatedAt),
        },
      })
    }

    // 3. Recipe ingredients (link table)
    for (const ri of recipeIngredients) {
      try {
        await db.recipeIngredient.create({
          data: {
            id: toStr(ri.id),
            recipeId: toStr(ri.recipeId),
            ingredientId: toStr(ri.ingredientId),
            quantity: toNumber(ri.quantity),
            unit: toStr(ri.unit),
          },
        })
      } catch (err) {
        // Skip dangling link rows (missing FK)
        console.warn('Skipping recipeIngredient:', err)
      }
    }

    // 4. Stock movements
    for (const sm of stockMovements) {
      try {
        await db.stockMovement.create({
          data: {
            id: toStr(sm.id),
            ingredientId: toStr(sm.ingredientId),
            type: toStr(sm.type),
            quantity: toNumber(sm.quantity),
            unitPrice: toNumber(sm.unitPrice),
            totalAmount: toNumber(sm.totalAmount),
            date: toDate(sm.date),
            notes: toNullableStr(sm.notes),
            referenceId: toNullableStr(sm.referenceId),
            createdAt: toDate(sm.createdAt),
          },
        })
      } catch (err) {
        console.warn('Skipping stockMovement:', err)
      }
    }

    // 5. Daily meals
    for (const dm of dailyMeals) {
      try {
        await db.dailyMealServed.create({
          data: {
            id: toStr(dm.id),
            date: toDate(dm.date),
            mealType: toStr(dm.mealType),
            mealsServed: toNumber(dm.mealsServed),
            recipeId: toStr(dm.recipeId),
            notes: toNullableStr(dm.notes),
            createdAt: toDate(dm.createdAt),
          },
        })
      } catch (err) {
        console.warn('Skipping dailyMeal:', err)
      }
    }

    // 6. Expenses (no FKs)
    for (const ex of expenses) {
      await db.expense.create({
        data: {
          id: toStr(ex.id),
          date: toDate(ex.date),
          category: toStr(ex.category),
          amount: toNumber(ex.amount),
          description: toNullableStr(ex.description),
          createdAt: toDate(ex.createdAt),
        },
      })
    }

    // 7. Purchases (without items)
    for (const p of purchases) {
      const { items: _ignoredNested, ...rest } = p
      void _ignoredNested
      await db.purchase.create({
        data: {
          id: toStr(rest.id),
          date: toDate(rest.date),
          supplier: toNullableStr(rest.supplier),
          invoiceNo: toNullableStr(rest.invoiceNo),
          totalAmount: toNumber(rest.totalAmount),
          notes: toNullableStr(rest.notes),
          createdAt: toDate(rest.createdAt),
        },
      })
    }

    // 8. Purchase items (link table)
    for (const pi of purchaseItems) {
      try {
        await db.purchaseItem.create({
          data: {
            id: toStr(pi.id),
            purchaseId: toStr(pi.purchaseId),
            ingredientId: toStr(pi.ingredientId),
            quantity: toNumber(pi.quantity),
            unitPrice: toNumber(pi.unitPrice),
            totalAmount: toNumber(pi.totalAmount),
          },
        })
      } catch (err) {
        console.warn('Skipping purchaseItem:', err)
      }
    }

    const counts = {
      ingredients: ingredients.length,
      recipes: recipes.length,
      recipeIngredients: recipeIngredients.length,
      stockMovements: stockMovements.length,
      dailyMeals: dailyMeals.length,
      purchases: purchases.length,
      purchaseItems: purchaseItems.length,
      expenses: expenses.length,
      total:
        ingredients.length +
        recipes.length +
        recipeIngredients.length +
        stockMovements.length +
        dailyMeals.length +
        purchases.length +
        purchaseItems.length +
        expenses.length,
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Backup restored successfully',
        importedAt: new Date().toISOString(),
        counts,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error importing backup:', error)
    return NextResponse.json(
      {
        error: 'Failed to import backup',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

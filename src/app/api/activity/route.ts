import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/activity - Recent activity timeline across the canteen
// Merges purchases, daily meals, expenses, and stock movements (WASTAGE / ADJUSTMENT)
// and returns the 8 most recent activities, sorted by createdAt desc.
export async function GET() {
  try {
    // ─── 1. Purchases (with items + supplier) ──────────────────────────────
    const purchases = await db.purchase.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        supplierLink: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            ingredient: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    })

    type PurchaseItem = (typeof purchases)[number]['items'][number]

    const purchaseActivities = purchases.flatMap((p) => {
      const supplierName =
        p.supplierLink?.name ?? p.supplier ?? 'Unknown Supplier'

      // Total quantity of the first item (or sum across items) — used in description.
      const totalQty = p.items.reduce(
        (sum: number, it: PurchaseItem) => sum + it.quantity,
        0
      )
      const firstItem = p.items[0]
      const unit = firstItem?.ingredient.unit ?? ''

      // Description focuses on the primary ingredient, with count of any extras.
      let description: string
      if (p.items.length === 0) {
        description = `Purchased items from ${supplierName}`
      } else if (p.items.length === 1) {
        description = `Purchased ${totalQty}${unit ? ' ' + unit : ''} ${firstItem.ingredient.name} from ${supplierName}`
      } else {
        description = `Purchased ${totalQty}${unit ? ' ' + unit : ''} ${firstItem.ingredient.name} + ${p.items.length - 1} more from ${supplierName}`
      }

      return {
        id: `purchase-${p.id}`,
        type: 'PURCHASE' as const,
        description,
        amount: p.totalAmount,
        createdAt: p.createdAt.toISOString(),
        ingredientName: firstItem?.ingredient.name ?? null,
        supplierName,
        recipeName: null,
      }
    })

    // ─── 2. Daily meals served (with recipe) ──────────────────────────────
    const meals = await db.dailyMealServed.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        recipe: {
          select: { id: true, name: true, mealType: true },
        },
      },
    })

    const mealActivities = meals.map((m) => ({
      id: `meal-${m.id}`,
      type: 'MEAL' as const,
      description: `Served ${m.mealsServed} ${m.mealType.toLowerCase()} portions of ${m.recipe.name}`,
      amount: null,
      createdAt: m.createdAt.toISOString(),
      ingredientName: null,
      supplierName: null,
      recipeName: m.recipe.name,
    }))

    // ─── 3. Expenses ──────────────────────────────────────────────────────
    const expenses = await db.expense.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const expenseActivities = expenses.map((e) => ({
      id: `expense-${e.id}`,
      type: 'EXPENSE' as const,
      description:
        e.description && e.description.trim().length > 0
          ? `${e.category} expense: ${e.description}`
          : `${e.category} expense logged`,
      amount: e.amount,
      createdAt: e.createdAt.toISOString(),
      ingredientName: null,
      supplierName: null,
      recipeName: null,
    }))

    // ─── 4. Stock movements — only WASTAGE & ADJUSTMENT ───────────────────
    // (PURCHASE shows up via the Purchases section already, and CONSUMPTION
    // is auto-generated from meal logs — including them would create noise.)
    const stockMovements = await db.stockMovement.findMany({
      where: {
        type: { in: ['WASTAGE', 'ADJUSTMENT'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        ingredient: {
          select: { id: true, name: true, unit: true },
        },
      },
    })

    const stockActivities = stockMovements.map((s) => {
      if (s.type === 'WASTAGE') {
        const reason =
          s.notes && s.notes.trim().length > 0 ? ` (${s.notes})` : ''
        return {
          id: `wastage-${s.id}`,
          type: 'WASTAGE' as const,
          description: `Wasted ${s.quantity} ${s.ingredient.unit} of ${s.ingredient.name}${reason}`,
          amount: s.totalAmount,
          createdAt: s.createdAt.toISOString(),
          ingredientName: s.ingredient.name,
          supplierName: null,
          recipeName: null,
        }
      }
      // ADJUSTMENT
      const note =
        s.notes && s.notes.trim().length > 0 ? ` — ${s.notes}` : ''
      return {
        id: `adjustment-${s.id}`,
        type: 'ADJUSTMENT' as const,
        description: `Adjusted ${s.ingredient.name} stock by ${s.quantity > 0 ? '+' : ''}${s.quantity} ${s.ingredient.unit}${note}`,
        amount: null,
        createdAt: s.createdAt.toISOString(),
        ingredientName: s.ingredient.name,
        supplierName: null,
        recipeName: null,
      }
    })

    // ─── Merge, sort by createdAt desc, limit to 8 ────────────────────────
    const all = [
      ...purchaseActivities,
      ...mealActivities,
      ...expenseActivities,
      ...stockActivities,
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 8)

    return NextResponse.json({ data: all })
  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}

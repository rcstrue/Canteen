import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Helper to get date range based on period
function getDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let start: Date
  let end: Date = now

  if (startDate && endDate) {
    start = new Date(startDate)
    end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
  } else {
    switch (period) {
      case 'today':
        start = todayStart
        break
      case 'week': {
        start = new Date(todayStart)
        start.setDate(start.getDate() - start.getDay())
        break
      }
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }
  }

  return { start, end }
}

// GET /api/reports/variance - Theoretical vs actual consumption variance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const { start, end } = getDateRange(period, startDate, endDate)

    // 1. Get all meals served in the period with their recipes
    const meals = await db.dailyMealServed.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: {
                  select: { id: true, name: true, unit: true, category: true, avgCost: true },
                },
              },
            },
          },
        },
      },
    })

    // 2. Calculate theoretical consumption from recipes × meals served
    const theoreticalConsumption = new Map<string, {
      ingredient: { id: string; name: string; unit: string; category: string; avgCost: number }
      theoreticalQty: number
      theoreticalCost: number
    }>()

    for (const meal of meals) {
      const ratio = meal.mealsServed / meal.recipe.baseServings
      for (const ri of meal.recipe.ingredients) {
        const consumedQty = ratio * ri.quantity
        const existing = theoreticalConsumption.get(ri.ingredientId)
        if (existing) {
          existing.theoreticalQty += consumedQty
          existing.theoreticalCost += consumedQty * ri.ingredient.avgCost
        } else {
          theoreticalConsumption.set(ri.ingredientId, {
            ingredient: ri.ingredient,
            theoreticalQty: consumedQty,
            theoreticalCost: consumedQty * ri.ingredient.avgCost,
          })
        }
      }
    }

    // 3. Get actual consumption from stock movements (CONSUMPTION type)
    const actualMovements = await db.stockMovement.findMany({
      where: {
        type: 'CONSUMPTION',
        date: { gte: start, lte: end },
      },
      include: {
        ingredient: {
          select: { id: true, name: true, unit: true, category: true, avgCost: true },
        },
      },
    })

    // Aggregate actual consumption by ingredient
    const actualConsumption = new Map<string, {
      ingredient: { id: string; name: string; unit: string; category: string; avgCost: number }
      actualQty: number
      actualCost: number
    }>()

    for (const m of actualMovements) {
      const existing = actualConsumption.get(m.ingredientId)
      if (existing) {
        existing.actualQty += m.quantity
        existing.actualCost += m.totalAmount
      } else {
        actualConsumption.set(m.ingredientId, {
          ingredient: m.ingredient,
          actualQty: m.quantity,
          actualCost: m.totalAmount,
        })
      }
    }

    // 4. Get wastage data
    const wastageMovements = await db.stockMovement.findMany({
      where: {
        type: 'WASTAGE',
        date: { gte: start, lte: end },
      },
      include: {
        ingredient: {
          select: { id: true, name: true, unit: true, category: true, avgCost: true },
        },
      },
    })

    const wastageByIngredient = new Map<string, number>()
    for (const m of wastageMovements) {
      const current = wastageByIngredient.get(m.ingredientId) || 0
      wastageByIngredient.set(m.ingredientId, current + m.quantity)
    }

    // 5. Merge all ingredients and compute variance
    const allIngredientIds = new Set([
      ...theoreticalConsumption.keys(),
      ...actualConsumption.keys(),
    ])

    const varianceReport = []

    for (const ingredientId of allIngredientIds) {
      const theoretical = theoreticalConsumption.get(ingredientId)
      const actual = actualConsumption.get(ingredientId)
      const wastage = wastageByIngredient.get(ingredientId) || 0

      const ingredient = theoretical?.ingredient || actual?.ingredient
      if (!ingredient) continue

      const theoreticalQty = theoretical?.theoreticalQty || 0
      const actualQty = actual?.actualQty || 0
      const varianceQty = actualQty - theoreticalQty
      const variancePercent = theoreticalQty > 0
        ? (varianceQty / theoreticalQty) * 100
        : 0

      const theoreticalCost = theoretical?.theoreticalCost || 0
      const actualCost = actual?.actualCost || 0
      const varianceCost = actualCost - theoreticalCost

      varianceReport.push({
        ingredient,
        theoreticalQty: Math.round(theoreticalQty * 100) / 100,
        actualQty: Math.round(actualQty * 100) / 100,
        varianceQty: Math.round(varianceQty * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        theoreticalCost: Math.round(theoreticalCost * 100) / 100,
        actualCost: Math.round(actualCost * 100) / 100,
        varianceCost: Math.round(varianceCost * 100) / 100,
        wastageQty: Math.round(wastage * 100) / 100,
        status: Math.abs(variancePercent) <= 5 ? 'normal' : Math.abs(variancePercent) <= 15 ? 'warning' : 'critical',
      })
    }

    // Sort by absolute variance percentage (largest first)
    varianceReport.sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent))

    // Summary statistics
    const totalTheoreticalCost = varianceReport.reduce((s, i) => s + i.theoreticalCost, 0)
    const totalActualCost = varianceReport.reduce((s, i) => s + i.actualCost, 0)
    const totalVarianceCost = totalActualCost - totalTheoreticalCost
    const totalWastage = varianceReport.reduce((s, i) => s + i.wastageQty, 0)

    const criticalItems = varianceReport.filter((i) => i.status === 'critical')
    const warningItems = varianceReport.filter((i) => i.status === 'warning')

    return NextResponse.json({
      period: { start: start.toISOString(), end: end.toISOString(), type: period },
      summary: {
        totalTheoreticalCost: Math.round(totalTheoreticalCost * 100) / 100,
        totalActualCost: Math.round(totalActualCost * 100) / 100,
        totalVarianceCost: Math.round(totalVarianceCost * 100) / 100,
        variancePercentage: totalTheoreticalCost > 0
          ? Math.round(((totalVarianceCost / totalTheoreticalCost) * 100) * 100) / 100
          : 0,
        totalWastage: Math.round(totalWastage * 100) / 100,
        criticalCount: criticalItems.length,
        warningCount: warningItems.length,
      },
      varianceByIngredient: varianceReport,
      criticalItems: criticalItems.slice(0, 10),
      warningItems: warningItems.slice(0, 10),
    })
  } catch (error) {
    console.error('Error generating variance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate variance report' },
      { status: 500 }
    )
  }
}

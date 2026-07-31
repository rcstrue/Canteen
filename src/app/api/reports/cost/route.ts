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

// GET /api/reports/cost - Cost report with period filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const { start, end } = getDateRange(period, startDate, endDate)

    // 1. Total food cost (from PURCHASE stock movements)
    const purchaseMovements = await db.stockMovement.findMany({
      where: {
        type: 'PURCHASE',
        date: { gte: start, lte: end },
      },
      include: {
        ingredient: {
          select: { id: true, name: true, category: true, unit: true },
        },
      },
    })

    const totalFoodCost = purchaseMovements.reduce(
      (sum, m) => sum + m.totalAmount,
      0
    )

    // 2. Cost breakdown by ingredient category
    const costByCategory = new Map<string, { category: string; totalCost: number; totalQuantity: number }>()
    for (const m of purchaseMovements) {
      const cat = m.ingredient.category
      const existing = costByCategory.get(cat)
      if (existing) {
        existing.totalCost += m.totalAmount
        existing.totalQuantity += m.quantity
      } else {
        costByCategory.set(cat, {
          category: cat,
          totalCost: m.totalAmount,
          totalQuantity: m.quantity,
        })
      }
    }

    const categoryBreakdown = Array.from(costByCategory.values()).sort(
      (a, b) => b.totalCost - a.totalCost
    )

    // 3. Total meals served in the period
    const mealsServed = await db.dailyMealServed.findMany({
      where: {
        date: { gte: start, lte: end },
      },
    })

    const totalMeals = mealsServed.reduce((sum, m) => sum + m.mealsServed, 0)
    const costPerMeal = totalMeals > 0 ? totalFoodCost / totalMeals : 0

    // 4. Daily cost trend
    const dailyCostMap = new Map<string, number>()
    for (const m of purchaseMovements) {
      const dayKey = m.date.toISOString().split('T')[0]
      const current = dailyCostMap.get(dayKey) || 0
      dailyCostMap.set(dayKey, current + m.totalAmount)
    }

    const dailyTrend = Array.from(dailyCostMap.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 5. Operating expenses for the period
    const expenses = await db.expense.findMany({
      where: {
        date: { gte: start, lte: end },
      },
    })

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const expenseByCategory = new Map<string, number>()
    for (const e of expenses) {
      const current = expenseByCategory.get(e.category) || 0
      expenseByCategory.set(e.category, current + e.amount)
    }

    const expenseBreakdown = Array.from(expenseByCategory.entries()).map(
      ([category, amount]) => ({ category, amount })
    )

    return NextResponse.json({
      period: { start: start.toISOString(), end: end.toISOString(), type: period },
      foodCost: {
        total: totalFoodCost,
        costPerMeal,
        categoryBreakdown,
        dailyTrend,
      },
      meals: {
        total: totalMeals,
        count: mealsServed.length,
      },
      expenses: {
        total: totalExpenses,
        breakdown: expenseBreakdown,
      },
      totalOperatingCost: totalFoodCost + totalExpenses,
      operatingCostPerMeal: totalMeals > 0 ? (totalFoodCost + totalExpenses) / totalMeals : 0,
    })
  } catch (error) {
    console.error('Error generating cost report:', error)
    return NextResponse.json(
      { error: 'Failed to generate cost report' },
      { status: 500 }
    )
  }
}

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/dashboard/charts — Aggregated chart data for the enhanced dashboard
// Returns: weeklyConsumption (7d), topIngredientsByCost (top 5, current month),
//          categorySpending (current month), monthlyKpiTrend (last 6 months)
export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // ─── 1. Weekly Consumption Trend (last 7 days, inclusive of today) ────────
    const sevenDaysAgo = new Date(todayStart)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    const [weeklyMovements, weeklyMeals] = await Promise.all([
      db.stockMovement.findMany({
        where: {
          date: { gte: sevenDaysAgo },
          type: { in: ['CONSUMPTION', 'WASTAGE'] },
        },
        select: { date: true, totalAmount: true },
      }),
      db.dailyMealServed.findMany({
        where: { date: { gte: sevenDaysAgo } },
        select: { date: true, mealsServed: true },
      }),
    ])

    // Build the 7-day skeleton (oldest first → today last)
    const dayKey = (d: Date) => d.toISOString().split('T')[0]
    const weeklyMap = new Map<string, { cost: number; meals: number }>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart)
      d.setDate(d.getDate() - i)
      weeklyMap.set(dayKey(d), { cost: 0, meals: 0 })
    }

    for (const m of weeklyMovements) {
      const key = dayKey(m.date)
      const entry = weeklyMap.get(key)
      if (entry) entry.cost += m.totalAmount
    }
    for (const meal of weeklyMeals) {
      const key = dayKey(meal.date)
      const entry = weeklyMap.get(key)
      if (entry) entry.meals += meal.mealsServed
    }

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weeklyConsumption = Array.from(weeklyMap.entries()).map(
      ([date, v]) => {
        const d = new Date(date + 'T00:00:00')
        return {
          day: dayLabels[d.getDay()],
          date,
          cost: Math.round(v.cost * 100) / 100,
          meals: v.meals,
        }
      }
    )

    // ─── 2. Top 5 Ingredients by Spend (current month, from PurchaseItem) ────
    const monthPurchaseItems = await db.purchaseItem.findMany({
      where: {
        purchase: { date: { gte: monthStart } },
      },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
            currentStock: true,
            category: true,
          },
        },
      },
    })

    const spendByIngredient = new Map<
      string,
      {
        name: string
        totalSpend: number
        currentStock: number
        unit: string
        category: string
      }
    >()
    for (const item of monthPurchaseItems) {
      const existing = spendByIngredient.get(item.ingredientId)
      if (existing) {
        existing.totalSpend += item.totalAmount
      } else {
        spendByIngredient.set(item.ingredientId, {
          name: item.ingredient.name,
          totalSpend: item.totalAmount,
          currentStock: item.ingredient.currentStock,
          unit: item.ingredient.unit,
          category: item.ingredient.category,
        })
      }
    }

    const topSpendArr = Array.from(spendByIngredient.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5)
    const maxSpend = topSpendArr.length > 0 ? topSpendArr[0].totalSpend : 0
    const topIngredientsByCost = topSpendArr.map((s) => ({
      name: s.name,
      totalSpend: Math.round(s.totalSpend * 100) / 100,
      currentStock: Math.round(s.currentStock * 100) / 100,
      unit: s.unit,
      percentage: maxSpend > 0 ? (s.totalSpend / maxSpend) * 100 : 0,
    }))

    // ─── 3. Category-wise Spending (current month, by ingredient.category) ───
    const categoryMap = new Map<string, number>()
    for (const item of monthPurchaseItems) {
      const cat = item.ingredient.category || 'Uncategorized'
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + item.totalAmount)
    }

    const categoryArr = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
      })
    )
    const totalCategorySpend = categoryArr.reduce((s, c) => s + c.amount, 0)
    const categorySpending = categoryArr
      .sort((a, b) => b.amount - a.amount)
      .map((c) => ({
        category: c.category,
        amount: c.amount,
        percentage:
          totalCategorySpend > 0 ? (c.amount / totalCategorySpend) * 100 : 0,
      }))

    // ─── 4. Monthly KPI Trend (last 6 months) for KPI sparklines ─────────────
    const monthlyKpiTrend: Array<{
      month: string
      foodCost: number
      operatingCost: number
      totalSpend: number
    }> = []

    const monthLabels = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]

    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
        999
      )

      const [purchasesAgg, expensesAgg, consumptionAgg] = await Promise.all([
        db.stockMovement.aggregate({
          _sum: { totalAmount: true },
          where: {
            type: 'PURCHASE',
            date: { gte: mStart, lte: mEnd },
          },
        }),
        db.expense.aggregate({
          _sum: { amount: true },
          where: { date: { gte: mStart, lte: mEnd } },
        }),
        db.stockMovement.aggregate({
          _sum: { totalAmount: true },
          where: {
            type: { in: ['CONSUMPTION', 'WASTAGE'] },
            date: { gte: mStart, lte: mEnd },
          },
        }),
      ])

      const foodCost = purchasesAgg._sum.totalAmount || 0
      const operatingCost =
        foodCost +
        (expensesAgg._sum.amount || 0) +
        (consumptionAgg._sum.totalAmount || 0)
      const totalSpend = foodCost + (expensesAgg._sum.amount || 0)

      monthlyKpiTrend.push({
        month: monthLabels[mStart.getMonth()],
        foodCost: Math.round(foodCost * 100) / 100,
        operatingCost: Math.round(operatingCost * 100) / 100,
        totalSpend: Math.round(totalSpend * 100) / 100,
      })
    }

    return NextResponse.json({
      weeklyConsumption,
      topIngredientsByCost,
      categorySpending,
      monthlyKpiTrend,
    })
  } catch (error) {
    console.error('Error fetching dashboard charts:', error)
    return NextResponse.json(
      {
        weeklyConsumption: [],
        topIngredientsByCost: [],
        categorySpending: [],
        monthlyKpiTrend: [],
        error: 'Failed to fetch chart data',
      },
      { status: 500 }
    )
  }
}

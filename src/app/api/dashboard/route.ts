import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/dashboard - Aggregated dashboard stats (consolidated)
// Supports optional startDate & endDate query params for date range filtering.
// This endpoint consolidates ALL dashboard data into a single response to
// minimise the number of API round-trips and reduce memory pressure.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Custom date range overrides
    const customStart = startDateParam ? new Date(startDateParam + 'T00:00:00') : null
    const customEnd = endDateParam ? new Date(endDateParam + 'T23:59:59.999') : null

    // For cost trend: use custom range if provided
    const trendStart = customStart ?? (() => {
      const d = new Date(todayStart)
      d.setDate(d.getDate() - 6)
      return d
    })()

    // ── Core metrics (single batch) ──────────────────────────────────────
    const [
      costToday,
      costWeek,
      costMonth,
      mealsToday,
      mealsMonth,
      mealsThisWeek,
      expenseMonthAgg,
      wastageMonthAgg,
      activeSuppliersCount,
    ] = await Promise.all([
      db.stockMovement.aggregate({
        _sum: { totalAmount: true },
        where: { type: 'PURCHASE', date: { gte: todayStart } },
      }),
      db.stockMovement.aggregate({
        _sum: { totalAmount: true },
        where: { type: 'PURCHASE', date: { gte: weekStart } },
      }),
      db.stockMovement.aggregate({
        _sum: { totalAmount: true },
        where: { type: 'PURCHASE', date: { gte: monthStart } },
      }),
      db.dailyMealServed.aggregate({
        _sum: { mealsServed: true },
        where: { date: { gte: todayStart } },
      }),
      db.dailyMealServed.aggregate({
        _sum: { mealsServed: true },
        where: { date: { gte: monthStart } },
      }),
      db.dailyMealServed.aggregate({
        _sum: { mealsServed: true },
        where: { date: { gte: weekStart } },
      }),
      db.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: monthStart } },
      }),
      db.stockMovement.aggregate({
        _sum: { totalAmount: true },
        where: { type: 'WASTAGE', date: { gte: monthStart } },
      }),
      db.supplier.count(),
    ])

    const totalFoodCostMonth = costMonth._sum.totalAmount || 0
    const totalMealsMonth = mealsMonth._sum.mealsServed || 0
    const costPerMeal = totalMealsMonth > 0 ? totalFoodCostMonth / totalMealsMonth : 0
    const totalOperatingCost = totalFoodCostMonth + (expenseMonthAgg._sum.amount || 0)

    // ── Ingredients + low stock (single fetch) ───────────────────────────
    const allIngredients = await db.ingredient.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        unit: true,
        category: true,
        currentStock: true,
        minStock: true,
        lastPurchasePrice: true,
        avgCost: true,
        supplier: true,
        supplierId: true,
      },
    })

    const lowStockAlerts = allIngredients.filter(
      (i) => i.currentStock < i.minStock
    )

    // ── Top consuming ingredients + today's meals + expenses (batch) ────
    const [consumptionMovements, todayMeals, expensesThisMonth, last7DaysMovements] = await Promise.all([
      db.stockMovement.findMany({
        where: { type: 'CONSUMPTION', date: { gte: monthStart } },
        include: {
          ingredient: { select: { id: true, name: true, unit: true, category: true } },
        },
      }),
      db.dailyMealServed.findMany({
        where: { date: { gte: todayStart } },
        include: { recipe: { select: { id: true, name: true, mealType: true } } },
      }),
      db.expense.findMany({ where: { date: { gte: monthStart } } }),
      db.stockMovement.findMany({
        where: { type: 'PURCHASE', date: { gte: trendStart } },
        select: { date: true, totalAmount: true },
      }),
    ])

    // Aggregate consumption by ingredient
    const consumptionByIngredient = new Map<string, {
      ingredient: { id: string; name: string; unit: string; category: string }
      totalQuantity: number
      totalCost: number
    }>()

    for (const m of consumptionMovements) {
      const existing = consumptionByIngredient.get(m.ingredientId)
      if (existing) {
        existing.totalQuantity += m.quantity
        existing.totalCost += m.totalAmount
      } else {
        consumptionByIngredient.set(m.ingredientId, {
          ingredient: m.ingredient,
          totalQuantity: m.quantity,
          totalCost: m.totalAmount,
        })
      }
    }

    const topConsumingIngredients = Array.from(consumptionByIngredient.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)

    // Expense breakdown
    const expenseByCategory = new Map<string, number>()
    for (const e of expensesThisMonth) {
      const current = expenseByCategory.get(e.category) || 0
      expenseByCategory.set(e.category, current + e.amount)
    }
    const expenseBreakdown = Array.from(expenseByCategory.entries()).map(
      ([category, amount]) => ({ category, amount })
    )

    // Cost trend (daily food cost for the selected range or last 7 days)
    const costByDay = new Map<string, number>()
    if (customStart && customEnd) {
      const d = new Date(customStart)
      while (d <= customEnd) {
        const key = d.toISOString().split('T')[0]
        costByDay.set(key, 0)
        d.setDate(d.getDate() + 1)
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayStart)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        costByDay.set(key, 0)
      }
    }

    for (const m of last7DaysMovements) {
      const key = m.date.toISOString().split('T')[0]
      if (costByDay.has(key)) {
        costByDay.set(key, (costByDay.get(key) || 0) + m.totalAmount)
      }
    }

    const costTrend = Array.from(costByDay.entries()).map(([date, cost]) => ({
      date,
      cost,
    }))

    // ── Current budget ──────────────────────────────────────────────────
    const currentMonth = new Date().toISOString().slice(0, 7)
    const currentBudget = await db.budget.findFirst({
      where: { month: currentMonth },
    })

    // ── Recent activity (last 8) ────────────────────────────────────────
    const recentPurchases = await db.purchase.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        supplierLink: { select: { name: true } },
      },
    })

    const recentStockMovements = await db.stockMovement.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        ingredient: { select: { name: true, unit: true } },
      },
    })

    const recentMeals = await db.dailyMealServed.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        recipe: { select: { name: true } },
      },
    })

    const activities = [
      ...recentPurchases.map((p) => ({
        id: `purchase-${p.id}`,
        type: 'purchase' as const,
        title: `Purchase: ${p.invoiceNo || 'N/A'}`,
        description: p.supplierLink?.name || p.supplier || 'Unknown supplier',
        amount: p.totalAmount,
        timestamp: p.createdAt.toISOString(),
      })),
      ...recentStockMovements.map((s) => ({
        id: `movement-${s.id}`,
        type: s.type.toLowerCase() as 'purchase' | 'consumption' | 'wastage' | 'adjustment',
        title: `${s.type}: ${s.ingredient.name}`,
        description: `${s.quantity} ${s.ingredient.unit}`,
        amount: s.totalAmount,
        timestamp: s.createdAt.toISOString(),
      })),
      ...recentMeals.map((m) => ({
        id: `meal-${m.id}`,
        type: 'meal' as const,
        title: `Meals served: ${m.recipe.name}`,
        description: `${m.mealsServed} servings`,
        amount: null,
        timestamp: m.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8)

    return NextResponse.json({
      // Core food cost
      foodCost: {
        today: costToday._sum.totalAmount || 0,
        week: costWeek._sum.totalAmount || 0,
        month: totalFoodCostMonth,
      },
      // Meals
      meals: {
        today: mealsToday._sum.mealsServed || 0,
        month: totalMealsMonth,
        week: mealsThisWeek._sum.mealsServed || 0,
      },
      costPerMeal,
      lowStockAlerts,
      topConsumingIngredients,
      todayMeals,
      expenses: {
        month: expenseMonthAgg._sum.amount || 0,
        breakdown: expenseBreakdown,
      },
      totalOperatingCost,
      costTrend,
      // Consolidated quick stats (previously 4 separate API calls)
      quickStats: {
        todayPurchasesTotal: costToday._sum.totalAmount || 0,
        weekMealsCount: mealsThisWeek._sum.mealsServed || 0,
        monthWastageValue: wastageMonthAgg._sum.totalAmount || 0,
        activeSuppliersCount,
      },
      // Consolidated budget (previously a separate API call)
      currentBudget,
      // Consolidated activity feed (previously a separate API call)
      activities,
      // Consolidated ingredient count
      totalIngredientCount: allIngredients.length,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

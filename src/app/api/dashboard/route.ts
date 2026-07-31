import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/dashboard - Aggregated dashboard stats
export async function GET(_request: NextRequest) {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // 1. Total food cost: today, this week, this month
    const [costToday, costWeek, costMonth] = await Promise.all([
      db.stockMovement.aggregate({
        _sum: { totalAmount: true },
        where: {
          type: 'PURCHASE',
          date: { gte: todayStart },
        },
      }),
      db.stockMovement.aggregate({
        _sum: { totalAmount: true },
        where: {
          type: 'PURCHASE',
          date: { gte: weekStart },
        },
      }),
      db.stockMovement.aggregate({
        _sum: { totalAmount: true },
        where: {
          type: 'PURCHASE',
          date: { gte: monthStart },
        },
      }),
    ])

    // 2. Total meals served today
    const mealsToday = await db.dailyMealServed.aggregate({
      _sum: { mealsServed: true },
      where: {
        date: { gte: todayStart },
      },
    })

    // 3. Total meals served this month
    const mealsMonth = await db.dailyMealServed.aggregate({
      _sum: { mealsServed: true },
      where: {
        date: { gte: monthStart },
      },
    })

    // 4. Cost per meal (monthly)
    const totalFoodCostMonth = costMonth._sum.totalAmount || 0
    const totalMealsMonth = mealsMonth._sum.mealsServed || 0
    const costPerMeal = totalMealsMonth > 0 ? totalFoodCostMonth / totalMealsMonth : 0

    // 5. Low stock alerts
    const lowStockIngredients = await db.ingredient.findMany({
      where: {
        currentStock: { lt: 0 }, // Will filter in JS
      },
      orderBy: { name: 'asc' },
    })

    // SQLite doesn't support field-level comparison in where, filter in JS
    const allIngredients = await db.ingredient.findMany({
      orderBy: { name: 'asc' },
    })
    const lowStockAlerts = allIngredients.filter(
      (i) => i.currentStock < i.minStock
    )

    // 6. Top consuming ingredients (from CONSUMPTION movements this month)
    const consumptionMovements = await db.stockMovement.findMany({
      where: {
        type: 'CONSUMPTION',
        date: { gte: monthStart },
      },
      include: {
        ingredient: {
          select: { id: true, name: true, unit: true, category: true },
        },
      },
    })

    // Aggregate by ingredient
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

    // 7. Today's meals served breakdown
    const todayMeals = await db.dailyMealServed.findMany({
      where: {
        date: { gte: todayStart },
      },
      include: {
        recipe: {
          select: { id: true, name: true, mealType: true },
        },
      },
    })

    // 8. Expense summary this month
    const expenseMonth = await db.expense.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: monthStart },
      },
    })

    // 9. Expense breakdown by category this month
    const expensesThisMonth = await db.expense.findMany({
      where: {
        date: { gte: monthStart },
      },
    })

    const expenseByCategory = new Map<string, number>()
    for (const e of expensesThisMonth) {
      const current = expenseByCategory.get(e.category) || 0
      expenseByCategory.set(e.category, current + e.amount)
    }

    const expenseBreakdown = Array.from(expenseByCategory.entries()).map(
      ([category, amount]) => ({ category, amount })
    )

    return NextResponse.json({
      foodCost: {
        today: costToday._sum.totalAmount || 0,
        week: costWeek._sum.totalAmount || 0,
        month: totalFoodCostMonth,
      },
      meals: {
        today: mealsToday._sum.mealsServed || 0,
        month: totalMealsMonth,
      },
      costPerMeal,
      lowStockAlerts,
      topConsumingIngredients,
      todayMeals,
      expenses: {
        month: expenseMonth._sum.amount || 0,
        breakdown: expenseBreakdown,
      },
      totalOperatingCost: totalFoodCostMonth + (expenseMonth._sum.amount || 0),
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

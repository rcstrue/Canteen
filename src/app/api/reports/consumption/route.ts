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

// GET /api/reports/consumption - Consumption report: ingredient usage over period
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const category = searchParams.get('category') || undefined

    const { start, end } = getDateRange(period, startDate, endDate)

    // Fetch all CONSUMPTION and WASTAGE movements in the period
    const where: Record<string, unknown> = {
      type: { in: ['CONSUMPTION', 'WASTAGE'] },
      date: { gte: start, lte: end },
    }

    const movements = await db.stockMovement.findMany({
      where,
      include: {
        ingredient: {
          select: { id: true, name: true, unit: true, category: true, avgCost: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    // Filter by category if specified
    const filtered = category
      ? movements.filter((m) => m.ingredient.category === category)
      : movements

    // Aggregate by ingredient
    const usageByIngredient = new Map<string, {
      ingredient: { id: string; name: string; unit: string; category: string; avgCost: number }
      consumptionQty: number
      consumptionCost: number
      wastageQty: number
      wastageCost: number
      totalQty: number
      totalCost: number
    }>()

    for (const m of filtered) {
      const existing = usageByIngredient.get(m.ingredientId)
      const qty = m.quantity
      const cost = m.totalAmount

      if (existing) {
        if (m.type === 'CONSUMPTION') {
          existing.consumptionQty += qty
          existing.consumptionCost += cost
        } else {
          existing.wastageQty += qty
          existing.wastageCost += cost
        }
        existing.totalQty += qty
        existing.totalCost += cost
      } else {
        usageByIngredient.set(m.ingredientId, {
          ingredient: m.ingredient,
          consumptionQty: m.type === 'CONSUMPTION' ? qty : 0,
          consumptionCost: m.type === 'CONSUMPTION' ? cost : 0,
          wastageQty: m.type === 'WASTAGE' ? qty : 0,
          wastageCost: m.type === 'WASTAGE' ? cost : 0,
          totalQty: qty,
          totalCost: cost,
        })
      }
    }

    const usageReport = Array.from(usageByIngredient.values()).sort(
      (a, b) => b.totalCost - a.totalCost
    )

    // Summary by category
    const categorySummary = new Map<string, { category: string; totalQty: number; totalCost: number; wastagePercent: number }>()
    for (const item of usageReport) {
      const cat = item.ingredient.category
      const existing = categorySummary.get(cat)
      if (existing) {
        existing.totalQty += item.totalQty
        existing.totalCost += item.totalCost
        existing.wastagePercent = existing.totalQty > 0
          ? ((existing.totalQty - (usageReport
              .filter((i) => i.ingredient.category === cat)
              .reduce((s, i) => s + i.consumptionQty, 0))) / existing.totalQty) * 100
          : 0
      } else {
        categorySummary.set(cat, {
          category: cat,
          totalQty: item.totalQty,
          totalCost: item.totalCost,
          wastagePercent: item.totalQty > 0
            ? (item.wastageQty / item.totalQty) * 100
            : 0,
        })
      }
    }

    const categoryBreakdown = Array.from(categorySummary.values()).sort(
      (a, b) => b.totalCost - a.totalCost
    )

    // Daily consumption trend
    const dailyTrend = new Map<string, { date: string; consumption: number; wastage: number }>()
    for (const m of filtered) {
      const dayKey = m.date.toISOString().split('T')[0]
      const existing = dailyTrend.get(dayKey)
      if (existing) {
        if (m.type === 'CONSUMPTION') {
          existing.consumption += m.totalAmount
        } else {
          existing.wastage += m.totalAmount
        }
      } else {
        dailyTrend.set(dayKey, {
          date: dayKey,
          consumption: m.type === 'CONSUMPTION' ? m.totalAmount : 0,
          wastage: m.type === 'WASTAGE' ? m.totalAmount : 0,
        })
      }
    }

    const trend = Array.from(dailyTrend.values()).sort(
      (a, b) => a.date.localeCompare(b.date)
    )

    const totalConsumption = usageReport.reduce((s, i) => s + i.consumptionCost, 0)
    const totalWastage = usageReport.reduce((s, i) => s + i.wastageCost, 0)

    return NextResponse.json({
      period: { start: start.toISOString(), end: end.toISOString(), type: period },
      summary: {
        totalConsumption,
        totalWastage,
        wastagePercentage: (totalConsumption + totalWastage) > 0
          ? (totalWastage / (totalConsumption + totalWastage)) * 100
          : 0,
      },
      usageByIngredient: usageReport,
      categoryBreakdown,
      dailyTrend: trend,
    })
  } catch (error) {
    console.error('Error generating consumption report:', error)
    return NextResponse.json(
      { error: 'Failed to generate consumption report' },
      { status: 500 }
    )
  }
}

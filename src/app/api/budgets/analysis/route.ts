import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse "YYYY-MM" → { year, monthIndex (0-based) }. Returns null on invalid. */
function parseMonth(ym: string): { year: number; monthIndex: number } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(ym)
  if (!m) return null
  return { year: parseInt(m[1], 10), monthIndex: parseInt(m[2], 10) - 1 }
}

/** Get the "YYYY-MM" string for a Date in local time (avoids UTC off-by-one). */
function getYearMonth(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Format a Date into "July 2026" (long month + year). */
function getMonthLabelLong(ym: string): string {
  const parsed = parseMonth(ym)
  if (!parsed) return ym
  const date = new Date(parsed.year, parsed.monthIndex, 1)
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

/** Get short month label like "Jul". */
function getMonthShort(ym: string): string {
  const parsed = parseMonth(ym)
  if (!parsed) return ym
  const date = new Date(parsed.year, parsed.monthIndex, 1)
  return date.toLocaleString('en-IN', { month: 'short' })
}

/** Total days in a given month. */
function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Returns YYYY-MM-DD string for a given year/monthIndex/day. */
function formatDay(year: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/** Round to 2 decimals, returning a Number (safe for JSON). */
const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

/** Compute actuals (foodCost + expenses) for a single month. */
async function computeMonthActuals(
  monthStart: Date,
  monthEnd: Date
): Promise<{ foodCost: number; expenseTotal: number; operatingCost: number }> {
  // Food cost: sum of PurchaseItem.totalAmount where Purchase.date is in this month.
  // Use findMany (not aggregate) so we can apply the relation filter on purchase.date.
  const purchaseItems = await db.purchaseItem.findMany({
    where: {
      purchase: { date: { gte: monthStart, lte: monthEnd } },
    },
    select: { totalAmount: true, ingredientId: true },
  })
  const foodCost = purchaseItems.reduce((s, pi) => s + (pi.totalAmount || 0), 0)

  const expenseAgg = await db.expense.aggregate({
    _sum: { amount: true },
    where: { date: { gte: monthStart, lte: monthEnd } },
  })
  const expenseTotal = expenseAgg._sum.amount ?? 0

  return {
    foodCost: round2(foodCost),
    expenseTotal: round2(expenseTotal),
    operatingCost: round2(foodCost + expenseTotal),
  }
}

// ─── Route Handler ──────────────────────────────────────────────────────────

// GET /api/budgets/analysis?month=YYYY-MM
// Returns budget vs actual analysis for the given month (defaults to current month).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')

    const now = new Date()
    // Resolve target month (default: current month)
    let targetYM: string
    if (monthParam) {
      const parsed = parseMonth(monthParam)
      if (!parsed) {
        return NextResponse.json(
          { error: 'Invalid month format. Use YYYY-MM (e.g., 2026-07).' },
          { status: 400 }
        )
      }
      targetYM = monthParam
    } else {
      targetYM = getYearMonth(now)
    }

    const parsed = parseMonth(targetYM)!
    const { year, monthIndex } = parsed

    const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0)
    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
    const daysInMonth = getDaysInMonth(year, monthIndex)

    // Determine "today" relative to the target month.
    // If target month is in the past, daysElapsed = daysInMonth.
    // If target month is in the future, daysElapsed = 0.
    // If target month is current, daysElapsed = today's date-of-month (capped at daysInMonth).
    const currentYM = getYearMonth(now)
    let daysElapsed: number
    if (targetYM < currentYM) {
      daysElapsed = daysInMonth
    } else if (targetYM > currentYM) {
      daysElapsed = 0
    } else {
      daysElapsed = Math.min(now.getDate(), daysInMonth)
    }

    // 1. Budget for this month (may be null)
    const budget = await db.budget.findUnique({ where: { month: targetYM } })

    // 2. Current-month actuals
    const actuals = await computeMonthActuals(monthStart, monthEnd)

    // 3. Projection
    let projectedSpend: number
    if (daysElapsed === 0) {
      // Future month or no days elapsed — projection is just current spend (likely 0)
      projectedSpend = actuals.operatingCost
    } else if (daysElapsed === 1) {
      // Day-1 edge case: use actuals as projected (avoids multiplying one day's spend by total days)
      projectedSpend = actuals.operatingCost
    } else if (daysElapsed >= daysInMonth) {
      // Whole month elapsed — no projection needed
      projectedSpend = actuals.operatingCost
    } else {
      projectedSpend = (actuals.operatingCost / daysElapsed) * daysInMonth
    }
    projectedSpend = round2(projectedSpend)

    // 4. Utilization
    const foodBudget = budget?.foodBudget ?? 0
    const operatingBudget = budget?.operatingBudget ?? 0
    const totalBudget = budget?.totalBudget ?? 0

    const foodPct = foodBudget > 0 ? round2((actuals.foodCost / foodBudget) * 100) : 0
    const operatingPct =
      operatingBudget > 0 ? round2((actuals.operatingCost / operatingBudget) * 100) : 0
    const totalPct =
      totalBudget > 0 ? round2((actuals.operatingCost / totalBudget) * 100) : 0
    const projectedPct =
      totalBudget > 0 ? round2((projectedSpend / totalBudget) * 100) : 0

    // 5. Category breakdown — sum purchase_items joined with ingredients for current month
    const categoryItems = await db.purchaseItem.findMany({
      where: {
        purchase: { date: { gte: monthStart, lte: monthEnd } },
      },
      select: {
        totalAmount: true,
        ingredient: { select: { category: true } },
      },
    })

    const categoryMap = new Map<string, number>()
    for (const item of categoryItems) {
      const cat = item.ingredient?.category || 'Uncategorized'
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + (item.totalAmount || 0))
    }

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, actual]) => {
        const budgeted = 0 // no per-category budgets yet
        return {
          category,
          budgeted,
          actual: round2(actual),
          variance: round2(budgeted - actual), // negative = over
          pct: budgeted > 0 ? round2((actual / budgeted) * 100) : 0,
        }
      })
      .sort((a, b) => b.actual - a.actual)

    // 6. Daily spend — for each day of month up to today (or full month if past)
    const dailyUpperBound = daysElapsed > 0 ? daysElapsed : 0
    const dailySpend: {
      day: number
      date: string
      foodCost: number
      operatingCost: number
    }[] = []

    if (dailyUpperBound > 0) {
      // Bucket purchases by day of month
      const dailyFood = new Map<number, number>()
      const dailyExpense = new Map<number, number>()

      // Fetch purchases in month with their date — sum item totals by purchase date
      const purchasesInMonth = await db.purchase.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: {
          date: true,
          items: { select: { totalAmount: true } },
        },
      })
      for (const p of purchasesInMonth) {
        const day = new Date(p.date).getDate()
        const itemTotal = p.items.reduce((s, i) => s + (i.totalAmount || 0), 0)
        dailyFood.set(day, (dailyFood.get(day) || 0) + itemTotal)
      }

      const expensesInMonth = await db.expense.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: { date: true, amount: true },
      })
      for (const e of expensesInMonth) {
        const day = new Date(e.date).getDate()
        dailyExpense.set(day, (dailyExpense.get(day) || 0) + (e.amount || 0))
      }

      for (let day = 1; day <= dailyUpperBound; day++) {
        const foodCost = dailyFood.get(day) || 0
        const expense = dailyExpense.get(day) || 0
        dailySpend.push({
          day,
          date: formatDay(year, monthIndex, day),
          foodCost: round2(foodCost),
          operatingCost: round2(foodCost + expense),
        })
      }
    }

    // 7. History — last 6 months (target month + 5 prior)
    const history: {
      month: string
      monthFull: string
      monthCode: string
      budget: number
      actual: number
      variance: number
    }[] = []

    const historyMonths: { ym: string; start: Date; end: Date }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, monthIndex - i, 1)
      const ym = getYearMonth(d)
      const hStart = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
      const hEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      historyMonths.push({ ym, start: hStart, end: hEnd })
    }

    // Fetch all budgets for these months in one query
    const historyBudgets = await db.budget.findMany({
      where: { month: { in: historyMonths.map((h) => h.ym) } },
      select: { month: true, totalBudget: true },
    })
    const budgetByMonth = new Map(historyBudgets.map((b) => [b.month, b.totalBudget]))

    // Fetch actuals for each history month in parallel
    const historyActuals = await Promise.all(
      historyMonths.map((h) => computeMonthActuals(h.start, h.end))
    )

    for (let i = 0; i < historyMonths.length; i++) {
      const h = historyMonths[i]
      const a = historyActuals[i]
      const b = budgetByMonth.get(h.ym) ?? 0
      const hasData = b > 0 || a.operatingCost > 0
      history.push({
        month: getMonthShort(h.ym),
        monthFull: getMonthLabelLong(h.ym),
        monthCode: h.ym,
        budget: round2(b),
        actual: a.operatingCost,
        variance: round2(b - a.operatingCost),
        hasData,
      })
    }

    return NextResponse.json({
      month: targetYM,
      monthLabel: getMonthLabelLong(targetYM),
      budget,
      actuals: {
        foodCost: actuals.foodCost,
        expenseTotal: actuals.expenseTotal,
        operatingCost: actuals.operatingCost,
        totalSpend: actuals.operatingCost,
      },
      projectedSpend,
      daysElapsed,
      daysInMonth,
      utilization: {
        foodPct,
        operatingPct,
        totalPct,
        projectedPct,
      },
      categoryBreakdown,
      dailySpend,
      history,
    })
  } catch (error) {
    console.error('Error in /api/budgets/analysis:', error)
    return NextResponse.json(
      { error: 'Failed to generate budget analysis' },
      { status: 500 }
    )
  }
}

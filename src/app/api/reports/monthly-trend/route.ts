import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Helper: format a Date into "YYYY-MM" string in local time (avoids UTC off-by-one)
function getYearMonth(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// Helper: build a short label like "Jul 2026"
function getMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map((n) => parseInt(n, 10))
  if (!y || !m) return ym
  const date = new Date(y, m - 1, 1)
  return date.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

// GET /api/reports/monthly-trend
// Returns the last 6 months of food cost (purchases) and operating cost (expenses).
export async function GET() {
  try {
    const now = new Date()

    // Build the list of last 6 months (current month + 5 previous).
    // Each entry is { year, monthIndex, yearMonth } where monthIndex is 0-based.
    const months: { year: number; monthIndex: number; yearMonth: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        yearMonth: getYearMonth(d),
      })
    }

    // Range covering all 6 months (start of oldest month → end of current month).
    const rangeStart = new Date(months[0].year, months[0].monthIndex, 1)
    const rangeEnd = new Date(
      months[months.length - 1].year,
      months[months.length - 1].monthIndex + 1,
      0,
      23,
      59,
      59,
      999
    )

    // 1. Purchases grouped by month — sum totalAmount
    const purchases = await db.purchase.findMany({
      where: { date: { gte: rangeStart, lte: rangeEnd } },
      select: { date: true, totalAmount: true },
    })

    const purchaseByMonth = new Map<string, number>()
    for (const p of purchases) {
      const ym = getYearMonth(new Date(p.date))
      purchaseByMonth.set(ym, (purchaseByMonth.get(ym) || 0) + p.totalAmount)
    }

    // 2. Expenses grouped by month — sum amount
    const expenses = await db.expense.findMany({
      where: { date: { gte: rangeStart, lte: rangeEnd } },
      select: { date: true, amount: true },
    })

    const expenseByMonth = new Map<string, number>()
    for (const e of expenses) {
      const ym = getYearMonth(new Date(e.date))
      expenseByMonth.set(ym, (expenseByMonth.get(ym) || 0) + e.amount)
    }

    // 3. Compose the result array
    const data = months.map((m) => ({
      month: m.yearMonth,
      monthLabel: getMonthLabel(m.yearMonth),
      foodCost: Number((purchaseByMonth.get(m.yearMonth) || 0).toFixed(2)),
      operatingCost: Number((expenseByMonth.get(m.yearMonth) || 0).toFixed(2)),
    }))

    return NextResponse.json({
      generatedAt: now.toISOString(),
      months: data,
    })
  } catch (error) {
    console.error('Error generating monthly trend report:', error)
    return NextResponse.json(
      { error: 'Failed to generate monthly trend report' },
      { status: 500 }
    )
  }
}

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Helper: format a Date into "YYYY-MM" string in local time
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

// GET /api/suppliers/[id]/performance
// Returns comprehensive performance metrics for a single supplier:
//   - totalOrders, totalSpend, avgOrderValue, lastOrderDate
//   - calculatedOnTimeRate (from expectedDate + deliveryDate)
//   - topIngredients (top 3 by purchase frequency)
//   - monthlySpend (last 6 months: [{ month, total, count }])
//   - recentOrders (last 5 purchases with date, invoice, amount, status)
//   - rating, qualityScore, onTimeRate, notes from the Supplier model
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supplier = await db.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        category: true,
        rating: true,
        onTimeRate: true,
        qualityScore: true,
        notes: true,
        lastOrderDate: true,
      },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Fetch all purchases (with items + ingredient names) for this supplier
    const purchases = await db.purchase.findMany({
      where: { supplierId: id },
      select: {
        id: true,
        date: true,
        invoiceNo: true,
        totalAmount: true,
        notes: true,
        status: true,
        deliveryDate: true,
        expectedDate: true,
        items: {
          select: {
            ingredientId: true,
            ingredient: { select: { name: true, unit: true } },
            quantity: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    const totalOrders = purchases.length
    const totalSpend = purchases.reduce((sum, p) => sum + p.totalAmount, 0)
    const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0

    // Last order date = most recent purchase date
    const lastOrderDate =
      purchases.length > 0 ? purchases[0].date : supplier.lastOrderDate

    // Calculated on-time rate from expectedDate + deliveryDate
    // A purchase is "on-time" if deliveryDate <= expectedDate (both must be set)
    const qualifyingPurchases = purchases.filter(
      (p) => p.expectedDate && p.deliveryDate
    )
    let calculatedOnTimeRate: number | null = null
    if (qualifyingPurchases.length > 0) {
      const onTimeCount = qualifyingPurchases.filter((p) => {
        const delivery = new Date(p.deliveryDate as Date)
        const expected = new Date(p.expectedDate as Date)
        // Compare dates only (ignore time)
        delivery.setHours(0, 0, 0, 0)
        expected.setHours(0, 0, 0, 0)
        return delivery.getTime() <= expected.getTime()
      }).length
      calculatedOnTimeRate = Math.round(
        (onTimeCount / qualifyingPurchases.length) * 100
      )
    }

    // Top 3 ingredients supplied (by purchase frequency — i.e. how many
    // distinct purchases include this ingredient)
    const ingredientFrequency = new Map<
      string,
      { name: string; unit: string; count: number; totalQty: number }
    >()
    for (const p of purchases) {
      const seenInThisPurchase = new Set<string>()
      for (const item of p.items) {
        if (!seenInThisPurchase.has(item.ingredientId)) {
          seenInThisPurchase.add(item.ingredientId)
          const existing = ingredientFrequency.get(item.ingredientId)
          if (existing) {
            existing.count += 1
            existing.totalQty += item.quantity
          } else {
            ingredientFrequency.set(item.ingredientId, {
              name: item.ingredient.name,
              unit: item.ingredient.unit,
              count: 1,
              totalQty: item.quantity,
            })
          }
        } else {
          // Already counted frequency for this purchase; still accumulate qty
          const existing = ingredientFrequency.get(item.ingredientId)
          if (existing) existing.totalQty += item.quantity
        }
      }
    }
    const topIngredients = Array.from(ingredientFrequency.entries())
      .map(([ingId, info]) => ({ ingredientId: ingId, ...info }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // Monthly spend trend (last 6 months)
    const now = new Date()
    const months: { year: number; monthIndex: number; yearMonth: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        yearMonth: getYearMonth(d),
      })
    }
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

    const purchaseByMonth = new Map<string, { total: number; count: number }>()
    for (const p of purchases) {
      const pd = new Date(p.date)
      if (pd < rangeStart || pd > rangeEnd) continue
      const ym = getYearMonth(pd)
      const existing = purchaseByMonth.get(ym)
      if (existing) {
        existing.total += p.totalAmount
        existing.count += 1
      } else {
        purchaseByMonth.set(ym, { total: p.totalAmount, count: 1 })
      }
    }
    const monthlySpend = months.map((m) => {
      const entry = purchaseByMonth.get(m.yearMonth)
      return {
        month: getMonthLabel(m.yearMonth),
        total: Number((entry?.total || 0).toFixed(2)),
        count: entry?.count || 0,
      }
    })

    // Recent orders (last 5)
    const recentOrders = purchases.slice(0, 5).map((p) => ({
      id: p.id,
      date: p.date,
      invoiceNo: p.invoiceNo,
      totalAmount: p.totalAmount,
      status: p.status,
    }))

    // Determine effective onTimeRate:
    // - prefer manual override (supplier.onTimeRate) if set
    // - otherwise use calculatedOnTimeRate (may be null if no qualifying purchases)
    const effectiveOnTimeRate =
      supplier.onTimeRate != null ? supplier.onTimeRate : calculatedOnTimeRate

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        category: supplier.category,
        rating: supplier.rating,
        qualityScore: supplier.qualityScore,
        onTimeRate: supplier.onTimeRate,
        calculatedOnTimeRate,
        effectiveOnTimeRate,
        notes: supplier.notes,
      },
      metrics: {
        totalOrders,
        totalSpend: Number(totalSpend.toFixed(2)),
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        lastOrderDate,
      },
      topIngredients,
      monthlySpend,
      recentOrders,
    })
  } catch (error) {
    console.error('Error fetching supplier performance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier performance' },
      { status: 500 }
    )
  }
}

// PUT /api/suppliers/[id]/performance
// Updates the manual performance fields: rating, qualityScore, onTimeRate, notes.
// Also updates lastOrderDate if provided (typically computed by the server,
// but allowed here so the UI can keep it in sync).
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { rating, qualityScore, onTimeRate, notes } = body

    // Validate rating (1-5 or null)
    let ratingValue: number | null | undefined
    if (rating !== undefined) {
      if (rating === null) {
        ratingValue = null
      } else {
        const r = Number(rating)
        if (!Number.isInteger(r) || r < 1 || r > 5) {
          return NextResponse.json(
            { error: 'Rating must be an integer between 1 and 5' },
            { status: 400 }
          )
        }
        ratingValue = r
      }
    }

    // Validate qualityScore (1-5 or null)
    let qualityValue: number | null | undefined
    if (qualityScore !== undefined) {
      if (qualityScore === null) {
        qualityValue = null
      } else {
        const q = Number(qualityScore)
        if (!Number.isInteger(q) || q < 1 || q > 5) {
          return NextResponse.json(
            { error: 'Quality score must be an integer between 1 and 5' },
            { status: 400 }
          )
        }
        qualityValue = q
      }
    }

    // Validate onTimeRate (0-100 or null)
    let onTimeValue: number | null | undefined
    if (onTimeRate !== undefined) {
      if (onTimeRate === null) {
        onTimeValue = null
      } else {
        const o = Number(onTimeRate)
        if (Number.isNaN(o) || o < 0 || o > 100) {
          return NextResponse.json(
            { error: 'On-time rate must be a number between 0 and 100' },
            { status: 400 }
          )
        }
        onTimeValue = o
      }
    }

    // Validate notes (string or null)
    let notesValue: string | null | undefined
    if (notes !== undefined) {
      notesValue = typeof notes === 'string' ? notes.trim() : null
    }

    const existing = await db.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    const updated = await db.supplier.update({
      where: { id },
      data: {
        ...(ratingValue !== undefined && { rating: ratingValue }),
        ...(qualityValue !== undefined && { qualityScore: qualityValue }),
        ...(onTimeValue !== undefined && { onTimeRate: onTimeValue }),
        ...(notesValue !== undefined && { notes: notesValue }),
      },
      select: {
        id: true,
        name: true,
        category: true,
        rating: true,
        qualityScore: true,
        onTimeRate: true,
        notes: true,
        lastOrderDate: true,
      },
    })

    return NextResponse.json({
      success: true,
      supplier: updated,
    })
  } catch (error) {
    console.error('Error updating supplier performance:', error)
    return NextResponse.json(
      { error: 'Failed to update supplier performance' },
      { status: 500 }
    )
  }
}

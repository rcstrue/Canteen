import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/stock-movements - List stock movements with filters + pagination + summary
//
// Query params:
//   page          int (default 1)
//   limit         int (default 50)
//   type          string | comma-separated list (PURCHASE,CONSUMPTION,WASTAGE,ADJUSTMENT)
//   ingredientId  string
//   from          ISO date string (YYYY-MM-DD) — inclusive
//   to            ISO date string (YYYY-MM-DD) — inclusive (end-of-day)
//   startDate     alias for `from` (backward compat)
//   endDate       alias for `to` (backward compat)
//   offset        int (legacy, ignored when page is present)
//   search        string — case-insensitive contains on notes + ingredient name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // ── Pagination ────────────────────────────────────────────────────────
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50)
    )
    // Legacy `offset` takes effect only when `page` is not provided.
    const pageParam = searchParams.get('page')
    const offsetParam = searchParams.get('offset')
    const offset = pageParam
      ? (page - 1) * limit
      : offsetParam
        ? Math.max(0, parseInt(offsetParam, 10) || 0)
        : (page - 1) * limit

    // ── Type filter (comma-separated) ─────────────────────────────────────
    const typeRaw = searchParams.get('type')
    const validTypes = ['PURCHASE', 'CONSUMPTION', 'WASTAGE', 'ADJUSTMENT']
    const types: string[] = typeRaw
      ? typeRaw
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter((t) => validTypes.includes(t))
      : []

    // ── Other filters ─────────────────────────────────────────────────────
    const ingredientId = searchParams.get('ingredientId')
    const fromRaw = searchParams.get('from') || searchParams.get('startDate')
    const toRaw = searchParams.get('to') || searchParams.get('endDate')
    const search = (searchParams.get('search') || '').trim()

    // ── Build Prisma `where` ──────────────────────────────────────────────
    const where: Record<string, unknown> = {}

    if (types.length === 1) {
      where.type = types[0]
    } else if (types.length > 1) {
      where.type = { in: types }
    }

    if (ingredientId) {
      where.ingredientId = ingredientId
    }

    if (fromRaw || toRaw) {
      const dateFilter: Record<string, Date> = {}
      if (fromRaw) {
        const fromDate = new Date(fromRaw)
        if (!isNaN(fromDate.getTime())) dateFilter.gte = fromDate
      }
      if (toRaw) {
        // Make `to` inclusive of the entire day (23:59:59.999 local).
        const toDate = new Date(toRaw)
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999)
          dateFilter.lte = toDate
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        where.date = dateFilter
      }
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { notes: { contains: search } },
            { ingredient: { name: { contains: search } } },
          ],
        },
      ]
    }

    // ── Fetch page + total in parallel ────────────────────────────────────
    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        include: {
          ingredient: {
            select: { id: true, name: true, unit: true, category: true },
          },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      db.stockMovement.count({ where }),
    ])

    // ── Summary across the FULL filtered set (not just this page) ─────────
    // Use aggregate to avoid fetching every row. Each aggregate ANDs the
    // type-specific filter onto the base `where` so that if the user has
    // filtered by a specific type (e.g. only WASTAGE), the OTHER aggregates
    // correctly return 0.
    const [inAgg, outAgg, valueAgg] = await Promise.all([
      db.stockMovement.aggregate({
        where: { AND: [where, { type: 'PURCHASE' }] },
        _sum: { quantity: true, totalAmount: true },
      }),
      db.stockMovement.aggregate({
        where: {
          AND: [where, { type: { in: ['CONSUMPTION', 'WASTAGE'] } }],
        },
        _sum: { quantity: true, totalAmount: true },
      }),
      db.stockMovement.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
    ])

    const totalIn = inAgg._sum.quantity ?? 0
    const totalInValue = inAgg._sum.totalAmount ?? 0
    const totalOut = outAgg._sum.quantity ?? 0
    const totalOutValue = outAgg._sum.totalAmount ?? 0
    const totalValue = valueAgg._sum.totalAmount ?? 0

    const hasMore = offset + movements.length < total

    return NextResponse.json({
      data: movements,
      total,
      page,
      limit,
      hasMore,
      summary: {
        totalIn,
        totalInValue,
        totalOut,
        totalOutValue,
        totalValue,
        count: total,
      },
    })
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock movements' },
      { status: 500 }
    )
  }
}

// POST /api/stock-movements - Create stock movement and update ingredient stock
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ingredientId, type, quantity, unitPrice, totalAmount, date, notes, referenceId } = body

    if (!ingredientId || !type || quantity === undefined) {
      return NextResponse.json(
        { error: 'ingredientId, type, and quantity are required' },
        { status: 400 }
      )
    }

    const validTypes = ['PURCHASE', 'CONSUMPTION', 'WASTAGE', 'ADJUSTMENT']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const ingredient = await db.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      )
    }

    // Calculate total amount
    const calculatedTotal = totalAmount ?? (unitPrice ?? 0) * quantity
    const calculatedUnitPrice = unitPrice ?? (quantity > 0 ? calculatedTotal / quantity : 0)

    // Create the stock movement
    const movement = await db.stockMovement.create({
      data: {
        ingredientId,
        type,
        quantity,
        unitPrice: calculatedUnitPrice,
        totalAmount: calculatedTotal,
        date: date ? new Date(date) : new Date(),
        notes,
        referenceId,
      },
      include: {
        ingredient: true,
      },
    })

    // Update ingredient stock based on movement type
    let newStock = ingredient.currentStock

    switch (type) {
      case 'PURCHASE':
        newStock += quantity
        // Update lastPurchasePrice and avgCost
        const totalExistingValue = ingredient.currentStock * ingredient.avgCost
        const totalNewValue = quantity * calculatedUnitPrice
        const totalStock = ingredient.currentStock + quantity
        const newAvgCost = totalStock > 0
          ? (totalExistingValue + totalNewValue) / totalStock
          : calculatedUnitPrice

        await db.ingredient.update({
          where: { id: ingredientId },
          data: {
            currentStock: newStock,
            lastPurchasePrice: calculatedUnitPrice,
            avgCost: newAvgCost,
          },
        })
        break

      case 'CONSUMPTION':
        newStock -= quantity
        if (newStock < 0) newStock = 0
        await db.ingredient.update({
          where: { id: ingredientId },
          data: { currentStock: newStock },
        })
        break

      case 'WASTAGE':
        newStock -= quantity
        if (newStock < 0) newStock = 0
        await db.ingredient.update({
          where: { id: ingredientId },
          data: { currentStock: newStock },
        })
        break

      case 'ADJUSTMENT':
        // For ADJUSTMENT, quantity is the new absolute stock level
        await db.ingredient.update({
          where: { id: ingredientId },
          data: { currentStock: quantity },
        })
        break
    }

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'CREATE',
      entityType: 'StockMovement',
      entityId: movement.id,
      entityName: `${movement.type} — ${ingredient.name} (${movement.quantity} ${ingredient.unit})`,
      description: `Recorded stock movement: ${movement.type} for "${ingredient.name}" — qty ${movement.quantity} ${ingredient.unit}${movement.notes ? ` (${movement.notes})` : ''}`,
      metadata: {
        type: movement.type,
        ingredientId,
        ingredientName: ingredient.name,
        quantity: movement.quantity,
        unitPrice: movement.unitPrice,
        totalAmount: movement.totalAmount,
        previousStock: ingredient.currentStock,
        newStock: type === 'ADJUSTMENT' ? quantity : newStock,
        notes: movement.notes,
      },
    })

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error('Error creating stock movement:', error)
    return NextResponse.json(
      { error: 'Failed to create stock movement' },
      { status: 500 }
    )
  }
}

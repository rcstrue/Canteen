import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const ingredientId = searchParams.get('ingredientId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (ingredientId) where.ingredientId = ingredientId
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      where.date = dateFilter
    }

    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        include: { ingredient: { select: { id: true, name: true, unit: true, category: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.stockMovement.count({ where }),
    ])

    return NextResponse.json({ data: movements, total })
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json({ error: 'Failed to fetch stock movements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ingredientId, type, quantity, unitPrice, date, notes } = body

    if (!ingredientId || !type || !quantity || !date) {
      return NextResponse.json({ error: 'ingredientId, type, quantity, and date are required' }, { status: 400 })
    }

    const validTypes = ['PURCHASE', 'CONSUMPTION', 'WASTAGE', 'ADJUSTMENT']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const ingredient = await db.ingredient.findUnique({ where: { id: ingredientId } })
    if (!ingredient) return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })

    const price = unitPrice ?? ingredient.avgCost ?? 0
    const totalAmount = quantity * price

    const movement = await db.stockMovement.create({
      data: { ingredientId, type, quantity, unitPrice: price, totalAmount, date: new Date(date), notes },
      include: { ingredient: { select: { name: true, unit: true } } },
    })

    // Update ingredient stock
    let newStock = ingredient.currentStock
    if (type === 'PURCHASE') newStock += quantity
    else if (type === 'CONSUMPTION' || type === 'WASTAGE') newStock = Math.max(0, newStock - quantity)
    else if (type === 'ADJUSTMENT') newStock = quantity // adjustment sets absolute value

    await db.ingredient.update({ where: { id: ingredientId }, data: { currentStock: newStock } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'CREATE', entityType: 'StockMovement', entityId: movement.id, entityName: `${type}: ${ingredient.name}`,
      description: `${type} for ${ingredient.name}: ${quantity} ${ingredient.unit} (₹${totalAmount.toFixed(2)})`,
      metadata: { type, ingredientId, quantity, unitPrice: price, totalAmount, date },
    })

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error('Error creating stock movement:', error)
    return NextResponse.json({ error: 'Failed to create stock movement' }, { status: 500 })
  }
}

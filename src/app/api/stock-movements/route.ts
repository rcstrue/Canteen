import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/stock-movements - List stock movements with filters
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

    if (type) {
      where.type = type
    }

    if (ingredientId) {
      where.ingredientId = ingredientId
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      where.date = dateFilter
    }

    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        include: {
          ingredient: {
            select: { id: true, name: true, unit: true, category: true },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.stockMovement.count({ where }),
    ])

    return NextResponse.json({ data: movements, total })
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

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error('Error creating stock movement:', error)
    return NextResponse.json(
      { error: 'Failed to create stock movement' },
      { status: 500 }
    )
  }
}

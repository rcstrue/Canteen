import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/purchases - List purchases with items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const supplier = searchParams.get('supplier')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      where.date = dateFilter
    }

    if (supplier) {
      where.supplier = { contains: supplier }
    }

    const [purchases, total] = await Promise.all([
      db.purchase.findMany({
        where,
        include: {
          items: {
            include: {
              ingredient: {
                select: { id: true, name: true, unit: true, category: true },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.purchase.count({ where }),
    ])

    return NextResponse.json({ data: purchases, total })
  } catch (error) {
    console.error('Error fetching purchases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    )
  }
}

// POST /api/purchases - Create purchase with items + auto stock movements
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, supplier, invoiceNo, notes, items } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one purchase item is required' },
        { status: 400 }
      )
    }

    // Validate all ingredient IDs exist
    const ingredientIds = items.map((item: { ingredientId: string }) => item.ingredientId)
    const ingredients = await db.ingredient.findMany({
      where: { id: { in: ingredientIds } },
    })

    if (ingredients.length !== ingredientIds.length) {
      return NextResponse.json(
        { error: 'One or more ingredients not found' },
        { status: 404 }
      )
    }

    const ingredientMap = new Map(ingredients.map((i) => [i.id, i]))

    // Calculate total amount
    const totalAmount = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    )

    // Create the purchase record with items
    const purchase = await db.purchase.create({
      data: {
        date: date ? new Date(date) : new Date(),
        supplier,
        invoiceNo,
        totalAmount,
        notes,
        items: {
          create: items.map((item: { ingredientId: string; quantity: number; unitPrice: number }) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        items: {
          include: {
            ingredient: {
              select: { id: true, name: true, unit: true, category: true },
            },
          },
        },
      },
    })

    // Create PURCHASE stock movements and update ingredient stock
    for (const item of items) {
      const ingredient = ingredientMap.get(item.ingredientId)!
      const itemTotal = item.quantity * item.unitPrice

      // Create PURCHASE stock movement
      await db.stockMovement.create({
        data: {
          ingredientId: item.ingredientId,
          type: 'PURCHASE',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalAmount: itemTotal,
          date: purchase.date,
          notes: `Purchase ${invoiceNo ? `(${invoiceNo})` : ''}`,
          referenceId: purchase.id,
        },
      })

      // Update ingredient stock, lastPurchasePrice, avgCost
      const totalExistingValue = ingredient.currentStock * ingredient.avgCost
      const totalNewValue = item.quantity * item.unitPrice
      const totalStock = ingredient.currentStock + item.quantity
      const newAvgCost = totalStock > 0
        ? (totalExistingValue + totalNewValue) / totalStock
        : item.unitPrice

      await db.ingredient.update({
        where: { id: item.ingredientId },
        data: {
          currentStock: totalStock,
          lastPurchasePrice: item.unitPrice,
          avgCost: newAvgCost,
        },
      })
    }

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'CREATE',
      entityType: 'Purchase',
      entityId: purchase.id,
      entityName: purchase.invoiceNo || `Purchase ${purchase.id.slice(-6)}`,
      description: `Created purchase${purchase.invoiceNo ? ` (${purchase.invoiceNo})` : ''} from "${purchase.supplier || 'Unknown Supplier'}" — ${items.length} items, ₹${purchase.totalAmount.toFixed(2)}`,
      metadata: {
        date: purchase.date,
        supplier: purchase.supplier,
        invoiceNo: purchase.invoiceNo,
        totalAmount: purchase.totalAmount,
        itemCount: items.length,
      },
    })

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    )
  }
}

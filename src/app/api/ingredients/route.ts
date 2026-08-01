import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/ingredients - List all ingredients
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const lowStock = searchParams.get('lowStock')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (category) {
      where.category = category
    }

    if (search) {
      where.name = { contains: search }
    }

    const ingredients = await db.ingredient.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    let result = ingredients
    if (lowStock === 'true') {
      // SQLite doesn't support field-to-field comparison in WHERE, filter in JS
      result = ingredients.filter((i) => i.currentStock < i.minStock)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching ingredients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ingredients' },
      { status: 500 }
    )
  }
}

// POST /api/ingredients - Create ingredient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, unit, category, currentStock, minStock, lastPurchasePrice, avgCost, supplier } = body

    if (!name || !unit || !category) {
      return NextResponse.json(
        { error: 'Name, unit, and category are required' },
        { status: 400 }
      )
    }

    const ingredient = await db.ingredient.create({
      data: {
        name,
        unit,
        category,
        currentStock: currentStock ?? 0,
        minStock: minStock ?? 0,
        lastPurchasePrice: lastPurchasePrice ?? 0,
        avgCost: avgCost ?? 0,
        supplier,
      },
    })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'CREATE',
      entityType: 'Ingredient',
      entityId: ingredient.id,
      entityName: ingredient.name,
      description: `Created ingredient "${ingredient.name}" (${ingredient.category}, ${ingredient.currentStock} ${ingredient.unit})`,
      metadata: {
        category: ingredient.category,
        unit: ingredient.unit,
        currentStock: ingredient.currentStock,
        minStock: ingredient.minStock,
        lastPurchasePrice: ingredient.lastPurchasePrice,
        avgCost: ingredient.avgCost,
      },
    })

    return NextResponse.json(ingredient, { status: 201 })
  } catch (error) {
    console.error('Error creating ingredient:', error)
    return NextResponse.json(
      { error: 'Failed to create ingredient' },
      { status: 500 }
    )
  }
}

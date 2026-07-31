import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/ingredients/[id] - Get single ingredient
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ingredient = await db.ingredient.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { date: 'desc' },
          take: 20,
        },
        recipeIngredients: {
          include: { recipe: true },
        },
      },
    })

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(ingredient)
  } catch (error) {
    console.error('Error fetching ingredient:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ingredient' },
      { status: 500 }
    )
  }
}

// PUT /api/ingredients/[id] - Update ingredient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, unit, category, currentStock, minStock, lastPurchasePrice, avgCost, supplier } = body

    const existing = await db.ingredient.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      )
    }

    const ingredient = await db.ingredient.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(unit !== undefined && { unit }),
        ...(category !== undefined && { category }),
        ...(currentStock !== undefined && { currentStock }),
        ...(minStock !== undefined && { minStock }),
        ...(lastPurchasePrice !== undefined && { lastPurchasePrice }),
        ...(avgCost !== undefined && { avgCost }),
        ...(supplier !== undefined && { supplier }),
      },
    })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'UPDATE',
      entityType: 'Ingredient',
      entityId: ingredient.id,
      entityName: ingredient.name,
      description: `Updated ingredient "${ingredient.name}"`,
      metadata: { before: existing, after: ingredient },
    })

    return NextResponse.json(ingredient)
  } catch (error) {
    console.error('Error updating ingredient:', error)
    return NextResponse.json(
      { error: 'Failed to update ingredient' },
      { status: 500 }
    )
  }
}

// DELETE /api/ingredients/[id] - Delete ingredient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.ingredient.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      )
    }

    await db.ingredient.delete({ where: { id } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE',
      entityType: 'Ingredient',
      entityId: existing.id,
      entityName: existing.name,
      description: `Deleted ingredient "${existing.name}" (${existing.category})`,
      metadata: {
        name: existing.name,
        category: existing.category,
        unit: existing.unit,
        currentStock: existing.currentStock,
      },
    })

    return NextResponse.json({ message: 'Ingredient deleted successfully' })
  } catch (error) {
    console.error('Error deleting ingredient:', error)
    return NextResponse.json(
      { error: 'Failed to delete ingredient' },
      { status: 500 }
    )
  }
}

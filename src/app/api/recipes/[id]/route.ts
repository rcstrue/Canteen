import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const recipe = await db.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true, avgCost: true, lastPurchasePrice: true, currentStock: true } } } },
        costHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { dailyMeals: true } },
      },
    })
    if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(recipe)
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const { name, description, mealType, baseServings, instructions, ingredients, ...rest } = body

    // If ingredients array provided, delete old and create new
    if (ingredients) {
      await db.recipeIngredient.deleteMany({ where: { recipeId: id } })
    }

    const recipe = await db.recipe.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(mealType && { mealType }),
        ...(baseServings && { baseServings }),
        ...(instructions !== undefined && { instructions }),
        ...(ingredients && {
          ingredients: {
            create: ingredients.map((i: { ingredientId: string; quantity: number; unit: string }) => ({
              ingredientId: i.ingredientId,
              quantity: i.quantity,
              unit: i.unit,
            })),
          },
        }),
      },
      include: { ingredients: { include: { ingredient: true } } },
    })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'UPDATE', entityType: 'Recipe', entityId: recipe.id, entityName: recipe.name,
      description: `Updated recipe "${recipe.name}"`,
    })

    return NextResponse.json(recipe)
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const recipe = await db.recipe.delete({ where: { id } })
    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE', entityType: 'Recipe', entityId: id, entityName: recipe.name,
      description: `Deleted recipe "${recipe.name}"`,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 })
  }
}

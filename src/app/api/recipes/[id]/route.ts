import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { recordRecipeCost } from '@/lib/recipe-cost'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/recipes/[id] - Get single recipe with ingredients
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const recipe = await db.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        dailyMeals: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    })

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

// PUT /api/recipes/[id] - Update recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, mealType, baseServings, instructions, ingredients, imageUrl } = body

    const existing = await db.recipe.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // If ingredients are provided, replace them all
    if (ingredients && Array.isArray(ingredients)) {
      // Delete existing ingredients
      await db.recipeIngredient.deleteMany({
        where: { recipeId: id },
      })

      // Create new ingredients
      await db.recipeIngredient.createMany({
        data: ingredients.map((ing: { ingredientId: string; quantity: number; unit: string }) => ({
          recipeId: id,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
      })
    }

    const recipe = await db.recipe.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(mealType !== undefined && { mealType }),
        ...(baseServings !== undefined && { baseServings }),
        ...(instructions !== undefined && { instructions }),
        ...(imageUrl !== undefined && { imageUrl: typeof imageUrl === 'string' && imageUrl.length > 0 ? imageUrl : null }),
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'UPDATE',
      entityType: 'Recipe',
      entityId: recipe.id,
      entityName: recipe.name,
      description: `Updated recipe "${recipe.name}"`,
      metadata: { before: existing, after: { name: recipe.name, mealType: recipe.mealType, baseServings: recipe.baseServings } },
    })

    // Track cost changes when recipes are edited — fire and forget
    // (don't block the response on the snapshot write). recordRecipeCost
    // is non-throwing internally, so a failure here cannot break the PUT.
    void recordRecipeCost(recipe.id, 'recipe_edit', undefined, request).catch(
      (err) => console.error('[recipes] auto cost snapshot failed:', err)
    )

    return NextResponse.json(recipe)
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}

// DELETE /api/recipes/[id] - Delete recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.recipe.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    await db.recipe.delete({ where: { id } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE',
      entityType: 'Recipe',
      entityId: existing.id,
      entityName: existing.name,
      description: `Deleted recipe "${existing.name}" (${existing.mealType})`,
      metadata: {
        name: existing.name,
        mealType: existing.mealType,
        baseServings: existing.baseServings,
      },
    })

    return NextResponse.json({ message: 'Recipe deleted successfully' })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}

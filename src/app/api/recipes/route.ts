import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/recipes - List all recipes with ingredients
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mealType = searchParams.get('mealType')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (mealType) {
      where.mealType = mealType
    }

    if (search) {
      where.name = { contains: search }
    }

    const recipes = await db.recipe.findMany({
      where,
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(recipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}

// POST /api/recipes - Create recipe with ingredients
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, mealType, baseServings, instructions, ingredients, imageUrl } = body

    if (!name || !mealType) {
      return NextResponse.json(
        { error: 'Name and mealType are required' },
        { status: 400 }
      )
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'At least one ingredient is required' },
        { status: 400 }
      )
    }

    const recipe = await db.recipe.create({
      data: {
        name,
        description,
        mealType,
        baseServings: baseServings ?? 100,
        instructions,
        imageUrl: typeof imageUrl === 'string' ? imageUrl : null,
        ingredients: {
          create: ingredients.map((ing: { ingredientId: string; quantity: number; unit: string }) => ({
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        },
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
      action: 'CREATE',
      entityType: 'Recipe',
      entityId: recipe.id,
      entityName: recipe.name,
      description: `Created recipe "${recipe.name}" (${recipe.mealType}, ${recipe.baseServings} servings, ${ingredients.length} ingredients)`,
      metadata: {
        mealType: recipe.mealType,
        baseServings: recipe.baseServings,
        ingredientCount: ingredients.length,
      },
    })

    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}

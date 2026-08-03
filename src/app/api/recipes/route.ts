import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mealType = searchParams.get('mealType')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (mealType) where.mealType = mealType
    if (search) where.name = { contains: search }

    const recipes = await db.recipe.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true, avgCost: true, lastPurchasePrice: true } } } }, _count: { select: { dailyMeals: true } } },
    })

    return NextResponse.json(recipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, mealType, baseServings, instructions, ingredients } = body

    if (!name || !mealType) {
      return NextResponse.json({ error: 'Name and mealType are required' }, { status: 400 })
    }

    const recipe = await db.recipe.create({
      data: {
        name, description, mealType,
        baseServings: baseServings ?? 100,
        instructions,
        ingredients: ingredients ? {
          create: ingredients.map((i: { ingredientId: string; quantity: number; unit: string }) => ({
            ingredientId: i.ingredientId,
            quantity: i.quantity,
            unit: i.unit,
          })),
        } : undefined,
      },
      include: { ingredients: { include: { ingredient: true } } },
    })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'CREATE', entityType: 'Recipe', entityId: recipe.id, entityName: recipe.name,
      description: `Created recipe "${recipe.name}" (${recipe.mealType}, ${recipe.baseServings} servings, ${recipe.ingredients.length} ingredients)`,
      metadata: { mealType: recipe.mealType, baseServings: recipe.baseServings, ingredientCount: recipe.ingredients.length },
    })

    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 })
  }
}

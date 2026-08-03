import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const mealType = searchParams.get('mealType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}
    if (date) {
      const d = new Date(date)
      const nextDay = new Date(d); nextDay.setDate(nextDay.getDate() + 1)
      where.date = { gte: d, lt: nextDay }
    } else if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      where.date = dateFilter
    }
    if (mealType) where.mealType = mealType

    const [meals, total] = await Promise.all([
      db.dailyMealServed.findMany({
        where,
        include: { recipe: { include: { ingredients: { include: { ingredient: true } } } } },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.dailyMealServed.count({ where }),
    ])

    return NextResponse.json({ data: meals, total })
  } catch (error) {
    console.error('Error fetching daily meals:', error)
    return NextResponse.json({ error: 'Failed to fetch daily meals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, mealType, mealsServed, recipeId, notes } = body

    if (!date || !mealType || !mealsServed || !recipeId) {
      return NextResponse.json({ error: 'date, mealType, mealsServed, and recipeId are required' }, { status: 400 })
    }

    const recipe = await db.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: { include: { ingredient: true } } },
    })

    if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return NextResponse.json({ error: 'Recipe has no ingredients defined' }, { status: 400 })
    }

    const meal = await db.dailyMealServed.create({
      data: { date: new Date(date), mealType, mealsServed, recipeId, notes },
      include: { recipe: true },
    })

    const ratio = mealsServed / recipe.baseServings
    const stockMovements = []

    for (const ri of recipe.ingredients) {
      const consumedQty = ratio * ri.quantity
      const ingredient = ri.ingredient

      await db.stockMovement.create({
        data: {
          ingredientId: ri.ingredientId, type: 'CONSUMPTION', quantity: consumedQty, unitPrice: ingredient.avgCost,
          totalAmount: consumedQty * ingredient.avgCost, date: new Date(date),
          notes: `${mealType} - ${recipe.name} (${mealsServed} servings)`, referenceId: meal.id,
        },
      })

      const newStock = Math.max(0, ingredient.currentStock - consumedQty)
      await db.ingredient.update({ where: { id: ri.ingredientId }, data: { currentStock: newStock } })

      stockMovements.push({ ingredientId: ri.ingredientId, consumed: consumedQty })
    }

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'CREATE', entityType: 'DailyMeal', entityId: meal.id, entityName: `${meal.mealType} — ${recipe.name} (${meal.mealsServed} servings)`,
      description: `Recorded daily meal: ${meal.mealType} — ${recipe.name} for ${meal.mealsServed} servings`,
      metadata: { date: meal.date, mealType, mealsServed, recipeId, recipeName: recipe.name },
    })

    return NextResponse.json({ meal, stockMovements }, { status: 201 })
  } catch (error) {
    console.error('Error creating daily meal:', error)
    return NextResponse.json({ error: 'Failed to create daily meal' }, { status: 500 })
  }
}

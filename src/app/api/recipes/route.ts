import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/recipes - List all recipes with ingredients + latest cost variance
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

    // Pull the latest 2 cost-history rows per recipe in a single query.
    // We fetch a wider slice (top 2 per recipeId) by querying all rows for
    // the matching recipe IDs ordered desc, then keeping the first two per
    // recipe in JS. This avoids SQLite's lack of LATERAL / per-group LIMIT.
    const recipeIds = recipes.map((r) => r.id)
    const recentHistory = recipeIds.length
      ? await db.recipeCostHistory.findMany({
          where: { recipeId: { in: recipeIds } },
          orderBy: { createdAt: 'desc' },
          // 2 rows × recipe count + a safety margin; we filter in JS below.
          take: recipeIds.length * 2,
          select: {
            id: true,
            recipeId: true,
            cost: true,
            costPerServing: true,
            servings: true,
            trigger: true,
            createdAt: true,
          },
        })
      : []

    // Group into { recipeId: [latest, previous] }
    const latestByRecipe = new Map<string, { costPerServing: number; cost: number; createdAt: Date }>()
    const previousByRecipe = new Map<string, { costPerServing: number; cost: number; createdAt: Date }>()
    for (const row of recentHistory) {
      if (!latestByRecipe.has(row.recipeId)) {
        latestByRecipe.set(row.recipeId, {
          costPerServing: row.costPerServing,
          cost: row.cost,
          createdAt: row.createdAt,
        })
      } else if (!previousByRecipe.has(row.recipeId)) {
        previousByRecipe.set(row.recipeId, {
          costPerServing: row.costPerServing,
          cost: row.cost,
          createdAt: row.createdAt,
        })
      }
    }

    const recipesWithVariance = recipes.map((recipe) => {
      const latest = latestByRecipe.get(recipe.id)
      const previous = previousByRecipe.get(recipe.id)

      if (!latest) {
        return { ...recipe, latestCostVariance: null }
      }

      if (!previous || previous.costPerServing === 0) {
        return {
          ...recipe,
          latestCostVariance: {
            current: latest.costPerServing,
            previous: null,
            absolute: 0,
            percentage: 0,
            direction: 'none' as const,
            recordedAt: latest.createdAt.toISOString(),
          },
        }
      }

      const absolute = latest.costPerServing - previous.costPerServing
      const percentage = (absolute / previous.costPerServing) * 100
      let direction: 'up' | 'down' | 'none' = 'none'
      // Use ±0.5% as the noise threshold (matches the cost-history route)
      if (Math.abs(percentage) > 0.5) {
        direction = percentage > 0 ? 'up' : 'down'
      }

      return {
        ...recipe,
        latestCostVariance: {
          current: round2(latest.costPerServing),
          previous: round2(previous.costPerServing),
          absolute: round2(absolute),
          percentage: round2(percentage),
          direction,
          recordedAt: latest.createdAt.toISOString(),
        },
      }
    })

    return NextResponse.json(recipesWithVariance)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
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

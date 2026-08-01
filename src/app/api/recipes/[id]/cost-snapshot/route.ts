import { db } from '@/lib/db'
import { recordRecipeCost, calculateRecipeCost } from '@/lib/recipe-cost'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/recipes/[id]/cost-snapshot
//   Returns the most recent RecipeCostHistory row (if any) plus the live
//   cost breakdown computed right now. Used by the meals view to refresh
//   the "current cost" card without a full history pull.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const recipe = await db.recipe.findUnique({
      where: { id },
      select: { id: true, name: true, baseServings: true },
    })
    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    const [latest, breakdown] = await Promise.all([
      db.recipeCostHistory.findFirst({
        where: { recipeId: id },
        orderBy: { createdAt: 'desc' },
      }),
      calculateRecipeCost(id),
    ])

    return NextResponse.json({
      recipeId: id,
      recipeName: recipe.name,
      live: breakdown,
      latest: latest
        ? {
            id: latest.id,
            cost: latest.cost,
            costPerServing: latest.costPerServing,
            servings: latest.servings,
            trigger: latest.trigger,
            notes: latest.notes,
            createdAt: latest.createdAt.toISOString(),
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching cost snapshot:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cost snapshot' },
      { status: 500 }
    )
  }
}

// POST /api/recipes/[id]/cost-snapshot
//   Records a new manual cost snapshot for the recipe. Returns 201 with the
//   created snapshot row plus the computed breakdown.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const recipe = await db.recipe.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Optional notes payload — ignored if body is empty/invalid JSON.
    let notes: string | undefined
    try {
      const body = await request.json()
      if (body && typeof body.notes === 'string') {
        notes = body.notes.trim() || undefined
      }
    } catch {
      // No JSON body provided — that's fine, treat as manual snapshot.
    }

    const [breakdown, created] = await Promise.all([
      calculateRecipeCost(id),
      recordRecipeCost(id, 'manual', notes, request),
    ])

    if (!created) {
      return NextResponse.json(
        { error: 'Failed to record cost snapshot' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        recipeId: id,
        recipeName: recipe.name,
        snapshot: {
          id: created.id,
          cost: created.cost,
          costPerServing: created.costPerServing,
          servings: created.servings,
          trigger: created.trigger,
          notes: created.notes,
          createdAt: created.createdAt.toISOString(),
        },
        breakdown,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error recording cost snapshot:', error)
    return NextResponse.json(
      { error: 'Failed to record cost snapshot' },
      { status: 500 }
    )
  }
}

import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/recipes/[id]/cost-history
//   Returns: { current, previous, variance, history, trend }
//   - current/previous: latest two snapshots (previous null if <2 exist)
//   - variance: { absolute, percentage, direction }
//   - history: last 30 snapshots, sorted desc
//   - trend: history reversed (oldest first) for charting
export async function GET(
  _request: NextRequest,
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

    const rows = await db.recipeCostHistory.findMany({
      where: { recipeId: id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    if (rows.length === 0) {
      return NextResponse.json({
        recipeId: id,
        recipeName: recipe.name,
        current: null,
        previous: null,
        variance: { absolute: 0, percentage: 0, direction: 'none' as const },
        history: [],
        trend: [],
      })
    }

    const current = rows[0]
    const previous = rows[1] ?? null

    const variance = computeVariance(current, previous)

    const history = rows.map((r) => ({
      id: r.id,
      cost: r.cost,
      costPerServing: r.costPerServing,
      servings: r.servings,
      trigger: r.trigger,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }))

    // Trend: oldest first for charting
    const trend = [...rows]
      .reverse()
      .map((r) => ({
        date: r.createdAt.toISOString(),
        cost: r.costPerServing,
        servings: r.servings,
        trigger: r.trigger,
      }))

    return NextResponse.json({
      recipeId: id,
      recipeName: recipe.name,
      current: {
        id: current.id,
        cost: current.cost,
        costPerServing: current.costPerServing,
        servings: current.servings,
        trigger: current.trigger,
        notes: current.notes,
        recordedAt: current.createdAt.toISOString(),
      },
      previous: previous
        ? {
            id: previous.id,
            cost: previous.cost,
            costPerServing: previous.costPerServing,
            servings: previous.servings,
            trigger: previous.trigger,
            notes: previous.notes,
            recordedAt: previous.createdAt.toISOString(),
          }
        : null,
      variance,
      history,
      trend,
    })
  } catch (error) {
    console.error('Error fetching cost history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cost history' },
      { status: 500 }
    )
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function computeVariance(
  current: { costPerServing: number },
  previous: { costPerServing: number } | null
): { absolute: number; percentage: number; direction: 'up' | 'down' | 'none' } {
  if (!previous || previous.costPerServing === 0) {
    return { absolute: 0, percentage: 0, direction: 'none' }
  }
  const absolute = current.costPerServing - previous.costPerServing
  const percentage = (absolute / previous.costPerServing) * 100
  // 0.5% noise threshold to avoid "up/down" flicker on rounding
  let direction: 'up' | 'down' | 'none' = 'none'
  if (Math.abs(percentage) > 0.5) {
    direction = percentage > 0 ? 'up' : 'down'
  }
  return {
    absolute: round2(absolute),
    percentage: round2(percentage),
    direction,
  }
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

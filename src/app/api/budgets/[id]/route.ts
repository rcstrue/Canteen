import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/budgets/[id] - Get a specific budget
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const budget = await db.budget.findUnique({ where: { id } })

    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error fetching budget:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    )
  }
}

// PUT /api/budgets/[id] - Update a budget
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { month, foodBudget, operatingBudget, totalBudget, alertThreshold } = body

    const existing = await db.budget.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      )
    }

    // If month is being changed, validate format and uniqueness
    if (month && month !== existing.month) {
      const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/
      if (!monthRegex.test(month)) {
        return NextResponse.json(
          { error: 'Invalid month format. Use YYYY-MM (e.g., 2026-07)' },
          { status: 400 }
        )
      }
      const duplicate = await db.budget.findUnique({ where: { month } })
      if (duplicate) {
        return NextResponse.json(
          { error: 'A budget already exists for this month' },
          { status: 409 }
        )
      }
    }

    const budget = await db.budget.update({
      where: { id },
      data: {
        ...(month !== undefined && { month }),
        ...(foodBudget !== undefined && { foodBudget }),
        ...(operatingBudget !== undefined && { operatingBudget }),
        ...(totalBudget !== undefined && { totalBudget }),
        ...(alertThreshold !== undefined && { alertThreshold }),
      },
    })

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    )
  }
}

// DELETE /api/budgets/[id] - Delete a budget
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.budget.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      )
    }

    await db.budget.delete({ where: { id } })

    return NextResponse.json({ message: 'Budget deleted successfully' })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json(
      { error: 'Failed to delete budget' },
      { status: 500 }
    )
  }
}

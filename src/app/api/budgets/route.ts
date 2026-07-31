import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/budgets - List all budgets (sorted by month desc)
export async function GET() {
  try {
    const budgets = await db.budget.findMany({
      orderBy: { month: 'desc' },
    })

    return NextResponse.json(budgets)
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}

// POST /api/budgets - Create or update a budget for a specific month
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { month, foodBudget, operatingBudget, totalBudget, alertThreshold } = body

    if (!month) {
      return NextResponse.json(
        { error: 'month is required (format: YYYY-MM)' },
        { status: 400 }
      )
    }

    // Validate month format
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/
    if (!monthRegex.test(month)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM (e.g., 2026-07)' },
        { status: 400 }
      )
    }

    // Upsert: create or update budget for the given month
    const budget = await db.budget.upsert({
      where: { month },
      create: {
        month,
        foodBudget: foodBudget ?? 0,
        operatingBudget: operatingBudget ?? 0,
        totalBudget: totalBudget ?? 0,
        alertThreshold: alertThreshold ?? 80,
      },
      update: {
        ...(foodBudget !== undefined && { foodBudget }),
        ...(operatingBudget !== undefined && { operatingBudget }),
        ...(totalBudget !== undefined && { totalBudget }),
        ...(alertThreshold !== undefined && { alertThreshold }),
      },
    })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'UPDATE',
      entityType: 'Budget',
      entityId: budget.id,
      entityName: budget.month,
      description: `Set budget for ${budget.month} (food: ₹${budget.foodBudget.toFixed(2)}, operating: ₹${budget.operatingBudget.toFixed(2)}, total: ₹${budget.totalBudget.toFixed(2)}, alert at ${budget.alertThreshold}%)`,
      metadata: {
        month: budget.month,
        foodBudget: budget.foodBudget,
        operatingBudget: budget.operatingBudget,
        totalBudget: budget.totalBudget,
        alertThreshold: budget.alertThreshold,
      },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating budget:', error)
    return NextResponse.json(
      { error: 'Failed to create/update budget' },
      { status: 500 }
    )
  }
}

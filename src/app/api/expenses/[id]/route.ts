import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/expenses/[id] - Update expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, category, amount, description } = body

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    if (category) {
      const validCategories = ['Gas', 'Electricity', 'Water', 'Maintenance', 'Other']
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const expense = await db.expense.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(category !== undefined && { category }),
        ...(amount !== undefined && { amount }),
        ...(description !== undefined && { description }),
      },
    })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'UPDATE',
      entityType: 'Expense',
      entityId: expense.id,
      entityName: `${expense.category} — ₹${expense.amount.toFixed(2)}`,
      description: `Updated expense "${expense.category}" (₹${expense.amount.toFixed(2)})`,
      metadata: { before: existing, after: { category: expense.category, amount: expense.amount, date: expense.date, description: expense.description } },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    )
  }
}

// DELETE /api/expenses/[id] - Delete expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      )
    }

    await db.expense.delete({ where: { id } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE',
      entityType: 'Expense',
      entityId: existing.id,
      entityName: `${existing.category} — ₹${existing.amount.toFixed(2)}`,
      description: `Deleted expense "${existing.category}" of ₹${existing.amount.toFixed(2)}`,
      metadata: {
        date: existing.date,
        category: existing.category,
        amount: existing.amount,
        description: existing.description,
      },
    })

    return NextResponse.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}

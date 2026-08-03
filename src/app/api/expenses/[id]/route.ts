import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const expense = await db.expense.update({ where: { id }, data: { ...body, ...(body.date && { date: new Date(body.date) }) } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'UPDATE', entityType: 'Expense', entityId: expense.id, entityName: `${expense.category}`,
      description: `Updated expense "${expense.category}"`,
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const expense = await db.expense.delete({ where: { id } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE', entityType: 'Expense', entityId: id, entityName: `${expense.category}`,
      description: `Deleted expense "${expense.category}" ₹${expense.amount.toFixed(2)}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}

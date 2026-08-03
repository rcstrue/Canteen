import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const budget = await db.budget.delete({ where: { id } })
    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE', entityType: 'Budget', entityId: id, entityName: budget.month,
      description: `Deleted budget for ${budget.month}`,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
  }
}

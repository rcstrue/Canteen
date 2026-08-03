import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const ingredient = await db.ingredient.findUnique({
      where: { id },
      include: { supplierLink: true, stockMovements: { orderBy: { createdAt: 'desc' }, take: 10 } },
    })
    if (!ingredient) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(ingredient)
  } catch (error) {
    console.error('Error fetching ingredient:', error)
    return NextResponse.json({ error: 'Failed to fetch ingredient' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const ingredient = await db.ingredient.update({
      where: { id },
      data: body,
      include: { supplierLink: true },
    })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'UPDATE', entityType: 'Ingredient', entityId: ingredient.id, entityName: ingredient.name,
      description: `Updated ingredient "${ingredient.name}"`,
      metadata: body,
    })

    return NextResponse.json(ingredient)
  } catch (error) {
    console.error('Error updating ingredient:', error)
    return NextResponse.json({ error: 'Failed to update ingredient' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const ingredient = await db.ingredient.delete({ where: { id } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE', entityType: 'Ingredient', entityId: id, entityName: ingredient.name,
      description: `Deleted ingredient "${ingredient.name}"`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ingredient:', error)
    return NextResponse.json({ error: 'Failed to delete ingredient' }, { status: 500 })
  }
}

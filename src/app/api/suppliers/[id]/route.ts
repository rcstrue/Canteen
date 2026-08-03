import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: { _count: { select: { ingredients: true, purchases: true } }, purchases: { select: { totalAmount: true } } },
    })
    if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const totalPurchaseValue = supplier.purchases.reduce((sum, p) => sum + p.totalAmount, 0)
    return NextResponse.json({ ...supplier, ingredientCount: supplier._count.ingredients, purchaseCount: supplier._count.purchases, totalPurchaseValue })
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const supplier = await db.supplier.update({ where: { id }, data: body })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'UPDATE', entityType: 'Supplier', entityId: supplier.id, entityName: supplier.name,
      description: `Updated supplier "${supplier.name}"`,
      metadata: body,
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error updating supplier:', error)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const supplier = await db.supplier.delete({ where: { id } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE', entityType: 'Supplier', entityId: id, entityName: supplier.name,
      description: `Deleted supplier "${supplier.name}"`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}

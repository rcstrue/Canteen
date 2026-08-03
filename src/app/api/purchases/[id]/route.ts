import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: { items: { include: { ingredient: true } }, supplierLink: true },
    })
    if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Error fetching purchase:', error)
    return NextResponse.json({ error: 'Failed to fetch purchase' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const purchase = await db.purchase.findUnique({ where: { id }, include: { items: true } })
    if (!purchase) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete related stock movements
    for (const item of purchase.items) {
      await db.stockMovement.deleteMany({ where: { referenceId: id, ingredientId: item.ingredientId } })
      // Reverse the stock
      const ingredient = await db.ingredient.findUnique({ where: { id: item.ingredientId } })
      if (ingredient) {
        await db.ingredient.update({
          where: { id: item.ingredientId },
          data: { currentStock: Math.max(0, ingredient.currentStock - item.quantity) },
        })
      }
    }

    await db.purchase.delete({ where: { id } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE', entityType: 'Purchase', entityId: id, entityName: purchase.invoiceNo || id,
      description: `Deleted purchase ${purchase.invoiceNo || id}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting purchase:', error)
    return NextResponse.json({ error: 'Failed to delete purchase' }, { status: 500 })
  }
}

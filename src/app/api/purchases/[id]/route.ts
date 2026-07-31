import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/purchases/[id] - Get single purchase with items
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            ingredient: {
              select: { id: true, name: true, unit: true, category: true },
            },
          },
        },
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Error fetching purchase:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase' },
      { status: 500 }
    )
  }
}

// DELETE /api/purchases/[id] - Delete purchase
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.purchase.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    // Note: Deleting a purchase does NOT reverse the stock movements.
    // In production, you'd want to create reversal movements.
    // For now, we just delete the record and its items (cascade).

    await db.purchase.delete({ where: { id } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE',
      entityType: 'Purchase',
      entityId: existing.id,
      entityName: existing.invoiceNo || `Purchase ${existing.id.slice(-6)}`,
      description: `Deleted purchase${existing.invoiceNo ? ` (${existing.invoiceNo})` : ''} from "${existing.supplier || 'Unknown'}" — ₹${existing.totalAmount.toFixed(2)}, ${existing.items.length} items`,
      metadata: {
        date: existing.date,
        supplier: existing.supplier,
        invoiceNo: existing.invoiceNo,
        totalAmount: existing.totalAmount,
        itemCount: existing.items.length,
      },
    })

    return NextResponse.json({ message: 'Purchase deleted successfully' })
  } catch (error) {
    console.error('Error deleting purchase:', error)
    return NextResponse.json(
      { error: 'Failed to delete purchase' },
      { status: 500 }
    )
  }
}

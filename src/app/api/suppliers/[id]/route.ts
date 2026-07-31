import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/suppliers/[id] - Get a single supplier with full details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        ingredients: {
          select: {
            id: true,
            name: true,
            unit: true,
            category: true,
            currentStock: true,
            minStock: true,
            avgCost: true,
          },
          orderBy: { name: 'asc' },
        },
        purchases: {
          select: {
            id: true,
            date: true,
            invoiceNo: true,
            totalAmount: true,
            notes: true,
          },
          orderBy: { date: 'desc' },
          take: 50,
        },
        _count: {
          select: {
            ingredients: true,
            purchases: true,
          },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    const totalPurchaseValue = supplier.purchases.reduce(
      (sum, p) => sum + p.totalAmount,
      0
    )

    return NextResponse.json({
      ...supplier,
      ingredientCount: supplier._count.ingredients,
      purchaseCount: supplier._count.purchases,
      totalPurchaseValue,
    })
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    )
  }
}

// PUT /api/suppliers/[id] - Update a supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      gstin,
      category,
      notes,
    } = body

    const existing = await db.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // If renaming, ensure the new name is not taken by another supplier
    if (name && name.trim() !== existing.name) {
      const conflict = await db.supplier.findFirst({
        where: {
          name: { equals: name.trim() },
          id: { not: id },
        },
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'Another supplier with this name already exists' },
          { status: 409 }
        )
      }
    }

    const updated = await db.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(contactPerson !== undefined && {
          contactPerson: contactPerson?.trim() || null,
        }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(gstin !== undefined && { gstin: gstin?.trim() || null }),
        ...(category !== undefined && {
          category: category?.trim() || null,
        }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
      include: {
        _count: {
          select: {
            ingredients: true,
            purchases: true,
          },
        },
        purchases: {
          select: { totalAmount: true },
        },
      },
    })

    const totalPurchaseValue = updated.purchases.reduce(
      (sum, p) => sum + p.totalAmount,
      0
    )
    const { purchases: _purchases, ...rest } = updated
    void _purchases

    return NextResponse.json({
      ...rest,
      ingredientCount: updated._count.ingredients,
      purchaseCount: updated._count.purchases,
      totalPurchaseValue,
    })
  } catch (error) {
    console.error('Error updating supplier:', error)
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Delete a supplier
// Note: this sets supplierId=null on related ingredients & purchases (no cascade),
// so existing data stays intact.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.supplier.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Detach linked ingredients before deletion (set supplierId to null)
    await db.ingredient.updateMany({
      where: { supplierId: id },
      data: { supplierId: null },
    })

    // Detach linked purchases
    await db.purchase.updateMany({
      where: { supplierId: id },
      data: { supplierId: null },
    })

    await db.supplier.delete({ where: { id } })

    return NextResponse.json({
      message: 'Supplier deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    )
  }
}

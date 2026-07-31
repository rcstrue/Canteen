import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/suppliers - List all suppliers with ingredient + purchase stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (category && category !== 'All') {
      where.category = category
    }

    if (search) {
      where.name = { contains: search }
    }

    const suppliers = await db.supplier.findMany({
      where,
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
      orderBy: { name: 'asc' },
    })

    // Compute total purchase value per supplier
    const result = suppliers.map((s) => {
      const totalPurchaseValue = s.purchases.reduce(
        (sum, p) => sum + p.totalAmount,
        0
      )
      // Omit the raw purchases array from the response to keep payload small
      const { purchases: _purchases, ...rest } = s
      void _purchases
      return {
        ...rest,
        ingredientCount: s._count.ingredients,
        purchaseCount: s._count.purchases,
        totalPurchaseValue,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

// POST /api/suppliers - Create a new supplier
export async function POST(request: NextRequest) {
  try {
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

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name (case-insensitive)
    const existing = await db.supplier.findFirst({
      where: { name: { equals: name.trim() } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A supplier with this name already exists' },
        { status: 409 }
      )
    }

    const supplier = await db.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        gstin: gstin?.trim() || null,
        category: category?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        _count: {
          select: {
            ingredients: true,
            purchases: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        ...supplier,
        ingredientCount: supplier._count.ingredients,
        purchaseCount: supplier._count.purchases,
        totalPurchaseValue: 0,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}

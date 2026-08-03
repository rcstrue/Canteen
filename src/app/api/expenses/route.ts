import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      where.date = dateFilter
    }

    const [expenses, total] = await Promise.all([
      db.expense.findMany({ where, orderBy: { date: 'desc' }, take: limit, skip: offset }),
      db.expense.count({ where }),
    ])

    return NextResponse.json({ data: expenses, total })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, category, amount, description } = body

    if (!date || !category || !amount) {
      return NextResponse.json({ error: 'date, category, and amount are required' }, { status: 400 })
    }

    const expense = await db.expense.create({ data: { date: new Date(date), category, amount, description } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'CREATE', entityType: 'Expense', entityId: expense.id, entityName: `${expense.category} — ₹${expense.amount.toFixed(2)}`,
      description: `Created expense "${expense.category}" of ₹${expense.amount.toFixed(2)}`,
      metadata: { date: expense.date, category: expense.category, amount: expense.amount },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}

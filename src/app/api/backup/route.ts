import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [users, suppliers, ingredients, recipes, purchases, dailyMeals, expenses, budgets, stockMovements, auditLogs] = await Promise.all([
      db.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
      db.supplier.findMany(),
      db.ingredient.findMany(),
      db.recipe.findMany({ include: { ingredients: true } }),
      db.purchase.findMany({ include: { items: true } }),
      db.dailyMealServed.findMany(),
      db.expense.findMany(),
      db.budget.findMany(),
      db.stockMovement.findMany(),
      db.auditLog.findMany({ take: 500, orderBy: { createdAt: 'desc' } }),
    ])

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      users, suppliers, ingredients, recipes, purchases, dailyMeals, expenses, budgets, stockMovements, auditLogs,
    }

    return NextResponse.json(backup)
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 })
  }
}

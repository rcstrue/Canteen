import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalLogs, todayLogs, topActions, topEntities] = await Promise.all([
      db.auditLog.count(),
      db.auditLog.count({ where: { createdAt: { gte: monthStart } } }),
      db.auditLog.groupBy({ by: ['action'], _count: { action: true }, orderBy: { _count: { action: 'desc' } }, take: 10 }),
      db.auditLog.groupBy({ by: ['entityType'], _count: { entityType: true }, orderBy: { _count: { entityType: 'desc' } }, take: 10 }),
    ])

    return NextResponse.json({ totalLogs, thisMonthLogs: todayLogs, topActions, topEntities })
  } catch (error) {
    console.error('Error fetching audit stats:', error)
    return NextResponse.json({ error: 'Failed to fetch audit stats' }, { status: 500 })
  }
}

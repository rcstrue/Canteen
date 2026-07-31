import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

type SortKey = 'rating' | 'spend' | 'orders' | 'onTime' | 'name'
type SortOrder = 'asc' | 'desc'

// GET /api/suppliers/performance/overview
// Returns performance summary for ALL suppliers.
// Each entry: { id, name, category, totalOrders, totalSpend, avgOrderValue,
//   rating, qualityScore, onTimeRate, lastOrderDate }
//
// Query params:
//   ?sortBy=rating|spend|orders|onTime|name (default: spend)
//   ?order=asc|desc (default: desc)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawSortBy = searchParams.get('sortBy') || 'spend'
    const rawOrder = searchParams.get('order') || 'desc'

    const sortBy: SortKey = (
      ['rating', 'spend', 'orders', 'onTime', 'name'].includes(rawSortBy)
        ? rawSortBy
        : 'spend'
    ) as SortKey
    const order: SortOrder = rawOrder === 'asc' ? 'asc' : 'desc'

    const suppliers = await db.supplier.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        rating: true,
        qualityScore: true,
        onTimeRate: true,
        notes: true,
        lastOrderDate: true,
        purchases: {
          select: {
            date: true,
            totalAmount: true,
          },
        },
        _count: {
          select: { ingredients: true },
        },
      },
    })

    type OverviewEntry = {
      id: string
      name: string
      category: string | null
      totalOrders: number
      totalSpend: number
      avgOrderValue: number
      rating: number | null
      qualityScore: number | null
      onTimeRate: number | null
      lastOrderDate: Date | null
      ingredientCount: number
      notes: string | null
    }

    const overview: OverviewEntry[] = suppliers.map((s) => {
      const totalOrders = s.purchases.length
      const totalSpend = s.purchases.reduce(
        (sum, p) => sum + p.totalAmount,
        0
      )
      const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0
      const lastOrderDate =
        s.purchases.length > 0
          ? s.purchases.reduce((latest, p) => {
              const d = new Date(p.date)
              return !latest || d > latest ? d : latest
            }, null as Date | null)
          : s.lastOrderDate
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        totalOrders,
        totalSpend: Number(totalSpend.toFixed(2)),
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        rating: s.rating,
        qualityScore: s.qualityScore,
        onTimeRate: s.onTimeRate,
        lastOrderDate,
        ingredientCount: s._count.ingredients,
        notes: s.notes,
      }
    })

    // Sort
    overview.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'rating':
          cmp = (a.rating ?? 0) - (b.rating ?? 0)
          break
        case 'spend':
          cmp = a.totalSpend - b.totalSpend
          break
        case 'orders':
          cmp = a.totalOrders - b.totalOrders
          break
        case 'onTime':
          cmp = (a.onTimeRate ?? 0) - (b.onTimeRate ?? 0)
          break
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
      }
      return order === 'asc' ? cmp : -cmp
    })

    // Aggregate summary
    const totalSuppliers = overview.length
    const activeSuppliers = overview.filter(
      (s) => s.totalOrders > 0 || s.ingredientCount > 0
    ).length
    const inactiveSuppliers = totalSuppliers - activeSuppliers
    const totalSpendAll = overview.reduce((sum, s) => sum + s.totalSpend, 0)
    const ratedSuppliers = overview.filter((s) => s.rating != null)
    const avgRating =
      ratedSuppliers.length > 0
        ? ratedSuppliers.reduce((sum, s) => sum + (s.rating as number), 0) /
          ratedSuppliers.length
        : null
    const topSupplier = overview.reduce(
      (best, s) =>
        !best || s.totalSpend > best.totalSpend ? s : best,
      null as OverviewEntry | null
    )

    return NextResponse.json({
      sortBy,
      order,
      summary: {
        totalSuppliers,
        activeSuppliers,
        inactiveSuppliers,
        totalSpend: Number(totalSpendAll.toFixed(2)),
        avgRating: avgRating != null ? Number(avgRating.toFixed(2)) : null,
        ratedCount: ratedSuppliers.length,
        topSupplier: topSupplier
          ? {
              id: topSupplier.id,
              name: topSupplier.name,
              totalSpend: topSupplier.totalSpend,
            }
          : null,
      },
      suppliers: overview,
    })
  } catch (error) {
    console.error('Error fetching suppliers performance overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers performance overview' },
      { status: 500 }
    )
  }
}

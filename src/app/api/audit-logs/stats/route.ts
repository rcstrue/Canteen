import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET /api/audit-logs/stats - Aggregate stats for the audit dashboard (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: admin role required" },
        { status: 403 }
      );
    }

    const now = new Date();

    // Today: midnight of today
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0, 0, 0, 0
    );

    // This week: last 7 days (rolling)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // This month: 1st of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Last 30 days (rolling) for top users / distribution
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      todayCount,
      weekCount,
      monthCount,
      totalCount,
      topUsersRaw,
      actionDistributionRaw,
      entityDistributionRaw,
    ] = await Promise.all([
      db.auditLog.count({ where: { createdAt: { gte: startOfToday } } }),
      db.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.auditLog.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.auditLog.count(),
      // Top 5 active users (by log count, last 30 days)
      db.auditLog.groupBy({
        by: ["userId", "userName", "userRole"],
        where: {
          createdAt: { gte: thirtyDaysAgo },
          userId: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { userId: "desc" } },
        take: 5,
      }),
      // Action distribution (last 30 days)
      db.auditLog.groupBy({
        by: ["action"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
        orderBy: { _count: { action: "desc" } },
      }),
      // Entity type distribution (last 30 days)
      db.auditLog.groupBy({
        by: ["entityType"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
        orderBy: { _count: { entityType: "desc" } },
      }),
    ]);

    return NextResponse.json({
      counts: {
        today: todayCount,
        week: weekCount,
        month: monthCount,
        total: totalCount,
      },
      topUsers: topUsersRaw.map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userRole: u.userRole,
        count: u._count._all,
      })),
      actionDistribution: actionDistributionRaw.map((a) => ({
        action: a.action,
        count: a._count._all,
      })),
      entityDistribution: entityDistributionRaw.map((e) => ({
        entityType: e.entityType,
        count: e._count._all,
      })),
    });
  } catch (error) {
    console.error("Error fetching audit stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit stats" },
      { status: 500 }
    );
  }
}

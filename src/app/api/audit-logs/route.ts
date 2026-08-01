import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/audit-logs - List audit logs with filters & pagination (admin only)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10))
    );
    const userId = searchParams.get("userId") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const action = searchParams.get("action") || undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};

    if (userId && userId !== "all") {
      where.userId = userId;
    }
    if (entityType && entityType !== "all") {
      where.entityType = entityType;
    }
    if (action && action !== "all") {
      where.action = action;
    }

    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) dateFilter.gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime())) {
          // include the entire `to` day
          d.setHours(23, 59, 59, 999);
          dateFilter.lte = d;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
      }
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    const hasMore = page * limit < total;

    return NextResponse.json({
      data: logs,
      total,
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

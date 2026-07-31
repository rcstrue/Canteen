import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

function safeParseMetadata(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // return raw string if not valid JSON
  }
}

// GET /api/audit-logs/[id] - Single audit log detail (admin only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const log = await db.auditLog.findUnique({
      where: { id },
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
    });

    if (!log) {
      return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...log,
      metadataParsed: safeParseMetadata(log.metadata),
    });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}

// DELETE /api/audit-logs/[id] - Delete a single audit log (admin only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const existing = await db.auditLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
    }

    await db.auditLog.delete({ where: { id } });

    return NextResponse.json({ message: "Audit log deleted successfully" });
  } catch (error) {
    console.error("Error deleting audit log:", error);
    return NextResponse.json(
      { error: "Failed to delete audit log" },
      { status: 500 }
    );
  }
}

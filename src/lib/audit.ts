import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { NextRequest } from "next/server";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "BULK_DELETE"
  | "BULK_EXPORT"
  | "IMPORT"
  | "EXPORT"
  | "PRINT";

export type EntityType =
  | "Ingredient"
  | "Recipe"
  | "RecipeCostHistory"
  | "Purchase"
  | "Supplier"
  | "Expense"
  | "User"
  | "Budget"
  | "DailyMeal"
  | "StockMovement"
  | "Auth";

interface AuditPayload {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Helper: pull audit context (user info + IP + User-Agent) from a NextRequest
 * by combining the NextAuth session with standard forwarding headers.
 *
 * Usage:
 *   const ctx = await getAuditContext(request);
 *   await logAudit({ ...ctx, action: "CREATE", entityType: "Ingredient", ... });
 */
export async function getAuditContext(request: NextRequest): Promise<{
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}> {
  let session: Awaited<ReturnType<typeof getServerSession>> = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // ignore session errors — audit should never throw
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : null;
  const ua = request.headers.get("user-agent");

  return {
    userId: session?.user?.id ?? null,
    userName: session?.user?.name ?? null,
    userRole: session?.user?.role ?? null,
    ipAddress: ip ?? null,
    userAgent: ua ?? null,
  };
}

/**
 * Persist an audit log entry. This function is intentionally non-throwing —
 * audit logging must NEVER break the main operation it is recording.
 */
export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: payload.userId ?? null,
        userName: payload.userName ?? null,
        userRole: payload.userRole ?? null,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId ?? null,
        entityName: payload.entityName ?? null,
        description: payload.description,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        ipAddress: payload.ipAddress ?? null,
        userAgent: payload.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] Failed to log:", error);
    // Don't throw — audit logging should never break the main operation
  }
}

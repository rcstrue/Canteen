import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-jwt";
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

export async function getAuditContext(request: NextRequest): Promise<{
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}> {
  const user = await getAuthUser(request);
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : null;
  const ua = request.headers.get("user-agent");

  return {
    userId: user?.id ?? null,
    userName: user?.name ?? null,
    userRole: user?.role ?? null,
    ipAddress: ip ?? null,
    userAgent: ua ?? null,
  };
}

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
  }
}

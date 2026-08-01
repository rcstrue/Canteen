import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { NextRequest } from "next/server";

export interface RecipeCostBreakdownIngredient {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineCost: number;
}

export interface RecipeCostBreakdown {
  totalCost: number;
  costPerServing: number;
  servings: number;
  ingredients: RecipeCostBreakdownIngredient[];
}

/**
 * Calculate the current cost of a recipe.
 *
 * Uses `avgCost` from each linked ingredient, falling back to
 * `lastPurchasePrice` when `avgCost` is 0 (e.g., newly created
 * ingredients that have never been purchased).
 *
 * Returns a zeroed breakdown when the recipe or its ingredients
 * cannot be found — never throws.
 */
export async function calculateRecipeCost(
  recipeId: string
): Promise<RecipeCostBreakdown> {
  const empty: RecipeCostBreakdown = {
    totalCost: 0,
    costPerServing: 0,
    servings: 0,
    ingredients: [],
  };

  try {
    const recipe = await db.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: { ingredient: true },
        },
      },
    });

    if (!recipe) return empty;

    const servings = recipe.baseServings || 0;
    const ingredients = recipe.ingredients.map((ri) => {
      const unitPrice =
        ri.ingredient.avgCost > 0
          ? ri.ingredient.avgCost
          : ri.ingredient.lastPurchasePrice;
      const lineCost = ri.quantity * unitPrice;
      return {
        name: ri.ingredient.name,
        quantity: ri.quantity,
        unit: ri.unit,
        unitPrice,
        lineCost,
      };
    });

    const totalCost = ingredients.reduce((s, i) => s + i.lineCost, 0);
    const costPerServing = servings > 0 ? totalCost / servings : 0;

    return {
      totalCost: round2(totalCost),
      costPerServing: round2(costPerServing),
      servings,
      ingredients,
    };
  } catch (error) {
    console.error("[recipe-cost] calculateRecipeCost failed:", error);
    return empty;
  }
}

/**
 * Persist a RecipeCostHistory snapshot for the given recipe.
 *
 * Safe to call from API routes — pulls audit context from the
 * inbound request. Non-throwing: any failure is logged and the
 * promise resolves (never rejects) so callers can `void` it
 * fire-and-forget.
 *
 * Returns the created history row, or null on failure.
 */
export async function recordRecipeCost(
  recipeId: string,
  trigger: string = "manual",
  notes?: string,
  request?: NextRequest
): Promise<{ id: string; cost: number; costPerServing: number; servings: number; createdAt: Date } | null> {
  try {
    const recipe = await db.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true, name: true },
    });
    if (!recipe) {
      console.warn("[recipe-cost] recordRecipeCost: recipe not found:", recipeId);
      return null;
    }

    const breakdown = await calculateRecipeCost(recipeId);

    const created = await db.recipeCostHistory.create({
      data: {
        recipeId,
        cost: breakdown.totalCost,
        costPerServing: breakdown.costPerServing,
        servings: breakdown.servings,
        trigger,
        notes: notes ?? null,
      },
    });

    // Fire-and-forget audit log — never blocks.
    void logAudit({
      ...(request ? await safeAuditContext(request) : {}),
      action: "CREATE",
      entityType: "RecipeCostHistory",
      entityId: created.id,
      entityName: recipe.name,
      description: `Recorded cost snapshot: ₹${breakdown.costPerServing.toFixed(2)}/serving (total ₹${breakdown.totalCost.toFixed(2)}) — trigger: ${trigger}`,
      metadata: {
        recipeId,
        recipeName: recipe.name,
        cost: breakdown.totalCost,
        costPerServing: breakdown.costPerServing,
        servings: breakdown.servings,
        trigger,
        notes: notes ?? null,
      },
    }).catch((err) => {
      console.error("[recipe-cost] audit log failed:", err);
    });

    return created;
  } catch (error) {
    console.error("[recipe-cost] recordRecipeCost failed:", error);
    return null;
  }
}

// ─── Internal helpers ───────────────────────────────────────────

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function safeAuditContext(request: NextRequest) {
  try {
    const { getAuditContext } = await import("@/lib/audit");
    return await getAuditContext(request);
  } catch {
    return {};
  }
}

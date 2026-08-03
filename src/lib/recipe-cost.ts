import { db } from "@/lib/db";

export async function calculateRecipeCost(recipeId: string): Promise<{
  totalCost: number;
  costPerServing: number;
  ingredients: { id: string; name: string; quantity: number; unit: string; unitCost: number; lineCost: number }[];
}> {
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  if (!recipe) {
    return { totalCost: 0, costPerServing: 0, ingredients: [] };
  }

  const ingredients = recipe.ingredients.map((ri) => {
    const unitCost = ri.ingredient.avgCost || ri.ingredient.lastPurchasePrice || 0;
    const lineCost = ri.quantity * unitCost;
    return {
      id: ri.ingredientId,
      name: ri.ingredient.name,
      quantity: ri.quantity,
      unit: ri.unit,
      unitCost,
      lineCost,
    };
  });

  const totalCost = ingredients.reduce((sum, i) => sum + i.lineCost, 0);
  const costPerServing = recipe.baseServings > 0 ? totalCost / recipe.baseServings : 0;

  return { totalCost, costPerServing, ingredients };
}

export async function snapshotRecipeCost(recipeId: string, trigger: string = "manual", notes?: string) {
  const { totalCost, costPerServing } = await calculateRecipeCost(recipeId);
  const recipe = await db.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) return null;

  return db.recipeCostHistory.create({
    data: {
      recipeId,
      cost: totalCost,
      costPerServing,
      servings: recipe.baseServings,
      trigger,
      notes,
    },
  });
}

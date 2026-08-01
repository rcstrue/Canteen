import type { ChartConfig } from "@/components/ui/chart";

/** RCS Canteen serves 600 employees */
export const EMPLOYEE_COUNT = 600;

/** Cohesive chart palette — amber/orange first, then warm complementary tones */
export const CHART_COLORS = [
  "#f59e0b", // amber-500
  "#f97316", // orange-500
  "#f43f5e", // rose-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#d97706", // amber-600
  "#ea580c", // orange-600
  "#e11d48", // rose-600
];

/** CSS-var-backed chart palette for the category donut (theme-aware) */
export const CATEGORY_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
];

/** Category → color mapping (for bar chart color differentiation by category) */
export const CATEGORY_COLORS: Record<string, string> = {
  Grains: "#f59e0b",
  Vegetables: "#10b981",
  Dairy: "#8b5cf6",
  Spices: "#f43f5e",
  Oils: "#f97316",
  Oil: "#f97316",
  Pulses: "#d97706",
  Meat: "#e11d48",
  Fruits: "#84cc16",
  Beverages: "#06b6d4",
  Bakery: "#a855f7",
  Condiments: "#ec4899",
};

export function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  // Fallback: hash the category name to pick a consistent color
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash << 5) - hash + category.charCodeAt(i);
    hash |= 0;
  }
  return CHART_COLORS[Math.abs(hash) % CHART_COLORS.length];
}

// ─── Chart Configs ──────────────────────────────────────────────────────────

export const consumptionChartConfig: ChartConfig = {
  totalQuantity: { label: "Quantity Consumed", color: "#f59e0b" },
};

export const expenseChartConfig: ChartConfig = {
  amount: { label: "Amount (₹)", color: "#f97316" },
};

export const costTrendChartConfig: ChartConfig = {
  cost: { label: "Food Cost (₹)", color: "#f59e0b" },
};

export const weeklyConsumptionConfig: ChartConfig = {
  cost: { label: "Cost (₹)", color: "#f97316" },
  meals: { label: "Meals Served", color: "#10b981" },
};

export const topIngredientsConfig: ChartConfig = {
  totalSpend: { label: "Spend (₹)", color: "#f59e0b" },
};

export const categorySpendingConfig: ChartConfig = {
  amount: { label: "Spend (₹)", color: "#f59e0b" },
};

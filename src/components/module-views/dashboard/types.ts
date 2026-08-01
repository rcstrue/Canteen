import type { DateRange } from "react-day-picker";
import type { ViewId } from "@/components/app-sidebar";

// ─── Dashboard Data Types ──────────────────────────────────────────────────

export interface DashboardData {
  foodCost: { today: number; week: number; month: number };
  meals: { today: number; month: number; week?: number };
  costPerMeal: number;
  lowStockAlerts: Array<{
    id: string;
    name: string;
    unit: string;
    category: string;
    currentStock: number;
    minStock: number;
    lastPurchasePrice?: number;
    avgCost?: number;
    supplier?: string | null;
    supplierId?: string | null;
  }>;
  topConsumingIngredients: Array<{
    ingredient: {
      id: string;
      name: string;
      unit: string;
      category: string;
    };
    totalQuantity: number;
    totalCost: number;
  }>;
  todayMeals: Array<{
    id: string;
    date: string;
    mealType: string;
    mealsServed: number;
    recipe: { name: string };
  }>;
  expenses: {
    month: number;
    breakdown: Array<{ category: string; amount: number }>;
  };
  totalOperatingCost: number;
  costTrend: Array<{ date: string; cost: number }>;
  // Consolidated fields (added in R6)
  quickStats?: QuickStats;
  currentBudget?: BudgetRecord | null;
  activities?: ActivityItem[];
  totalIngredientCount?: number;
}

// ─── Chart Analytics Types ──────────────────────────────────────────────────

export interface DashboardChartsData {
  weeklyConsumption: Array<{
    day: string;
    date: string;
    cost: number;
    meals: number;
  }>;
  topIngredientsByCost: Array<{
    name: string;
    totalSpend: number;
    currentStock: number;
    unit: string;
    percentage: number;
  }>;
  categorySpending: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyKpiTrend: Array<{
    month: string;
    foodCost: number;
    operatingCost: number;
    totalSpend: number;
  }>;
}

export interface IngredientListItem {
  id: string;
  name: string;
  unit: string;
  category: string;
  currentStock: number;
  minStock: number;
}

export interface CostReportData {
  foodCost: { total: number; costPerMeal: number };
  meals: { total: number };
  totalOperatingCost: number;
}

export interface BudgetRecord {
  id: string;
  month: string;
  foodBudget: number;
  operatingBudget: number;
  totalBudget: number;
  alertThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardViewProps {
  onNavigate?: (view: ViewId) => void;
}

// ─── Activity Timeline Types ────────────────────────────────────────────────

export type ActivityType =
  | "PURCHASE"
  | "MEAL"
  | "EXPENSE"
  | "WASTAGE"
  | "ADJUSTMENT"
  | "CONSUMPTION"
  | "purchase"
  | "meal"
  | "expense"
  | "wastage"
  | "adjustment"
  | "consumption";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description?: string;
  title?: string;
  amount: number | null;
  createdAt?: string;
  timestamp?: string;
  ingredientName?: string | null;
  supplierName?: string | null;
  recipeName?: string | null;
}

export interface QuickStats {
  todayPurchasesTotal: number;
  weekMealsCount: number;
  monthWastageValue: number;
  activeSuppliersCount: number;
}

// ─── Date Range Types ───────────────────────────────────────────────────────

export type DateRangePreset = "today" | "week" | "month" | "custom";

export interface DateRangeState {
  preset: DateRangePreset;
  range: DateRange | undefined;
}

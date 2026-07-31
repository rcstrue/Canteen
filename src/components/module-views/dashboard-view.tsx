"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Package,
  UtensilsCrossed,
  IndianRupee,
  ShoppingCart,
  Flame,
  Receipt,
  Users,
  CalendarDays,
  ArrowRight,
  ClipboardList,
  PlusCircle,
  Activity,
  ShieldCheck,
  Calendar,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Warehouse,
  Soup,
  FileText,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";
import { motion, type Variants } from "framer-motion";
import type { ViewId } from "@/components/app-sidebar";
import { BudgetStatus } from "@/components/budget-status";

// ─── Constants ───────────────────────────────────────────────────────────────

/** RCS Canteen serves 600 employees */
const EMPLOYEE_COUNT = 600;

/** Cohesive chart palette — amber/orange first, then warm complementary tones */
const CHART_COLORS = [
  "#f59e0b", // amber-500
  "#f97316", // orange-500
  "#f43f5e", // rose-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#d97706", // amber-600
  "#ea580c", // orange-600
  "#e11d48", // rose-600
];

/** Category → color mapping (for bar chart color differentiation by category) */
const CATEGORY_COLORS: Record<string, string> = {
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

function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  // Fallback: hash the category name to pick a consistent color
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash << 5) - hash + category.charCodeAt(i);
    hash |= 0;
  }
  return CHART_COLORS[Math.abs(hash) % CHART_COLORS.length];
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardData {
  foodCost: { today: number; week: number; month: number };
  meals: { today: number; month: number };
  costPerMeal: number;
  lowStockAlerts: Array<{
    id: string;
    name: string;
    unit: string;
    category: string;
    currentStock: number;
    minStock: number;
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
}

interface IngredientListItem {
  id: string;
  name: string;
  unit: string;
  category: string;
  currentStock: number;
  minStock: number;
}

interface CostReportData {
  foodCost: { total: number; costPerMeal: number };
  meals: { total: number };
  totalOperatingCost: number;
}

interface BudgetRecord {
  id: string;
  month: string;
  foodBudget: number;
  operatingBudget: number;
  totalBudget: number;
  alertThreshold: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardViewProps {
  onNavigate?: (view: ViewId) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyShort(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return formatCurrency(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatNumberDecimal(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function mealTypeLabel(type: string): string {
  const map: Record<string, string> = {
    BREAKFAST: "Breakfast",
    LUNCH: "Lunch",
    DINNER: "Dinner",
    SNACKS: "Snacks",
    TEA: "Tea",
  };
  return map[type] || type;
}

function formatDateLong(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Compute percentage change between current and baseline. Returns null if invalid. */
function pctChange(current: number, baseline: number): number | null {
  if (!baseline || baseline <= 0) return null;
  return ((current - baseline) / baseline) * 100;
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Chart Configs ──────────────────────────────────────────────────────────

const consumptionChartConfig: ChartConfig = {
  totalQuantity: { label: "Quantity Consumed", color: "#f59e0b" },
};

const expenseChartConfig: ChartConfig = {
  amount: { label: "Amount (₹)", color: "#f97316" },
};

const costTrendChartConfig: ChartConfig = {
  cost: { label: "Food Cost (₹)", color: "#f59e0b" },
};

// ─── Reusable: Trend Badge ──────────────────────────────────────────────────

interface TrendBadgeProps {
  /** Percentage change (positive = increase, negative = decrease) */
  pct: number | null;
  /** For cost metrics, "lower is better" → up arrow = red. For meals/positive metrics, "up is better" */
  lowerIsBetter?: boolean;
  /** Comparison label e.g. "vs avg day" */
  label: string;
}

function TrendBadge({ pct, lowerIsBetter = true, label }: TrendBadgeProps) {
  if (pct === null || !isFinite(pct)) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
    );
  }

  const isUp = pct > 0;
  const isFlat = Math.abs(pct) < 0.5;
  const goodDirection = lowerIsBetter ? !isUp : isUp;
  const colorClass = isFlat
    ? "text-muted-foreground"
    : goodDirection
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={`h-4 w-4 ${colorClass}`} />
      <span className={`font-bold tabular-nums ${colorClass}`}>
        {isFlat ? "0%" : `${isUp ? "+" : ""}${pct.toFixed(1)}%`}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Reusable: Metric Card ──────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBgClass: string;
  trend?: React.ReactNode;
  subValue?: React.ReactNode;
}

function MetricCard({
  title,
  value,
  icon,
  iconBgClass,
  trend,
  subValue,
}: MetricCardProps) {
  return (
    <Card className="group relative h-full overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/20">
      {/* Gradient border effect on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))", padding: "1.5px" }}>
        <div className="h-full w-full rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20" />
      </div>
      <CardHeader className="relative flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium text-amber-900/80 dark:text-amber-200/80">
          {title}
        </CardDescription>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBgClass}`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-2">
        <div className="text-2xl font-bold tracking-tight tabular-nums text-amber-950 dark:text-amber-100">
          {value}
        </div>
        {subValue}
        {trend && (
          <div className="mt-0.5 inline-flex items-center gap-1.5 self-start rounded-full bg-amber-100/60 px-2.5 py-1 dark:bg-amber-900/30">
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Stock Health Gauge ─────────────────────────────────────────────────────

function CircularGauge({ percent }: { percent: number }) {
  const size = 168;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference - (clamped / 100) * circumference;

  // Color shifts: red (low) → amber (mid) → emerald (high)
  const color =
    clamped >= 80 ? "#10b981" : clamped >= 60 ? "#f59e0b" : "#f43f5e";

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Stock health percentage"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {Math.round(clamped)}%
        </span>
        <span className="mt-0.5 text-xs font-medium text-muted-foreground">
          Above Par
        </span>
      </div>
    </div>
  );
}

// ─── Donut Pie Label Renderer ───────────────────────────────────────────────

/** Renders percentage labels INSIDE donut slices */
function renderPiePercentLabel(props: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (percent < 0.05) return null; // hide labels on slices < 5%

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
      style={{ pointerEvents: "none" }}
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

// ─── Loading Skeletons ──────────────────────────────────────────────────────

function MetricCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-7 w-32" />
        <Skeleton className="mb-2 h-3 w-20" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

function BannerSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <Skeleton className="mb-2 h-4 w-32" />
        <Skeleton className="mb-1 h-8 w-64" />
        <Skeleton className="mb-6 h-4 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[100px] w-full md:col-span-2" />
        </div>
      </CardContent>
    </Card>
  );
}

function LargeCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function DashboardView({ onNavigate }: DashboardViewProps = {}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [allIngredients, setAllIngredients] = useState<IngredientListItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monthly comparison state
  const [currentMonthReport, setCurrentMonthReport] = useState<CostReportData | null>(null);
  const [prevMonthReport, setPrevMonthReport] = useState<CostReportData | null>(null);

  // Budget state
  const [currentBudget, setCurrentBudget] = useState<BudgetRecord | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);
        const [dashRes, ingRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/ingredients"),
        ]);
        if (!dashRes.ok) {
          throw new Error(
            `Failed to fetch dashboard data (${dashRes.status})`
          );
        }
        const json = await dashRes.json();
        setData(json);
        // Ingredients fetch is best-effort (used for stock health gauge)
        if (ingRes.ok) {
          const ingJson = (await ingRes.json()) as IngredientListItem[];
          setAllIngredients(ingJson);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  // Fetch monthly comparison data
  useEffect(() => {
    async function fetchMonthlyComparison() {
      try {
        const now = new Date();
        // Current month: first day to now
        const curStart = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const curEnd = now.toISOString().split("T")[0];

        // Previous month: first day to last day
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          .toISOString()
          .split("T")[0];
        const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0)
          .toISOString()
          .split("T")[0];

        const [curRes, prevRes] = await Promise.all([
          fetch(
            `/api/reports/cost?period=month&startDate=${curStart}&endDate=${curEnd}`
          ),
          fetch(
            `/api/reports/cost?period=month&startDate=${prevStart}&endDate=${prevEnd}`
          ),
        ]);

        if (curRes.ok) {
          setCurrentMonthReport(await curRes.json());
        }
        if (prevRes.ok) {
          setPrevMonthReport(await prevRes.json());
        }
      } catch (err) {
        console.error("Monthly comparison fetch error:", err);
      }
    }
    fetchMonthlyComparison();
  }, []);

  // Fetch current month's budget
  useEffect(() => {
    async function fetchBudget() {
      try {
        const res = await fetch("/api/budgets");
        if (res.ok) {
          const budgets = (await res.json()) as BudgetRecord[];
          const currentMonth = new Date().toISOString().slice(0, 7);
          const current = budgets.find((b) => b.month === currentMonth);
          if (current) {
            setCurrentBudget(current);
          }
        }
      } catch (err) {
        console.error("Budget fetch error:", err);
      }
    }
    fetchBudget();
  }, []);

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <BannerSkeleton />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LargeCardSkeleton />
          <LargeCardSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LargeCardSkeleton />
          <LargeCardSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LargeCardSkeleton />
          <LargeCardSkeleton />
        </div>
        <LargeCardSkeleton />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Dashboard
            </CardTitle>
            <CardDescription>
              {error ||
                "Unable to load dashboard data. Please try again later."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Computed Values ────────────────────────────────────────────────────

  // Estimated weekly meals from month + today data (rough heuristic)
  const weekMeals = data.meals.month
    ? Math.round((data.meals.today * 7 + data.meals.month) / 8)
    : data.meals.today * 7;

  // Trend calculations (vs averages derived from existing data)
  const avgDailyFromWeek = data.foodCost.week / 7;
  const avgWeeklyFromMonth = data.foodCost.month / 4.33;
  const todayVsAvgDay = pctChange(data.foodCost.today, avgDailyFromWeek);
  const weekVsAvgWeek = pctChange(data.foodCost.week, avgWeeklyFromMonth);

  // Cost per employee (monthly total operating cost / 600 employees)
  const costPerEmployee = data.totalOperatingCost / EMPLOYEE_COUNT;
  const dailyCostPerEmployee = costPerEmployee / 30;

  // Stock health: % of ingredients at/above par level
  const totalIngredientCount =
    allIngredients.length > 0 ? allIngredients.length : data.lowStockAlerts.length;
  const aboveParCount =
    allIngredients.length > 0
      ? allIngredients.filter((i) => i.currentStock >= i.minStock).length
      : Math.max(0, totalIngredientCount - data.lowStockAlerts.length);
  const stockHealthPct =
    totalIngredientCount > 0
      ? (aboveParCount / totalIngredientCount) * 100
      : 100;

  // Top consuming ingredients chart data
  const consumptionChartData = data.topConsumingIngredients
    .slice(0, 8)
    .map((item) => ({
      name:
        item.ingredient.name.length > 14
          ? item.ingredient.name.slice(0, 13) + "…"
          : item.ingredient.name,
      fullName: item.ingredient.name,
      totalQuantity: Number(item.totalQuantity.toFixed(1)),
      unit: item.ingredient.unit,
      totalCost: item.totalCost,
      category: item.ingredient.category,
      color: getCategoryColor(item.ingredient.category),
    }));

  // Expense breakdown chart data — sorted desc, capped to 6 categories
  const expenseChartData = [...data.expenses.breakdown]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((item, idx) => ({
      name: item.category,
      amount: item.amount,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ─── 1. Welcome Banner (full width) ─────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/40 shadow-sm transition-all hover:shadow-md dark:border-amber-900/40 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-900/20">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: greeting + date */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
                  <Flame className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-amber-900/70 dark:text-amber-200/70">
                    Welcome back, Admin
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight text-amber-950 dark:text-amber-100 md:text-3xl">
                    RCS Canteen Dashboard
                  </h1>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDateLong()}
                  </p>
                </div>
              </div>

              {/* Right: Quick action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onNavigate?.("daily-entry")}
                  className="bg-amber-600 text-white shadow-sm hover:bg-amber-700"
                >
                  <ClipboardList className="h-4 w-4" />
                  Record Today&apos;s Meals
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate?.("purchases")}
                  className="border-amber-300 bg-white/70 text-amber-900 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/30"
                >
                  <PlusCircle className="h-4 w-4" />
                  New Purchase
                </Button>
              </div>
            </div>

            {/* 7-Day Cost Trend Sparkline */}
            <div className="mt-6 grid grid-cols-1 gap-4 border-t border-amber-200/60 pt-6 md:grid-cols-3 dark:border-amber-900/30">
              <div className="flex flex-col justify-center gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  7-Day Cost Trend
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-amber-950 dark:text-amber-100">
                    {formatCurrencyShort(data.foodCost.week)}
                  </span>
                  <span className="text-xs text-muted-foreground">this week</span>
                </div>
                <TrendBadge
                  pct={weekVsAvgWeek}
                  lowerIsBetter={true}
                  label="vs avg week"
                />
              </div>
              <div className="md:col-span-2">
                <ChartContainer config={costTrendChartConfig} className="h-[100px] w-full">
                  <LineChart
                    data={data.costTrend.map((d) => ({
                      ...d,
                      label: new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", {
                        weekday: "short",
                      }),
                    }))}
                    margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatCurrency(Number(value))}
                          labelFormatter={(label) => {
                            const entry = data.costTrend.find(
                              (d) =>
                                new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" }) === label
                            );
                            return entry
                              ? new Date(entry.date + "T00:00:00").toLocaleDateString("en-IN", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "short",
                                })
                              : label;
                          }}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 2. Quick Actions Widget ─────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          <button
            onClick={() => onNavigate?.("daily-entry")}
            className="group flex flex-col items-center gap-2 rounded-xl border border-amber-200/60 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:border-amber-400 hover:bg-amber-50 hover:shadow-md hover:-translate-y-0.5 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:border-amber-700 dark:hover:bg-amber-900/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 transition-colors group-hover:bg-amber-200 dark:bg-amber-900/40 dark:group-hover:bg-amber-800/50">
              <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-amber-900 dark:text-amber-200">Record Meals</span>
          </button>

          <button
            onClick={() => onNavigate?.("purchases")}
            className="group flex flex-col items-center gap-2 rounded-xl border border-orange-200/60 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:border-orange-400 hover:bg-orange-50 hover:shadow-md hover:-translate-y-0.5 dark:border-orange-900/40 dark:bg-orange-950/20 dark:hover:border-orange-700 dark:hover:bg-orange-900/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 transition-colors group-hover:bg-orange-200 dark:bg-orange-900/40 dark:group-hover:bg-orange-800/50">
              <ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-xs font-medium text-orange-900 dark:text-orange-200">New Purchase</span>
          </button>

          <button
            onClick={() => onNavigate?.("stock")}
            className="group flex flex-col items-center gap-2 rounded-xl border border-emerald-200/60 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-md hover:-translate-y-0.5 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 transition-colors group-hover:bg-emerald-200 dark:bg-emerald-900/40 dark:group-hover:bg-emerald-800/50">
              <Warehouse className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">Add Stock</span>
          </button>

          <button
            onClick={() => onNavigate?.("meals")}
            className="group flex flex-col items-center gap-2 rounded-xl border border-rose-200/60 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:border-rose-400 hover:bg-rose-50 hover:shadow-md hover:-translate-y-0.5 dark:border-rose-900/40 dark:bg-rose-950/20 dark:hover:border-rose-700 dark:hover:bg-rose-900/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 transition-colors group-hover:bg-rose-200 dark:bg-rose-900/40 dark:group-hover:bg-rose-800/50">
              <Soup className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <span className="text-xs font-medium text-rose-900 dark:text-rose-200">Manage Recipes</span>
          </button>

          <button
            onClick={() => onNavigate?.("reports")}
            className="group flex flex-col items-center gap-2 rounded-xl border border-violet-200/60 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:border-violet-400 hover:bg-violet-50 hover:shadow-md hover:-translate-y-0.5 dark:border-violet-900/40 dark:bg-violet-950/20 dark:hover:border-violet-700 dark:hover:bg-violet-900/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 transition-colors group-hover:bg-violet-200 dark:bg-violet-900/40 dark:group-hover:bg-violet-800/50">
              <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-xs font-medium text-violet-900 dark:text-violet-200">View Reports</span>
          </button>

          <button
            onClick={() => onNavigate?.("expenses")}
            className="group flex flex-col items-center gap-2 rounded-xl border border-amber-200/60 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:border-amber-400 hover:bg-amber-50 hover:shadow-md hover:-translate-y-0.5 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:border-amber-700 dark:hover:bg-amber-900/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 transition-colors group-hover:bg-amber-200 dark:bg-amber-900/40 dark:group-hover:bg-amber-800/50">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-amber-900 dark:text-amber-200">Log Expense</span>
          </button>
        </div>
      </motion.div>

      {/* ─── 3. Top Metric Cards (4) ────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={itemVariants} className="h-full">
          <MetricCard
            title="Today's Food Cost"
            value={formatCurrency(data.foodCost.today)}
            icon={<IndianRupee className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            iconBgClass="bg-amber-100 dark:bg-amber-900/30"
            trend={<TrendBadge pct={todayVsAvgDay} label="vs avg day (week)" />}
            subValue={
              <p className="text-xs text-muted-foreground">
                From today&apos;s purchases
              </p>
            }
          />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <MetricCard
            title="This Week's Food Cost"
            value={formatCurrency(data.foodCost.week)}
            icon={<ShoppingCart className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
            iconBgClass="bg-orange-100 dark:bg-orange-900/30"
            trend={<TrendBadge pct={weekVsAvgWeek} label="vs avg week (month)" />}
            subValue={
              <p className="text-xs text-muted-foreground">
                Last 7 days purchases
              </p>
            }
          />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <MetricCard
            title="This Month's Food Cost"
            value={formatCurrency(data.foodCost.month)}
            icon={<Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            iconBgClass="bg-amber-100 dark:bg-amber-900/30"
            trend={
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Month-to-date total</span>
              </div>
            }
            subValue={
              <p className="text-xs text-muted-foreground">
                {formatCurrency(data.foodCost.month / 30)} / day avg
              </p>
            }
          />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <MetricCard
            title="Cost Per Employee"
            value={formatCurrency(costPerEmployee)}
            icon={<Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
            iconBgClass="bg-orange-100 dark:bg-orange-900/30"
            trend={
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>For {formatNumber(EMPLOYEE_COUNT)} employees</span>
              </div>
            }
            subValue={
              <p className="text-xs text-muted-foreground">
                Daily:{" "}
                <span className="font-semibold text-amber-800 dark:text-amber-300">
                  {formatCurrency(dailyCostPerEmployee)}
                </span>{" "}
                / employee
              </p>
            }
          />
        </motion.div>
      </motion.div>

      {/* ─── 4. Monthly Comparison (prominent) ─────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 border-amber-200/60 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-amber-100/20 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-amber-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              Monthly Comparison
            </CardTitle>
            <CardDescription>
              Current month vs previous month key metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!currentMonthReport && !prevMonthReport ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="mb-2 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  Loading comparison data…
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(() => {
                  const cur = currentMonthReport;
                  const prev = prevMonthReport;

                  const metrics: Array<{
                    label: string;
                    current: number;
                    previous: number;
                    format: (v: number) => string;
                    lowerIsBetter: boolean;
                    icon: React.ReactNode;
                    iconBg: string;
                  }> = [
                    {
                      label: "Food Cost",
                      current: cur?.foodCost?.total ?? 0,
                      previous: prev?.foodCost?.total ?? 0,
                      format: formatCurrency,
                      lowerIsBetter: true,
                      icon: <IndianRupee className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
                      iconBg: "bg-amber-100 dark:bg-amber-900/30",
                    },
                    {
                      label: "Total Meals Served",
                      current: cur?.meals?.total ?? 0,
                      previous: prev?.meals?.total ?? 0,
                      format: formatNumber,
                      lowerIsBetter: false,
                      icon: <UtensilsCrossed className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
                      iconBg: "bg-orange-100 dark:bg-orange-900/30",
                    },
                    {
                      label: "Cost Per Meal",
                      current: cur?.foodCost?.costPerMeal ?? 0,
                      previous: prev?.foodCost?.costPerMeal ?? 0,
                      format: formatCurrency,
                      lowerIsBetter: true,
                      icon: <Receipt className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
                      iconBg: "bg-rose-100 dark:bg-rose-900/30",
                    },
                    {
                      label: "Operating Cost",
                      current: cur?.totalOperatingCost ?? 0,
                      previous: prev?.totalOperatingCost ?? 0,
                      format: formatCurrency,
                      lowerIsBetter: true,
                      icon: <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
                      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
                    },
                  ];

                  return metrics.map((m) => {
                    const changePct =
                      m.previous > 0
                        ? ((m.current - m.previous) / m.previous) * 100
                        : null;
                    const isUp = changePct !== null && changePct > 0;
                    const isFlat = changePct !== null && Math.abs(changePct) < 0.5;
                    const goodDirection = m.lowerIsBetter ? !isUp : isUp;
                    const isGood = isFlat || (changePct !== null && goodDirection);
                    const colorClass =
                      changePct === null || isFlat
                        ? "text-muted-foreground"
                        : goodDirection
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400";
                    const bgClass =
                      changePct === null || isFlat
                        ? "bg-muted/50"
                        : goodDirection
                          ? "bg-emerald-50 dark:bg-emerald-950/20"
                          : "bg-rose-50 dark:bg-rose-950/20";

                    return (
                      <div
                        key={m.label}
                        className={`rounded-xl border p-4 transition-colors ${bgClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}>
                              {m.icon}
                            </div>
                            <span className="text-sm font-medium">{m.label}</span>
                          </div>
                          {changePct !== null && !isFlat && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${colorClass} ${isGood ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30"}`}
                            >
                              {isUp ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )}
                              {isUp ? "+" : ""}
                              {changePct.toFixed(1)}%
                            </span>
                          )}
                          {isFlat && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                              <Minus className="h-3 w-3" />
                              0.0%
                            </span>
                          )}
                          {changePct === null && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground">
                              Current Month
                            </p>
                            <p className="text-lg font-bold tabular-nums">
                              {m.format(m.current)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground">
                              Previous Month
                            </p>
                            <p className="text-lg font-bold tabular-nums text-muted-foreground">
                              {m.format(m.previous)}
                            </p>
                          </div>
                        </div>
                        {m.previous > 0 && (
                          <div className="mt-3">
                            <Progress
                              value={Math.min(100, (m.current / m.previous) * 100)}
                              className={`h-1.5 ${isGood ? "[&>div]:bg-emerald-500" : "[&>div]:bg-rose-500"}`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── 5. Meals Summary + Stock Health Gauge ──────────────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {/* Total Meals Served */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="h-full shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <UtensilsCrossed className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                Total Meals Served
              </CardTitle>
              <CardDescription>Breakdown by time period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/20">
                  <span className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {formatNumber(data.meals.today)}
                  </span>
                  <span className="text-xs text-muted-foreground">Today</span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 dark:from-orange-950/30 dark:to-amber-950/20">
                  <span className="text-2xl font-bold tabular-nums text-orange-700 dark:text-orange-400">
                    {formatNumber(weekMeals)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    This Week
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/20">
                  <span className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                    {formatNumber(data.meals.month)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    This Month
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-3 border-t pt-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Today vs Month avg / day
                    </span>
                    <span className="font-semibold tabular-nums">
                      {data.meals.month > 0
                        ? `${formatNumber(
                            Math.round(data.meals.today - data.meals.month / 30)
                          )} meals`
                        : "—"}
                    </span>
                  </div>
                  <Progress
                    value={
                      data.meals.month > 0
                        ? Math.min(
                            100,
                            (data.meals.today / (data.meals.month / 30)) * 100
                          )
                        : 0
                    }
                    className="h-2 [&>div]:bg-amber-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Budget Overview Card */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="h-full shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 border-amber-200/60 dark:border-amber-900/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    Budget Status
                  </CardTitle>
                  <CardDescription>
                    {currentBudget
                      ? `Monthly budget utilization — ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`
                      : "No budget set for this month"}
                  </CardDescription>
                </div>
                {onNavigate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate("settings")}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                  >
                    Manage
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {currentBudget ? (
                <div className="space-y-4">
                  <BudgetStatus
                    label="Food Budget"
                    spent={data.foodCost.month}
                    budget={currentBudget.foodBudget}
                    alertThreshold={currentBudget.alertThreshold}
                    compact
                  />
                  <BudgetStatus
                    label="Operating Budget"
                    spent={data.totalOperatingCost}
                    budget={currentBudget.operatingBudget}
                    alertThreshold={currentBudget.alertThreshold}
                    compact
                  />
                  {currentBudget.totalBudget > 0 && (
                    <BudgetStatus
                      label="Total Budget"
                      spent={data.totalOperatingCost}
                      budget={currentBudget.totalBudget}
                      alertThreshold={currentBudget.alertThreshold}
                      compact
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Target className="mb-2 h-10 w-10 text-amber-400" />
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    No Budget Set
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set up a monthly budget in Settings to track your spending
                  </p>
                  {onNavigate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate("settings")}
                      className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                    >
                      Set Budget
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ─── Stock Health Gauge ──────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {/* Stock Health Gauge */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="h-full shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                Stock Health
              </CardTitle>
              <CardDescription>
                Ingredients at or above par level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-around">
                <CircularGauge percent={stockHealthPct} />
                <div className="space-y-3 text-center sm:text-left">
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {aboveParCount}
                      <span className="text-base text-muted-foreground">
                        {" "}
                        / {totalIngredientCount}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ingredients above par
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-950/20">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    <div>
                      <p className="text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                        {data.lowStockAlerts.length}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Below minimum
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.("stock")}
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                  >
                    Manage Stock
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ─── 4. Low Stock Alerts + Today's Meals ────────────────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {/* Low Stock Alerts */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                Low Stock Alerts
                {data.lowStockAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {data.lowStockAlerts.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Ingredients below minimum stock level
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {data.lowStockAlerts.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                  <Package className="mb-2 h-10 w-10 text-emerald-500" />
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    All Stock Levels OK
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No ingredients are below minimum stock
                  </p>
                </div>
              ) : (
                <>
                  <div className="max-h-80 flex-1 space-y-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
                    {data.lowStockAlerts.map((item) => {
                      const stockPercent = Math.round(
                        (item.currentStock / item.minStock) * 100
                      );
                      const isCritical = item.currentStock === 0;
                      const isWarning = stockPercent < 50;

                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border p-3 transition-colors hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                isCritical
                                  ? "bg-rose-100 dark:bg-rose-900/30"
                                  : isWarning
                                    ? "bg-orange-100 dark:bg-orange-900/30"
                                    : "bg-amber-100 dark:bg-amber-900/30"
                              }`}
                            >
                              <Package
                                className={`h-4 w-4 ${
                                  isCritical
                                    ? "text-rose-600 dark:text-rose-400"
                                    : isWarning
                                      ? "text-orange-600 dark:text-orange-400"
                                      : "text-amber-600 dark:text-amber-400"
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-medium">
                                  {item.name}
                                </p>
                                <Badge
                                  variant={
                                    isCritical ? "destructive" : "secondary"
                                  }
                                  className={`shrink-0 text-xs ${
                                    isWarning && !isCritical
                                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                      : ""
                                  }`}
                                >
                                  {formatNumberDecimal(item.currentStock)} /{" "}
                                  {formatNumberDecimal(item.minStock)}{" "}
                                  {item.unit}
                                </Badge>
                              </div>
                              <div className="mt-1.5 flex items-center gap-2">
                                <Progress
                                  value={Math.min(stockPercent, 100)}
                                  className={`h-1.5 flex-1 ${
                                    isCritical
                                      ? "[&>div]:bg-rose-500"
                                      : isWarning
                                        ? "[&>div]:bg-orange-500"
                                        : "[&>div]:bg-amber-500"
                                  }`}
                                />
                                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                                  {stockPercent}%
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>Category: {item.category}</span>
                                <span>
                                  Par level:{" "}
                                  {formatNumberDecimal(item.minStock)}{" "}
                                  {item.unit}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate?.("stock")}
                      className="w-full text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                    >
                      View All Stock
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Meals Served */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <UtensilsCrossed className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                Today&apos;s Meals Served
              </CardTitle>
              <CardDescription>
                Meal breakdown for today&apos;s service
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {data.todayMeals.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                  <UtensilsCrossed className="mb-2 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No Meals Recorded Today
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add daily meal entries to see the breakdown
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.("daily-entry")}
                    className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Record Now
                  </Button>
                </div>
              ) : (
                <>
                  <div className="max-h-80 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Meal Type</TableHead>
                          <TableHead>Recipe</TableHead>
                          <TableHead className="text-right">Meals</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.todayMeals.map((meal) => (
                          <TableRow key={meal.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              >
                                {mealTypeLabel(meal.mealType)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {meal.recipe.name}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatNumber(meal.mealsServed)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-3 dark:from-amber-950/30 dark:to-orange-950/20">
                    <span className="text-sm font-medium">Total Today</span>
                    <span className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
                      {formatNumber(data.meals.today)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ─── 5. Top Consuming Ingredients + Expense Breakdown ───────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {/* Top Consuming Ingredients */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                Top Consuming Ingredients
              </CardTitle>
              <CardDescription>
                Most used ingredients this month — colored by category
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {consumptionChartData.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                  <Package className="mb-2 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No Consumption Data
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Record daily meals to see ingredient consumption
                  </p>
                </div>
              ) : (
                <ChartContainer
                  config={consumptionChartConfig}
                  className="min-h-[320px] w-full"
                >
                  <BarChart
                    data={consumptionChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
                    barCategoryGap={8}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="var(--border)"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 12 }}
                      stroke="var(--muted-foreground)"
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">
                                {item.payload.fullName}
                              </span>
                              <span>
                                {formatNumberDecimal(Number(value))}{" "}
                                {item.payload.unit}
                              </span>
                              <span className="text-amber-600 dark:text-amber-400">
                                Cost: {formatCurrency(item.payload.totalCost)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Category: {item.payload.category}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="totalQuantity"
                      radius={[0, 6, 6, 0]}
                      minPointSize={4}
                      barSize={22}
                    >
                      {consumptionChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                      <LabelList
                        dataKey="totalQuantity"
                        position="right"
                        formatter={(value: number) =>
                          formatNumberDecimal(value)
                        }
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          fill: "var(--foreground)",
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Expense Breakdown — donut chart with percentage labels */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Receipt className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                Expense Breakdown
              </CardTitle>
              <CardDescription>
                Monthly expenses by category — Total:{" "}
                <span className="font-semibold tabular-nums">
                  {formatCurrency(data.expenses.month)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {expenseChartData.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                  <Receipt className="mb-2 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No Expenses This Month
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add expenses to see the breakdown
                  </p>
                </div>
              ) : (
                <>
                  <ChartContainer
                    config={expenseChartConfig}
                    className="mx-auto min-h-[240px] w-full max-w-[320px]"
                  >
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={2}
                        label={renderPiePercentLabel}
                        labelLine={false}
                      >
                        {expenseChartData.map((entry, idx) => (
                          <Cell key={`exp-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, _name, item) => (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">
                                  {item.payload.name}
                                </span>
                                <span>
                                  {formatCurrency(Number(value))}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {data.expenses.month > 0
                                    ? `${(
                                        (Number(value) /
                                          data.expenses.month) *
                                        100
                                      ).toFixed(1)}% of total`
                                    : ""}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>

                  {/* Expense legend list with percentages */}
                  <div className="mt-4 space-y-2 border-t pt-3">
                    {expenseChartData.map((item) => {
                      const pct =
                        data.expenses.month > 0
                          ? (item.amount / data.expenses.month) * 100
                          : 0;
                      return (
                        <div
                          key={item.name}
                          className="flex items-center justify-between py-1"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {pct.toFixed(0)}%
                            </span>
                            <span className="text-sm font-semibold tabular-nums">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

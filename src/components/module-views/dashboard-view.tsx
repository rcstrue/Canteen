"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  IndianRupee,
  ShoppingCart,
  Receipt,
  Activity,
  Users,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AnimatedCounter } from "@/components/animated-counter";
import { Sparkline } from "@/components/sparkline";

// ─── Extracted sub-components ───────────────────────────────────────────────

import { MetricCard, TrendBadge, MetricCardSkeleton } from "./dashboard/metric-card";
import { LowStockAlertBanner } from "./dashboard/low-stock-banner";
import { ActivityTimeline } from "./dashboard/activity-timeline";
import { QuickStatsSidebar, QuickStatsSummaryBar } from "./dashboard/quick-stats";
import { getDateRangeForPreset } from "./dashboard/date-range-selector";
import { BannerSkeleton, LargeCardSkeleton } from "./dashboard/empty-states";
import { WelcomeBanner } from "./dashboard/welcome-banner";
import { QuickActions } from "./dashboard/quick-actions";
import { MonthlyComparison } from "./dashboard/monthly-comparison";
import { MealsBudgetSection, StockSection } from "./dashboard/stock-meals-section";
import { WeeklyConsumptionChart } from "./dashboard/weekly-consumption-chart";
import { TopIngredientsChart, CategorySpendingChart } from "./dashboard/ingredients-category-charts";
import { ConsumptionChart, ExpenseChart } from "./dashboard/consumption-expense-charts";

// ─── Shared types & helpers ─────────────────────────────────────────────────

import type {
  DashboardData,
  DashboardChartsData,
  IngredientListItem,
  CostReportData,
  BudgetRecord,
  DashboardViewProps,
  ActivityItem,
  QuickStats,
  DateRangeState,
} from "./dashboard/types";

import {
  formatCurrency,
  formatNumber,
  pctChange,
} from "./dashboard/helpers";

import {
  EMPLOYEE_COUNT,
} from "./dashboard/constants";

// ─── Main Component ─────────────────────────────────────────────────────────

export function DashboardView({ onNavigate }: DashboardViewProps = {}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [allIngredients, setAllIngredients] = useState<IngredientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRangeState>({
    preset: "today",
    range: getDateRangeForPreset("today"),
  });

  const [currentMonthReport, setCurrentMonthReport] = useState<CostReportData | null>(null);
  const [prevMonthReport, setPrevMonthReport] = useState<CostReportData | null>(null);
  const [currentBudget, setCurrentBudget] = useState<BudgetRecord | null>(null);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [quickStatsLoading, setQuickStatsLoading] = useState(true);

  const [chartsData, setChartsData] = useState<DashboardChartsData | null>(null);
  const [chartsLoading, setChartsLoading] = useState(true);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const dashboardUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange.range?.from) {
      params.set("startDate", format(dateRange.range.from, "yyyy-MM-dd"));
    }
    if (dateRange.range?.to) {
      params.set("endDate", format(dateRange.range.to, "yyyy-MM-dd"));
    }
    const qs = params.toString();
    return qs ? `/api/dashboard?${qs}` : "/api/dashboard";
  }, [dateRange]);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);
        const [dashRes, ingRes] = await Promise.all([
          fetch(dashboardUrl),
          fetch("/api/ingredients"),
        ]);
        if (!dashRes.ok) {
          throw new Error(`Failed to fetch dashboard data (${dashRes.status})`);
        }
        const json = await dashRes.json();
        setData(json);
        if (ingRes.ok) {
          const ingJson = (await ingRes.json()) as IngredientListItem[];
          setAllIngredients(ingJson);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [dashboardUrl]);

  useEffect(() => {
    let cancelled = false;
    async function fetchCharts() {
      try {
        setChartsLoading(true);
        const res = await fetch("/api/dashboard/charts");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        if (json && !json.error) {
          setChartsData({
            weeklyConsumption: Array.isArray(json.weeklyConsumption) ? json.weeklyConsumption : [],
            topIngredientsByCost: Array.isArray(json.topIngredientsByCost) ? json.topIngredientsByCost : [],
            categorySpending: Array.isArray(json.categorySpending) ? json.categorySpending : [],
            monthlyKpiTrend: Array.isArray(json.monthlyKpiTrend) ? json.monthlyKpiTrend : [],
          });
        }
      } catch (err) {
        console.error("Charts fetch error:", err);
        if (!cancelled) {
          toast.error("Failed to load chart analytics", {
            description: "Trend charts will be hidden. Refresh the page to retry.",
          });
        }
      } finally {
        if (!cancelled) setChartsLoading(false);
      }
    }
    fetchCharts();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    async function fetchMonthlyComparison() {
      try {
        const now = new Date();
        const curStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const curEnd = now.toISOString().split("T")[0];
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
        const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];

        const [curRes, prevRes] = await Promise.all([
          fetch(`/api/reports/cost?period=month&startDate=${curStart}&endDate=${curEnd}`),
          fetch(`/api/reports/cost?period=month&startDate=${prevStart}&endDate=${prevEnd}`),
        ]);
        if (curRes.ok) setCurrentMonthReport(await curRes.json());
        if (prevRes.ok) setPrevMonthReport(await prevRes.json());
      } catch (err) {
        console.error("Monthly comparison fetch error:", err);
      }
    }
    fetchMonthlyComparison();
  }, []);

  useEffect(() => {
    async function fetchBudget() {
      try {
        const res = await fetch("/api/budgets");
        if (res.ok) {
          const budgets = (await res.json()) as BudgetRecord[];
          const currentMonth = new Date().toISOString().slice(0, 7);
          const current = budgets.find((b) => b.month === currentMonth);
          if (current) setCurrentBudget(current);
        }
      } catch (err) {
        console.error("Budget fetch error:", err);
      }
    }
    fetchBudget();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchActivity() {
      try {
        setActivitiesLoading(true);
        const res = await fetch("/api/activity");
        if (!res.ok) return;
        const json = (await res.json()) as { data: ActivityItem[] };
        if (!cancelled && Array.isArray(json?.data)) setActivities(json.data);
      } catch (err) {
        console.error("Activity feed fetch error:", err);
      } finally {
        if (!cancelled) setActivitiesLoading(false);
      }
    }
    fetchActivity();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchQuickStats() {
      try {
        setQuickStatsLoading(true);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayStr = todayStart.toISOString().split("T")[0];
        const weekStartStr = weekStart.toISOString().split("T")[0];

        const [purchasesRes, mealsRes, wastageRes, suppliersRes] = await Promise.all([
          fetch(`/api/purchases?startDate=${todayStr}&limit=100`),
          fetch(`/api/daily-meals?startDate=${weekStartStr}&limit=200`),
          fetch(`/api/stock-movements?type=WASTAGE&limit=200`),
          fetch("/api/suppliers?limit=500"),
        ]);

        let todayPurchasesTotal = 0;
        if (purchasesRes.ok) {
          const json = (await purchasesRes.json()) as { data?: Array<{ date: string; totalAmount: number }> };
          todayPurchasesTotal = (json.data ?? []).reduce((sum, p) => {
            const d = new Date(p.date);
            return d >= todayStart ? sum + p.totalAmount : sum;
          }, 0);
        }

        let weekMealsCount = 0;
        if (mealsRes.ok) {
          const json = (await mealsRes.json()) as { data?: Array<{ date: string; mealsServed: number }> };
          weekMealsCount = (json.data ?? []).reduce((sum, m) => {
            const d = new Date(m.date);
            return d >= weekStart ? sum + m.mealsServed : sum;
          }, 0);
        }

        let monthWastageValue = 0;
        if (wastageRes.ok) {
          const json = (await wastageRes.json()) as { data?: Array<{ date: string; totalAmount: number }> };
          monthWastageValue = (json.data ?? []).reduce((sum, s) => {
            const d = new Date(s.date);
            return d >= monthStart ? sum + s.totalAmount : sum;
          }, 0);
        }

        let activeSuppliersCount = 0;
        if (suppliersRes.ok) {
          const json = await suppliersRes.json();
          if (Array.isArray(json)) {
            activeSuppliersCount = json.length;
          } else if (json && typeof json === "object" && "total" in json) {
            activeSuppliersCount = (json as { total: number }).total ?? 0;
          } else if (json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown[] }).data)) {
            activeSuppliersCount = (json as { data: unknown[] }).data.length;
          }
        }

        if (!cancelled) {
          setQuickStats({ todayPurchasesTotal, weekMealsCount, monthWastageValue, activeSuppliersCount });
        }
      } catch (err) {
        console.error("Quick stats fetch error:", err);
      } finally {
        if (!cancelled) setQuickStatsLoading(false);
      }
    }
    fetchQuickStats();
    return () => { cancelled = true; };
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
        <LargeCardSkeleton />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LargeCardSkeleton />
          <LargeCardSkeleton />
        </div>
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
              {error || "Unable to load dashboard data. Please try again later."}
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

  const weekMeals = data.meals.month
    ? Math.round((data.meals.today * 7 + data.meals.month) / 8)
    : data.meals.today * 7;

  const avgDailyFromWeek = data.foodCost.week / 7;
  const avgWeeklyFromMonth = data.foodCost.month / 4.33;
  const todayVsAvgDay = pctChange(data.foodCost.today, avgDailyFromWeek);
  const weekVsAvgWeek = pctChange(data.foodCost.week, avgWeeklyFromMonth);

  const costPerEmployee = data.totalOperatingCost / EMPLOYEE_COUNT;
  const dailyCostPerEmployee = costPerEmployee / 30;

  const totalIngredientCount = allIngredients.length > 0 ? allIngredients.length : data.lowStockAlerts.length;
  const aboveParCount = allIngredients.length > 0
    ? allIngredients.filter((i) => i.currentStock >= i.minStock).length
    : Math.max(0, totalIngredientCount - data.lowStockAlerts.length);
  const stockHealthPct = totalIngredientCount > 0 ? (aboveParCount / totalIngredientCount) * 100 : 100;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 0. Low-Stock Alert Banner */}
      <LowStockAlertBanner lowStockItems={data.lowStockAlerts} onNavigate={onNavigate} />

      {/* 1. Welcome Banner */}
      <WelcomeBanner
        data={data}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        weekVsAvgWeek={weekVsAvgWeek}
        onNavigate={onNavigate}
      />

      {/* 2. Quick Actions Widget */}
      <QuickActions onNavigate={onNavigate} />

      {/* 3. Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Today's Food Cost"
          value={formatCurrency(data.foodCost.today)}
          valueNode={<AnimatedCounter value={data.foodCost.today} prefix="₹" decimals={2} className="text-2xl font-bold tracking-tight tabular-nums text-amber-950 dark:text-amber-100" />}
          sparkline={!chartsLoading && chartsData?.monthlyKpiTrend?.length ? <Sparkline data={chartsData.monthlyKpiTrend.map((m) => m.foodCost)} color="var(--chart-1)" type="area" height={24} /> : null}
          icon={<IndianRupee className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          iconBgClass="bg-amber-100 dark:bg-amber-900/30"
          trend={<TrendBadge pct={todayVsAvgDay} label="vs yesterday" />}
          subValue={<div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Zap className="h-3 w-3 text-amber-500" /><span>From today&apos;s purchases</span></div>}
        />

        <MetricCard
          title="This Week's Food Cost"
          value={formatCurrency(data.foodCost.week)}
          valueNode={<AnimatedCounter value={data.foodCost.week} prefix="₹" decimals={2} className="text-2xl font-bold tracking-tight tabular-nums text-amber-950 dark:text-amber-100" />}
          sparkline={!chartsLoading && chartsData?.monthlyKpiTrend?.length ? <Sparkline data={chartsData.monthlyKpiTrend.map((m) => m.foodCost)} color="var(--chart-2)" type="area" height={24} /> : null}
          icon={<ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
          iconBgClass="bg-orange-100 dark:bg-orange-900/30"
          trend={<TrendBadge pct={weekVsAvgWeek} label="vs last week" />}
          subValue={<div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShoppingCart className="h-3 w-3 text-orange-500" /><span>Last 7 days purchases</span></div>}
        />

        <MetricCard
          title="This Month's Food Cost"
          value={formatCurrency(data.foodCost.month)}
          valueNode={<AnimatedCounter value={data.foodCost.month} prefix="₹" decimals={2} className="text-2xl font-bold tracking-tight tabular-nums text-amber-950 dark:text-amber-100" />}
          sparkline={!chartsLoading && chartsData?.monthlyKpiTrend?.length ? <Sparkline data={chartsData.monthlyKpiTrend.map((m) => m.foodCost)} color="var(--chart-4)" type="area" height={24} /> : null}
          icon={<Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          iconBgClass="bg-amber-100 dark:bg-amber-900/30"
          trend={<div className="flex items-center gap-1 text-xs text-muted-foreground"><Activity className="h-3 w-3" /><span>Month-to-date total</span></div>}
          subValue={<div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Receipt className="h-3 w-3 text-amber-500" /><span>{formatCurrency(data.foodCost.month / 30)} / day avg</span></div>}
        />

        <MetricCard
          title="Cost Per Employee"
          value={formatCurrency(costPerEmployee)}
          valueNode={<AnimatedCounter value={costPerEmployee} prefix="₹" decimals={2} className="text-2xl font-bold tracking-tight tabular-nums text-amber-950 dark:text-amber-100" />}
          sparkline={!chartsLoading && chartsData?.monthlyKpiTrend?.length ? <Sparkline data={chartsData.monthlyKpiTrend.map((m) => m.operatingCost)} color="var(--chart-3)" type="area" height={24} /> : null}
          icon={<Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
          iconBgClass="bg-orange-100 dark:bg-orange-900/30"
          trend={<div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /><span>For {formatNumber(EMPLOYEE_COUNT)} employees</span></div>}
          subValue={<div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3 w-3 text-orange-500" /><span>Daily: <span className="font-semibold text-amber-800 dark:text-amber-300">{formatCurrency(dailyCostPerEmployee)}</span> / employee</span></div>}
        />
      </div>

      {/* 3.5 Quick Stats Summary Bar */}
      <QuickStatsSummaryBar totalEmployees={EMPLOYEE_COUNT} mealsServedToday={data.meals.today} avgCostPerMeal={data.costPerMeal} stockHealthPct={stockHealthPct} loading={false} />

      {/* 4. Monthly Comparison */}
      <MonthlyComparison currentMonthReport={currentMonthReport} prevMonthReport={prevMonthReport} />

      {/* 4.5 Activity Timeline + Quick Stats Sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-full lg:col-span-2">
          <ActivityTimeline activities={activities} loading={activitiesLoading} />
        </div>
        <div className="h-full">
          <QuickStatsSidebar stats={quickStats} loading={quickStatsLoading} />
        </div>
      </div>

      {/* 5. Meals Summary + Budget Status */}
      <MealsBudgetSection data={data} weekMeals={weekMeals} currentBudget={currentBudget} onNavigate={onNavigate} />

      {/* 6. Stock Health + Low Stock + Today's Meals */}
      <StockSection data={data} stockHealthPct={stockHealthPct} aboveParCount={aboveParCount} totalIngredientCount={totalIngredientCount} onNavigate={onNavigate} />

      {/* 7. Weekly Consumption Trend */}
      <WeeklyConsumptionChart chartsData={chartsData} chartsLoading={chartsLoading} />

      {/* 8. Top 5 Ingredients + Category Spending */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TopIngredientsChart chartsData={chartsData} chartsLoading={chartsLoading} />
        <CategorySpendingChart chartsData={chartsData} chartsLoading={chartsLoading} />
      </div>

      {/* 9. Top Consuming Ingredients + Expense Breakdown */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ConsumptionChart data={data} />
        <ExpenseChart data={data} />
      </div>
    </div>
  );
}

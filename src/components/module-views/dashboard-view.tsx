"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
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
import { AnimatedCounter } from "@/components/animated-counter";
import { Sparkline } from "@/components/sparkline";

// ─── Eagerly loaded components (above the fold) ────────────────────────────

import { TrendBadge, MetricCardSkeleton } from "./dashboard/metric-card";
import { LowStockAlertBanner } from "./dashboard/low-stock-banner";
import { getDateRangeForPreset } from "./dashboard/date-range-selector";
import { BannerSkeleton, LargeCardSkeleton } from "./dashboard/empty-states";
import { QuickActions } from "./dashboard/quick-actions";
import { QuickStatsSummaryBar } from "./dashboard/quick-stats";

// ─── Lazy loaded components (below the fold - loaded on demand) ────────────

const MetricCard = lazy(() =>
  import("./dashboard/metric-card").then((m) => ({ default: m.MetricCard }))
);
const WelcomeBanner = lazy(() =>
  import("./dashboard/welcome-banner").then((m) => ({ default: m.WelcomeBanner }))
);
const ActivityTimeline = lazy(() =>
  import("./dashboard/activity-timeline").then((m) => ({ default: m.ActivityTimeline }))
);
const QuickStatsSidebar = lazy(() =>
  import("./dashboard/quick-stats").then((m) => ({ default: m.QuickStatsSidebar }))
);
const MonthlyComparison = lazy(() =>
  import("./dashboard/monthly-comparison").then((m) => ({ default: m.MonthlyComparison }))
);
const MealsBudgetSection = lazy(() =>
  import("./dashboard/stock-meals-section").then((m) => ({ default: m.MealsBudgetSection }))
);
const StockSection = lazy(() =>
  import("./dashboard/stock-meals-section").then((m) => ({ default: m.StockSection }))
);
const WeeklyConsumptionChart = lazy(() =>
  import("./dashboard/weekly-consumption-chart").then((m) => ({ default: m.WeeklyConsumptionChart }))
);
const TopIngredientsChart = lazy(() =>
  import("./dashboard/ingredients-category-charts").then((m) => ({ default: m.TopIngredientsChart }))
);
const CategorySpendingChart = lazy(() =>
  import("./dashboard/ingredients-category-charts").then((m) => ({ default: m.CategorySpendingChart }))
);
const ConsumptionChart = lazy(() =>
  import("./dashboard/consumption-expense-charts").then((m) => ({ default: m.ConsumptionChart }))
);
const ExpenseChart = lazy(() =>
  import("./dashboard/consumption-expense-charts").then((m) => ({ default: m.ExpenseChart }))
);

// ─── Types ─────────────────────────────────────────────────────────────────

import type {
  DashboardData,
  DashboardChartsData,
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

import { EMPLOYEE_COUNT } from "./dashboard/constants";

// ─── Charts data fetched separately (lazy) ─────────────────────────────────

interface ChartsDataState {
  data: DashboardChartsData | null;
  loading: boolean;
}

// ─── Main Component ────────────────────────────────────────────────────────

export function DashboardView({ onNavigate }: DashboardViewProps = {}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRangeState>({
    preset: "today",
    range: getDateRangeForPreset("today"),
  });

  // Consolidated state from single API response
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [currentBudget, setCurrentBudget] = useState<BudgetRecord | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [totalIngredientCount, setTotalIngredientCount] = useState(0);

  // Charts data loaded separately (lazy, non-blocking)
  const [charts, setCharts] = useState<ChartsDataState>({
    data: null,
    loading: true,
  });

  // Monthly comparison loaded separately (lazy, non-blocking)
  const [monthlyComparison, setMonthlyComparison] = useState<{
    current: CostReportData | null;
    previous: CostReportData | null;
  }>({ current: null, previous: null });

  // ─── Primary data fetch (single consolidated call) ────────────────────

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
    let cancelled = false;

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(dashboardUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch dashboard data (${res.status})`);
        }
        const json = await res.json();
        if (cancelled) return;

        setData(json);
        if (json.quickStats) setQuickStats(json.quickStats);
        if (json.currentBudget) setCurrentBudget(json.currentBudget);
        if (json.activities) setActivities(json.activities);
        if (typeof json.totalIngredientCount === "number") {
          setTotalIngredientCount(json.totalIngredientCount);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboard();
    return () => {
      cancelled = true;
    };
  }, [dashboardUrl]);

  // ─── Charts data fetch (deferred - runs after main data) ──────────────

  useEffect(() => {
    let cancelled = false;

    // Defer charts fetch to avoid competing with main data fetch
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/dashboard/charts");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (json && !json.error) {
          setCharts({
            data: {
              weeklyConsumption: Array.isArray(json.weeklyConsumption) ? json.weeklyConsumption : [],
              topIngredientsByCost: Array.isArray(json.topIngredientsByCost) ? json.topIngredientsByCost : [],
              categorySpending: Array.isArray(json.categorySpending) ? json.categorySpending : [],
              monthlyKpiTrend: Array.isArray(json.monthlyKpiTrend) ? json.monthlyKpiTrend : [],
            },
            loading: false,
          });
        } else {
          setCharts({ data: null, loading: false });
        }
      } catch (err) {
        console.error("Charts fetch error:", err);
        if (!cancelled) setCharts({ data: null, loading: false });
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // ─── Monthly comparison fetch (deferred) ──────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
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

        if (cancelled) return;

        setMonthlyComparison({
          current: curRes.ok ? await curRes.json() : null,
          previous: prevRes.ok ? await prevRes.json() : null,
        });
      } catch (err) {
        console.error("Monthly comparison fetch error:", err);
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 view-enter">
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
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <div className="space-y-6 view-enter">
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

  const avgDailyFromWeek = data.foodCost.week / 7;
  const avgWeeklyFromMonth = data.foodCost.month / 4.33;
  const todayVsAvgDay = pctChange(data.foodCost.today, avgDailyFromWeek);
  const weekVsAvgWeek = pctChange(data.foodCost.week, avgWeeklyFromMonth);

  const costPerEmployee = data.totalOperatingCost / EMPLOYEE_COUNT;
  const dailyCostPerEmployee = costPerEmployee / 30;

  const totalCount = totalIngredientCount || data.lowStockAlerts.length || 1;
  const aboveParCount = Math.max(0, totalCount - data.lowStockAlerts.length);
  const stockHealthPct = totalCount > 0 ? (aboveParCount / totalCount) * 100 : 100;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 view-enter">
      {/* 0. Low-Stock Alert Banner */}
      <LowStockAlertBanner lowStockItems={data.lowStockAlerts} onNavigate={onNavigate} />

      {/* 1. Welcome Banner (lazy) */}
      <Suspense fallback={<BannerSkeleton />}>
        <WelcomeBanner
          data={data}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          weekVsAvgWeek={weekVsAvgWeek}
          onNavigate={onNavigate}
        />
      </Suspense>

      {/* 2. Quick Actions Widget */}
      <QuickActions onNavigate={onNavigate} />

      {/* 3. Top Metric Cards (lazy) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<MetricCardSkeleton />}>
          <MetricCard
            title="Today's Food Cost"
            value={formatCurrency(data.foodCost.today)}
            valueNode={<AnimatedCounter value={data.foodCost.today} prefix="₹" decimals={2} className="text-2xl font-bold tracking-tight tabular-nums text-amber-950 dark:text-amber-100" />}
            sparkline={!charts.loading && charts.data?.monthlyKpiTrend?.length ? <Sparkline data={charts.data.monthlyKpiTrend.map((m) => m.foodCost)} color="var(--chart-1)" type="area" height={24} /> : null}
            icon={<IndianRupee className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            iconBgClass="bg-amber-100 dark:bg-amber-900/30"
            trend={<TrendBadge pct={todayVsAvgDay} label="vs yesterday" />}
            subValue={<div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Zap className="h-3 w-3 text-amber-500" /><span>From today&apos;s purchases</span></div>}
          />
        </Suspense>

        <Suspense fallback={<MetricCardSkeleton />}>
          <MetricCard
            title="This Week's Food Cost"
            value={formatCurrency(data.foodCost.week)}
            valueNode={<AnimatedCounter value={data.foodCost.week} prefix="₹" decimals={2} className="text-2xl font-bold tracking-tight tabular-nums text-amber-950 dark:text-amber-100" />}
            sparkline={!charts.loading && charts.data?.monthlyKpiTrend?.length ? <Sparkline data={charts.data.monthlyKpiTrend.map((m) => m.foodCost)} color="var(--chart-2)" type="area" height={24} /> : null}
            icon={<ShoppingCart className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
            iconBgClass="bg-orange-100 dark:bg-orange-900/30"
            trend={<TrendBadge pct={weekVsAvgWeek} label="vs last week" />}
            subValue={<div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShoppingCart className="h-3 w-3 text-orange-500" /><span>Last 7 days purchases</span></div>}
          />
        </Suspense>

        <Suspense fallback={<MetricCardSkeleton />}>
          <MetricCard
            title="This Month's Food Cost"
            value={formatCurrency(data.foodCost.month)}
            valueNode={<AnimatedCounter value={data.foodCost.month} prefix="₹" decimals={2} className="text-2xl font-bold tracking-tight tabular-nums text-amber-950 dark:text-amber-100" />}
            sparkline={!charts.loading && charts.data?.monthlyKpiTrend?.length ? <Sparkline data={charts.data.monthlyKpiTrend.map((m) => m.foodCost)} color="var(--chart-4)" type="area" height={24} /> : null}
            icon={<Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            iconBgClass="bg-amber-100 dark:bg-amber-900/30"
            trend={<div className="flex items-center gap-1 text-xs text-muted-foreground"><Activity className="h-3 w-3" /><span>Month-to-date total</span></div>}
            subValue={<div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Receipt className="h-3 w-3 text-amber-500" /><span>{formatCurrency(data.foodCost.month / 30)} / day avg</span></div>}
          />
        </Suspense>

        <Suspense fallback={<MetricCardSkeleton />}>
          <MetricCard
            title="Cost Per Employee"
            value={formatCurrency(costPerEmployee)}
            valueNode={<AnimatedCounter value={costPerEmployee} prefix="₹" decimals={2} className="text-2xl font-bold tracking-tight tabular-nums text-amber-950 dark:text-amber-100" />}
            sparkline={!charts.loading && charts.data?.monthlyKpiTrend?.length ? <Sparkline data={charts.data.monthlyKpiTrend.map((m) => m.operatingCost)} color="var(--chart-3)" type="area" height={24} /> : null}
            icon={<Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
            iconBgClass="bg-orange-100 dark:bg-orange-900/30"
            trend={<div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /><span>For {formatNumber(EMPLOYEE_COUNT)} employees</span></div>}
            subValue={<div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3 w-3 text-orange-500" /><span>Daily: <span className="font-semibold text-amber-800 dark:text-amber-300">{formatCurrency(dailyCostPerEmployee)}</span> / employee</span></div>}
          />
        </Suspense>
      </div>

      {/* 3.5 Quick Stats Summary Bar */}
      <QuickStatsSummaryBar
        totalEmployees={EMPLOYEE_COUNT}
        mealsServedToday={data.meals.today}
        avgCostPerMeal={data.costPerMeal}
        stockHealthPct={stockHealthPct}
        loading={false}
      />

      {/* 4. Monthly Comparison (lazy) */}
      <Suspense fallback={<LargeCardSkeleton />}>
        <MonthlyComparison
          currentMonthReport={monthlyComparison.current}
          prevMonthReport={monthlyComparison.previous}
        />
      </Suspense>

      {/* 4.5 Activity Timeline + Quick Stats Sidebar (lazy) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-full lg:col-span-2">
          <Suspense fallback={<LargeCardSkeleton />}>
            <ActivityTimeline activities={activities} loading={false} />
          </Suspense>
        </div>
        <div className="h-full">
          <Suspense fallback={<LargeCardSkeleton />}>
            <QuickStatsSidebar stats={quickStats} loading={false} />
          </Suspense>
        </div>
      </div>

      {/* 5. Meals Summary + Budget Status (lazy) */}
      <Suspense fallback={<LargeCardSkeleton />}>
        <MealsBudgetSection
          data={data}
          weekMeals={data.meals.week || data.meals.today * 7}
          currentBudget={currentBudget}
          onNavigate={onNavigate}
        />
      </Suspense>

      {/* 6. Stock Health + Low Stock + Today's Meals (lazy) */}
      <Suspense fallback={<LargeCardSkeleton />}>
        <StockSection
          data={data}
          stockHealthPct={stockHealthPct}
          aboveParCount={aboveParCount}
          totalIngredientCount={totalCount}
          onNavigate={onNavigate}
        />
      </Suspense>

      {/* 7. Weekly Consumption Trend (lazy) */}
      <Suspense fallback={<LargeCardSkeleton />}>
        <WeeklyConsumptionChart chartsData={charts.data} chartsLoading={charts.loading} />
      </Suspense>

      {/* 8. Top 5 Ingredients + Category Spending (lazy) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Suspense fallback={<LargeCardSkeleton />}>
          <TopIngredientsChart chartsData={charts.data} chartsLoading={charts.loading} />
        </Suspense>
        <Suspense fallback={<LargeCardSkeleton />}>
          <CategorySpendingChart chartsData={charts.data} chartsLoading={charts.loading} />
        </Suspense>
      </div>

      {/* 9. Top Consuming Ingredients + Expense Breakdown (lazy) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Suspense fallback={<LargeCardSkeleton />}>
          <ConsumptionChart data={data} />
        </Suspense>
        <Suspense fallback={<LargeCardSkeleton />}>
          <ExpenseChart data={data} />
        </Suspense>
      </div>
    </div>
  );
}

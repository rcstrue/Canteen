'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { toast } from 'sonner';
import {
  BarChart3,
  IndianRupee,
  Utensils,
  Users,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Download,
  Printer,
  LineChart as LineChartIcon,
  BarChart as BarChartIcon,
  Wallet,
  Scale,
  Flame,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Label as RechartsLabel,
} from 'recharts';
import { downloadCSV } from '@/lib/export-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CostReport {
  period: { start: string; end: string; type: string };
  foodCost: {
    total: number;
    costPerMeal: number;
    categoryBreakdown: { category: string; totalCost: number; totalQuantity: number }[];
    dailyTrend: { date: string; cost: number }[];
  };
  meals: { total: number; count: number };
  expenses: { total: number; breakdown: { category: string; amount: number }[] };
  totalOperatingCost: number;
  operatingCostPerMeal: number;
}

interface ConsumptionReport {
  period: { start: string; end: string; type: string };
  summary: {
    totalConsumption: number;
    totalWastage: number;
    wastagePercentage: number;
  };
  usageByIngredient: {
    ingredient: { id: string; name: string; unit: string; category: string; avgCost: number };
    consumptionQty: number;
    consumptionCost: number;
    wastageQty: number;
    wastageCost: number;
    totalQty: number;
    totalCost: number;
  }[];
  categoryBreakdown: { category: string; totalQty: number; totalCost: number; wastagePercent: number }[];
  dailyTrend: { date: string; consumption: number; wastage: number }[];
}

interface VarianceReport {
  period: { start: string; end: string; type: string };
  summary: {
    totalTheoreticalCost: number;
    totalActualCost: number;
    totalVarianceCost: number;
    variancePercentage: number;
    totalWastage: number;
    criticalCount: number;
    warningCount: number;
  };
  varianceByIngredient: {
    ingredient: { id: string; name: string; unit: string; category: string; avgCost: number };
    theoreticalQty: number;
    actualQty: number;
    varianceQty: number;
    variancePercent: number;
    theoreticalCost: number;
    actualCost: number;
    varianceCost: number;
    wastageQty: number;
    status: 'normal' | 'warning' | 'critical';
  }[];
  criticalItems: unknown[];
  warningItems: unknown[];
}

type PeriodType = 'today' | 'week' | 'month';
type TrendChartType = 'line' | 'bar';

interface MonthlyTrendPoint {
  month: string;
  monthLabel: string;
  foodCost: number;
  operatingCost: number;
}

interface MonthlyTrendResponse {
  generatedAt: string;
  months: MonthlyTrendPoint[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const fmtNum = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
});

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

// Cohesive palette per spec: amber-500, orange-500, rose-500, emerald-500, violet-500, cyan-500
const PALETTE = [
  '#f59e0b', // amber-500
  '#f97316', // orange-500
  '#f43f5e', // rose-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
];

const CATEGORY_COLORS: Record<string, string> = {
  Grains: '#f59e0b', // amber
  Pulses: '#f97316', // orange
  Vegetables: '#10b981', // emerald
  Oil: '#8b5cf6', // violet
  Spices: '#f43f5e', // rose
  Dairy: '#06b6d4', // cyan
  Meat: '#ef4444', // red
  Other: '#6b7280', // gray
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? PALETTE[Math.abs(hash(category)) % PALETTE.length];
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

/** Format as DD/MM/YYYY (Indian format). */
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Short format DD/MM for chart axes. */
function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

/** Compute the previous-period date range (same duration immediately before `start`). */
function getPreviousRange(start: string, end: string): { start: string; end: string } {
  const s = new Date(start);
  const e = new Date(end);
  const duration = e.getTime() - s.getTime();
  const prevEnd = new Date(s.getTime() - 1); // day before current start
  const prevStart = new Date(prevEnd.getTime() - duration);
  return {
    start: prevStart.toISOString().split('T')[0],
    end: prevEnd.toISOString().split('T')[0],
  };
}

// ─── Chart Configs ────────────────────────────────────────────────────────────

const costTrendConfig: ChartConfig = {
  cost: { label: 'Daily Cost', color: '#f59e0b' },
};

const costBreakdownConfig: ChartConfig = {
  value: { label: 'Cost' },
};

const consumptionBarConfig: ChartConfig = {
  totalQty: { label: 'Qty Consumed', color: '#f59e0b' },
  wastageQty: { label: 'Wastage', color: '#f43f5e' },
};

const consumptionTrendConfig: ChartConfig = {
  consumption: { label: 'Consumption', color: '#f59e0b' },
  wastage: { label: 'Wastage', color: '#f43f5e' },
};

const consumptionCategoryConfig: ChartConfig = {
  value: { label: 'Cost' },
};

const varianceBarConfig: ChartConfig = {
  theoretical: { label: 'Theoretical', color: '#f59e0b' },
  actual: { label: 'Actual', color: '#f97316' },
};

const monthlyTrendConfig: ChartConfig = {
  foodCost: { label: 'Food Cost', color: '#f59e0b' },
  operatingCost: { label: 'Operating Cost', color: '#10b981' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsView() {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('cost');

  // New feature toggles
  const [compareMode, setCompareMode] = useState(false);
  const [trendChartType, setTrendChartType] = useState<TrendChartType>('line');

  const [costData, setCostData] = useState<CostReport | null>(null);
  const [consumptionData, setConsumptionData] = useState<ConsumptionReport | null>(null);
  const [varianceData, setVarianceData] = useState<VarianceReport | null>(null);

  // Previous-period comparison data
  const [prevCostData, setPrevCostData] = useState<CostReport | null>(null);
  const [prevConsumptionData, setPrevConsumptionData] = useState<ConsumptionReport | null>(null);
  const [prevVarianceData, setPrevVarianceData] = useState<VarianceReport | null>(null);

  const [costLoading, setCostLoading] = useState(false);
  const [consumptionLoading, setConsumptionLoading] = useState(false);
  const [varianceLoading, setVarianceLoading] = useState(false);

  const [costError, setCostError] = useState('');
  const [consumptionError, setConsumptionError] = useState('');
  const [varianceError, setVarianceError] = useState('');

  // Monthly trend (6 months) — shown above the tabs.
  const [trendData, setTrendData] = useState<MonthlyTrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState('');

  const isCustomRange = !!(startDate && endDate);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (isCustomRange) {
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      params.set('period', period);
    } else {
      params.set('period', period);
    }
    return params.toString();
  }, [period, startDate, endDate, isCustomRange]);

  const fetchCostReport = useCallback(async () => {
    setCostLoading(true);
    setCostError('');
    try {
      const res = await fetch(`/api/reports/cost?${buildQuery()}`);
      if (!res.ok) throw new Error('Failed to fetch cost report');
      const data = (await res.json()) as CostReport;
      setCostData(data);
    } catch {
      setCostError('Failed to load cost report');
    } finally {
      setCostLoading(false);
    }
  }, [buildQuery]);

  const fetchConsumptionReport = useCallback(async () => {
    setConsumptionLoading(true);
    setConsumptionError('');
    try {
      const res = await fetch(`/api/reports/consumption?${buildQuery()}`);
      if (!res.ok) throw new Error('Failed to fetch consumption report');
      const data = (await res.json()) as ConsumptionReport;
      setConsumptionData(data);
    } catch {
      setConsumptionError('Failed to load consumption report');
    } finally {
      setConsumptionLoading(false);
    }
  }, [buildQuery]);

  const fetchVarianceReport = useCallback(async () => {
    setVarianceLoading(true);
    setVarianceError('');
    try {
      const res = await fetch(`/api/reports/variance?${buildQuery()}`);
      if (!res.ok) throw new Error('Failed to fetch variance report');
      const data = (await res.json()) as VarianceReport;
      setVarianceData(data);
    } catch {
      setVarianceError('Failed to load variance report');
    } finally {
      setVarianceLoading(false);
    }
  }, [buildQuery]);

  // Fetch all reports when period changes
  useEffect(() => {
    fetchCostReport();
    fetchConsumptionReport();
    fetchVarianceReport();
  }, [fetchCostReport, fetchConsumptionReport, fetchVarianceReport]);

  // Fetch 6-month trend once on mount (independent of period filter).
  const fetchMonthlyTrend = useCallback(async () => {
    setTrendLoading(true);
    setTrendError('');
    try {
      const res = await fetch('/api/reports/monthly-trend');
      if (!res.ok) throw new Error('Failed to fetch monthly trend');
      const data = (await res.json()) as MonthlyTrendResponse;
      setTrendData(data.months || []);
    } catch {
      setTrendError('Failed to load monthly trend');
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthlyTrend();
  }, [fetchMonthlyTrend]);

  // Fetch previous-period comparison data when compareMode is enabled
  useEffect(() => {
    if (!compareMode) {
      setPrevCostData(null);
      setPrevConsumptionData(null);
      setPrevVarianceData(null);
      return;
    }
    const baseStart = costData?.period.start;
    const baseEnd = costData?.period.end;
    if (!baseStart || !baseEnd) return;

    const prev = getPreviousRange(baseStart, baseEnd);
    const q = new URLSearchParams({
      startDate: prev.start,
      endDate: prev.end,
      period,
    }).toString();

    (async () => {
      try {
        const [c, co, v] = await Promise.all([
          fetch(`/api/reports/cost?${q}`).then((r) => r.json() as Promise<CostReport>),
          fetch(`/api/reports/consumption?${q}`).then((r) => r.json() as Promise<ConsumptionReport>),
          fetch(`/api/reports/variance?${q}`).then((r) => r.json() as Promise<VarianceReport>),
        ]);
        setPrevCostData(c);
        setPrevConsumptionData(co);
        setPrevVarianceData(v);
      } catch {
        toast.error('Could not load previous-period data for comparison.');
      }
    })();
  }, [compareMode, costData?.period.start, costData?.period.end, period]);

  const handlePeriodChange = (p: PeriodType) => {
    setPeriod(p);
    setStartDate('');
    setEndDate('');
  };

  const handleCustomApply = () => {
    if (startDate && endDate) {
      fetchCostReport();
      fetchConsumptionReport();
      fetchVarianceReport();
    }
  };

  const totalEmployees = 600;

  // ─── CSV export handlers ─────────────────────────────────────────────────

  const exportCostCSV = () => {
    if (!costData) return;
    const rows = costData.foodCost.dailyTrend.map((row, idx) => {
      const avgMealsPerDay =
        costData.foodCost.dailyTrend.length > 0
          ? costData.meals.total / costData.foodCost.dailyTrend.length
          : 0;
      return {
        'Date (DD/MM/YYYY)': formatDate(row.date),
        'Day Cost': row.cost.toFixed(2),
        'Meals Served': Math.round(avgMealsPerDay),
        'Cost Per Meal': (avgMealsPerDay > 0 ? row.cost / avgMealsPerDay : 0).toFixed(2),
        'Index': idx + 1,
      };
    });
    downloadCSV(`cost-report-${period}-${Date.now()}.csv`, rows);
    toast.success('Cost report exported.');
  };

  const exportConsumptionCSV = () => {
    if (!consumptionData) return;
    const rows = consumptionData.usageByIngredient.map((i) => ({
      Ingredient: i.ingredient.name,
      Category: i.ingredient.category,
      Unit: i.ingredient.unit,
      'Qty Consumed': i.consumptionQty.toFixed(2),
      'Consumption Cost': i.consumptionCost.toFixed(2),
      'Wastage Qty': i.wastageQty.toFixed(2),
      'Wastage Cost': i.wastageCost.toFixed(2),
      'Total Qty': i.totalQty.toFixed(2),
      'Total Cost': i.totalCost.toFixed(2),
    }));
    downloadCSV(`consumption-report-${period}-${Date.now()}.csv`, rows);
    toast.success('Consumption report exported.');
  };

  const exportVarianceCSV = () => {
    if (!varianceData) return;
    const rows = varianceData.varianceByIngredient.map((i) => ({
      Ingredient: i.ingredient.name,
      Category: i.ingredient.category,
      Unit: i.ingredient.unit,
      'Theoretical Qty': i.theoreticalQty.toFixed(2),
      'Actual Qty': i.actualQty.toFixed(2),
      'Variance Qty': i.varianceQty.toFixed(2),
      'Variance %': i.variancePercent.toFixed(2),
      'Theoretical Cost': i.theoreticalCost.toFixed(2),
      'Actual Cost': i.actualCost.toFixed(2),
      'Variance Cost': i.varianceCost.toFixed(2),
      'Wastage Qty': i.wastageQty.toFixed(2),
      Status: i.status,
    }));
    downloadCSV(`variance-report-${period}-${Date.now()}.csv`, rows);
    toast.success('Variance report exported.');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Cost, consumption, and variance analysis for canteen operations
          </p>
        </div>
      </div>

      {/* Period Selector + Global Actions */}
      <Card className="transition-all hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Period:</span>
              </div>
              {/* Pill-style period selector */}
              <div className="inline-flex rounded-full bg-muted p-1">
                {(['today', 'week', 'month'] as PeriodType[]).map((p) => {
                  const active = period === p && !isCustomRange;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePeriodChange(p)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-auto text-sm"
                aria-label="Custom start date"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-auto text-sm"
                aria-label="Custom end date"
              />
              <Button
                size="sm"
                onClick={handleCustomApply}
                disabled={!startDate || !endDate}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Apply
              </Button>

              {/* Compare toggle */}
              <div className="ml-2 flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
                <Switch
                  id="compare-mode"
                  checked={compareMode}
                  onCheckedChange={setCompareMode}
                  aria-label="Toggle comparison with previous period"
                />
                <Label htmlFor="compare-mode" className="cursor-pointer text-xs font-medium">
                  Compare
                </Label>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Trend Analysis — 6-month combo chart + summary cards */}
      <MonthlyTrendSection
        data={trendData}
        loading={trendLoading}
        error={trendError}
        onRetry={fetchMonthlyTrend}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="cost" className="gap-1.5">
            <IndianRupee className="h-4 w-4" />
            Cost Report
          </TabsTrigger>
          <TabsTrigger value="consumption" className="gap-1.5">
            <Package className="h-4 w-4" />
            Consumption Report
          </TabsTrigger>
          <TabsTrigger value="variance" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Variance Report
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* ─── Cost Report Tab ──────────────────────────────────────────── */}
            <TabsContent value="cost" className="space-y-6 mt-4">
              {costLoading ? (
                <CostReportSkeleton />
              ) : costError ? (
                <ErrorState message={costError} onRetry={fetchCostReport} />
              ) : costData ? (
                <>
                  {/* Report Summary Header */}
                  <ReportSummaryHeader
                    title="Cost Report"
                    metric={fmt.format(costData.totalOperatingCost)}
                    metricLabel="Total Operating Cost"
                    periodStart={costData.period.start}
                    periodEnd={costData.period.end}
                    onExport={exportCostCSV}
                    accent="amber"
                  />

                  {/* KPI Cards — integrated with operating cost context */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                      title="Food Cost"
                      value={fmt.format(costData.foodCost.total)}
                      icon={<IndianRupee className="h-5 w-5" />}
                      iconBg="bg-amber-100 dark:bg-amber-900/30"
                      iconColor="text-amber-600 dark:text-amber-400"
                      subtitle={`${fmtNum.format(costData.meals.total)} meals served`}
                      previousValue={
                        compareMode && prevCostData
                          ? fmt.format(prevCostData.foodCost.total)
                          : undefined
                      }
                      goodWhenDown
                    />
                    <SummaryCard
                      title="Food Cost / Meal"
                      value={fmt.format(costData.foodCost.costPerMeal)}
                      icon={<Utensils className="h-5 w-5" />}
                      iconBg="bg-orange-100 dark:bg-orange-900/30"
                      iconColor="text-orange-600 dark:text-orange-400"
                      subtitle="Raw ingredient cost per meal"
                      previousValue={
                        compareMode && prevCostData
                          ? fmt.format(prevCostData.foodCost.costPerMeal)
                          : undefined
                      }
                      goodWhenDown
                    />
                    <SummaryCard
                      title="Operating Cost / Meal"
                      value={fmt.format(costData.operatingCostPerMeal)}
                      icon={<Wallet className="h-5 w-5" />}
                      iconBg="bg-rose-100 dark:bg-rose-900/30"
                      iconColor="text-rose-600 dark:text-rose-400"
                      subtitle="Food + expenses per meal"
                      previousValue={
                        compareMode && prevCostData
                          ? fmt.format(prevCostData.operatingCostPerMeal)
                          : undefined
                      }
                      goodWhenDown
                    />
                    <SummaryCard
                      title="Operating Expenses"
                      value={fmt.format(costData.expenses.total)}
                      icon={<TrendingUp className="h-5 w-5" />}
                      iconBg="bg-violet-100 dark:bg-violet-900/30"
                      iconColor="text-violet-600 dark:text-violet-400"
                      subtitle={`Based on ${totalEmployees} employees`}
                      previousValue={
                        compareMode && prevCostData
                          ? fmt.format(prevCostData.expenses.total)
                          : undefined
                      }
                      goodWhenDown
                    />
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Cost Breakdown by Category (Donut with % labels) */}
                    <Card className="transition-all hover:shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Cost Breakdown by Category</CardTitle>
                        <CardDescription>Food cost distribution across ingredient categories</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {costData.foodCost.categoryBreakdown.length > 0 ? (
                          <ChartContainer
                            config={costBreakdownConfig}
                            className="mx-auto aspect-square max-h-[320px]"
                          >
                            <PieChart>
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    formatter={(value, name) => (
                                      <span>
                                        {name}: <span className="font-semibold tabular-nums">{fmt.format(Number(value))}</span>
                                      </span>
                                    )}
                                  />
                                }
                              />
                              <Pie
                                data={costData.foodCost.categoryBreakdown.map((c) => ({
                                  name: c.category,
                                  value: c.totalCost,
                                }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={95}
                                paddingAngle={2}
                                dataKey="value"
                                nameKey="name"
                                labelLine={false}
                                label={renderPiePercentLabel}
                              >
                                {costData.foodCost.categoryBreakdown.map((entry) => (
                                  <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                                ))}
                              </Pie>
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value) => (
                                  <span className="text-xs">{value}</span>
                                )}
                              />
                            </PieChart>
                          </ChartContainer>
                        ) : (
                          <EmptyState message="No category data available" />
                        )}
                      </CardContent>
                    </Card>

                    {/* Daily Cost Trend (with chart-type toggle) */}
                    <Card className="transition-all hover:shadow-md">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">Daily Cost Trend</CardTitle>
                            <CardDescription>Food cost trend over the selected period</CardDescription>
                          </div>
                          <ChartTypeToggle value={trendChartType} onChange={setTrendChartType} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        {costData.foodCost.dailyTrend.length > 0 ? (
                          <ChartContainer config={costTrendConfig} className="aspect-[2/1] w-full">
                            {trendChartType === 'line' ? (
                              <LineChart data={costData.foodCost.dailyTrend} margin={{ top: 10, right: 12, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                                <XAxis
                                  dataKey="date"
                                  tickFormatter={formatShortDate}
                                  tick={{ fontSize: 11 }}
                                  tickMargin={8}
                                  interval="preserveStartEnd"
                                  angle={-15}
                                  textAnchor="end"
                                  height={50}
                                  className="text-muted-foreground"
                                />
                                <YAxis
                                  tickFormatter={(v) => `₹${fmtNum.format(v / 1000)}k`}
                                  tick={{ fontSize: 11 }}
                                  className="text-muted-foreground"
                                />
                                <ChartTooltip
                                  content={
                                    <ChartTooltipContent
                                      labelFormatter={(label) => formatDate(label as string)}
                                      formatter={(value) => (
                                        <span className="tabular-nums">{fmt.format(Number(value))}</span>
                                      )}
                                    />
                                  }
                                />
                                <Line
                                  type="monotone"
                                  dataKey="cost"
                                  stroke="#f59e0b"
                                  strokeWidth={2}
                                  dot={{ r: 3, fill: '#f59e0b' }}
                                  activeDot={{ r: 5, fill: '#d97706' }}
                                />
                              </LineChart>
                            ) : (
                              <BarChart data={costData.foodCost.dailyTrend} margin={{ top: 10, right: 12, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                                <XAxis
                                  dataKey="date"
                                  tickFormatter={formatShortDate}
                                  tick={{ fontSize: 11 }}
                                  tickMargin={8}
                                  interval="preserveStartEnd"
                                  angle={-15}
                                  textAnchor="end"
                                  height={50}
                                  className="text-muted-foreground"
                                />
                                <YAxis
                                  tickFormatter={(v) => `₹${fmtNum.format(v / 1000)}k`}
                                  tick={{ fontSize: 11 }}
                                  className="text-muted-foreground"
                                />
                                <ChartTooltip
                                  content={
                                    <ChartTooltipContent
                                      labelFormatter={(label) => formatDate(label as string)}
                                      formatter={(value) => (
                                        <span className="tabular-nums">{fmt.format(Number(value))}</span>
                                      )}
                                    />
                                  }
                                />
                                <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                                  <RechartsLabel
                                    dataKey="cost"
                                    position="top"
                                    formatter={(v: number) => `₹${fmtNum.format(v)}`}
                                    style={{ fontSize: 9, fill: '#92400e' }}
                                  />
                                </Bar>
                              </BarChart>
                            )}
                          </ChartContainer>
                        ) : (
                          <EmptyState message="No daily trend data available" />
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Cost Table */}
                  <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Daily Cost Details</CardTitle>
                      <CardDescription>Breakdown of daily costs and meals served</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {costData.foodCost.dailyTrend.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Total Cost</TableHead>
                                <TableHead className="text-right">Meals Served</TableHead>
                                <TableHead className="text-right">Cost Per Meal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {costData.foodCost.dailyTrend.map((row) => {
                                const mealsForDay = costData.foodCost.dailyTrend.length
                                  ? costData.meals.total / costData.foodCost.dailyTrend.length
                                  : 0;
                                const costPerMeal =
                                  mealsForDay > 0 ? row.cost / mealsForDay : 0;
                                return (
                                  <TableRow key={row.date} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-medium tabular-nums">
                                      {formatDate(row.date)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                      {fmt.format(row.cost)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                      {fmtNum.format(Math.round(mealsForDay))}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">
                                      {fmt.format(costPerMeal)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <EmptyState message="No daily cost data available" />
                      )}
                    </CardContent>
                  </Card>

                  {/* Expense Breakdown */}
                  {costData.expenses.breakdown.length > 0 && (
                    <Card className="transition-all hover:shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Operating Expenses</CardTitle>
                        <CardDescription>Expense breakdown by category</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Share</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {costData.expenses.breakdown.map((exp) => (
                                <TableRow key={exp.category} className="hover:bg-muted/50 transition-colors">
                                  <TableCell className="font-medium">{exp.category}</TableCell>
                                  <TableCell className="text-right tabular-nums">{fmt.format(exp.amount)}</TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {costData.expenses.total > 0
                                      ? ((exp.amount / costData.expenses.total) * 100).toFixed(1)
                                      : '0'}
                                    %
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="font-bold bg-amber-50/50 dark:bg-amber-950/20">
                                <TableCell>Total</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {fmt.format(costData.expenses.total)}
                                </TableCell>
                                <TableCell className="text-right">100%</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
                    No cost data available
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ─── Consumption Report Tab ───────────────────────────────────── */}
            <TabsContent value="consumption" className="space-y-6 mt-4">
              {consumptionLoading ? (
                <ConsumptionReportSkeleton />
              ) : consumptionError ? (
                <ErrorState message={consumptionError} onRetry={fetchConsumptionReport} />
              ) : consumptionData ? (
                <>
                  <ReportSummaryHeader
                    title="Consumption Report"
                    metric={fmt.format(consumptionData.summary.totalConsumption)}
                    metricLabel="Total Consumption Value"
                    periodStart={consumptionData.period.start}
                    periodEnd={consumptionData.period.end}
                    onExport={exportConsumptionCSV}
                    accent="orange"
                  />

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                      title="Consumption Value"
                      value={fmt.format(consumptionData.summary.totalConsumption)}
                      icon={<Package className="h-5 w-5" />}
                      iconBg="bg-amber-100 dark:bg-amber-900/30"
                      iconColor="text-amber-600 dark:text-amber-400"
                      subtitle="Total consumption value"
                      previousValue={
                        compareMode && prevConsumptionData
                          ? fmt.format(prevConsumptionData.summary.totalConsumption)
                          : undefined
                      }
                      goodWhenDown
                    />
                    <SummaryCard
                      title="Wastage Value"
                      value={fmt.format(consumptionData.summary.totalWastage)}
                      icon={<TrendingDown className="h-5 w-5" />}
                      iconBg="bg-rose-100 dark:bg-rose-900/30"
                      iconColor="text-rose-600 dark:text-rose-400"
                      subtitle={`${consumptionData.summary.wastagePercentage.toFixed(1)}% of total`}
                      previousValue={
                        compareMode && prevConsumptionData
                          ? fmt.format(prevConsumptionData.summary.totalWastage)
                          : undefined
                      }
                      goodWhenDown
                    />
                    <SummaryCard
                      title="Ingredients Used"
                      value={String(consumptionData.usageByIngredient.length)}
                      icon={<BarChart3 className="h-5 w-5" />}
                      iconBg="bg-violet-100 dark:bg-violet-900/30"
                      iconColor="text-violet-600 dark:text-violet-400"
                      subtitle="Distinct ingredients consumed"
                    />
                    <SummaryCard
                      title="Categories"
                      value={String(consumptionData.categoryBreakdown.length)}
                      icon={<Package className="h-5 w-5" />}
                      iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                      iconColor="text-emerald-600 dark:text-emerald-400"
                      subtitle="Categories tracked"
                    />
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Top Consuming Ingredients (Horizontal Bar) */}
                    <Card className="transition-all hover:shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Top Consuming Ingredients</CardTitle>
                        <CardDescription>By quantity consumed</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {consumptionData.usageByIngredient.length > 0 ? (
                          <ChartContainer
                            config={consumptionBarConfig}
                            className="aspect-[2/1] w-full"
                          >
                            <BarChart
                              data={consumptionData.usageByIngredient.slice(0, 8).map((i) => ({
                                name: i.ingredient.name.length > 12
                                  ? i.ingredient.name.substring(0, 12) + '…'
                                  : i.ingredient.name,
                                totalQty: i.consumptionQty,
                                wastageQty: i.wastageQty,
                                unit: i.ingredient.unit,
                              }))}
                              layout="vertical"
                              margin={{ top: 5, right: 30, bottom: 5, left: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                              <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                              <YAxis
                                type="category"
                                dataKey="name"
                                width={90}
                                tick={{ fontSize: 11 }}
                                className="text-muted-foreground"
                              />
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    formatter={(value, _name, props) => {
                                      const unit = props.payload?.unit || '';
                                      return (
                                        <span className="tabular-nums">
                                          {fmtNum.format(Number(value))} {unit}
                                        </span>
                                      );
                                    }}
                                  />
                                }
                              />
                              <Bar dataKey="totalQty" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                                <RechartsLabel
                                  dataKey="totalQty"
                                  position="right"
                                  formatter={(v: number) => fmtNum.format(v)}
                                  style={{ fontSize: 9, fill: '#92400e' }}
                                />
                              </Bar>
                              <Bar dataKey="wastageQty" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ChartContainer>
                        ) : (
                          <EmptyState message="No consumption data available" />
                        )}
                      </CardContent>
                    </Card>

                    {/* Consumption by Category (Donut with % labels) */}
                    <Card className="transition-all hover:shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Consumption by Category</CardTitle>
                        <CardDescription>Cost distribution by ingredient category</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {consumptionData.categoryBreakdown.length > 0 ? (
                          <ChartContainer
                            config={consumptionCategoryConfig}
                            className="mx-auto aspect-square max-h-[320px]"
                          >
                            <PieChart>
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    formatter={(value, name) => (
                                      <span>
                                        {name}: <span className="font-semibold tabular-nums">{fmt.format(Number(value))}</span>
                                      </span>
                                    )}
                                  />
                                }
                              />
                              <Pie
                                data={consumptionData.categoryBreakdown.map((c) => ({
                                  name: c.category,
                                  value: c.totalCost,
                                }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={95}
                                paddingAngle={2}
                                dataKey="value"
                                nameKey="name"
                                labelLine={false}
                                label={renderPiePercentLabel}
                              >
                                {consumptionData.categoryBreakdown.map((entry) => (
                                  <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                                ))}
                              </Pie>
                              <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value) => (
                                  <span className="text-xs">{value}</span>
                                )}
                              />
                            </PieChart>
                          </ChartContainer>
                        ) : (
                          <EmptyState message="No category data available" />
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Consumption Table */}
                  <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Ingredient Consumption Details</CardTitle>
                      <CardDescription>Detailed breakdown of consumed and wasted ingredients</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {consumptionData.usageByIngredient.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ingredient</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Qty Consumed</TableHead>
                                <TableHead className="text-right">Unit</TableHead>
                                <TableHead className="text-right">Total Cost</TableHead>
                                <TableHead className="text-right">Wastage Qty</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {consumptionData.usageByIngredient.map((item) => (
                                <TableRow key={item.ingredient.id} className="hover:bg-muted/50 transition-colors">
                                  <TableCell className="font-medium">{item.ingredient.name}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                      style={{
                                        borderColor: getCategoryColor(item.ingredient.category),
                                        color: getCategoryColor(item.ingredient.category),
                                      }}
                                    >
                                      {item.ingredient.category}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {fmtNum.format(item.consumptionQty)}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {item.ingredient.unit}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {fmt.format(item.totalCost)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {item.wastageQty > 0 ? (
                                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                                        {fmtNum.format(item.wastageQty)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">0</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <EmptyState message="No consumption data available" />
                      )}
                    </CardContent>
                  </Card>

                  {/* Daily Consumption Trend (with chart-type toggle) */}
                  {consumptionData.dailyTrend.length > 0 && (
                    <Card className="transition-all hover:shadow-md">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">Daily Consumption Trend</CardTitle>
                            <CardDescription>Consumption vs wastage over time</CardDescription>
                          </div>
                          <ChartTypeToggle value={trendChartType} onChange={setTrendChartType} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={consumptionTrendConfig}
                          className="aspect-[2/1] w-full"
                        >
                          {trendChartType === 'line' ? (
                            <LineChart
                              data={consumptionData.dailyTrend.map((d) => ({
                                date: d.date,
                                consumption: d.consumption,
                                wastage: d.wastage,
                              }))}
                              margin={{ top: 10, right: 12, bottom: 5, left: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={formatShortDate}
                                tick={{ fontSize: 11 }}
                                tickMargin={8}
                                interval="preserveStartEnd"
                                angle={-15}
                                textAnchor="end"
                                height={50}
                                className="text-muted-foreground"
                              />
                              <YAxis
                                tickFormatter={(v) => `₹${fmtNum.format(v / 1000)}k`}
                                tick={{ fontSize: 11 }}
                                className="text-muted-foreground"
                              />
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    labelFormatter={(label) => formatDate(label as string)}
                                    formatter={(value) => (
                                      <span className="tabular-nums">{fmt.format(Number(value))}</span>
                                    )}
                                  />
                                }
                              />
                              <Line
                                type="monotone"
                                dataKey="consumption"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#f59e0b' }}
                                activeDot={{ r: 5 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="wastage"
                                stroke="#f43f5e"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#f43f5e' }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          ) : (
                            <BarChart
                              data={consumptionData.dailyTrend.map((d) => ({
                                date: d.date,
                                consumption: d.consumption,
                                wastage: d.wastage,
                              }))}
                              margin={{ top: 10, right: 12, bottom: 5, left: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={formatShortDate}
                                tick={{ fontSize: 11 }}
                                tickMargin={8}
                                interval="preserveStartEnd"
                                angle={-15}
                                textAnchor="end"
                                height={50}
                                className="text-muted-foreground"
                              />
                              <YAxis
                                tickFormatter={(v) => `₹${fmtNum.format(v / 1000)}k`}
                                tick={{ fontSize: 11 }}
                                className="text-muted-foreground"
                              />
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    labelFormatter={(label) => formatDate(label as string)}
                                    formatter={(value) => (
                                      <span className="tabular-nums">{fmt.format(Number(value))}</span>
                                    )}
                                  />
                                }
                              />
                              <Bar dataKey="consumption" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="wastage" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          )}
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
                    No consumption data available
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ─── Variance Report Tab ──────────────────────────────────────── */}
            <TabsContent value="variance" className="space-y-6 mt-4">
              {varianceLoading ? (
                <VarianceReportSkeleton />
              ) : varianceError ? (
                <ErrorState message={varianceError} onRetry={fetchVarianceReport} />
              ) : varianceData ? (
                <>
                  <ReportSummaryHeader
                    title="Variance Report"
                    metric={fmt.format(varianceData.summary.totalVarianceCost)}
                    metricLabel="Total Variance Cost"
                    periodStart={varianceData.period.start}
                    periodEnd={varianceData.period.end}
                    onExport={exportVarianceCSV}
                    accent="rose"
                  />

                  {/* Explanation Banner */}
                  <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">
                            Understanding Variance Report
                          </p>
                          <p className="text-amber-700 dark:text-amber-400">
                            <strong>Theoretical consumption</strong> is calculated from recipe quantities × meals served.{' '}
                            <strong>Actual consumption</strong> is recorded from stock movements. The difference (variance)
                            helps identify potential waste, over-portioning, or theft. A positive variance means more was
                            consumed than expected.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                      title="Total Variance"
                      value={fmt.format(varianceData.summary.totalVarianceCost)}
                      icon={<Scale className="h-5 w-5" />}
                      iconBg="bg-amber-100 dark:bg-amber-900/30"
                      iconColor="text-amber-600 dark:text-amber-400"
                      subtitle={`${fmtPct(varianceData.summary.variancePercentage)} of theoretical`}
                      trend={varianceData.summary.totalVarianceCost > 0 ? 'up' : 'down'}
                      previousValue={
                        compareMode && prevVarianceData
                          ? fmt.format(prevVarianceData.summary.totalVarianceCost)
                          : undefined
                      }
                      goodWhenDown
                    />
                    <SummaryCard
                      title="Normal"
                      value={String(
                        varianceData.varianceByIngredient.filter((i) => i.status === 'normal').length
                      )}
                      icon={<CheckCircle2 className="h-5 w-5" />}
                      iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                      iconColor="text-emerald-600 dark:text-emerald-400"
                      subtitle="≤5% variance"
                    />
                    <SummaryCard
                      title="Warning"
                      value={String(varianceData.summary.warningCount)}
                      icon={<AlertCircle className="h-5 w-5" />}
                      iconBg="bg-amber-100 dark:bg-amber-900/30"
                      iconColor="text-amber-600 dark:text-amber-400"
                      subtitle="≤15% variance"
                    />
                    <SummaryCard
                      title="Critical"
                      value={String(varianceData.summary.criticalCount)}
                      icon={<XCircle className="h-5 w-5" />}
                      iconBg="bg-rose-100 dark:bg-rose-900/30"
                      iconColor="text-rose-600 dark:text-rose-400"
                      subtitle=">15% variance"
                    />
                  </div>

                  {/* Variance Bar Chart */}
                  <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Theoretical vs Actual Consumption</CardTitle>
                      <CardDescription>Comparison of expected vs actual ingredient usage</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {varianceData.varianceByIngredient.length > 0 ? (
                        <ChartContainer
                          config={varianceBarConfig}
                          className="aspect-[2/1] w-full"
                        >
                          <BarChart
                            data={varianceData.varianceByIngredient.slice(0, 10).map((i) => ({
                              name: i.ingredient.name.length > 15
                                ? i.ingredient.name.substring(0, 15) + '…'
                                : i.ingredient.name,
                              theoretical: i.theoreticalQty,
                              actual: i.actualQty,
                              unit: i.ingredient.unit,
                            }))}
                            margin={{ top: 10, right: 12, bottom: 5, left: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 11 }}
                              tickMargin={8}
                              interval={0}
                              angle={-20}
                              textAnchor="end"
                              height={70}
                              className="text-muted-foreground"
                            />
                            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  formatter={(value, _name, props) => {
                                    const unit = props.payload?.unit || '';
                                    return (
                                      <span className="tabular-nums">
                                        {fmtNum.format(Number(value))} {unit}
                                      </span>
                                    );
                                  }}
                                />
                              }
                            />
                            <Legend iconType="circle" />
                            <Bar dataKey="theoretical" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="actual" fill="#f97316" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                      ) : (
                        <EmptyState message="No variance data available" />
                      )}
                    </CardContent>
                  </Card>

                  {/* Variance Table */}
                  <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Variance by Ingredient</CardTitle>
                      <CardDescription>
                        Detailed comparison of theoretical vs actual consumption
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {varianceData.varianceByIngredient.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ingredient</TableHead>
                                <TableHead className="text-right">Theoretical Qty</TableHead>
                                <TableHead className="text-right">Actual Qty</TableHead>
                                <TableHead className="text-right">Variance Qty</TableHead>
                                <TableHead className="text-right">Variance %</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {varianceData.varianceByIngredient.map((item) => (
                                <TableRow key={item.ingredient.id} className="hover:bg-muted/50 transition-colors">
                                  <TableCell className="font-medium">
                                    {item.ingredient.name}
                                    <span className="text-muted-foreground text-xs ml-1">
                                      ({item.ingredient.unit})
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {fmtNum.format(item.theoreticalQty)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {fmtNum.format(item.actualQty)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    <span
                                      className={
                                        item.varianceQty > 0
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : item.varianceQty < 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : ''
                                      }
                                    >
                                      {item.varianceQty > 0 ? '+' : ''}
                                      {fmtNum.format(item.varianceQty)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    <span
                                      className={
                                        Math.abs(item.variancePercent) > 15
                                          ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                          : Math.abs(item.variancePercent) > 5
                                          ? 'text-amber-600 dark:text-amber-400 font-medium'
                                          : 'text-emerald-600 dark:text-emerald-400'
                                      }
                                    >
                                      {fmtPct(item.variancePercent)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <VarianceBadge status={item.status} />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <EmptyState message="No variance data available" />
                      )}
                    </CardContent>
                  </Card>

                  {/* Variance Cost Summary */}
                  {varianceData.varianceByIngredient.length > 0 && (
                    <Card className="transition-all hover:shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Variance Cost Impact</CardTitle>
                        <CardDescription>Financial impact of variance by ingredient</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ingredient</TableHead>
                                <TableHead className="text-right">Theoretical Cost</TableHead>
                                <TableHead className="text-right">Actual Cost</TableHead>
                                <TableHead className="text-right">Variance Cost</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {varianceData.varianceByIngredient.map((item) => (
                                <TableRow key={item.ingredient.id} className="hover:bg-muted/50 transition-colors">
                                  <TableCell className="font-medium">{item.ingredient.name}</TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {fmt.format(item.theoreticalCost)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {fmt.format(item.actualCost)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    <span
                                      className={
                                        item.varianceCost > 0
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : item.varianceCost < 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : ''
                                      }
                                    >
                                      {item.varianceCost > 0 ? '+' : ''}
                                      {fmt.format(item.varianceCost)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <VarianceBadge status={item.status} />
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="font-bold bg-amber-50/50 dark:bg-amber-950/20">
                                <TableCell>Total</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {fmt.format(varianceData.summary.totalTheoreticalCost)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {fmt.format(varianceData.summary.totalActualCost)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  <span
                                    className={
                                      varianceData.summary.totalVarianceCost > 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    }
                                  >
                                    {varianceData.summary.totalVarianceCost > 0 ? '+' : ''}
                                    {fmt.format(varianceData.summary.totalVarianceCost)}
                                  </span>
                                </TableCell>
                                <TableCell />
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
                    No variance data available
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SummaryCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  subtitle,
  trend,
  previousValue,
  goodWhenDown,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
  trend?: 'up' | 'down';
  previousValue?: string;
  goodWhenDown?: boolean;
}) {
  // Compute delta vs previous value
  const delta = useMemo(() => {
    if (!previousValue) return null;
    const currNum = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
    const prevNum = parseFloat(previousValue.replace(/[^0-9.-]/g, '')) || 0;
    if (prevNum === 0) return null;
    return ((currNum - prevNum) / Math.abs(prevNum)) * 100;
  }, [value, previousValue]);

  const deltaPositive = delta !== null && delta > 0;
  const deltaIsGood =
    delta !== null
      ? goodWhenDown
        ? !deltaPositive
        : deltaPositive
      : null;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
            <span className={iconColor}>{icon}</span>
          </div>
          {trend && (
            <span
              className={
                trend === 'up'
                  ? 'flex items-center text-rose-500 text-xs font-medium'
                  : 'flex items-center text-emerald-500 text-xs font-medium'
              }
            >
              {trend === 'up' ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          {previousValue && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Prev: <span className="tabular-nums">{previousValue}</span>
              {delta !== null && (
                <span
                  className={`ml-1 font-medium ${
                    deltaIsGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  ({delta >= 0 ? '+' : ''}{delta.toFixed(1)}%)
                </span>
              )}
            </p>
          )}
          {subtitle && !previousValue && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VarianceBadge({ status }: { status: 'normal' | 'warning' | 'critical' }) {
  switch (status) {
    case 'normal':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Normal
        </Badge>
      );
    case 'warning':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Warning
        </Badge>
      );
    case 'critical':
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
          <XCircle className="h-3 w-3 mr-1" />
          Critical
        </Badge>
      );
  }
}

function ChartTypeToggle({
  value,
  onChange,
}: {
  value: TrendChartType;
  onChange: (v: TrendChartType) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
      <button
        type="button"
        onClick={() => onChange('line')}
        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-all ${
          value === 'line'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Show line chart"
      >
        <LineChartIcon className="h-3.5 w-3.5" />
        Line
      </button>
      <button
        type="button"
        onClick={() => onChange('bar')}
        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-all ${
          value === 'bar'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        aria-label="Show bar chart"
      >
        <BarChartIcon className="h-3.5 w-3.5" />
        Bar
      </button>
    </div>
  );
}

function ReportSummaryHeader({
  title,
  metric,
  metricLabel,
  periodStart,
  periodEnd,
  onExport,
  accent,
}: {
  title: string;
  metric: string;
  metricLabel: string;
  periodStart: string;
  periodEnd: string;
  onExport: () => void;
  accent: 'amber' | 'orange' | 'rose';
}) {
  const accentClasses = {
    amber: 'from-amber-500 to-orange-500',
    orange: 'from-orange-500 to-rose-500',
    rose: 'from-rose-500 to-violet-500',
  }[accent];

  return (
    <Card className={`overflow-hidden border-0 bg-gradient-to-r ${accentClasses} text-white`}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-white/80">{title}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">{metric}</p>
            <p className="text-sm text-white/90 mt-1">{metricLabel}</p>
            <p className="text-xs text-white/70 mt-2 tabular-nums">
              Period: {formatDate(periodStart)} – {formatDate(periodEnd)}
            </p>
          </div>
          <Button
            onClick={onExport}
            variant="secondary"
            className="bg-white/95 text-foreground hover:bg-white gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-8">
        <XCircle className="h-10 w-10 text-destructive mb-2" />
        <p className="text-destructive font-medium">{message}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
      {message}
    </div>
  );
}

// ─── Monthly Trend Section (6-month combo chart + summary cards) ─────────────

function MonthlyTrendSection({
  data,
  loading,
  error,
  onRetry,
}: {
  data: MonthlyTrendPoint[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  // Compute summary stats — based on total monthly cost (food + operating).
  const stats = useMemo(() => {
    if (!data.length) {
      return {
        avg: 0,
        momChange: null as number | null,
        highest: null as MonthlyTrendPoint | null,
        lowest: null as MonthlyTrendPoint | null,
      };
    }
    const totals = data.map((d) => ({
      ...d,
      total: d.foodCost + d.operatingCost,
    }));
    const sum = totals.reduce((acc, d) => acc + d.total, 0);
    const avg = sum / totals.length;

    const last = totals[totals.length - 1];
    const prev = totals[totals.length - 2];
    let momChange: number | null = null;
    if (prev && prev.total > 0) {
      momChange = ((last.total - prev.total) / prev.total) * 100;
    }

    const highest = totals.reduce(
      (max, d) => (d.total > max.total ? d : max),
      totals[0]
    );
    const lowest = totals.reduce(
      (min, d) => (d.total < min.total ? d : min),
      totals[0]
    );

    return { avg, momChange, highest, lowest };
  }, [data]);

  return (
    <Card className="overflow-hidden border-amber-200/70 dark:border-amber-800/40 transition-all hover:shadow-md">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Cost Trend Analysis
              </CardTitle>
              <CardDescription>
                6-month combo of food cost (bars) and operating cost (line)
              </CardDescription>
            </div>
          </div>
          {data.length > 0 && (
            <Badge
              variant="outline"
              className="bg-white/70 dark:bg-background/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 gap-1"
            >
              <CalendarDays className="h-3 w-3" />
              {data[0].monthLabel} – {data[data.length - 1].monthLabel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-6">
        {loading ? (
          <MonthlyTrendSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : data.length === 0 ? (
          <EmptyState message="No monthly trend data available" />
        ) : (
          <>
            {/* Combo Chart — bars (food cost) + line (operating cost) */}
            <ChartContainer config={monthlyTrendConfig} className="aspect-[16/9] w-full sm:h-[340px] sm:aspect-auto">
              <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 12 }}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(v) => `₹${fmtNum.format(v / 1000)}k`}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) => `${label}`}
                      formatter={(value, name) => (
                        <span className="tabular-nums">
                          {name === 'foodCost'
                            ? 'Food Cost: '
                            : 'Operating Cost: '}
                          {fmt.format(Number(value))}
                        </span>
                      )}
                    />
                  }
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-xs">
                      {value === 'foodCost' ? 'Food Cost' : 'Operating Cost'}
                    </span>
                  )}
                />
                <Bar
                  dataKey="foodCost"
                  name="foodCost"
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
                <Line
                  type="monotone"
                  dataKey="operatingCost"
                  name="operatingCost"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6, fill: '#059669' }}
                />
              </ComposedChart>
            </ChartContainer>

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MonthlyTrendStatCard
                title="Avg Monthly Cost"
                value={fmt.format(stats.avg)}
                subtitle="Food + operating, last 6 mo"
                icon={<Wallet className="h-5 w-5" />}
                iconBg="bg-amber-100 dark:bg-amber-900/30"
                iconColor="text-amber-600 dark:text-amber-400"
              />
              <MonthlyTrendStatCard
                title="MoM Change"
                value={
                  stats.momChange === null
                    ? '—'
                    : `${stats.momChange >= 0 ? '+' : ''}${stats.momChange.toFixed(1)}%`
                }
                subtitle="Latest month vs previous"
                icon={
                  stats.momChange === null ? (
                    <Scale className="h-5 w-5" />
                  ) : stats.momChange >= 0 ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5" />
                  )
                }
                iconBg="bg-orange-100 dark:bg-orange-900/30"
                iconColor={
                  stats.momChange === null
                    ? 'text-muted-foreground'
                    : stats.momChange >= 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
                valueColor={
                  stats.momChange === null
                    ? undefined
                    : stats.momChange >= 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
              />
              <MonthlyTrendStatCard
                title="Highest Cost Month"
                value={fmt.format(stats.highest?.total ?? 0)}
                subtitle={stats.highest?.monthLabel ?? '—'}
                icon={<TrendingUp className="h-5 w-5" />}
                iconBg="bg-rose-100 dark:bg-rose-900/30"
                iconColor="text-rose-600 dark:text-rose-400"
              />
              <MonthlyTrendStatCard
                title="Lowest Cost Month"
                value={fmt.format(stats.lowest?.total ?? 0)}
                subtitle={stats.lowest?.monthLabel ?? '—'}
                icon={<TrendingDown className="h-5 w-5" />}
                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                iconColor="text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyTrendStatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  valueColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
            <span className={iconColor}>{icon}</span>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold tabular-nums ${valueColor ?? ''}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyTrendSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[340px] w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Custom recharts label that renders the percentage of each pie slice.
function renderPiePercentLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) {
  if (percent === undefined) return null;
  const RADIAN = Math.PI / 180;
  const radius = (Number(innerRadius) + Number(outerRadius)) / 2;
  const x = Number(cx) + radius * Math.cos(-midAngle! * RADIAN);
  const y = Number(cy) + radius * Math.sin(-midAngle! * RADIAN);
  // Hide label for very small slices
  if (percent < 0.04) return null;
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Loading Skeletons ───────────────────────────────────────────────────────

function CostReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-5 w-60 mb-4" />
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-5 w-60 mb-4" />
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-5 w-40 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ConsumptionReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-8 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function VarianceReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

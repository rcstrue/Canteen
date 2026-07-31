'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Download,
  Plus,
  PiggyBank,
  Target,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadCSV } from '@/lib/export-utils';
import type { ViewId } from '@/components/app-sidebar';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BudgetRow {
  id: string;
  month: string;
  foodBudget: number;
  operatingBudget: number;
  totalBudget: number;
  alertThreshold: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryRow {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  pct: number;
}

interface DailySpendRow {
  day: number;
  date: string;
  foodCost: number;
  operatingCost: number;
}

interface HistoryRow {
  month: string;
  monthFull: string;
  monthCode: string;
  budget: number;
  actual: number;
  variance: number;
  hasData?: boolean;
}

interface AnalysisResponse {
  month: string;
  monthLabel: string;
  budget: BudgetRow | null;
  actuals: {
    foodCost: number;
    expenseTotal: number;
    operatingCost: number;
    totalSpend: number;
  };
  projectedSpend: number;
  daysElapsed: number;
  daysInMonth: number;
  utilization: {
    foodPct: number;
    operatingPct: number;
    totalPct: number;
    projectedPct: number;
  };
  categoryBreakdown: CategoryRow[];
  dailySpend: DailySpendRow[];
  history: HistoryRow[];
}

interface BudgetViewProps {
  onNavigate?: (view: ViewId) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrFmt2 = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numFmt = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

const dailyTrendConfig: ChartConfig = {
  foodCost: { label: 'Food Cost', color: '#f59e0b' },
  operatingCost: { label: 'Operating Cost', color: '#f97316' },
};

const historyConfig: ChartConfig = {
  budget: { label: 'Budget', color: '#fbbf24' },
  actual: { label: 'Actual', color: '#ef4444' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCurrentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Utilization color band — emerald / amber / orange / red. */
function getUtilBand(pct: number): {
  color: string;
  bg: string;
  text: string;
  ring: string;
  label: string;
} {
  if (pct > 100) {
    return {
      color: '#ef4444',
      bg: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      ring: 'ring-red-200 dark:ring-red-900/40',
      label: 'Over Budget',
    };
  }
  if (pct >= 80) {
    return {
      color: '#f97316',
      bg: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
      ring: 'ring-orange-200 dark:ring-orange-900/40',
      label: 'Critical',
    };
  }
  if (pct >= 60) {
    return {
      color: '#f59e0b',
      bg: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      ring: 'ring-amber-200 dark:ring-amber-900/40',
      label: 'Caution',
    };
  }
  return {
    color: '#10b981',
    bg: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-200 dark:ring-emerald-900/40',
    label: 'On Track',
  };
}

function formatINR(amount: number, withDecimals = false): string {
  return withDecimals ? inrFmt2.format(amount) : inrFmt.format(amount);
}

function formatINRShort(amount: number): string {
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return `₹${amount.toFixed(0)}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BudgetView({ onNavigate }: BudgetViewProps) {
  const [month, setMonth] = useState<string>(getCurrentMonthStr());
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Set Budget dialog
  const [setBudgetOpen, setSetBudgetOpen] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  const fetchData = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/budgets/analysis?month=${targetMonth}`);
      if (!res.ok) throw new Error('Failed to fetch budget analysis');
      const json = (await res.json()) as AnalysisResponse;
      setData(json);
    } catch {
      setError('Failed to load budget analysis. Please retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(month);
  }, [month, fetchData]);

  const handleMonthChange = (value: string) => {
    if (value) setMonth(value);
  };

  const handleExportCSV = () => {
    if (!data) return;
    const rows = data.categoryBreakdown.map((c) => ({
      Month: data.month,
      Category: c.category,
      Budgeted: c.budgeted.toFixed(2),
      Actual: c.actual.toFixed(2),
      Variance: c.variance.toFixed(2),
      'Utilization%': data.budget && data.budget.totalBudget > 0
        ? ((c.actual / data.budget.totalBudget) * 100).toFixed(2)
        : '0.00',
    }));
    if (rows.length === 0) {
      // Still export a single summary row so the file isn't empty
      rows.push({
        Month: data.month,
        Category: '— (no spend this month)',
        Budgeted: '0.00',
        Actual: '0.00',
        Variance: '0.00',
        'Utilization%': '0.00',
      });
    }
    downloadCSV(`budget-analysis-${data.month}.csv`, rows);
    toast.success('Budget analysis exported to CSV.');
  };

  // ─── Set Budget dialog handlers ─────────────────────────────────────────
  const openSetBudget = () => {
    setSetBudgetOpen(true);
  };

  if (loading) {
    return <BudgetSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header
          month={month}
          onMonthChange={handleMonthChange}
          onExport={handleExportCSV}
          onSetBudget={openSetBudget}
        />
        <Card className="border-red-200 dark:border-red-900/40">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-semibold">{error}</p>
              <p className="text-sm text-muted-foreground">
                The analysis endpoint could not be reached.
              </p>
            </div>
            <Button onClick={() => fetchData(month)} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Header
          month={month}
          onMonthChange={handleMonthChange}
          onExport={handleExportCSV}
          onSetBudget={openSetBudget}
        />
      </motion.div>

      {/* ─── Empty state: no budget set ─────────────────────────────────── */}
      {!data.budget && (
        <motion.div variants={itemVariants}>
          <Card className="border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/40 dark:border-amber-900/40 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-900/10">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/30">
                <PiggyBank className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  No budget set for {data.monthLabel}
                </p>
                <p className="text-sm text-muted-foreground">
                  Set a monthly budget to track spend against target, get
                  utilization alerts, and view projections.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button onClick={openSetBudget} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                  <Plus className="h-4 w-4" />
                  Set Budget for {data.monthLabel}
                </Button>
                {onNavigate && (
                  <Button
                    variant="outline"
                    onClick={() => onNavigate('purchases')}
                    className="gap-1.5"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    View Purchases
                  </Button>
                )}
              </div>
              {/* Show actual spend even without budget */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat
                  label="Food Cost (Actual)"
                  value={formatINR(data.actuals.foodCost)}
                />
                <MiniStat
                  label="Expenses"
                  value={formatINR(data.actuals.expenseTotal)}
                />
                <MiniStat
                  label="Total Spend"
                  value={formatINR(data.actuals.totalSpend)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── KPI Summary Cards (4) ──────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={itemVariants} className="h-full">
          <KpiCard
            title="Total Budget"
            value={formatINR(data.budget?.totalBudget ?? 0)}
            icon={<Wallet className="h-5 w-5" />}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
            badge={
              data.budget
                ? {
                    text: `${data.utilization.totalPct.toFixed(1)}% used`,
                    tone: getUtilBand(data.utilization.totalPct).text,
                  }
                : undefined
            }
            subtitle={
              data.budget
                ? `${formatINR(data.actuals.totalSpend)} spent so far`
                : 'No budget set'
            }
          />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <KpiCard
            title="Actual Spend"
            value={formatINR(data.actuals.totalSpend)}
            icon={<IndianRupee className="h-5 w-5" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            iconColor="text-orange-600 dark:text-orange-400"
            subtitle={`Day ${data.daysElapsed} of ${data.daysInMonth} · ${formatINR(data.actuals.foodCost)} food`}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <KpiCard
            title="Projected Spend"
            value={formatINR(data.projectedSpend)}
            icon={<TrendingUp className="h-5 w-5" />}
            iconBg={
              data.utilization.projectedPct > 100
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-emerald-100 dark:bg-emerald-900/30'
            }
            iconColor={
              data.utilization.projectedPct > 100
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }
            badge={
              data.budget
                ? {
                    text: `${data.utilization.projectedPct.toFixed(1)}% of budget`,
                    tone:
                      data.utilization.projectedPct > 100
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400',
                  }
                : undefined
            }
            subtitle={
              data.daysElapsed < data.daysInMonth
                ? `Estimated end-of-month · ${data.daysInMonth - data.daysElapsed} days left`
                : 'Final spend for the month'
            }
          />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <KpiCard
            title="Variance"
            value={formatINR(
              (data.budget?.totalBudget ?? 0) - data.actuals.totalSpend
            )}
            icon={
              (data.budget?.totalBudget ?? 0) - data.actuals.totalSpend >= 0 ? (
                <TrendingDown className="h-5 w-5" />
              ) : (
                <ArrowUpRight className="h-5 w-5" />
              )
            }
            iconBg={
              (data.budget?.totalBudget ?? 0) - data.actuals.totalSpend >= 0
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
            }
            iconColor={
              (data.budget?.totalBudget ?? 0) - data.actuals.totalSpend >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }
            badge={{
              text:
                (data.budget?.totalBudget ?? 0) - data.actuals.totalSpend >= 0
                  ? 'Under budget'
                  : 'Over budget',
              tone:
                (data.budget?.totalBudget ?? 0) - data.actuals.totalSpend >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
            }}
            subtitle={
              data.budget
                ? `Threshold alert at ${data.budget.alertThreshold}%`
                : 'Set a budget to track variance'
            }
          />
        </motion.div>
      </motion.div>

      {/* ─── Budget Utilization Progress ────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-sm transition-all hover:shadow-md border-amber-200/60 dark:border-amber-900/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Budget Utilization
                </CardTitle>
                <CardDescription>
                  Food, Operating, and Total budget vs actual for {data.monthLabel}
                </CardDescription>
              </div>
              {data.budget && (
                <Badge
                  variant="outline"
                  className={`ring-1 ${getUtilBand(data.utilization.totalPct).ring} ${getUtilBand(data.utilization.totalPct).text}`}
                >
                  {getUtilBand(data.utilization.totalPct).label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {data.budget ? (
              <>
                <UtilBar
                  label="Food Budget"
                  budget={data.budget.foodBudget}
                  actual={data.actuals.foodCost}
                  pct={data.utilization.foodPct}
                  projectedPct={undefined}
                />
                <UtilBar
                  label="Operating Budget"
                  budget={data.budget.operatingBudget}
                  actual={data.actuals.operatingCost}
                  pct={data.utilization.operatingPct}
                  projectedPct={undefined}
                />
                <UtilBar
                  label="Total Budget"
                  budget={data.budget.totalBudget}
                  actual={data.actuals.totalSpend}
                  pct={data.utilization.totalPct}
                  projectedPct={data.utilization.projectedPct}
                />
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded-sm bg-emerald-500" />
                    On Track (0–60%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded-sm bg-amber-500" />
                    Caution (60–80%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded-sm bg-orange-500" />
                    Critical (80–100%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded-sm bg-red-500" />
                    Over Budget (&gt;100%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0 w-3 border-t-2 border-dashed border-foreground/60" />
                    Projected marker
                  </span>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                No budget set for this month — set a budget to see utilization
                bars.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Daily Spend Trend + Category Breakdown (2-col) ─────────────── */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        {/* Daily Spend Trend */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="chart-card-accent h-full shadow-sm transition-all hover:shadow-md border-amber-200/60 dark:border-amber-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Daily Spend Trend
              </CardTitle>
              <CardDescription>
                Food cost (bar) vs operating cost (line) for {data.monthLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.dailySpend.length > 0 ? (
                <DailySpendChart data={data.dailySpend} />
              ) : (
                <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <Calendar className="h-8 w-8 opacity-40" />
                  <p>No spend recorded yet for {data.monthLabel}.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="h-full shadow-sm transition-all hover:shadow-md border-amber-200/60 dark:border-amber-900/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Category Breakdown
                  </CardTitle>
                  <CardDescription>
                    Top 10 categories by actual spend
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {data.categoryBreakdown.length} categories
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {data.categoryBreakdown.length > 0 ? (
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-right text-xs">Actual</TableHead>
                        <TableHead className="text-right text-xs">Budget</TableHead>
                        <TableHead className="text-right text-xs">Variance</TableHead>
                        <TableHead className="text-right text-xs">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.categoryBreakdown.slice(0, 10).map((c) => (
                        <TableRow key={c.category}>
                          <TableCell className="py-2 text-sm font-medium">
                            {c.category}
                          </TableCell>
                          <TableCell className="py-2 text-right text-sm tabular-nums">
                            {formatINR(c.actual)}
                          </TableCell>
                          <TableCell className="py-2 text-right text-sm text-muted-foreground tabular-nums">
                            {c.budgeted > 0 ? formatINR(c.budgeted) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                c.variance >= 0
                                  ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400'
                                  : 'border-red-200 text-red-700 dark:border-red-900/50 dark:text-red-400'
                              }`}
                            >
                              {c.variance >= 0 ? '+' : ''}
                              {formatINR(c.variance)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs tabular-nums text-muted-foreground">
                            {data.budget && data.budget.totalBudget > 0
                              ? ((c.actual / data.budget.totalBudget) * 100).toFixed(1)
                              : '—'}
                            %
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <Wallet className="h-8 w-8 opacity-40" />
                  <p>No category spend recorded for {data.monthLabel}.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ─── 6-Month Budget History (full-width) ────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="chart-card-accent shadow-sm transition-all hover:shadow-md border-amber-200/60 dark:border-amber-900/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PiggyBank className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  6-Month Budget History
                </CardTitle>
                <CardDescription>
                  Budget vs actual across the last 6 months
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.history.some((h) => h.budget > 0 || h.actual > 0) ? (
              <>
                <ChartContainer
                  config={historyConfig}
                  className="aspect-[3/1] w-full"
                >
                  <ComposedChart
                    data={data.history}
                    margin={{ top: 10, right: 12, bottom: 5, left: 0 }}
                  >
                    <defs>
                      <pattern
                        id="budget-empty-hatch"
                        patternUnits="userSpaceOnUse"
                        width={6}
                        height={6}
                        patternTransform="rotate(45)"
                      >
                        <rect width={6} height={6} fill="oklch(0.85 0.05 70 / 0.15)" />
                        <line x1="0" y1="0" x2="0" y2={6} stroke="oklch(0.65 0.15 60)" strokeWidth={2} strokeOpacity={0.3} />
                      </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickMargin={8}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatINRShort(Number(v))}
                      width={70}
                      className="text-muted-foreground"
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name, item) => {
                            const p = (item as { payload?: HistoryRow })?.payload;
                            if (p && !p.hasData) {
                              return (
                                <span className="italic text-muted-foreground">
                                  No data recorded this month
                                </span>
                              );
                            }
                            return (
                              <span>
                                {name}:{' '}
                                <span className="font-semibold tabular-nums">
                                  {formatINR(Number(value))}
                                </span>
                              </span>
                            );
                          }}
                          labelFormatter={(_, payload) => {
                            const p = payload?.[0]?.payload as
                              | HistoryRow
                              | undefined;
                            return p?.monthFull ?? '';
                          }}
                        />
                      }
                    />
                    <Legend
                      verticalAlign="top"
                      height={28}
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-xs">{value}</span>
                      )}
                    />
                    <Bar
                      dataKey="budget"
                      fill="var(--color-budget)"
                      fillOpacity={0.35}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    >
                      {data.history.map((entry) => (
                        <Cell
                          key={entry.monthCode}
                          fill={entry.hasData === false ? 'url(#budget-empty-hatch)' : 'var(--color-budget)'}
                          fillOpacity={entry.hasData === false ? 1 : 0.35}
                        />
                      ))}
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="var(--color-actual)"
                      strokeWidth={3}
                      dot={{ r: 5, fill: 'var(--color-actual)', strokeWidth: 2, stroke: 'var(--background)' }}
                      activeDot={{ r: 7, strokeWidth: 2 }}
                      connectNulls
                    />
                  </ComposedChart>
                </ChartContainer>
                {/* No-data badges for empty months */}
                {data.history.some((h) => !h.hasData) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">No data recorded:</span>
                    {data.history
                      .filter((h) => !h.hasData)
                      .map((h) => (
                        <Badge
                          key={h.monthCode}
                          variant="outline"
                          className="bg-muted/40 text-muted-foreground gap-1 font-normal"
                        >
                          <Calendar className="h-3 w-3" />
                          {h.monthFull}
                        </Badge>
                      ))}
                  </div>
                )}
                {/* History table */}
                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Month</TableHead>
                        <TableHead className="text-right text-xs">Budget</TableHead>
                        <TableHead className="text-right text-xs">Actual</TableHead>
                        <TableHead className="text-right text-xs">Variance</TableHead>
                        <TableHead className="text-right text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.history.map((h) => (
                        <TableRow key={h.monthCode} className={h.hasData === false ? 'opacity-60' : ''}>
                          <TableCell className="py-2 text-sm font-medium">
                            {h.monthFull}
                          </TableCell>
                          <TableCell className="py-2 text-right text-sm tabular-nums">
                            {h.budget > 0 ? formatINR(h.budget) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right text-sm tabular-nums">
                            {h.actual > 0 ? formatINR(h.actual) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right text-sm tabular-nums">
                            {h.hasData === false ? (
                              <span className="text-muted-foreground/50">—</span>
                            ) : (
                              <span
                                className={
                                  h.variance >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }
                              >
                                {h.variance >= 0 ? '+' : ''}
                                {formatINR(h.variance)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            {h.budget > 0 ? (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  h.variance >= 0
                                    ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400'
                                    : 'border-red-200 text-red-700 dark:border-red-900/50 dark:text-red-400'
                                }`}
                              >
                                {h.variance >= 0 ? 'Under' : 'Over'}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <PiggyBank className="h-8 w-8 opacity-40" />
                <p>No budget history available for the last 6 months.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Set Budget Dialog ──────────────────────────────────────────── */}
      <SetBudgetDialog
        open={setBudgetOpen}
        onOpenChange={setSetBudgetOpen}
        existingBudget={data.budget}
        defaultMonth={month}
        saving={savingBudget}
        onSave={async (payload) => {
          setSavingBudget(true);
          try {
            let res: Response;
            if (data.budget) {
              // Update existing
              res = await fetch(`/api/budgets/${data.budget.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
            } else {
              // Create new (POST supports upsert by month)
              res = await fetch('/api/budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
            }
            if (!res.ok) {
              const err = await res.json().catch(() => null);
              throw new Error(err?.error || 'Failed to save budget');
            }
            toast.success(
              data.budget
                ? `Budget updated for ${payload.month}`
                : `Budget set for ${payload.month}`
            );
            setSetBudgetOpen(false);
            // Re-fetch to reflect the saved budget
            await fetchData(month);
          } catch (e) {
            toast.error('Failed to save budget', {
              description: e instanceof Error ? e.message : 'Unknown error',
            });
          } finally {
            setSavingBudget(false);
          }
        }}
      />
    </motion.div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function Header({
  month,
  onMonthChange,
  onExport,
  onSetBudget,
}: {
  month: string;
  onMonthChange: (v: string) => void;
  onExport: () => void;
  onSetBudget: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budget vs Actual</h1>
          <p className="text-sm text-muted-foreground">
            Track monthly spend against budget with projections and history
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
          <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <Input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="h-8 w-[150px] border-0 px-0 shadow-none focus-visible:ring-0"
            aria-label="Select month"
          />
        </div>
        <Button onClick={onSetBudget} size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="h-4 w-4" />
          Set Budget
        </Button>
        <Button onClick={onExport} size="sm" variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  subtitle,
  badge,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
  badge?: { text: string; tone: string };
}) {
  return (
    <Card className="h-full shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
              {value}
            </p>
            {badge && (
              <p className={`mt-1 text-xs font-semibold ${badge.tone}`}>
                {badge.text}
              </p>
            )}
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}
          >
            {icon}
          </div>
        </div>
        {subtitle && (
          <p className="mt-3 truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Mini Stat (used in empty state) ────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-4 py-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}

// ─── Utilization Bar (custom horizontal bar with gradient + projected marker) ──

function UtilBar({
  label,
  budget,
  actual,
  pct,
  projectedPct,
}: {
  label: string;
  budget: number;
  actual: number;
  pct: number;
  projectedPct?: number;
}) {
  const band = getUtilBand(pct);
  // Bar width capped at 100% visually (over-budget shown as full bar with red marker)
  const barWidth = Math.min(pct, 100);
  const projectedLeft = projectedPct !== undefined
    ? Math.min(projectedPct, 100)
    : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">
            {formatINR(actual)} / {formatINR(budget)}
          </span>
        </div>
        <span className={`text-xs font-semibold tabular-nums ${band.text}`}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="gradient-progress relative h-3 w-full overflow-hidden rounded-full">
        {/* Filled bar with gradient */}
        <div
          className="relative h-full rounded-full transition-all duration-500"
          style={{
            width: `${barWidth}%`,
            backgroundImage: `linear-gradient(to right, ${band.color}, ${band.color}cc)`,
          }}
        />
        {/* Projected marker (vertical dashed line) */}
        {projectedLeft !== null && (
          <div
            className="absolute top-0 z-10 flex h-full flex-col items-center justify-center"
            style={{ left: `${projectedLeft}%` }}
            aria-label={`Projected at ${projectedPct?.toFixed(0)}%`}
            title={`Projected: ${projectedPct?.toFixed(1)}%`}
          >
            <div className="h-full w-0.5 border-l-2 border-dashed border-foreground/70" />
          </div>
        )}
        {/* Threshold alert marker (alertThreshold on Total bar) */}
      </div>
    </div>
  );
}

// ─── Daily Spend Chart ──────────────────────────────────────────────────────

function DailySpendChart({ data }: { data: DailySpendRow[] }) {
  const avgDaily =
    data.length > 0
      ? data.reduce((s, d) => s + d.operatingCost, 0) / data.length
      : 0;

  return (
    <ChartContainer config={dailyTrendConfig} className="aspect-[2/1] w-full">
      <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11 }}
          tickMargin={8}
          tickFormatter={(v) => `D${v}`}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => formatINRShort(Number(v))}
          width={60}
          className="text-muted-foreground"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <span>
                  {name}:{' '}
                  <span className="font-semibold tabular-nums">
                    {formatINR(Number(value))}
                  </span>
                </span>
              )}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as DailySpendRow | undefined;
                return p ? `Day ${p.day} · ${p.date}` : '';
              }}
            />
          }
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          formatter={(value) => <span className="text-xs">{value}</span>}
        />
        <Bar
          dataKey="foodCost"
          fill="var(--color-foodCost)"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
        <Line
          type="monotone"
          dataKey="operatingCost"
          stroke="var(--color-operatingCost)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
        />
        <ReferenceLine
          y={avgDaily}
          stroke="#6b7280"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{
            value: `Avg ${formatINRShort(avgDaily)}`,
            position: 'right',
            fill: '#6b7280',
            fontSize: 10,
          }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

// ─── Set Budget Dialog ──────────────────────────────────────────────────────

interface SetBudgetPayload {
  month: string;
  foodBudget: number;
  operatingBudget: number;
  totalBudget: number;
  alertThreshold: number;
}

function SetBudgetDialog({
  open,
  onOpenChange,
  existingBudget,
  defaultMonth,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingBudget: BudgetRow | null;
  defaultMonth: string;
  saving: boolean;
  onSave: (payload: SetBudgetPayload) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Mount form only when open so useState initializers run fresh each
            time the dialog opens (avoids setState-in-effect lint pattern). */}
        {open ? (
          <SetBudgetForm
            key={existingBudget?.id ?? `new-${defaultMonth}`}
            existingBudget={existingBudget}
            defaultMonth={defaultMonth}
            saving={saving}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SetBudgetForm({
  existingBudget,
  defaultMonth,
  saving,
  onSave,
  onCancel,
}: {
  existingBudget: BudgetRow | null;
  defaultMonth: string;
  saving: boolean;
  onSave: (payload: SetBudgetPayload) => Promise<void>;
  onCancel: () => void;
}) {
  // Lazy initializers — runs once per mount. Parent controls remount via `key`
  // (changes whenever existingBudget changes after a save).
  const [formMonth, setFormMonth] = useState<string>(
    () => existingBudget?.month ?? defaultMonth
  );
  const [foodBudget, setFoodBudget] = useState<string>(
    () => (existingBudget ? String(existingBudget.foodBudget) : '')
  );
  const [operatingBudget, setOperatingBudget] = useState<string>(
    () => (existingBudget ? String(existingBudget.operatingBudget) : '')
  );
  const [alertThreshold, setAlertThreshold] = useState<string>(
    () => (existingBudget ? String(existingBudget.alertThreshold) : '80')
  );

  const totalBudget = useMemo(() => {
    const f = parseFloat(foodBudget) || 0;
    const o = parseFloat(operatingBudget) || 0;
    return f + o;
  }, [foodBudget, operatingBudget]);

  const canSubmit =
    !!formMonth &&
    parseFloat(foodBudget) >= 0 &&
    parseFloat(operatingBudget) >= 0 &&
    parseFloat(alertThreshold) >= 0 &&
    parseFloat(alertThreshold) <= 100 &&
    !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSave({
      month: formMonth,
      foodBudget: parseFloat(foodBudget) || 0,
      operatingBudget: parseFloat(operatingBudget) || 0,
      totalBudget,
      alertThreshold: parseFloat(alertThreshold) || 80,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          {existingBudget ? 'Update Budget' : 'Set Monthly Budget'}
        </DialogTitle>
        <DialogDescription>
          Define the food and operating budgets for the selected month. The
          total budget is auto-calculated as Food + Operating.
        </DialogDescription>
      </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget-month">Month</Label>
            <Input
              id="budget-month"
              type="month"
              value={formMonth}
              onChange={(e) => setFormMonth(e.target.value)}
              required
              disabled={!!existingBudget}
            />
            {existingBudget && (
              <p className="text-xs text-muted-foreground">
                Month cannot be changed for an existing budget.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="food-budget">Food Budget (₹)</Label>
            <Input
              id="food-budget"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={foodBudget}
              onChange={(e) => setFoodBudget(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="operating-budget">Operating Budget (₹)</Label>
            <Input
              id="operating-budget"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={operatingBudget}
              onChange={(e) => setOperatingBudget(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Includes food cost + other operating expenses (gas, electricity,
              etc.)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="total-budget">Total Budget (auto-calculated)</Label>
            <Input
              id="total-budget"
              type="text"
              readOnly
              value={formatINR(totalBudget, true)}
              className="bg-muted/50 font-semibold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alert-threshold">Alert Threshold (%)</Label>
            <Input
              id="alert-threshold"
              type="number"
              min="0"
              max="100"
              step="1"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Trigger a utilization alert once spend crosses this percentage.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : existingBudget ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Update Budget
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Set Budget
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
    </>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function BudgetSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

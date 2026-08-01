"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { Package } from "lucide-react";
import { formatCurrency, formatCurrencyShort, formatNumberDecimal } from "./helpers";
import { topIngredientsConfig, categorySpendingConfig, CATEGORY_CHART_COLORS } from "./constants";
import type { DashboardChartsData } from "./types";

// ─── Top Ingredients by Spend ───────────────────────────────────────────────

interface TopIngredientsChartProps {
  chartsData: DashboardChartsData | null;
  chartsLoading: boolean;
}

export function TopIngredientsChart({ chartsData, chartsLoading }: TopIngredientsChartProps) {
  return (
    <Card className="chart-card-accent flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 border-amber-200/60 dark:border-amber-900/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          Top 5 Ingredients by Spend
        </CardTitle>
        <CardDescription>Current month</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {chartsLoading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : !chartsData?.topIngredientsByCost?.length ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <Package className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No spend data</p>
            <p className="text-xs text-muted-foreground">Record purchases to populate this list</p>
          </div>
        ) : (
          <>
            <ChartContainer config={topIngredientsConfig} className="min-h-[220px] w-full">
              <BarChart data={chartsData.topIngredientsByCost} layout="vertical" margin={{ top: 5, right: 60, left: 0, bottom: 5 }} barCategoryGap={6}>
                <defs>
                  <linearGradient id="barSpendGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 11) + "…" : v} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{(item.payload as { name: string }).name}</span>
                    <span>Spend: {formatCurrency(Number(value))}</span>
                    <span className="text-xs text-muted-foreground">Stock: {formatNumberDecimal((item.payload as { currentStock: number }).currentStock)} {(item.payload as { unit: string }).unit}</span>
                  </div>
                )} />} />
                <Bar dataKey="totalSpend" radius={[0, 6, 6, 0]} minPointSize={4} barSize={22} fill="url(#barSpendGrad)">
                  <LabelList dataKey="totalSpend" position="right" formatter={(value: number) => formatCurrencyShort(Number(value))} style={{ fontSize: 11, fontWeight: 600, fill: "var(--foreground)" }} />
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="mt-4 space-y-2 border-t pt-3">
              {chartsData.topIngredientsByCost.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-4 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{idx + 1}.</span>
                    <span className="truncate text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-orange-600" style={{ width: `${item.percentage}%` }} />
                    </div>
                    <span className="text-xs font-semibold tabular-nums">{formatCurrencyShort(item.totalSpend)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Category Spending Donut ────────────────────────────────────────────────

interface CategorySpendingChartProps {
  chartsData: DashboardChartsData | null;
  chartsLoading: boolean;
}

export function CategorySpendingChart({ chartsData, chartsLoading }: CategorySpendingChartProps) {
  return (
    <Card className="chart-card-accent flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 border-amber-200/60 dark:border-amber-900/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          Spending by Category
        </CardTitle>
        <CardDescription>Current month</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {chartsLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : !chartsData?.categorySpending?.length ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <Package className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No category data</p>
            <p className="text-xs text-muted-foreground">Record purchases to see the breakdown</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative mx-auto shrink-0" style={{ width: 200, height: 200 }}>
              <ChartContainer config={categorySpendingConfig} className="h-[200px] w-[200px]">
                <CategoryDonutInner data={chartsData.categorySpending.slice(0, 5)} />
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</span>
                <span className="text-lg font-bold tabular-nums text-amber-950 dark:text-amber-100">
                  {formatCurrencyShort(chartsData.categorySpending.reduce((s, c) => s + c.amount, 0))}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-2 self-stretch">
              {chartsData.categorySpending.slice(0, 6).map((cat, idx) => (
                <div key={cat.category} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_CHART_COLORS[idx % CATEGORY_CHART_COLORS.length] }} />
                    <span className="truncate text-sm">{cat.category}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">{cat.percentage.toFixed(0)}%</span>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrencyShort(cat.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Internal: Category Donut with PieChart ─────────────────────────────────

import {
  PieChart,
  Pie,
  Cell,
} from "recharts";

function CategoryDonutInner({ data }: { data: Array<{ category: string; amount: number; percentage: number }> }) {
  return (
    <PieChart>
      <Pie data={data} dataKey="amount" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2}>
        {data.map((_, idx) => (
          <Cell key={`cat-${idx}`} fill={CATEGORY_CHART_COLORS[idx % CATEGORY_CHART_COLORS.length]} />
        ))}
      </Pie>
      <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{(item.payload as { category: string }).category}</span>
          <span>{formatCurrency(Number(value))}</span>
          <span className="text-xs text-muted-foreground">{((item.payload as { percentage: number }).percentage).toFixed(1)}% of total</span>
        </div>
      )} />} />
    </PieChart>
  );
}

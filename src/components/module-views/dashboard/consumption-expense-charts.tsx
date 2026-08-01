"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  CartesianGrid,
  Cell,
  LabelList,
  PieChart,
  Pie,
} from "recharts";
import { Package, Receipt } from "lucide-react";
import { formatCurrency, formatCurrencyShort, formatNumberDecimal } from "./helpers";
import { consumptionChartConfig, expenseChartConfig, CHART_COLORS, getCategoryColor } from "./constants";
import type { DashboardData } from "./types";

// ─── Consumption Chart Data Type ────────────────────────────────────────────

interface ConsumptionEntry {
  name: string;
  fullName: string;
  totalQuantity: number;
  unit: string;
  totalCost: number;
  category: string;
  color: string;
}

// ─── Top Consuming Ingredients Chart ────────────────────────────────────────

interface ConsumptionChartProps {
  data: DashboardData;
}

export function ConsumptionChart({ data }: ConsumptionChartProps) {
  const consumptionChartData: ConsumptionEntry[] = data.topConsumingIngredients
    .slice(0, 8)
    .map((item) => ({
      name: item.ingredient.name.length > 14 ? item.ingredient.name.slice(0, 13) + "…" : item.ingredient.name,
      fullName: item.ingredient.name,
      totalQuantity: Number(item.totalQuantity.toFixed(1)),
      unit: item.ingredient.unit,
      totalCost: item.totalCost,
      category: item.ingredient.category,
      color: getCategoryColor(item.ingredient.category),
    }));

  return (
    <Card className="flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          Top Consuming Ingredients
        </CardTitle>
        <CardDescription>Most used ingredients this month — colored by category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {consumptionChartData.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <Package className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No Consumption Data</p>
            <p className="text-xs text-muted-foreground">Record daily meals to see ingredient consumption</p>
          </div>
        ) : (
          <ChartContainer config={consumptionChartConfig} className="min-h-[320px] w-full">
            <BarChart data={consumptionChartData} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }} barCategoryGap={8}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => (
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{item.payload.fullName}</span>
                  <span>{formatNumberDecimal(Number(value))} {item.payload.unit}</span>
                  <span className="text-amber-600 dark:text-amber-400">Cost: {formatCurrency(item.payload.totalCost)}</span>
                  <span className="text-xs text-muted-foreground">Category: {item.payload.category}</span>
                </div>
              )} />} />
              <Bar dataKey="totalQuantity" radius={[0, 6, 6, 0]} minPointSize={4} barSize={22}>
                {consumptionChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList dataKey="totalQuantity" position="right" formatter={(value: number) => formatNumberDecimal(value)} style={{ fontSize: 11, fontWeight: 600, fill: "var(--foreground)" }} />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Expense Breakdown Chart ────────────────────────────────────────────────

interface ExpenseChartProps {
  data: DashboardData;
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  const expenseChartData = [...data.expenses.breakdown]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((item, idx) => ({
      name: item.category,
      amount: item.amount,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));

  return (
    <Card className="flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Receipt className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          Expense Breakdown
        </CardTitle>
        <CardDescription>
          Monthly expenses by category — Total: <span className="font-semibold tabular-nums">{formatCurrency(data.expenses.month)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {expenseChartData.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <Receipt className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No Expenses This Month</p>
            <p className="text-xs text-muted-foreground">Add expenses to see the breakdown</p>
          </div>
        ) : (
          <>
            <ChartContainer config={expenseChartConfig} className="mx-auto min-h-[240px] w-full max-w-[320px]">
              <PieChart>
                <Pie data={expenseChartData} dataKey="amount" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2} label={renderPiePercentLabel} labelLine={false}>
                  {expenseChartData.map((entry, idx) => (
                    <Cell key={`exp-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{item.payload.name}</span>
                    <span>{formatCurrency(Number(value))}</span>
                    <span className="text-xs text-muted-foreground">
                      {data.expenses.month > 0 ? `${((Number(value) / data.expenses.month) * 100).toFixed(1)}% of total` : ""}
                    </span>
                  </div>
                )} />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 space-y-2 border-t pt-3">
              {expenseChartData.map((item) => {
                const pct = data.expenses.month > 0 ? (item.amount / data.expenses.month) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                      <span className="text-sm font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Donut Pie Label Renderer ───────────────────────────────────────────────

function renderPiePercentLabel(props: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} style={{ pointerEvents: "none" }}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

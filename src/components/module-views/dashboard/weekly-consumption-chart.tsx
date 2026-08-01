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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Activity } from "lucide-react";
import { formatCurrency, formatCurrencyShort, formatNumber } from "./helpers";
import { weeklyConsumptionConfig } from "./constants";
import type { DashboardChartsData } from "./types";

interface WeeklyConsumptionChartProps {
  chartsData: DashboardChartsData | null;
  chartsLoading: boolean;
}

export function WeeklyConsumptionChart({ chartsData, chartsLoading }: WeeklyConsumptionChartProps) {
  return (
    <Card className="chart-card-accent shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 border-amber-200/60 dark:border-amber-900/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          Weekly Consumption Trend
        </CardTitle>
        <CardDescription>Last 7 days cost &amp; meals served</CardDescription>
      </CardHeader>
      <CardContent>
        {chartsLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : !chartsData?.weeklyConsumption?.length ? (
          <div className="flex h-[280px] flex-col items-center justify-center text-center">
            <Activity className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No weekly data yet</p>
            <p className="text-xs text-muted-foreground">Record daily meals to populate this chart</p>
          </div>
        ) : (
          <ChartContainer config={weeklyConsumptionConfig} className="h-[280px] w-full">
            <AreaChart data={chartsData.weeklyConsumption} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="costAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="mealsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
              <YAxis yAxisId="cost" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrencyShort(Number(v))} />
              <YAxis yAxisId="meals" orientation="right" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name, item) => (
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{new Date((item.payload as { date: string }).date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</span>
                  {name === "cost" ? <span>Cost: <span className="font-semibold tabular-nums">{formatCurrency(Number(value))}</span></span> : <span>Meals: <span className="font-semibold tabular-nums">{formatNumber(Number(value))}</span></span>}
                </div>
              )} />} />
              <Area yAxisId="cost" type="monotone" dataKey="cost" stroke="#f97316" strokeWidth={2.5} fill="url(#costAreaGrad)" dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#ea580c", stroke: "#fff", strokeWidth: 2 }} />
              <Area yAxisId="meals" type="monotone" dataKey="meals" stroke="#10b981" strokeWidth={2.5} fill="url(#mealsAreaGrad)" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#059669", stroke: "#fff", strokeWidth: 2 }} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

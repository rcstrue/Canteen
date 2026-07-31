"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Flame,
  CalendarDays,
  ClipboardList,
  PlusCircle,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
} from "recharts";
import { formatCurrency, formatCurrencyShort, formatDateLong } from "./helpers";
import { costTrendChartConfig } from "./constants";
import { TrendBadge } from "./metric-card";
import { DateRangeSelector } from "./date-range-selector";
import type { DashboardData, DateRangeState } from "./types";
import type { ViewId } from "@/components/app-sidebar";

interface WelcomeBannerProps {
  data: DashboardData;
  dateRange: DateRangeState;
  onDateRangeChange: (state: DateRangeState) => void;
  weekVsAvgWeek: number | null;
  onNavigate?: (view: ViewId) => void;
}

export function WelcomeBanner({
  data,
  dateRange,
  onDateRangeChange,
  weekVsAvgWeek,
  onNavigate,
}: WelcomeBannerProps) {
  return (
    <Card className="overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/40 shadow-sm transition-all hover:shadow-md dark:border-amber-900/40 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-900/20">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
              <Flame className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-amber-900/70 dark:text-amber-200/70">Welcome back, Admin</p>
              <h1 className="text-2xl font-bold tracking-tight text-amber-950 dark:text-amber-100 md:text-3xl">
                RCS Canteen Dashboard
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateLong()}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onNavigate?.("daily-entry")} className="bg-amber-600 text-white shadow-sm hover:bg-amber-700">
                <ClipboardList className="h-4 w-4" />
                Record Today&apos;s Meals
              </Button>
              <Button variant="outline" onClick={() => onNavigate?.("purchases")} className="border-amber-300 bg-white/70 text-amber-900 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/30">
                <PlusCircle className="h-4 w-4" />
                New Purchase
              </Button>
            </div>
          </div>
        </div>

        {/* 7-Day Cost Trend Sparkline */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-amber-200/60 pt-6 md:grid-cols-3 dark:border-amber-900/30">
          <div className="flex flex-col justify-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">7-Day Cost Trend</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-amber-950 dark:text-amber-100">
                {formatCurrencyShort(data.foodCost.week)}
              </span>
              <span className="text-xs text-muted-foreground">this week</span>
            </div>
            <TrendBadge pct={weekVsAvgWeek} lowerIsBetter={true} label="vs avg week" />
          </div>
          <div className="md:col-span-2">
            <ChartContainer config={costTrendChartConfig} className="h-[100px] w-full">
              <LineChart
                data={data.costTrend.map((d) => ({
                  ...d,
                  label: new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" }),
                }))}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value))}
                      labelFormatter={(label) => {
                        const entry = data.costTrend.find(
                          (d) => new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" }) === label
                        );
                        return entry
                          ? new Date(entry.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })
                          : label;
                      }}
                    />
                  }
                />
                <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

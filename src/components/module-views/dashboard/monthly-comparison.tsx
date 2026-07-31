"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  IndianRupee,
  UtensilsCrossed,
  Receipt,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar as CalendarIcon,
} from "lucide-react";
import { formatCurrency, formatNumber } from "./helpers";
import type { CostReportData } from "./types";

interface MonthlyComparisonProps {
  currentMonthReport: CostReportData | null;
  prevMonthReport: CostReportData | null;
}

export function MonthlyComparison({ currentMonthReport, prevMonthReport }: MonthlyComparisonProps) {
  return (
    <Card className="shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 border-amber-200/60 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-amber-100/20 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-amber-900/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <CalendarIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          Monthly Comparison
        </CardTitle>
        <CardDescription>Current month vs previous month key metrics</CardDescription>
      </CardHeader>
      <CardContent>
        {!currentMonthReport && !prevMonthReport ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarIcon className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Loading comparison data…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(() => {
              const cur = currentMonthReport;
              const prev = prevMonthReport;
              const metrics: Array<{ label: string; current: number; previous: number; format: (v: number) => string; lowerIsBetter: boolean; icon: React.ReactNode; iconBg: string }> = [
                { label: "Food Cost", current: cur?.foodCost?.total ?? 0, previous: prev?.foodCost?.total ?? 0, format: formatCurrency, lowerIsBetter: true, icon: <IndianRupee className="h-4 w-4 text-amber-600 dark:text-amber-400" />, iconBg: "bg-amber-100 dark:bg-amber-900/30" },
                { label: "Total Meals Served", current: cur?.meals?.total ?? 0, previous: prev?.meals?.total ?? 0, format: formatNumber, lowerIsBetter: false, icon: <UtensilsCrossed className="h-4 w-4 text-orange-600 dark:text-orange-400" />, iconBg: "bg-orange-100 dark:bg-orange-900/30" },
                { label: "Cost Per Meal", current: cur?.foodCost?.costPerMeal ?? 0, previous: prev?.foodCost?.costPerMeal ?? 0, format: formatCurrency, lowerIsBetter: true, icon: <Receipt className="h-4 w-4 text-rose-600 dark:text-rose-400" />, iconBg: "bg-rose-100 dark:bg-rose-900/30" },
                { label: "Operating Cost", current: cur?.totalOperatingCost ?? 0, previous: prev?.totalOperatingCost ?? 0, format: formatCurrency, lowerIsBetter: true, icon: <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />, iconBg: "bg-emerald-100 dark:bg-emerald-900/30" },
              ];
              return metrics.map((m) => {
                const changePct = m.previous > 0 ? ((m.current - m.previous) / m.previous) * 100 : null;
                const isUp = changePct !== null && changePct > 0;
                const isFlat = changePct !== null && Math.abs(changePct) < 0.5;
                const goodDirection = m.lowerIsBetter ? !isUp : isUp;
                const isGood = isFlat || (changePct !== null && goodDirection);
                const colorClass = changePct === null || isFlat ? "text-muted-foreground" : goodDirection ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
                const bgClass = changePct === null || isFlat ? "bg-muted/50" : goodDirection ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-rose-50 dark:bg-rose-950/20";
                return (
                  <div key={m.label} className={`rounded-xl border p-4 transition-colors ${bgClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.iconBg}`}>{m.icon}</div>
                        <span className="text-sm font-medium">{m.label}</span>
                      </div>
                      {changePct !== null && !isFlat && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${colorClass} ${isGood ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30"}`}>
                          {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {isUp ? "+" : ""}{changePct.toFixed(1)}%
                        </span>
                      )}
                      {isFlat && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground"><Minus className="h-3 w-3" />0.0%</span>}
                      {changePct === null && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div><p className="text-[11px] font-medium text-muted-foreground">Current Month</p><p className="text-lg font-bold tabular-nums">{m.format(m.current)}</p></div>
                      <div><p className="text-[11px] font-medium text-muted-foreground">Previous Month</p><p className="text-lg font-bold tabular-nums text-muted-foreground">{m.format(m.previous)}</p></div>
                    </div>
                    {m.previous > 0 && (
                      <div className="mt-3">
                        <Progress value={Math.min(100, (m.current / m.previous) * 100)} className={`h-1.5 ${isGood ? "[&>div]:bg-emerald-500" : "[&>div]:bg-rose-500"}`} />
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
  );
}

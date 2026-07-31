"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  UtensilsCrossed,
  Target,
  ArrowRight,
  Sun,
  CloudSun,
  Coffee,
  Moon,
} from "lucide-react";
import { BudgetStatus } from "@/components/budget-status";
import { formatCurrency, formatNumber, mealTypeLabel, formatNumberDecimal } from "./helpers";
import { BudgetEmptyState, MealsEmptyState } from "./empty-states";
import type { DashboardData, BudgetRecord } from "./types";
import type { ViewId } from "@/components/app-sidebar";

// ─── Meal type icon mapping ─────────────────────────────────────────────────

function mealTypeIcon(type: string): { icon: typeof Sun; bg: string; color: string } {
  const map: Record<string, { icon: typeof Sun; bg: string; color: string }> = {
    BREAKFAST: { icon: Sun, bg: "bg-amber-100 dark:bg-amber-900/30", color: "text-amber-600 dark:text-amber-400" },
    LUNCH: { icon: CloudSun, bg: "bg-orange-100 dark:bg-orange-900/30", color: "text-orange-600 dark:text-orange-400" },
    SNACKS: { icon: Coffee, bg: "bg-emerald-100 dark:bg-emerald-900/30", color: "text-emerald-600 dark:text-emerald-400" },
    TEA: { icon: Coffee, bg: "bg-emerald-100 dark:bg-emerald-900/30", color: "text-emerald-600 dark:text-emerald-400" },
    DINNER: { icon: Moon, bg: "bg-violet-100 dark:bg-violet-900/30", color: "text-violet-600 dark:text-violet-400" },
  };
  return map[type] ?? { icon: UtensilsCrossed, bg: "bg-amber-100 dark:bg-amber-900/30", color: "text-amber-600 dark:text-amber-400" };
}

// ─── Meals Budget Section ───────────────────────────────────────────────────

interface MealsBudgetSectionProps {
  data: DashboardData;
  weekMeals: number;
  currentBudget: BudgetRecord | null;
  onNavigate?: (view: ViewId) => void;
}

export function MealsBudgetSection({ data, weekMeals, currentBudget, onNavigate }: MealsBudgetSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Meals Summary */}
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
              <span className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatNumber(data.meals.today)}</span>
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 dark:from-orange-950/30 dark:to-amber-950/20">
              <span className="text-2xl font-bold tabular-nums text-orange-700 dark:text-orange-400">{formatNumber(weekMeals)}</span>
              <span className="text-xs text-muted-foreground">This Week</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/20">
              <span className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatNumber(data.meals.month)}</span>
              <span className="text-xs text-muted-foreground">This Month</span>
            </div>
          </div>
          <div className="mt-4 space-y-3 border-t pt-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Today vs Month avg / day</span>
                <span className="font-semibold tabular-nums">{data.meals.month > 0 ? `${formatNumber(Math.round(data.meals.today - data.meals.month / 30))} meals` : "—"}</span>
              </div>
              <Progress value={data.meals.month > 0 ? Math.min(100, (data.meals.today / (data.meals.month / 30)) * 100) : 0} className="h-2 [&>div]:bg-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Status */}
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
                {currentBudget ? `Monthly budget utilization — ${new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}` : "No budget set for this month"}
              </CardDescription>
            </div>
            {onNavigate && (
              <Button variant="outline" size="sm" onClick={() => onNavigate("settings")} className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30">
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentBudget ? (
            <div className="space-y-4">
              <BudgetStatus label="Food Budget" spent={data.foodCost.month} budget={currentBudget.foodBudget} alertThreshold={currentBudget.alertThreshold} compact />
              <BudgetStatus label="Operating Budget" spent={data.totalOperatingCost} budget={currentBudget.operatingBudget} alertThreshold={currentBudget.alertThreshold} compact />
              {currentBudget.totalBudget > 0 && (
                <BudgetStatus label="Total Budget" spent={data.totalOperatingCost} budget={currentBudget.totalBudget} alertThreshold={currentBudget.alertThreshold} compact />
              )}
            </div>
          ) : (
            <BudgetEmptyState onSetBudget={() => onNavigate?.("settings")} onSkip={() => onNavigate?.("dashboard")} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stock & Low Stock Alerts Section ───────────────────────────────────────

interface StockSectionProps {
  data: DashboardData;
  stockHealthPct: number;
  aboveParCount: number;
  totalIngredientCount: number;
  onNavigate?: (view: ViewId) => void;
}

export function StockSection({ data, stockHealthPct, aboveParCount, totalIngredientCount, onNavigate }: StockSectionProps) {
  return (
    <>
      {/* Stock Health Gauge */}
      <Card className="shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <UtensilsCrossed className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Stock Health
          </CardTitle>
          <CardDescription>Ingredients at or above par level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-around">
            <StockHealthGauge percent={stockHealthPct} />
            <div className="space-y-3 text-center sm:text-left">
              <div>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {aboveParCount}<span className="text-base text-muted-foreground"> / {totalIngredientCount}</span>
                </p>
                <p className="text-xs text-muted-foreground">Ingredients above par</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-950/20">
                <UtensilsCrossed className="h-4 w-4 text-rose-500" />
                <div>
                  <p className="text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">{data.lowStockAlerts.length}</p>
                  <p className="text-[11px] text-muted-foreground">Below minimum</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.("stock")} className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30">
                Manage Stock <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alerts + Today's Meals */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card className="flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <UtensilsCrossed className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              Low Stock Alerts
              {data.lowStockAlerts.length > 0 && <span className="ml-1 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">{data.lowStockAlerts.length}</span>}
            </CardTitle>
            <CardDescription>Ingredients below minimum stock level</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {data.lowStockAlerts.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                <UtensilsCrossed className="mb-2 h-10 w-10 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All Stock Levels OK</p>
                <p className="text-xs text-muted-foreground">No ingredients are below minimum stock</p>
              </div>
            ) : (
              <>
                <div className="max-h-80 flex-1 space-y-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
                  {data.lowStockAlerts.map((item) => {
                    const stockPercent = Math.round((item.currentStock / item.minStock) * 100);
                    const isCritical = item.currentStock === 0;
                    const isWarning = stockPercent < 50;
                    return (
                      <div key={item.id} className="rounded-lg border p-3 transition-colors hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isCritical ? "bg-rose-100 dark:bg-rose-900/30" : isWarning ? "bg-orange-100 dark:bg-orange-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                            <UtensilsCrossed className={`h-4 w-4 ${isCritical ? "text-rose-600 dark:text-rose-400" : isWarning ? "text-orange-600 dark:text-orange-400" : "text-amber-600 dark:text-amber-400"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium">{item.name}</p>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${isCritical ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" : isWarning ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                                {formatNumberDecimal(item.currentStock)} / {formatNumberDecimal(item.minStock)} {item.unit}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Progress value={Math.min(stockPercent, 100)} className={`h-1.5 flex-1 ${isCritical ? "[&>div]:bg-rose-500" : isWarning ? "[&>div]:bg-orange-500" : "[&>div]:bg-amber-500"}`} />
                              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{stockPercent}%</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Category: {item.category}</span>
                              <span>Par level: {formatNumberDecimal(item.minStock)} {item.unit}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 border-t pt-3">
                  <Button variant="ghost" size="sm" onClick={() => onNavigate?.("stock")} className="w-full text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30">
                    View All Stock <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Today's Meals Served */}
        <Card className="flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <UtensilsCrossed className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              Today&apos;s Meals Served
            </CardTitle>
            <CardDescription>Meal breakdown for today&apos;s service</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {data.todayMeals.length === 0 ? (
              <MealsEmptyState onRecord={() => onNavigate?.("daily-entry")} />
            ) : (
              <div className="max-h-80 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b transition-colors">
                      <th className="h-10 px-2 text-left font-medium text-muted-foreground">Meal Type</th>
                      <th className="h-10 px-2 text-left font-medium text-muted-foreground">Recipe</th>
                      <th className="h-10 px-2 text-right font-medium text-muted-foreground">Meals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.todayMeals.map((meal) => {
                      const meta = mealTypeIcon(meal.mealType);
                      const MealIcon = meta.icon;
                      return (
                        <tr key={meal.id} className="border-b transition-colors hover:bg-muted/30">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className={`flex h-7 w-7 items-center justify-center rounded-full ${meta.bg}`}>
                                <MealIcon className={`h-3.5 w-3.5 ${meta.color}`} />
                              </div>
                              <span className="text-sm font-medium">{mealTypeLabel(meal.mealType)}</span>
                            </div>
                          </td>
                          <td className="p-2 font-medium">{meal.recipe.name}</td>
                          <td className="p-2 text-right font-semibold tabular-nums">{formatNumber(meal.mealsServed)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-amber-200/60 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20">
                      <td colSpan={2} className="p-2 font-bold text-amber-900 dark:text-amber-100">Total Meals</td>
                      <td className="p-2 text-right font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatNumber(data.meals.today)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Stock Health Gauge (simpler SVG) ───────────────────────────────────────

function StockHealthGauge({ percent }: { percent: number }) {
  const size = 168;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference - (clamped / 100) * circumference;
  const color = clamped >= 80 ? "#10b981" : clamped >= 60 ? "#f59e0b" : "#f43f5e";

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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>{Math.round(clamped)}%</span>
        <span className="mt-0.5 text-xs font-medium text-muted-foreground">Above Par</span>
      </div>
    </div>
  );
}

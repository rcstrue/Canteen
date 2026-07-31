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
  IndianRupee,
  ShoppingCart,
  UtensilsCrossed,
  Trash2,
  Users,
  BarChart3,
  Utensils,
  HeartPulse,
} from "lucide-react";
import { formatCurrency, formatNumber } from "./helpers";
import type { QuickStats } from "./types";

// ─── Quick Stats Sidebar ───────────────────────────────────────────────────

interface QuickStatsSidebarProps {
  stats: QuickStats | null;
  loading: boolean;
}

export function QuickStatsSidebar({ stats, loading }: QuickStatsSidebarProps) {
  const items: Array<{
    label: string;
    value: string;
    icon: typeof IndianRupee;
    iconBg: string;
    iconColor: string;
  }> = stats
    ? [
        {
          label: "Today's Purchases",
          value: formatCurrency(stats.todayPurchasesTotal),
          icon: ShoppingCart,
          iconBg: "bg-amber-100 dark:bg-amber-900/30",
          iconColor: "text-amber-600 dark:text-amber-400",
        },
        {
          label: "This Week's Meals",
          value: formatNumber(stats.weekMealsCount),
          icon: UtensilsCrossed,
          iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
          iconColor: "text-emerald-600 dark:text-emerald-400",
        },
        {
          label: "This Month's Wastage",
          value: formatCurrency(stats.monthWastageValue),
          icon: Trash2,
          iconBg: "bg-rose-100 dark:bg-rose-900/30",
          iconColor: "text-rose-600 dark:text-rose-400",
        },
        {
          label: "Active Suppliers",
          value: formatNumber(stats.activeSuppliersCount),
          icon: Users,
          iconBg: "bg-orange-100 dark:bg-orange-900/30",
          iconColor: "text-orange-600 dark:text-orange-400",
        },
      ]
    : [];

  return (
    <Card className="flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          Quick Stats
        </CardTitle>
        <CardDescription>Snapshot of key operational metrics</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {loading || !stats ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <div
                  key={it.label}
                  className="flex items-center gap-3 rounded-xl border border-amber-200/40 bg-gradient-to-br from-amber-50/40 to-orange-50/30 p-3 transition-colors hover:border-amber-300/60 hover:bg-amber-50/60 dark:border-amber-900/30 dark:from-amber-950/20 dark:to-orange-950/10 dark:hover:bg-amber-950/30"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${it.iconBg}`}
                  >
                    <Icon className={`h-4 w-4 ${it.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {it.label}
                    </p>
                    <p className="text-base font-bold tabular-nums text-amber-950 dark:text-amber-100">
                      {it.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Quick Stats Summary Bar ───────────────────────────────────────────────

interface QuickStatsSummaryBarProps {
  totalEmployees: number;
  mealsServedToday: number;
  avgCostPerMeal: number;
  stockHealthPct: number;
  loading: boolean;
}

export function QuickStatsSummaryBar({
  totalEmployees,
  mealsServedToday,
  avgCostPerMeal,
  stockHealthPct,
  loading,
}: QuickStatsSummaryBarProps) {
  const stats = [
    {
      label: "Total Employees",
      value: formatNumber(totalEmployees),
      icon: Users,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Meals Served Today",
      value: formatNumber(mealsServedToday),
      icon: Utensils,
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Avg Cost / Meal",
      value: formatCurrency(avgCostPerMeal),
      icon: IndianRupee,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Stock Health",
      value: `${Math.round(stockHealthPct)}% OK`,
      icon: HeartPulse,
      iconBg: stockHealthPct >= 80
        ? "bg-emerald-100 dark:bg-emerald-900/30"
        : stockHealthPct >= 60
          ? "bg-amber-100 dark:bg-amber-900/30"
          : "bg-rose-100 dark:bg-rose-900/30",
      iconColor: stockHealthPct >= 80
        ? "text-emerald-600 dark:text-emerald-400"
        : stockHealthPct >= 60
          ? "text-amber-600 dark:text-amber-400"
          : "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-amber-200/50 bg-white/80 p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-amber-900/30 dark:bg-amber-950/20"
          >
            {loading ? (
              <>
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </>
            ) : (
              <>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground truncate">
                    {stat.label}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-amber-950 dark:text-amber-100">
                    {stat.value}
                  </p>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

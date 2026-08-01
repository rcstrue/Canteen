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
  ShoppingCart,
  UtensilsCrossed,
  Trash2,
  Receipt,
  Package,
  Activity,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "./helpers";
import type { ActivityItem, ActivityType } from "./types";

// ─── Activity Meta ──────────────────────────────────────────────────────────

const ACTIVITY_META: Record<
  ActivityType,
  { icon: typeof ShoppingCart; color: string; ring: string; label: string }
> = {
  PURCHASE: {
    icon: ShoppingCart,
    color: "text-amber-600 dark:text-amber-400",
    ring: "bg-amber-100 dark:bg-amber-900/30",
    label: "Purchase",
  },
  MEAL: {
    icon: UtensilsCrossed,
    color: "text-emerald-600 dark:text-emerald-400",
    ring: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "Meal",
  },
  WASTAGE: {
    icon: Trash2,
    color: "text-rose-600 dark:text-rose-400",
    ring: "bg-rose-100 dark:bg-rose-900/30",
    label: "Wastage",
  },
  EXPENSE: {
    icon: Receipt,
    color: "text-teal-600 dark:text-teal-400",
    ring: "bg-teal-100 dark:bg-teal-900/30",
    label: "Expense",
  },
  CONSUMPTION: {
    icon: Package,
    color: "text-orange-600 dark:text-orange-400",
    ring: "bg-orange-100 dark:bg-orange-900/30",
    label: "Consumption",
  },
  // Lowercase aliases for compatibility with consolidated API
  purchase: {
    icon: ShoppingCart,
    color: "text-amber-600 dark:text-amber-400",
    ring: "bg-amber-100 dark:bg-amber-900/30",
    label: "Purchase",
  },
  meal: {
    icon: UtensilsCrossed,
    color: "text-emerald-600 dark:text-emerald-400",
    ring: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "Meal",
  },
  wastage: {
    icon: Trash2,
    color: "text-rose-600 dark:text-rose-400",
    ring: "bg-rose-100 dark:bg-rose-900/30",
    label: "Wastage",
  },
  expense: {
    icon: Receipt,
    color: "text-teal-600 dark:text-teal-400",
    ring: "bg-teal-100 dark:bg-teal-900/30",
    label: "Expense",
  },
  adjustment: {
    icon: Package,
    color: "text-stone-600 dark:text-stone-400",
    ring: "bg-stone-200 dark:bg-stone-800/50",
    label: "Adjustment",
  },
  consumption: {
    icon: Package,
    color: "text-orange-600 dark:text-orange-400",
    ring: "bg-orange-100 dark:bg-orange-900/30",
    label: "Consumption",
  },
  ADJUSTMENT: {
    icon: Package,
    color: "text-stone-600 dark:text-stone-400",
    ring: "bg-stone-200 dark:bg-stone-800/50",
    label: "Adjustment",
  },
};

// ─── Activity Timeline ─────────────────────────────────────────────────────

interface ActivityTimelineProps {
  activities: ActivityItem[];
  loading: boolean;
}

export function ActivityTimeline({ activities, loading }: ActivityTimelineProps) {
  return (
    <Card className="flex h-full flex-col shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest purchases, meals, expenses & stock adjustments
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Activity className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              No Activity Yet
            </p>
            <p className="text-xs text-muted-foreground">
              Recent purchases, meals & expenses will appear here
            </p>
          </div>
        ) : (
          <ol className="relative max-h-[460px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
            {activities.map((act, idx) => {
              const meta = ACTIVITY_META[act.type] ?? ACTIVITY_META.ADJUSTMENT;
              const Icon = meta.icon;
              const isLast = idx === activities.length - 1;
              const ts = act.timestamp || act.createdAt || new Date().toISOString();
              const relativeTime = (() => {
                try {
                  return formatDistanceToNow(new Date(ts), {
                    addSuffix: true,
                  });
                } catch {
                  return "";
                }
              })();
              const absoluteTime = (() => {
                try {
                  const d = new Date(ts);
                  return d.toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });
                } catch {
                  return "";
                }
              })();
              const displayTitle = act.title || act.description || "Activity";

              return (
                <li key={act.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {/* Timeline rail (vertical line) */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[18px] top-9 h-[calc(100%-1.5rem)] w-px bg-border"
                    />
                  )}
                  {/* Icon circle */}
                  <div
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.ring}`}
                  >
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
                      <p className="text-sm font-medium leading-snug">
                        {displayTitle}
                      </p>
                      {act.description && act.title && (
                        <p className="text-xs text-muted-foreground truncate">
                          {act.description}
                        </p>
                      )}
                      {act.amount !== null && act.amount > 0 && (
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                          {formatCurrency(act.amount)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1" title={absoluteTime}>
                        <Clock className="h-3 w-3" />
                        {relativeTime}
                      </span>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="text-muted-foreground/80">{absoluteTime}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="rounded-full bg-muted/60 px-1.5 py-0.5 font-medium text-muted-foreground">
                        {meta.label}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

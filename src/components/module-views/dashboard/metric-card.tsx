"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── Trend Badge ────────────────────────────────────────────────────────────

interface TrendBadgeProps {
  /** Percentage change (positive = increase, negative = decrease) */
  pct: number | null;
  /** For cost metrics, "lower is better" → up arrow = red */
  lowerIsBetter?: boolean;
  /** Comparison label e.g. "vs avg day" */
  label: string;
}

export function TrendBadge({ pct, lowerIsBetter = true, label }: TrendBadgeProps) {
  if (pct === null || !isFinite(pct)) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
    );
  }

  const isUp = pct > 0;
  const isFlat = Math.abs(pct) < 0.5;
  const goodDirection = lowerIsBetter ? !isUp : isUp;
  const colorClass = isFlat
    ? "text-muted-foreground"
    : goodDirection
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={`h-4 w-4 ${colorClass}`} />
      <span className={`font-bold tabular-nums ${colorClass}`}>
        {isFlat ? "0%" : `${isUp ? "+" : ""}${pct.toFixed(1)}%`}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  /** Optional override — when provided, replaces the string `value`. */
  valueNode?: React.ReactNode;
  /** Optional sparkline node rendered between the value and trend. */
  sparkline?: React.ReactNode;
  icon: React.ReactNode;
  iconBgClass: string;
  trend?: React.ReactNode;
  subValue?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  valueNode,
  sparkline,
  icon,
  iconBgClass,
  trend,
  subValue,
}: MetricCardProps) {
  return (
    <Card className="metric-tile group relative h-full overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100/60 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:-translate-y-0.5 dark:border-amber-900/40 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-900/10">
      {/* Decorative gradient orb in the background */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-300/20 blur-2xl dark:bg-amber-500/10" />
      {/* Gradient border effect on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))", padding: "1.5px" }}>
        <div className="h-full w-full rounded-xl bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100/60 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-900/10" />
      </div>
      <CardHeader className="relative flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium text-amber-900/80 dark:text-amber-200/80">
          {title}
        </CardDescription>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${iconBgClass}`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-2">
        <div className="text-2xl font-bold tracking-tight tabular-nums text-amber-950 dark:text-amber-100">
          {valueNode ?? value}
        </div>
        {sparkline && <div className="h-6 w-full">{sparkline}</div>}
        {subValue}
        {trend && (
          <div className="mt-0.5 inline-flex items-center gap-1.5 self-start rounded-full bg-amber-100/60 px-2.5 py-1 dark:bg-amber-900/30">
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Stock Health Gauge ─────────────────────────────────────────────────────

export function CircularGauge({ percent }: { percent: number }) {
  const size = 168;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference - (clamped / 100) * circumference;

  // Color shifts: red (low) → amber (mid) → emerald (high)
  const color =
    clamped >= 80 ? "#10b981" : clamped >= 60 ? "#f59e0b" : "#f43f5e";

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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {Math.round(clamped)}%
        </span>
        <span className="mt-0.5 text-xs font-medium text-muted-foreground">
          Above Par
        </span>
      </div>
    </div>
  );
}

// ─── Stock Health Progress Bar (simpler alternative to CircularGauge) ───────

export function StockHealthBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const barColor =
    clamped >= 80
      ? "[&>div]:bg-emerald-500"
      : clamped >= 60
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-rose-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Stock Health</span>
        <span className="text-sm font-bold tabular-nums">{Math.round(clamped)}%</span>
      </div>
      <Progress value={clamped} className={`h-2.5 ${barColor}`} />
    </div>
  );
}

// ─── Loading Skeletons ──────────────────────────────────────────────────────

export function MetricCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-7 w-32" />
        <Skeleton className="mb-2 h-3 w-20" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

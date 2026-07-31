"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Bell } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BudgetStatusProps {
  /** Label for this budget category (e.g. "Food Budget") */
  label: string;
  /** Amount spent so far */
  spent: number;
  /** Total budget amount */
  budget: number;
  /** Alert threshold percentage (0-100). Default 80 */
  alertThreshold?: number;
  /** Optional compact mode for dashboard cards */
  compact?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(value: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
  return `₹${formatted}`;
}

function formatINRShort(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return formatINR(value);
}

function getBudgetColor(pct: number): string {
  if (pct > 100) return "#ef4444"; // red-500
  if (pct >= 80) return "#f59e0b"; // amber-500
  return "#10b981"; // emerald-500
}

function getProgressClass(pct: number): string {
  if (pct > 100) return "[&>div]:bg-red-500";
  if (pct >= 80) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-emerald-500";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BudgetStatus({
  label,
  spent,
  budget,
  alertThreshold = 80,
  compact = false,
  onClick,
}: BudgetStatusProps) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const remaining = budget - spent;
  const isOverBudget = pct > 100;
  const isAlertTriggered = pct >= alertThreshold && !isOverBudget;
  const color = getBudgetColor(pct);

  if (compact) {
    // Compact mode for dashboard
    return (
      <div
        className={`space-y-2 ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="text-xs font-bold tabular-nums" style={{ color }}>
            {Math.round(pct)}%
          </span>
        </div>
        <Progress
          value={Math.min(pct, 100)}
          className={`h-2 ${getProgressClass(pct)}`}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="tabular-nums">{formatINRShort(spent)} spent</span>
          <span className="tabular-nums">
            {remaining >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">{formatINRShort(remaining)} left</span>
            ) : (
              <span className="text-red-600 dark:text-red-400">{formatINRShort(Math.abs(remaining))} over</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  // Full mode for settings view
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <span className="text-sm font-bold tabular-nums">{Math.round(pct)}%</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatINRShort(spent)} / {formatINRShort(budget)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOverBudget ? (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Over Budget!
            </Badge>
          ) : isAlertTriggered ? (
            <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
              <Bell className="h-3 w-3 mr-1" />
              Alert
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              On Track
            </Badge>
          )}
        </div>
      </div>
      <Progress
        value={Math.min(pct, 100)}
        className={`h-3 ${getProgressClass(pct)}`}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">
          <span style={{ color }}>{Math.round(pct)}%</span> used — {formatINR(spent)}
        </span>
        <span className="tabular-nums">
          {remaining >= 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400">{formatINR(remaining)} remaining</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">{formatINR(Math.abs(remaining))} over</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ─── Budget Gauge (Circular) ─────────────────────────────────────────────────

export interface BudgetGaugeProps {
  percent: number;
  label: string;
  spent: number;
  budget: number;
}

export function BudgetGauge({ percent, label, spent, budget }: BudgetGaugeProps) {
  const size = 140;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(percent, 150));
  const dashOffset = circumference - (Math.min(clamped, 100) / 100) * circumference;
  const color = getBudgetColor(percent);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="meter"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} budget utilization`}
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
            className="text-2xl font-bold tabular-nums"
            style={{ color }}
          >
            {Math.round(percent)}%
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            Used
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatINRShort(spent)} / {formatINRShort(budget)}
        </p>
      </div>
    </div>
  );
}

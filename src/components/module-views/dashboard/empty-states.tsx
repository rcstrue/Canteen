"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Target, UtensilsCrossed, ArrowRight } from "lucide-react";

// ─── Budget Empty State ─────────────────────────────────────────────────────

export function BudgetEmptyState({
  onSetBudget,
  onSkip,
}: {
  onSetBudget: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-500/30">
          <Target className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-amber-900 dark:text-amber-200">
          No Budget Set
        </h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Set up a monthly budget in Settings to track spending and get alerts
        </p>
        <Button
          onClick={onSetBudget}
          className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/30 transition-all"
        >
          Set Budget
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
        <button
          onClick={onSkip}
          className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:text-amber-700 dark:hover:text-amber-400 hover:underline transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ─── Meals Empty State ──────────────────────────────────────────────────────

export function MealsEmptyState({ onRecord }: { onRecord: () => void }) {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-500/30">
          <UtensilsCrossed className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-amber-900 dark:text-amber-200">
          No Meals Recorded Today
        </h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          Log breakfast, lunch, dinner, and snack counts for today
        </p>
        <Button
          onClick={onRecord}
          className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/30 transition-all"
        >
          Record Meals
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Loading Skeletons ──────────────────────────────────────────────────────

export function BannerSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <Skeleton className="mb-2 h-4 w-32" />
        <Skeleton className="mb-1 h-8 w-64" />
        <Skeleton className="mb-6 h-4 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[100px] w-full md:col-span-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export function LargeCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}

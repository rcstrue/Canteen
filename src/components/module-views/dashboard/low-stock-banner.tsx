"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, X } from "lucide-react";
import type { ViewId } from "@/components/app-sidebar";
import type { DashboardData } from "./types";

// ─── Low-Stock Alert Banner ────────────────────────────────────────────────

const LOW_STOCK_BANNER_DISMISS_KEY = "rcs-dashboard-lowstock-dismissed";
const LOW_STOCK_BANNER_UPDATE_EVENT = "rcs-lowstock-update";

/** SSR-safe subscription to a session-storage dismissal flag. */
function useLowStockDismissed(): [boolean, () => void] {
  const subscribe = useCallback((callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    const handler = () => callback();
    window.addEventListener(LOW_STOCK_BANNER_UPDATE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(LOW_STOCK_BANNER_UPDATE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    try {
      return window.sessionStorage.getItem(LOW_STOCK_BANNER_DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  }, []);

  const getServerSnapshot = useCallback(() => false, []);

  const isDismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const dismiss = useCallback(() => {
    try {
      window.sessionStorage.setItem(LOW_STOCK_BANNER_DISMISS_KEY, "true");
      window.dispatchEvent(new Event(LOW_STOCK_BANNER_UPDATE_EVENT));
    } catch {
      // Ignore write failure (private mode, etc.).
    }
  }, []);

  return [isDismissed, dismiss];
}

interface LowStockBannerProps {
  lowStockItems: DashboardData["lowStockAlerts"];
  onNavigate?: (view: ViewId) => void;
}

export function LowStockAlertBanner({ lowStockItems, onNavigate }: LowStockBannerProps) {
  const [dismissed, handleDismiss] = useLowStockDismissed();

  if (dismissed || lowStockItems.length === 0) return null;

  const topItems = lowStockItems.slice(0, 5);
  const isCriticalOnly = lowStockItems.some((i) => i.currentStock === 0);

  return (
    <div
      className="overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`relative overflow-hidden rounded-xl border shadow-md ${
          isCriticalOnly
            ? "border-rose-300/70 dark:border-rose-900/50"
            : "border-amber-300/70 dark:border-amber-900/50"
        } bg-gradient-to-r from-amber-100 via-orange-100 to-rose-100 dark:from-amber-950/60 dark:via-orange-950/50 dark:to-rose-950/40`}
      >
        {/* Pulsing glow indicator */}
        <div
          aria-hidden="true"
          className={`absolute left-0 top-0 h-full w-1.5 ${
            isCriticalOnly
              ? "bg-rose-500 animate-pulse"
              : "bg-amber-500 animate-pulse"
          }`}
        />
        {/* Decorative glow on the left edge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-amber-400/30 blur-3xl dark:bg-amber-500/20"
        />
        <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: icon + headline + items as compact tags */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                isCriticalOnly
                  ? "bg-rose-500/20 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                  : "bg-amber-500/20 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-amber-950 dark:text-amber-100 sm:text-lg">
                  {lowStockItems.length} {lowStockItems.length === 1 ? "item needs" : "items need"} restocking
                </h2>
                <Badge
                  variant={isCriticalOnly ? "destructive" : "secondary"}
                  className={`shrink-0 ${
                    isCriticalOnly
                      ? ""
                      : "bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                  }`}
                >
                  {isCriticalOnly ? "Critical" : "Low Stock"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-amber-900/70 dark:text-amber-200/70">
                Stock at or below minimum par level — reorder soon to avoid shortages.
              </p>
              {/* Low stock items as compact tags */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {topItems.map((item) => {
                  const isZero = item.currentStock === 0;
                  return (
                    <span
                      key={item.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isZero
                          ? "bg-rose-200/80 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                          : "bg-white/80 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
                      }`}
                    >
                      <Package className="h-2.5 w-2.5" />
                      <span className="truncate max-w-[100px]">{item.name}</span>
                      <span className="tabular-nums opacity-80">
                        {new Intl.NumberFormat("en-IN", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 1,
                        }).format(item.currentStock)}
                        /{new Intl.NumberFormat("en-IN", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 1,
                        }).format(item.minStock)}
                      </span>
                    </span>
                  );
                })}
                {lowStockItems.length > 5 && (
                  <span className="inline-flex items-center rounded-full bg-amber-900/10 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-100/10 dark:text-amber-100">
                    +{lowStockItems.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              onClick={() => onNavigate?.("stock")}
              className="bg-amber-600 text-white shadow-sm hover:bg-amber-700"
            >
              <Package className="h-4 w-4" />
              View All Low Stock
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDismiss}
              aria-label="Dismiss low stock alert"
              className="h-9 w-9 text-amber-900/70 hover:bg-amber-200/60 hover:text-amber-900 dark:text-amber-200/70 dark:hover:bg-amber-900/40 dark:hover:text-amber-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

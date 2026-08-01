"use client";

import { useState, useEffect, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationType = "low-stock" | "budget-warning" | "data-reminder";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

interface NotificationState {
  readIds: string[];
  lastChecked: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NOTIFICATION_STORAGE_KEY = "rcs-canteen-notifications";
const BUDGET_STORAGE_KEY = "rcs-canteen-monthly-budget";

const DEFAULT_MONTHLY_BUDGET = 500000; // ₹5,00,000 default budget

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNotificationState(): NotificationState {
  if (typeof window === "undefined") return { readIds: [], lastChecked: "" };
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore
  }
  return { readIds: [], lastChecked: "" };
}

function saveNotificationState(state: NotificationState) {
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

function getMonthlyBudget(): number {
  if (typeof window === "undefined") return DEFAULT_MONTHLY_BUDGET;
  try {
    const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === "number" && parsed > 0) return parsed;
      if (typeof parsed === "object" && parsed.monthlyBudget) return parsed.monthlyBudget;
    }
  } catch {
    // Ignore
  }
  return DEFAULT_MONTHLY_BUDGET;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Notification Icon Component ─────────────────────────────────────────────

function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case "low-stock":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
      );
    case "budget-warning":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
      );
    case "data-reminder":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
      );
  }
}

function getNotificationBorderColor(type: NotificationType): string {
  switch (type) {
    case "low-stock":
      return "border-l-red-500";
    case "budget-warning":
      return "border-l-amber-500";
    case "data-reminder":
      return "border-l-blue-500";
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load read state from localStorage on mount
  useEffect(() => {
    const state = getNotificationState();
    setReadIds(new Set(state.readIds));
  }, []);

  // Fetch notifications from all three APIs
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const newNotifications: Notification[] = [];

      // 1. Low stock check
      try {
        const lowStockRes = await fetch("/api/ingredients?lowStock=true");
        if (lowStockRes.ok) {
          const lowStockItems = await lowStockRes.json();
          const lowStockCount = Array.isArray(lowStockItems) ? lowStockItems.length : 0;
          if (lowStockCount > 0) {
            newNotifications.push({
              id: "low-stock",
              type: "low-stock",
              title: "Low Stock Alert",
              description: `${lowStockCount} ingredient${lowStockCount > 1 ? "s are" : " is"} below minimum stock level`,
              time: "Just now",
              read: false,
            });
          }
        }
      } catch {
        // Ignore individual API errors
      }

      // 2. Budget warning check
      try {
        const dashboardRes = await fetch("/api/dashboard");
        if (dashboardRes.ok) {
          const dashboard = await dashboardRes.json();
          const monthlyBudget = getMonthlyBudget();
          const totalFoodCost = dashboard?.foodCost?.month ?? 0;
          const totalOperatingCost = dashboard?.totalOperatingCost ?? 0;
          const budgetUsedPercent = monthlyBudget > 0
            ? Math.round((totalOperatingCost / monthlyBudget) * 100)
            : 0;

          if (budgetUsedPercent >= 80) {
            const isCritical = budgetUsedPercent >= 95;
            newNotifications.push({
              id: "budget-warning",
              type: "budget-warning",
              title: isCritical ? "Budget Critical" : "Budget Warning",
              description: `Spending has reached ${budgetUsedPercent}% of monthly budget (${formatCurrency(totalOperatingCost)} / ${formatCurrency(monthlyBudget)})`,
              time: "Just now",
              read: false,
            });
          } else if (budgetUsedPercent >= 60) {
            newNotifications.push({
              id: "budget-info",
              type: "budget-warning",
              title: "Budget Update",
              description: `Food spending is at ${budgetUsedPercent}% of monthly budget (${formatCurrency(totalOperatingCost)} / ${formatCurrency(monthlyBudget)})`,
              time: "Just now",
              read: false,
            });
          }
        }
      } catch {
        // Ignore individual API errors
      }

      // 3. Data reminder - check if meals recorded today
      try {
        const today = new Date().toISOString().split("T")[0];
        const mealsRes = await fetch(`/api/daily-meals?date=${today}`);
        if (mealsRes.ok) {
          const mealsData = await mealsRes.json();
          const todayMeals = mealsData?.data ?? [];
          const totalMeals = mealsData?.total ?? 0;
          if (totalMeals === 0 || (Array.isArray(todayMeals) && todayMeals.length === 0)) {
            newNotifications.push({
              id: "data-reminder",
              type: "data-reminder",
              title: "Daily Reminder",
              description: "Don't forget to record today's meals and food entries",
              time: "Just now",
              read: false,
            });
          }
        }
      } catch {
        // Ignore individual API errors
      }

      setNotifications(newNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  // Mark all as read
  const handleMarkAllRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    const newReadIds = new Set([...readIds, ...allIds]);
    setReadIds(newReadIds);
    saveNotificationState({
      readIds: Array.from(newReadIds),
      lastChecked: new Date().toISOString(),
    });
  }, [notifications, readIds]);

  // When popover opens, mark all as read
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        // Small delay so user can see the items first
        setTimeout(() => {
          handleMarkAllRead();
        }, 1500);
      }
    },
    [handleMarkAllRead]
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] max-w-[calc(100vw-2rem)] p-0"
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">Notifications</h4>
                  {unreadCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleMarkAllRead}
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <Separator />

              {/* Content */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Checking for alerts...
                  </span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    No new notifications
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Everything is running smoothly
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="flex flex-col gap-1 p-2">
                    {notifications.map((notification, index) => {
                      const isRead = readIds.has(notification.id);
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                          className={`flex items-start gap-3 rounded-lg border-l-[3px] p-3 transition-colors hover:bg-muted/50 ${getNotificationBorderColor(
                            notification.type
                          )} ${isRead ? "opacity-60" : ""}`}
                        >
                          <NotificationIcon type={notification.type} />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium leading-none">
                                {notification.title}
                              </p>
                              {!isRead && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {notification.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground/70">
                              {notification.time}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Footer */}
              {notifications.length > 0 && (
                <>
                  <Separator />
                  <div className="px-4 py-2.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        handleMarkAllRead();
                        setOpen(false);
                      }}
                    >
                      Dismiss all notifications
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}

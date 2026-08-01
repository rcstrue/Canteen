"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ViewId } from "@/components/app-sidebar";
import {
  Plus,
  X,
  ShoppingCart,
  UtensilsCrossed,
  Package,
  Receipt,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  id: ViewId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon badge background + text color. */
  badgeClassName: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "purchases",
    label: "New Purchase",
    description: "Record a purchase invoice",
    icon: ShoppingCart,
    badgeClassName:
      "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30",
  },
  {
    id: "daily-entry",
    label: "Record Meals",
    description: "Log today's meal servings",
    icon: UtensilsCrossed,
    badgeClassName:
      "bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-orange-500/30",
  },
  {
    id: "stock",
    label: "Add Stock",
    description: "Update raw material inventory",
    icon: Package,
    badgeClassName:
      "bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-amber-500/30",
  },
  {
    id: "expenses",
    label: "Log Expense",
    description: "Record an operating expense",
    icon: Receipt,
    badgeClassName:
      "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-orange-500/30",
  },
];

interface FloatingActionsProps {
  onNavigate: (view: ViewId) => void;
}

/**
 * A mobile-only floating action button (FAB) that opens a quick actions menu.
 *
 * - Visible only on small screens (`sm:hidden`).
 * - Renders a fixed-position FAB at the bottom-right with an amber/orange
 *   gradient, soft shadow, and subtle hover animation.
 * - Clicking the FAB expands a small card with 4 quick actions that navigate
 *   to the relevant module view via `onNavigate`.
 * - Closes automatically when an action is selected, when the user clicks
 *   outside, or when the Escape key is pressed.
 */
export function FloatingActions({ onNavigate }: FloatingActionsProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Close on viewport resize to avoid leaving the menu open on tablet/desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 640) setOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleActionClick = (view: ViewId) => {
    onNavigate(view);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="sm:hidden fixed bottom-6 right-4 z-50 flex flex-col items-end gap-3"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Quick actions menu — appears above the FAB */}
      {open && (
        <div
          role="menu"
          aria-label="Quick actions"
          className="w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-200/70 bg-background/95 p-2 shadow-2xl shadow-amber-900/20 backdrop-blur-md animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3 duration-200"
        >
          <div className="px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Quick Actions</p>
              <p className="text-[10px] text-muted-foreground">
                Jump straight to a common task
              </p>
            </div>
            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">
              Mobile
            </span>
          </div>
          <div className="h-px bg-border/60 my-1" />
          <ul className="flex flex-col gap-1">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleActionClick(action.id)}
                    className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 focus:bg-amber-50 dark:focus:bg-amber-900/20 focus:outline-none"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md transition-transform group-hover:scale-105",
                        action.badgeClassName
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-foreground truncate">
                        {action.label}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {action.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* FAB toggle button */}
      <Button
        type="button"
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative h-14 w-14 rounded-full p-0 shadow-lg transition-all duration-200",
          "bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
          "text-white border-0 hover:scale-110 hover:shadow-xl hover:shadow-amber-500/40 active:scale-95",
          "focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        )}
      >
        {/* Pulse ring when closed to draw attention */}
        {!open && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-amber-500/40 animate-ping"
            style={{ animationDuration: "2.5s" }}
          />
        )}
        {/* Icon — rotates between Plus and X based on open state */}
        <span className="relative z-10 flex items-center justify-center">
          {open ? (
            <X className="h-6 w-6 transition-transform duration-200 rotate-0 scale-100" />
          ) : (
            <Plus
              className="h-6 w-6 transition-transform duration-200"
              style={{ transform: "rotate(0deg) scale(1)" }}
            />
          )}
        </span>
      </Button>
    </div>
  );
}

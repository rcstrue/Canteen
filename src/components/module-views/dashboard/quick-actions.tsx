"use client";

import {
  ClipboardList,
  ShoppingCart,
  Warehouse,
  Soup,
  BarChart3,
  FileText,
} from "lucide-react";
import type { ViewId } from "@/components/app-sidebar";

const QUICK_ACTIONS: Array<{
  label: string;
  sub: string;
  icon: typeof ClipboardList;
  color: string;
  nav: ViewId;
}> = [
  { label: "Record Meals", sub: "Interactive", icon: ClipboardList, color: "amber", nav: "daily-entry" },
  { label: "New Purchase", sub: "Interactive", icon: ShoppingCart, color: "orange", nav: "purchases" },
  { label: "Add Stock", sub: "Interactive", icon: Warehouse, color: "emerald", nav: "stock" },
  { label: "Manage Recipes", sub: "Interactive", icon: Soup, color: "rose", nav: "meals" },
  { label: "View Reports", sub: "Interactive", icon: BarChart3, color: "violet", nav: "reports" },
  { label: "Log Expense", sub: "Interactive", icon: FileText, color: "amber", nav: "expenses" },
];

interface QuickActionsProps {
  onNavigate?: (view: ViewId) => void;
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
      {QUICK_ACTIONS.map((action) => {
        const ActionIcon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => onNavigate?.(action.nav)}
            className={`group flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-${action.color}-300/70 bg-gradient-to-br from-${action.color}-50/50 to-amber-50/30 p-4 shadow-sm transition-all duration-200 hover:border-${action.color}-400 hover:bg-${action.color}-50 hover:shadow-md hover:-translate-y-0.5 dark:border-${action.color}-800/40 dark:from-${action.color}-950/20 dark:to-amber-950/10 dark:hover:border-${action.color}-600 dark:hover:bg-${action.color}-900/30`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${action.color}-100 shadow-sm transition-colors group-hover:bg-${action.color}-200 group-hover:shadow-md dark:bg-${action.color}-900/40 dark:group-hover:bg-${action.color}-800/50`}>
              <ActionIcon className={`h-5 w-5 text-${action.color}-600 dark:text-${action.color}-400`} />
            </div>
            <span className={`text-xs font-semibold text-${action.color}-900 dark:text-${action.color}-200`}>{action.label}</span>
            <span className={`text-[10px] text-${action.color}-700/60 dark:text-${action.color}-300/60`}>{action.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

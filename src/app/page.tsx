"use client";

import { useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, type ViewId } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

import { DashboardView } from "@/components/module-views/dashboard-view";
import { StockView } from "@/components/module-views/stock-view";
import { MealsView } from "@/components/module-views/meals-view";
import { DailyEntryView } from "@/components/module-views/daily-entry-view";
import { PurchasesView } from "@/components/module-views/purchases-view";
import { WastageView } from "@/components/module-views/wastage-view";
import { ReportsView } from "@/components/module-views/reports-view";
import { ExpensesView } from "@/components/module-views/expenses-view";
import { SettingsView } from "@/components/module-views/settings-view";

const viewLabels: Record<ViewId, string> = {
  dashboard: "Dashboard",
  stock: "Stock / Raw Materials",
  meals: "Meals / Recipes",
  "daily-entry": "Daily Entry",
  purchases: "Purchases",
  wastage: "Wastage",
  reports: "Reports",
  expenses: "Expenses",
  settings: "Settings",
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

function ViewRenderer({
  activeView,
  onNavigate,
}: {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
}) {
  switch (activeView) {
    case "dashboard":
      return <DashboardView onNavigate={onNavigate} />;
    case "stock":
      return <StockView />;
    case "meals":
      return <MealsView />;
    case "daily-entry":
      return <DailyEntryView />;
    case "purchases":
      return <PurchasesView />;
    case "wastage":
      return <WastageView />;
    case "reports":
      return <ReportsView />;
    case "expenses":
      return <ExpensesView />;
    case "settings":
      return <SettingsView />;
    default:
      return <DashboardView onNavigate={onNavigate} />;
  }
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewId>("dashboard");

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} onViewChange={setActiveView} />
      <SidebarInset>
        <div className="flex min-h-screen flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1 items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                {viewLabels[activeView]}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                Live · 600 Employees
              </span>
            </div>
            <ThemeToggle />
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6">
            <ViewRenderer activeView={activeView} onNavigate={setActiveView} />
          </main>

          {/* Footer */}
          <footer className="border-t bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground md:px-6">
            <span className="font-medium text-foreground/80">RCS Canteen</span>{" "}
            © 2026 · Stock &amp; Cost Management · Dahej Industrial Contract
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

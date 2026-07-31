"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, type ViewId } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut, User as UserIcon, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { LoginView } from "@/components/auth/login-view";
import { useAuth } from "@/components/auth/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { DashboardView } from "@/components/module-views/dashboard-view";
import { StockView } from "@/components/module-views/stock-view";
import { MealsView } from "@/components/module-views/meals-view";
import { DailyEntryView } from "@/components/module-views/daily-entry-view";
import { PurchasesView } from "@/components/module-views/purchases-view";
import { SuppliersView } from "@/components/module-views/suppliers-view";
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
  suppliers: "Suppliers",
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

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "admin":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "store":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "kitchen":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-400";
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case "admin":
      return "Admin";
    case "store":
      return "Store";
    case "kitchen":
      return "Kitchen";
    default:
      return "Staff";
  }
}

function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 h-auto hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
        >
          <Avatar className="h-7 w-7 avatar-ring">
            <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">
            {user.name}
          </span>
          <Badge
            variant="secondary"
            className={`hidden text-[10px] px-1.5 py-0 sm:inline-flex ${getRoleBadgeColor(user.role)}`}
          >
            {getRoleLabel(user.role)}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar className="h-9 w-9 avatar-ring">
            <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-bold rounded-full">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profile</span>
          <Badge
            variant="secondary"
            className={`ml-auto text-[10px] px-1.5 py-0 ${getRoleBadgeColor(user.role)}`}
          >
            {getRoleLabel(user.role)}
          </Badge>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
    case "suppliers":
      return <SuppliersView />;
    case "wastage":
      return <WastageView />;
    case "reports":
      return <ReportsView />;
    case "expenses":
      return <ExpensesView />;
    case "settings":
      return <SettingsView onNavigate={onNavigate} />;
    default:
      return <DashboardView onNavigate={onNavigate} />;
  }
}

function AuthenticatedApp() {
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

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
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex items-center gap-2 rounded-full border bg-background/50 px-3 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search...</span>
              <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                ⌘K
              </kbd>
            </Button>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-3 py-1 dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <span className="live-dot relative flex h-2 w-2 text-emerald-500">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="hidden text-xs font-medium text-emerald-700 dark:text-emerald-300 sm:inline">
                Live · 600 Employees
              </span>
            </div>
            <NotificationsDropdown />
            <ThemeToggle />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <UserMenu />
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

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onNavigate={setActiveView}
      />
    </SidebarProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-stone-950 dark:via-stone-950 dark:to-stone-950">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/30">
          <Loader2 className="h-7 w-7 animate-spin text-white" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          Loading RCS Canteen...
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [seeded, setSeeded] = useState(false);

  // Seed default auth users on first load
  useEffect(() => {
    if (!seeded) {
      fetch("/api/auth/seed", { method: "POST" })
        .then(() => setSeeded(true))
        .catch(() => setSeeded(true)); // Don't block on seed failure
    }
  }, [seeded]);

  // Show loading screen while checking session
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Show the main app
  return <AuthenticatedApp />;
}

"use client";

import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  ClipboardList,
  ShoppingCart,
  Truck,
  Trash2,
  BarChart3,
  Receipt,
  Settings,
  Flame,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export type ViewId =
  | "dashboard"
  | "stock"
  | "meals"
  | "daily-entry"
  | "purchases"
  | "suppliers"
  | "wastage"
  | "reports"
  | "expenses"
  | "settings";

interface NavItem {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "stock", label: "Stock / Raw Materials", icon: Package },
  { id: "meals", label: "Meals / Recipes", icon: UtensilsCrossed },
  { id: "daily-entry", label: "Daily Entry", icon: ClipboardList },
  { id: "purchases", label: "Purchases", icon: ShoppingCart },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "wastage", label: "Wastage", icon: Trash2 },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "settings", label: "Settings", icon: Settings },
];

interface AppSidebarProps {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
}

export function AppSidebar({ activeView, onViewChange }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Flame className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-bold">RCS Canteen</span>
            <span className="truncate text-xs text-muted-foreground">
              Stock & Cost Management
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeView === item.id}
                    onClick={() => onViewChange(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="px-3 py-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Flame className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                RCS Canteen
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                Dahej Industrial Contract
              </p>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            © 2026 RCS Canteen · v1.0.0
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

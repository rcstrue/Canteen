"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
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
  Plus,
  CalendarDays,
  FileText,
  UserPlus,
  IndianRupee,
  Printer,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import type { ViewId } from "@/components/app-sidebar";

// ─── Formatting Helpers ──────────────────────────────────────────────────────

const inr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const fmtDate = (iso: string) => {
  try {
    if (!iso) return "";
    return format(parseISO(iso), "dd/MM/yyyy");
  } catch {
    return "";
  }
};

// ─── Static Navigation + Quick Actions ──────────────────────────────────────

interface NavEntry {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavEntry[] = [
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

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  view: ViewId;
  hint: string;
}

const quickActions: QuickAction[] = [
  { label: "Add new ingredient", icon: Plus, view: "stock", hint: "Stock" },
  { label: "Record today's meals", icon: CalendarDays, view: "daily-entry", hint: "Daily Entry" },
  { label: "Log new purchase", icon: FileText, view: "purchases", hint: "Purchases" },
  { label: "Add new supplier", icon: UserPlus, view: "suppliers", hint: "Suppliers" },
  { label: "Log expense", icon: IndianRupee, view: "expenses", hint: "Expenses" },
  { label: "View reports", icon: BarChart3, view: "reports", hint: "Reports" },
  { label: "Print last invoice", icon: Printer, view: "purchases", hint: "Purchases" },
];

// ─── API Response Types ──────────────────────────────────────────────────────

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  category: string;
  currentStock: number;
  minStock: number;
}

interface RecipeIngredientLink {
  quantity: number;
  unit: string;
  ingredient: { avgCost: number };
}

interface Recipe {
  id: string;
  name: string;
  mealType: string;
  baseServings: number;
  ingredients: RecipeIngredientLink[];
}

interface Supplier {
  id: string;
  name: string;
  category?: string | null;
  totalPurchaseValue?: number;
}

interface Purchase {
  id: string;
  date: string;
  supplier?: string | null;
  invoiceNo?: string | null;
  totalAmount: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: ViewId) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // Reset state whenever the palette is opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setIngredients([]);
      setRecipes([]);
      setSuppliers([]);
      setPurchases([]);
      setLoading(false);
    }
  }, [open]);

  // Debounced API fetch (200ms, only when query length >= 2)
  useEffect(() => {
    if (!open) return;

    const q = query.trim();

    // If query is too short, clear all API results
    if (q.length < 2) {
      setIngredients([]);
      setRecipes([]);
      setSuppliers([]);
      setPurchases([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const lowerQ = q.toLowerCase();

        const [ingRes, recRes, supRes, purRes] = await Promise.all([
          fetch(`/api/ingredients?search=${encodeURIComponent(q)}`).then((r) =>
            r.json()
          ),
          fetch(`/api/recipes?search=${encodeURIComponent(q)}`).then((r) =>
            r.json()
          ),
          fetch(`/api/suppliers?search=${encodeURIComponent(q)}`).then((r) =>
            r.json()
          ),
          fetch(`/api/purchases?limit=20`).then((r) => r.json()),
        ]);

        setIngredients(Array.isArray(ingRes) ? ingRes : []);
        setRecipes(Array.isArray(recRes) ? recRes : []);

        setSuppliers(Array.isArray(supRes) ? supRes : []);

        const purData = purRes?.data ?? [];
        const safePurchases: Purchase[] = Array.isArray(purData) ? purData : [];
        // Filter purchases locally — API only supports supplier filter, not invoice
        const filteredPurchases = safePurchases.filter((p) => {
          const supMatch = (p.supplier || "").toLowerCase().includes(lowerQ);
          const invMatch = (p.invoiceNo || "").toLowerCase().includes(lowerQ);
          return supMatch || invMatch;
        });
        setPurchases(filteredPurchases);
      } catch (err) {
        console.error("Command palette search error:", err);
        setIngredients([]);
        setRecipes([]);
        setSuppliers([]);
        setPurchases([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, open]);

  // Handle selection — navigate and close
  const handleSelect = useCallback(
    (view: ViewId) => {
      onNavigate(view);
      onOpenChange(false);
    },
    [onNavigate, onOpenChange]
  );

  // Compute the per-meal cost of a recipe
  const recipeCostPerMeal = useCallback((r: Recipe): number => {
    const total = (r.ingredients || []).reduce(
      (sum, ri) => sum + (ri.ingredient?.avgCost || 0) * ri.quantity,
      0
    );
    return r.baseServings > 0 ? total / r.baseServings : 0;
  }, []);

  const q = query.trim();
  const shouldShowApiResults = q.length >= 2;
  const hasApiResults =
    ingredients.length > 0 ||
    recipes.length > 0 ||
    suppliers.length > 0 ||
    purchases.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 max-w-2xl gap-0"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>
            Search across RCS Canteen — navigation, ingredients, recipes,
            suppliers and purchases.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Command className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4 rounded-none">
            <CommandInput
              placeholder="Search views, ingredients, recipes, suppliers, purchases..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-[440px]">
              {/* Loading skeleton */}
              {loading && shouldShowApiResults && (
                <div className="p-3 space-y-3">
                  <Skeleton className="h-3 w-24" />
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-1">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-2.5 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Default view: Navigation + Quick Actions */}
              {!shouldShowApiResults && (
                <>
                  <CommandGroup heading="Navigation">
                    {navItems.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`nav-${item.label}`}
                        onSelect={() => handleSelect(item.id)}
                        className="group"
                      >
                        <item.icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-medium">{item.label}</span>
                        <CornerDownLeft className="ml-auto h-3 w-3 opacity-0 group-data-[selected=true]:opacity-60" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Quick Actions">
                    {quickActions.map((action) => (
                      <CommandItem
                        key={action.label}
                        value={`qa-${action.label}`}
                        onSelect={() => handleSelect(action.view)}
                        className="group"
                      >
                        <action.icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span className="font-medium">{action.label}</span>
                        <CommandShortcut>{action.hint}</CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Empty state when search yields nothing */}
              {shouldShowApiResults && !loading && !hasApiResults && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}

              {/* API search results */}
              {shouldShowApiResults && !loading && hasApiResults && (
                <>
                  {ingredients.length > 0 && (
                    <CommandGroup heading={`Ingredients · ${ingredients.length}`}>
                      {ingredients.slice(0, 8).map((ing) => (
                        <CommandItem
                          key={ing.id}
                          value={`ing-${ing.name} ${ing.category} ${ing.currentStock} ${ing.unit}`}
                          onSelect={() => handleSelect("stock")}
                          className="group"
                        >
                          <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="font-medium">{ing.name}</span>
                          <span className="text-muted-foreground text-xs">
                            · {ing.category} ·{" "}
                            <span
                              className={
                                ing.currentStock <= ing.minStock
                                  ? "text-red-600 dark:text-red-400 font-medium"
                                  : ""
                              }
                            >
                              {ing.currentStock} {ing.unit}
                            </span>
                          </span>
                          <CommandShortcut>Stock</CommandShortcut>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {recipes.length > 0 && (
                    <CommandGroup heading={`Recipes · ${recipes.length}`}>
                      {recipes.slice(0, 8).map((rec) => (
                        <CommandItem
                          key={rec.id}
                          value={`rec-${rec.name} ${rec.mealType}`}
                          onSelect={() => handleSelect("meals")}
                          className="group"
                        >
                          <UtensilsCrossed className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="font-medium">{rec.name}</span>
                          <span className="text-muted-foreground text-xs">
                            · {rec.mealType} · {inr(recipeCostPerMeal(rec))}
                            /meal
                          </span>
                          <CommandShortcut>Meals</CommandShortcut>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {suppliers.length > 0 && (
                    <CommandGroup heading={`Suppliers · ${suppliers.length}`}>
                      {suppliers.slice(0, 8).map((sup) => (
                        <CommandItem
                          key={sup.id}
                          value={`sup-${sup.name} ${sup.category || ""}`}
                          onSelect={() => handleSelect("suppliers")}
                          className="group"
                        >
                          <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="font-medium">{sup.name}</span>
                          <span className="text-muted-foreground text-xs">
                            · {sup.category || "General"} ·{" "}
                            {inr(sup.totalPurchaseValue || 0)}
                          </span>
                          <CommandShortcut>Suppliers</CommandShortcut>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {purchases.length > 0 && (
                    <CommandGroup heading={`Purchases · ${purchases.length}`}>
                      {purchases.slice(0, 8).map((pur) => (
                        <CommandItem
                          key={pur.id}
                          value={`pur-${pur.supplier || ""} ${pur.invoiceNo || ""}`}
                          onSelect={() => handleSelect("purchases")}
                          className="group"
                        >
                          <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <span className="font-medium">
                            {pur.supplier || "Unknown supplier"}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            · {pur.invoiceNo || "No invoice"} ·{" "}
                            {inr(pur.totalAmount)} · {fmtDate(pur.date)}
                          </span>
                          <CommandShortcut>Purchases</CommandShortcut>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>

            {/* Footer hint bar */}
            <div className="border-t bg-muted/30 px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-background px-1.5 py-0.5 font-mono ring-1 ring-border">
                    ↑
                  </kbd>
                  <kbd className="rounded bg-background px-1.5 py-0.5 font-mono ring-1 ring-border">
                    ↓
                  </kbd>
                  <span className="ml-0.5">to navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-background px-1.5 py-0.5 font-mono ring-1 ring-border">
                    ↵
                  </kbd>
                  <span className="ml-0.5">to select</span>
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-background px-1.5 py-0.5 font-mono ring-1 ring-border">
                  esc
                </kbd>
                <span className="ml-0.5">to close</span>
              </span>
            </div>
          </Command>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hook: useCommandPalette ─────────────────────────────────────────────────
//
// Self-contained hook that wires up the global Cmd+K / Ctrl+K keyboard shortcut.
// Place this at the top level of the authenticated app — it returns the open
// state plus a setter so callers can render the trigger button.

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase() ?? "";
        const isEditable =
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          (target?.isContentEditable ?? false);

        // When the palette is currently closed and an input/textarea is
        // focused, ignore the shortcut (per spec — the user is typing).
        if (!open && isEditable) return;

        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return { open, setOpen } as const;
}

// Re-export Loader2 for callers that want the spinner
export { Loader2 };

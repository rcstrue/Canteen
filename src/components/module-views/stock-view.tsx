"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useToast } from "@/hooks/use-toast";
import { downloadCSV } from "@/lib/export-utils";
import { formatINR } from "@/lib/utils";
import { StockMovementsView } from "@/components/module-views/stock-movements-view";

import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Eye,
  X,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  History,
  CheckCircle2,
  ShieldAlert,
  CircleAlert,
  Check,
  ListChecks,
  Inbox,
  PencilLine,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  category: string;
  currentStock: number;
  minStock: number;
  lastPurchasePrice: number;
  avgCost: number;
  supplier: string | null;
  createdAt: string;
  updatedAt: string;
}

interface IngredientDetail extends Ingredient {
  stockMovements: Array<{
    id: string;
    type: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    date: string;
    notes: string | null;
  }>;
  recipeIngredients: Array<{
    id: string;
    quantity: number;
    unit: string;
    recipe: {
      id: string;
      name: string;
      mealType: string;
    };
  }>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  "All",
  "Vegetables",
  "Grains",
  "Oil",
  "Spices",
  "Dairy",
  "Meat",
  "Pulses",
  "Other",
] as const;

const UNITS = ["kg", "gram", "litre", "ml", "pcs", "dozen", "packet"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Vegetables: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Grains: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Oil: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  Spices: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  Dairy: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Meat: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  Pulses: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
};

const ITEMS_PER_PAGE = 10;

type SortField =
  | "name"
  | "category"
  | "unit"
  | "currentStock"
  | "minStock"
  | "lastPurchasePrice"
  | "avgCost"
  | "supplier";
type SortDirection = "asc" | "desc";

// ─── Stock Movement Types & Config ──────────────────────────────────────────

type StockMovementType =
  | "PURCHASE"
  | "CONSUMPTION"
  | "WASTAGE"
  | "ADJUSTMENT";

interface StockMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: string;
  notes: string | null;
  referenceId: string | null;
  ingredientId: string;
  ingredient: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
}

const MOVEMENT_TYPES: { value: string; label: string }[] = [
  { value: "ALL", label: "All Types" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "CONSUMPTION", label: "Consumption" },
  { value: "WASTAGE", label: "Wastage" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const MOVEMENT_TYPE_CONFIG: Record<
  StockMovementType,
  {
    label: string;
    badgeClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PURCHASE: {
    label: "Purchase",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    Icon: ArrowDownLeft,
  },
  CONSUMPTION: {
    label: "Consumption",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    Icon: ArrowUpRight,
  },
  WASTAGE: {
    label: "Wastage",
    badgeClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    Icon: Trash2,
  },
  ADJUSTMENT: {
    label: "Adjustment",
    badgeClass:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    Icon: RefreshCw,
  },
};

const MOVEMENTS_PER_PAGE = 10;

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const ingredientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().min(1, "Unit is required"),
  category: z.string().min(1, "Category is required"),
  currentStock: z.coerce.number().min(0, "Must be 0 or more"),
  minStock: z.coerce.number().min(0, "Must be 0 or more"),
  lastPurchasePrice: z.coerce.number().min(0, "Must be 0 or more"),
  avgCost: z.coerce.number().min(0, "Must be 0 or more"),
  supplier: z.string().optional().default(""),
});

type IngredientFormValues = z.infer<typeof ingredientSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatStockWithUnit(quantity: number, unit: string): string {
  return `${quantity} ${unit}`;
}

function isLowStock(item: Ingredient): boolean {
  return item.currentStock < item.minStock;
}

type StockHealth = "OK" | "LOW" | "CRITICAL";

function getStockHealth(item: Ingredient): StockHealth {
  if (item.minStock === 0) return "OK";
  const ratio = item.currentStock / item.minStock;
  if (ratio < 1) return "CRITICAL";      // currentStock < minStock → red
  if (ratio < 1.5) return "LOW";         // between minStock and 1.5× minStock → amber
  return "OK";                            // currentStock > 1.5× minStock → green
}

function getStockHealthConfig(health: StockHealth): {
  label: string;
  badgeClass: string;
  Icon: React.ComponentType<{ className?: string }>;
  barColor: string;
} {
  switch (health) {
    case "CRITICAL":
      return {
        label: "Critical",
        badgeClass:
          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
        Icon: ShieldAlert,
        barColor: "bg-red-500",
      };
    case "LOW":
      return {
        label: "Low",
        badgeClass:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        Icon: AlertTriangle,
        barColor: "bg-amber-500",
      };
    case "OK":
    default:
      return {
        label: "OK",
        badgeClass:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        Icon: CheckCircle2,
        barColor: "bg-emerald-500",
      };
  }
}

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Format a date as a short relative-time string (e.g. "2h ago", "3d ago"). */
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w ago`;
  return formatDateDDMMYYYY(dateStr);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StockView() {
  // State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [deleteItem, setDeleteItem] = useState<Ingredient | null>(null);
  const [detailItem, setDetailItem] = useState<IngredientDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Movement History dialog state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyIngredientId, setHistoryIngredientId] = useState<
    string | undefined
  >(undefined);
  const [historyIngredientName, setHistoryIngredientName] = useState<
    string | undefined
  >(undefined);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Toast notifications
  const { toast } = useToast();

  // Active tab
  const [activeTab, setActiveTab] = useState<"inventory" | "movements">(
    "inventory"
  );

  // Critical-only filter (toggled by clicking the Critical summary card)
  const [criticalFilterOnly, setCriticalFilterOnly] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedCount = selectedIds.size;
  const isSelectionMode = selectedCount > 0;

  // Inline quick-edit state — when set, the row's stock-level quantity
  // is rendered as an editable input instead of a static number.
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditValue, setQuickEditValue] = useState<string>("");
  const [quickEditSaving, setQuickEditSaving] = useState(false);

  // Movement History state
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementType, setMovementType] = useState<string>("ALL");
  const [movementIngredientId, setMovementIngredientId] = useState<string>(
    "ALL"
  );
  const [movementDateFrom, setMovementDateFrom] = useState<string>("");
  const [movementDateTo, setMovementDateTo] = useState<string>("");
  const [movementSortDir, setMovementSortDir] = useState<"asc" | "desc">(
    "desc"
  );
  const [movementPage, setMovementPage] = useState(1);

  // ─── Form ────────────────────────────────────────────────────────────────

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: "",
      unit: "",
      category: "",
      currentStock: 0,
      minStock: 0,
      lastPurchasePrice: 0,
      avgCost: 0,
      supplier: "",
    },
  });

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      if (showLowStockOnly) params.set("lowStock", "true");

      const res = await fetch(`/api/ingredients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error("Failed to fetch ingredients:", error);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, showLowStockOnly]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, showLowStockOnly, criticalFilterOnly]);

  // Reset selection whenever filters change so we don't hold stale ids
  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, categoryFilter, showLowStockOnly, criticalFilterOnly]);

  // ─── Bulk selection handlers ─────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedIngredients = useMemo(
    () => ingredients.filter((i) => selectedIds.has(i.id)),
    [ingredients, selectedIds]
  );

  // ─── Inline quick-edit handlers ──────────────────────────────────────────

  const startQuickEdit = (item: Ingredient) => {
    setQuickEditId(item.id);
    setQuickEditValue(String(item.currentStock));
  };

  const cancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickEditValue("");
  };

  const saveQuickEdit = async (item: Ingredient) => {
    const parsed = parseFloat(quickEditValue);
    if (isNaN(parsed) || parsed < 0) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid non-negative number.",
        variant: "destructive",
      });
      return;
    }
    if (parsed === item.currentStock) {
      cancelQuickEdit();
      return;
    }
    setQuickEditSaving(true);
    try {
      const res = await fetch(`/api/ingredients/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          unit: item.unit,
          category: item.category,
          currentStock: parsed,
          minStock: item.minStock,
          lastPurchasePrice: item.lastPurchasePrice,
          avgCost: item.avgCost,
          supplier: item.supplier ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update stock level");
      toast({
        title: "Stock updated",
        description: `${item.name}: ${item.currentStock} ${item.unit} → ${parsed} ${item.unit}`,
      });
      cancelQuickEdit();
      await fetchIngredients();
    } catch (error) {
      console.error("Failed to save quick edit:", error);
      toast({
        title: "Update failed",
        description: "Could not save the new stock level.",
        variant: "destructive",
      });
    } finally {
      setQuickEditSaving(false);
    }
  };

  // ─── Bulk export selected ────────────────────────────────────────────────

  const handleBulkExportSelected = () => {
    if (selectedIngredients.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Select at least one ingredient to export.",
        variant: "destructive",
      });
      return;
    }
    const rows = selectedIngredients.map((item) => ({
      Name: item.name,
      Category: item.category,
      Unit: item.unit,
      "Current Stock": item.currentStock,
      "Min Stock": item.minStock,
      "Last Price": item.lastPurchasePrice,
      "Avg Cost": item.avgCost,
      Supplier: item.supplier ?? "",
      Status: isLowStock(item) ? "Low Stock" : "In Stock",
      "Last Updated": formatDateDDMMYYYY(item.updatedAt),
    }));
    const today = new Date().toISOString().split("T")[0];
    downloadCSV(`stock-selected-${today}.csv`, rows);
    toast({
      title: "Export successful",
      description: `Exported ${rows.length} ingredient${
        rows.length === 1 ? "" : "s"
      } to CSV.`,
    });
  };

  // ─── Fetch Movements ─────────────────────────────────────────────────────

  const fetchMovements = useCallback(async () => {
    setMovementsLoading(true);
    try {
      const params = new URLSearchParams();
      if (movementType !== "ALL") params.set("type", movementType);
      if (movementIngredientId !== "ALL")
        params.set("ingredientId", movementIngredientId);
      if (movementDateFrom) params.set("startDate", movementDateFrom);
      if (movementDateTo) params.set("endDate", movementDateTo);
      params.set("limit", "1000");
      params.set("offset", "0");

      const res = await fetch(`/api/stock-movements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMovements(Array.isArray(json?.data) ? json.data : []);
      } else {
        setMovements([]);
      }
    } catch (error) {
      console.error("Failed to fetch stock movements:", error);
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  }, [movementType, movementIngredientId, movementDateFrom, movementDateTo]);

  useEffect(() => {
    if (activeTab === "movements") {
      fetchMovements();
    }
  }, [activeTab, fetchMovements]);

  // Reset movement page when filters change
  useEffect(() => {
    setMovementPage(1);
  }, [movementType, movementIngredientId, movementDateFrom, movementDateTo]);

  // ─── Sorting ─────────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedIngredients = [...ingredients]
    .filter((i) => (criticalFilterOnly ? getStockHealth(i) === "CRITICAL" : true))
    .sort((a, b) => {
      let aVal: string | number = a[sortField] ?? "";
      let bVal: string | number = b[sortField] ?? "";

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  // ─── Pagination ──────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(sortedIngredients.length / ITEMS_PER_PAGE));
  const paginatedIngredients = sortedIngredients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ─── Bulk selection (depends on paginatedIngredients) ─────────────────────

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allSelected =
        paginatedIngredients.length > 0 &&
        paginatedIngredients.every((i) => prev.has(i.id));
      if (allSelected) {
        // Deselect only the visible ones
        const next = new Set(prev);
        paginatedIngredients.forEach((i) => next.delete(i.id));
        return next;
      }
      const next = new Set(prev);
      paginatedIngredients.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const allVisibleSelected =
    paginatedIngredients.length > 0 &&
    paginatedIngredients.every((i) => selectedIds.has(i.id));
  const someVisibleSelected =
    paginatedIngredients.some((i) => selectedIds.has(i.id)) && !allVisibleSelected;

  // ─── Movement Sorting & Summary ──────────────────────────────────────────

  const sortedMovements = [...movements].sort((a, b) => {
    const aDate = new Date(a.date).getTime();
    const bDate = new Date(b.date).getTime();
    return movementSortDir === "desc" ? bDate - aDate : aDate - bDate;
  });

  const movementSummary = useMemo(() => {
    let purchase = 0;
    let consumption = 0;
    let wastage = 0;
    for (const m of movements) {
      if (m.type === "PURCHASE") purchase += m.totalAmount ?? 0;
      else if (m.type === "CONSUMPTION") consumption += m.totalAmount ?? 0;
      else if (m.type === "WASTAGE") wastage += m.totalAmount ?? 0;
    }
    return { purchase, consumption, wastage };
  }, [movements]);

  const totalMovementPages = Math.max(
    1,
    Math.ceil(sortedMovements.length / MOVEMENTS_PER_PAGE)
  );
  const paginatedMovements = sortedMovements.slice(
    (movementPage - 1) * MOVEMENTS_PER_PAGE,
    movementPage * MOVEMENTS_PER_PAGE
  );

  // Keep movement page in valid range
  useEffect(() => {
    if (movementPage > totalMovementPages) setMovementPage(1);
  }, [movementPage, totalMovementPages]);

  // ─── CRUD Handlers ──────────────────────────────────────────────────────

  const openAddDialog = () => {
    setEditingItem(null);
    form.reset({
      name: "",
      unit: "",
      category: "",
      currentStock: 0,
      minStock: 0,
      lastPurchasePrice: 0,
      avgCost: 0,
      supplier: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: Ingredient) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      unit: item.unit,
      category: item.category,
      currentStock: item.currentStock,
      minStock: item.minStock,
      lastPurchasePrice: item.lastPurchasePrice,
      avgCost: item.avgCost,
      supplier: item.supplier ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: IngredientFormValues) => {
    setSubmitting(true);
    try {
      const body = {
        ...values,
        supplier: values.supplier || null,
      };

      if (editingItem) {
        const res = await fetch(`/api/ingredients/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update ingredient");
      } else {
        const res = await fetch("/api/ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create ingredient");
      }

      setDialogOpen(false);
      form.reset();
      await fetchIngredients();
    } catch (error) {
      console.error("Failed to save ingredient:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      const res = await fetch(`/api/ingredients/${deleteItem.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete ingredient");
      setDeleteItem(null);
      await fetchIngredients();
    } catch (error) {
      console.error("Failed to delete ingredient:", error);
    }
  };

  const openDetailDialog = async (item: Ingredient) => {
    try {
      const res = await fetch(`/api/ingredients/${item.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailItem(data);
        setDetailOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch ingredient detail:", error);
    }
  };

  // ─── Movement History Dialog ──────────────────────────────────────────

  const openHistoryGlobal = () => {
    setHistoryIngredientId(undefined);
    setHistoryIngredientName(undefined);
    setHistoryOpen(true);
  };

  const openHistoryForIngredient = (ingredient: {
    id: string;
    name: string;
  }) => {
    setHistoryIngredientId(ingredient.id);
    setHistoryIngredientName(ingredient.name);
    setDetailOpen(false);
    setHistoryOpen(true);
  };

  const ingredientOptionsForHistory = useMemo(
    () =>
      ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        category: i.category,
      })),
    [ingredients]
  );

  // ─── Export Handlers ─────────────────────────────────────────────────────

  const handleExportInventory = () => {
    if (sortedIngredients.length === 0) {
      toast({
        title: "Nothing to export",
        description: "There are no ingredients to export.",
        variant: "destructive",
      });
      return;
    }
    const rows = sortedIngredients.map((item) => ({
      Name: item.name,
      Category: item.category,
      Unit: item.unit,
      "Current Stock": item.currentStock,
      "Min Stock": item.minStock,
      "Last Price": item.lastPurchasePrice,
      "Avg Cost": item.avgCost,
      Supplier: item.supplier ?? "",
      Status: isLowStock(item) ? "Low Stock" : "In Stock",
      "Last Updated": formatDateDDMMYYYY(item.updatedAt),
    }));
    const today = new Date().toISOString().split("T")[0];
    downloadCSV(`stock-inventory-${today}.csv`, rows);
    toast({
      title: "Export successful",
      description: `Exported ${rows.length} ingredient${
        rows.length === 1 ? "" : "s"
      } to CSV.`,
    });
  };

  const handleExportMovements = () => {
    if (sortedMovements.length === 0) {
      toast({
        title: "Nothing to export",
        description:
          "There are no movements to export for the current filters.",
        variant: "destructive",
      });
      return;
    }
    const rows = sortedMovements.map((m) => ({
      Date: formatDateDDMMYYYY(m.date),
      Ingredient: m.ingredient?.name ?? "—",
      Type: m.type,
      Quantity: m.quantity,
      "Unit Price": m.unitPrice,
      "Total Amount": m.totalAmount,
      Notes: m.notes ?? "",
    }));
    const today = new Date().toISOString().split("T")[0];
    downloadCSV(`stock-movements-${today}.csv`, rows);
    toast({
      title: "Export successful",
      description: `Exported ${rows.length} movement${
        rows.length === 1 ? "" : "s"
      } to CSV.`,
    });
  };

  const handleMovementSortToggle = () => {
    setMovementSortDir((d) => (d === "desc" ? "asc" : "desc"));
  };

  // ─── Sortable Header Helper ──────────────────────────────────────────────

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
      {sortField === field && (
        <span className="ml-1 text-[10px] text-muted-foreground">
          {sortDirection === "asc" ? "↑" : "↓"}
        </span>
      )}
    </Button>
  );

  // ─── Low stock count ────────────────────────────────────────────────────

  const lowStockCount = ingredients.filter(isLowStock).length;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 view-enter">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
            <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Stock / Raw Materials
            </h1>
            <p className="text-muted-foreground">
              Manage raw material inventory, track quantities, and monitor stock
              levels
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={openHistoryGlobal}
          className="shrink-0"
        >
          <History className="h-4 w-4" />
          Movement History
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover card-elevated metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold tabular-nums">{ingredients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover card-elevated metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Stock OK</p>
                <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {ingredients.filter((i) => getStockHealth(i) === "OK").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover card-elevated metric-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <CircleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Near Par</p>
                <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {ingredients.filter((i) => getStockHealth(i) === "LOW").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Critical card — clickable, highlights when filter is active */}
        <button
          type="button"
          onClick={() => setCriticalFilterOnly((v) => !v)}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-xl"
          aria-pressed={criticalFilterOnly}
          aria-label={`${criticalFilterOnly ? "Clear" : "Apply"} critical-items filter`}
        >
          <Card
            className={`card-elevated metric-card transition-all ${
              criticalFilterOnly
                ? "ring-2 ring-red-500 bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800"
                : "card-hover hover:bg-red-50/50 dark:hover:bg-red-950/20"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                  <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Critical</p>
                    {criticalFilterOnly && (
                      <Badge variant="outline" className="badge-danger text-[9px] px-1 py-0">
                        Filtered
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">
                    {ingredients.filter((i) => getStockHealth(i) === "CRITICAL").length}
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground group-hover:text-foreground">
                        <RefreshCw className={`h-3.5 w-3.5 transition-transform ${criticalFilterOnly ? "rotate-180" : ""}`} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {criticalFilterOnly ? "Click to clear filter" : "Click to show only critical items"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Tabs: Inventory & Movement History */}
      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v === "movements" ? "movements" : "inventory")
        }
      >
        <TabsList>
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="movements">
            <History className="h-4 w-4" />
            Movement History
          </TabsTrigger>
        </TabsList>

        {/* ─── Inventory Tab ───────────────────────────────────────────── */}
        <TabsContent value="inventory" className="space-y-4">
      {/* Filters & Actions */}
      <Card className="card-elevated">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>
                Add, edit, and track all raw materials used in the canteen
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={openHistoryGlobal}
              >
                <History className="h-4 w-4" />
                Movement History
              </Button>
              <Button
                variant="outline"
                onClick={handleExportInventory}
                disabled={loading || sortedIngredients.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                onClick={openAddDialog}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Add Ingredient
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filter Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStockOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={
                showLowStockOnly
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-sm"
                  : ""
              }
              aria-pressed={showLowStockOnly}
            >
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </Button>
          </div>

          {/* Active filter chips + critical filter indicator */}
          {(criticalFilterOnly || search || categoryFilter !== "All" || showLowStockOnly) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {criticalFilterOnly && (
                <Badge variant="secondary" className="gap-1 badge-danger">
                  <ShieldAlert className="h-3 w-3" />
                  Critical only
                  <button
                    onClick={() => setCriticalFilterOnly(false)}
                    className="ml-1 hover:text-foreground"
                    aria-label="Clear critical filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {search && (
                <Badge variant="secondary" className="gap-1">
                  &ldquo;{search}&rdquo;
                  <button
                    onClick={() => setSearch("")}
                    className="ml-1 hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {categoryFilter !== "All" && (
                <Badge variant="secondary" className="gap-1">
                  {categoryFilter}
                  <button
                    onClick={() => setCategoryFilter("All")}
                    className="ml-1 hover:text-foreground"
                    aria-label="Clear category filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {showLowStockOnly && (
                <Badge variant="secondary" className="gap-1 badge-warning">
                  <AlertTriangle className="h-3 w-3" />
                  Low stock only
                  <button
                    onClick={() => setShowLowStockOnly(false)}
                    className="ml-1 hover:text-foreground"
                    aria-label="Clear low stock filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("All");
                  setShowLowStockOnly(false);
                  setCriticalFilterOnly(false);
                }}
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Bulk Actions Bar */}
          {isSelectionMode && (
            <div className="sticky top-0 z-20 overflow-hidden rounded-lg border border-amber-200 dark:border-amber-800/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
                    <ListChecks className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {selectedCount} ingredient{selectedCount === 1 ? "" : "s"} selected
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                      Choose an action below or clear the selection to exit
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkExportSelected}
                    className="border-amber-300 bg-white/70 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-950/40"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Export Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Exit Selection
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedIngredients.length === 0 ? (
            <div className="empty-state rounded-lg border border-dashed border-muted-foreground/25 py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4 ring-4 ring-orange-50 dark:ring-orange-950/40">
                {criticalFilterOnly ? (
                  <ShieldAlert className="h-10 w-10 text-red-500 dark:text-red-400" />
                ) : (
                  <Inbox className="h-10 w-10 text-orange-500 dark:text-orange-400" />
                )}
              </div>
              <p className="text-lg font-semibold text-foreground">
                {criticalFilterOnly
                  ? "No critical-stock items"
                  : search || categoryFilter !== "All" || showLowStockOnly
                    ? "No ingredients match your filters"
                    : "Your inventory is empty"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                {criticalFilterOnly
                  ? "All your ingredients are above their minimum stock levels. Great job keeping the kitchen stocked!"
                  : search || categoryFilter !== "All" || showLowStockOnly
                    ? "Try clearing some filters or adjusting your search query to find what you're looking for."
                    : "Start building your inventory by adding your first raw material — track quantities, set par levels, and monitor usage."}
              </p>
              {!search && categoryFilter === "All" && !showLowStockOnly && !criticalFilterOnly && (
                <Button
                  onClick={openAddDialog}
                  className="mt-5 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Ingredient
                </Button>
              )}
              {(search || categoryFilter !== "All" || showLowStockOnly || criticalFilterOnly) && (
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("All");
                    setShowLowStockOnly(false);
                    setCriticalFilterOnly(false);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px] pl-4">
                        <Checkbox
                          aria-label="Select all visible ingredients"
                          checked={
                            allVisibleSelected
                              ? true
                              : someVisibleSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={toggleSelectAllVisible}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader field="name">Name</SortableHeader>
                      </TableHead>
                      <TableHead>
                        <SortableHeader field="category">
                          Category
                        </SortableHeader>
                      </TableHead>
                      <TableHead>Stock Level</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead className="text-right">
                        <SortableHeader field="lastPurchasePrice">
                          Last Price
                        </SortableHeader>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortableHeader field="avgCost">
                          Avg Cost
                        </SortableHeader>
                      </TableHead>
                      <TableHead>
                        <SortableHeader field="supplier">
                          Supplier
                        </SortableHeader>
                      </TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedIngredients.map((item) => {
                      const health = getStockHealth(item);
                      const healthConfig = getStockHealthConfig(health);
                      const HealthIcon = healthConfig.Icon;
                      const maxStock = item.minStock > 0 ? item.minStock * 3 : item.currentStock > 0 ? item.currentStock : 1;
                      const stockPercent = Math.min(Math.round((item.currentStock / maxStock) * 100), 100);
                      const isSelected = selectedIds.has(item.id);
                      const isQuickEditing = quickEditId === item.id;
                      return (
                        <TableRow
                          key={item.id}
                          data-state={isSelected ? "selected" : undefined}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/40"
                              : health === "CRITICAL"
                                ? "bg-red-50/50 hover:bg-red-100/50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                                : health === "LOW"
                                  ? "bg-amber-50/30 hover:bg-amber-100/30 dark:bg-amber-950/10 dark:hover:bg-amber-950/20"
                                  : "hover:bg-muted/50"
                          }`}
                          onClick={() => {
                            if (isSelectionMode) {
                              toggleSelect(item.id);
                            } else if (!isQuickEditing) {
                              openDetailDialog(item);
                            }
                          }}
                        >
                          <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              aria-label={`Select ${item.name}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(item.id)}
                              className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                CATEGORY_COLORS[item.category] ||
                                CATEGORY_COLORS.Other
                              }
                            >
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => isQuickEditing && e.stopPropagation()}>
                            {isQuickEditing ? (
                              <div className="min-w-[160px] space-y-1">
                                <div className="flex items-center gap-1">
                                  <Input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={quickEditValue}
                                    onChange={(e) => setQuickEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        saveQuickEdit(item);
                                      } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelQuickEdit();
                                      }
                                    }}
                                    className="h-7 text-xs px-2 py-1 font-mono"
                                  />
                                  <span className="text-xs text-muted-foreground shrink-0">{item.unit}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
                                    onClick={() => saveQuickEdit(item)}
                                    disabled={quickEditSaving}
                                    title="Save (Enter)"
                                  >
                                    {quickEditSaving ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={cancelQuickEdit}
                                    disabled={quickEditSaving}
                                    title="Cancel (Esc)"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  Press <kbd className="px-1 rounded bg-muted">Enter</kbd> to save, <kbd className="px-1 rounded bg-muted">Esc</kbd> to cancel
                                </p>
                              </div>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startQuickEdit(item);
                                      }}
                                      className="group/stock min-w-[140px] flex flex-col gap-1 text-left"
                                      title="Click to edit stock level"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-mono font-medium flex items-center gap-1 group-hover/stock:text-amber-600 dark:group-hover/stock:text-amber-400">
                                          {item.currentStock} {item.unit}
                                          <PencilLine className="h-3 w-3 opacity-0 group-hover/stock:opacity-100 transition-opacity" />
                                        </span>
                                        <span className="text-muted-foreground">
                                          min: {item.minStock}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="h-3 flex-1 rounded-full bg-muted overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${healthConfig.barColor}`}
                                            style={{ width: `${Math.min(stockPercent, 100)}%` }}
                                          />
                                        </div>
                                        <span className={`text-[11px] font-semibold tabular-nums w-9 text-right ${
                                          health === "CRITICAL"
                                            ? "text-red-600 dark:text-red-400"
                                            : health === "LOW"
                                              ? "text-amber-600 dark:text-amber-400"
                                              : "text-emerald-600 dark:text-emerald-400"
                                        }`}>
                                          {stockPercent}%
                                        </span>
                                      </div>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Click to quick-edit stock level</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`gap-1 text-[10px] font-semibold ${healthConfig.badgeClass}`}
                            >
                              <HealthIcon className="h-3 w-3" />
                              {healthConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatINR(item.lastPurchasePrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatINR(item.avgCost)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.supplier || <span className="text-muted-foreground/60 italic text-xs">Not Set</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help">{formatRelativeTime(item.updatedAt)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {formatDateDDMMYYYY(item.updatedAt)}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(item);
                                }}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteItem(item);
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  –
                  {Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    sortedIngredients.length
                  )}{" "}
                  of {sortedIngredients.length} items
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show first, last, current, and adjacent pages
                        return (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                        );
                      })
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && page - prev > 1;
                        return (
                          <span key={page} className="flex items-center">
                            {showEllipsis && (
                              <span className="px-1 text-muted-foreground">
                                …
                              </span>
                            )}
                            <Button
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          </span>
                        );
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* ─── Movement History Tab ───────────────────────────────────── */}
        <TabsContent value="movements" className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="card-hover card-elevated metric-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Total Purchases
                    </p>
                    <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
                      {formatINR(movementSummary.purchase)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover card-elevated metric-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <ArrowUpRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Total Consumption
                    </p>
                    <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400 truncate">
                      {formatINR(movementSummary.consumption)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover card-elevated metric-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
                    <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Total Wastage
                    </p>
                    <p className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400 truncate">
                      {formatINR(movementSummary.wastage)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Movement Table */}
          <Card className="card-elevated">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Stock Movements</CardTitle>
                  <CardDescription>
                    Complete history of purchases, consumption, wastage, and
                    adjustments
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={handleExportMovements}
                  disabled={
                    movementsLoading || sortedMovements.length === 0
                  }
                  className="shrink-0"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter Row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Type
                  </label>
                  <Select
                    value={movementType}
                    onValueChange={setMovementType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOVEMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Ingredient
                  </label>
                  <Select
                    value={movementIngredientId}
                    onValueChange={setMovementIngredientId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Ingredients" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="ALL">All Ingredients</SelectItem>
                      {ingredients
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={movementDateFrom}
                    onChange={(e) => setMovementDateFrom(e.target.value)}
                    max={movementDateTo || undefined}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={movementDateTo}
                    onChange={(e) => setMovementDateTo(e.target.value)}
                    min={movementDateFrom || undefined}
                  />
                </div>
              </div>

              {/* Active filter chips + clear */}
              {(movementType !== "ALL" ||
                movementIngredientId !== "ALL" ||
                movementDateFrom ||
                movementDateTo) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Active filters:
                  </span>
                  {movementType !== "ALL" && (
                    <Badge variant="secondary" className="gap-1">
                      {MOVEMENT_TYPE_CONFIG[movementType as StockMovementType]
                        ?.label ?? movementType}
                      <button
                        onClick={() => setMovementType("ALL")}
                        className="ml-1 hover:text-foreground"
                        aria-label={`Clear ${movementType} filter`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {movementIngredientId !== "ALL" && (
                    <Badge variant="secondary" className="gap-1">
                      {ingredients.find((i) => i.id === movementIngredientId)
                        ?.name ?? "Ingredient"}
                      <button
                        onClick={() => setMovementIngredientId("ALL")}
                        className="ml-1 hover:text-foreground"
                        aria-label="Clear ingredient filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {movementDateFrom && (
                    <Badge variant="secondary" className="gap-1">
                      From: {formatDateDDMMYYYY(movementDateFrom)}
                      <button
                        onClick={() => setMovementDateFrom("")}
                        className="ml-1 hover:text-foreground"
                        aria-label="Clear from date"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {movementDateTo && (
                    <Badge variant="secondary" className="gap-1">
                      To: {formatDateDDMMYYYY(movementDateTo)}
                      <button
                        onClick={() => setMovementDateTo("")}
                        className="ml-1 hover:text-foreground"
                        aria-label="Clear to date"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      setMovementType("ALL");
                      setMovementIngredientId("ALL");
                      setMovementDateFrom("");
                      setMovementDateTo("");
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              )}

              {/* Table */}
              {movementsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sortedMovements.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <History className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <p className="text-sm font-medium">No movements found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters or record a new stock movement.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="-ml-3 h-8"
                              onClick={handleMovementSortToggle}
                            >
                              Date
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                              <span className="ml-1 text-[10px] text-muted-foreground">
                                {movementSortDir === "asc" ? "↑" : "↓"}
                              </span>
                            </Button>
                          </TableHead>
                          <TableHead>Ingredient</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-right">
                            Total Amount
                          </TableHead>
                          <TableHead className="min-w-[180px]">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMovements.map((m) => {
                          const cfg =
                            MOVEMENT_TYPE_CONFIG[m.type] ?? {
                              label: m.type,
                              badgeClass:
                                "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300 border-gray-200 dark:border-gray-800",
                              Icon: Package as React.ComponentType<{
                                className?: string;
                              }>,
                            };
                          const MovementIcon = cfg.Icon;
                          const isOutgoing =
                            m.type === "CONSUMPTION" ||
                            m.type === "WASTAGE";
                          return (
                            <TableRow
                              key={m.id}
                              className="transition-colors hover:bg-muted/50"
                            >
                              <TableCell className="font-mono text-xs tabular-nums">
                                {formatDateDDMMYYYY(m.date)}
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{m.ingredient?.name ?? "—"}</span>
                                  {m.ingredient?.category && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {m.ingredient.category}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`gap-1 ${cfg.badgeClass}`}
                                >
                                  <MovementIcon className="h-3 w-3" />
                                  {cfg.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums">
                                <span
                                  className={
                                    isOutgoing
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  }
                                >
                                  {isOutgoing ? "−" : "+"}
                                  {m.quantity}
                                </span>
                                <span className="ml-1 text-xs text-muted-foreground">
                                  {m.ingredient?.unit ?? ""}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums">
                                {formatINR(m.unitPrice)}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums font-semibold">
                                {formatINR(m.totalAmount)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                                {m.notes || ""}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing{" "}
                      {(movementPage - 1) * MOVEMENTS_PER_PAGE + 1}
                      {"–"}
                      {Math.min(
                        movementPage * MOVEMENTS_PER_PAGE,
                        sortedMovements.length
                      )}{" "}
                      of {sortedMovements.length} movements
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={movementPage === 1}
                        onClick={() => setMovementPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: totalMovementPages },
                          (_, i) => i + 1
                        )
                          .filter((page) => {
                            return (
                              page === 1 ||
                              page === totalMovementPages ||
                              Math.abs(page - movementPage) <= 1
                            );
                          })
                          .map((page, idx, arr) => {
                            const prev = arr[idx - 1];
                            const showEllipsis = prev && page - prev > 1;
                            return (
                              <span key={page} className="flex items-center">
                                {showEllipsis && (
                                  <span className="px-1 text-muted-foreground">
                                    …
                                  </span>
                                )}
                                <Button
                                  variant={
                                    movementPage === page
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setMovementPage(page)}
                                >
                                  {page}
                                </Button>
                              </span>
                            );
                          })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={movementPage === totalMovementPages}
                        onClick={() => setMovementPage((p) => p + 1)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Add / Edit Dialog ──────────────────────────────────────────────── */}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Ingredient" : "Add Ingredient"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the details of this ingredient."
                : "Add a new raw material to the inventory."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>
                        Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Rice" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unit */}
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Unit <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Category <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Current Stock */}
                <FormField
                  control={form.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Min Stock / Par Level */}
                <FormField
                  control={form.control}
                  name="minStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Stock / Par Level</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Last Purchase Price */}
                <FormField
                  control={form.control}
                  name="lastPurchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Purchase Price (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Avg Cost */}
                <FormField
                  control={form.control}
                  name="avgCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avg Cost (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Supplier */}
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. ABC Traders"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingItem ? "Update" : "Add"} Ingredient
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ────────────────────────────────────────────── */}

      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingredient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteItem?.name}</span>? This
              action cannot be undone. All related stock movements and recipe
              associations will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Detail Dialog ──────────────────────────────────────────────────── */}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              {detailItem?.name}
            </DialogTitle>
            <DialogDescription>
              Ingredient details and history
            </DialogDescription>
          </DialogHeader>

          {detailItem && (
            <div className="space-y-4">
              {/* Stock Health Banner */}
              {(() => {
                const health = getStockHealth(detailItem);
                const config = getStockHealthConfig(health);
                const HIcon = config.Icon;
                const maxStock = detailItem.minStock > 0 ? detailItem.minStock * 3 : detailItem.currentStock > 0 ? detailItem.currentStock : 1;
                const pct = Math.min(Math.round((detailItem.currentStock / maxStock) * 100), 100);
                return (
                  <div className={`rounded-lg border p-3 ${
                    health === "CRITICAL"
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                      : health === "LOW"
                        ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                        : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <HIcon className={`h-4 w-4 ${
                          health === "CRITICAL" ? "text-red-600 dark:text-red-400"
                            : health === "LOW" ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                        }`} />
                        <span className="text-sm font-medium">Stock Level</span>
                      </div>
                      <Badge variant="outline" className={`gap-1 text-[10px] font-semibold ${config.badgeClass}`}>
                        {health}
                      </Badge>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${config.barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{detailItem.currentStock} {detailItem.unit}</span>
                      <span>min: {detailItem.minStock} {detailItem.unit}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge
                    variant="secondary"
                    className={
                      CATEGORY_COLORS[detailItem.category] ||
                      CATEGORY_COLORS.Other
                    }
                  >
                    {detailItem.category}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit</p>
                  <p className="font-medium">{detailItem.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Current Stock
                  </p>
                  <p className="font-medium">
                    {formatStockWithUnit(
                      detailItem.currentStock,
                      detailItem.unit
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Min Stock</p>
                  <p className="font-medium">
                    {formatStockWithUnit(detailItem.minStock, detailItem.unit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Last Purchase Price
                  </p>
                  <p className="font-medium">
                    {formatINR(detailItem.lastPurchasePrice)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Cost</p>
                  <p className="font-medium">
                    {formatINR(detailItem.avgCost)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">
                    {detailItem.supplier || <span className="text-muted-foreground/60 italic text-xs">Not Set</span>}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Stock Movements */}
              <div>
                <h4 className="mb-2 text-sm font-semibold">
                  Recent Stock Movements
                </h4>
                {detailItem.stockMovements &&
                detailItem.stockMovements.length > 0 ? (
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {detailItem.stockMovements.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-md border p-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              m.type === "PURCHASE"
                                ? "default"
                                : m.type === "CONSUMPTION"
                                  ? "secondary"
                                  : m.type === "WASTAGE"
                                    ? "destructive"
                                    : "outline"
                            }
                            className="text-[10px]"
                          >
                            {m.type}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(m.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-mono">
                            {m.type === "CONSUMPTION" ||
                            m.type === "WASTAGE"
                              ? "-"
                              : "+"}
                            {m.quantity} {detailItem.unit}
                          </p>
                          {m.notes && (
                            <p className="text-xs text-muted-foreground">
                              {m.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No stock movements recorded yet.
                  </p>
                )}
              </div>

              <Separator />

              {/* Recipe Usage */}
              <div>
                <h4 className="mb-2 text-sm font-semibold">
                  Used in Recipes
                </h4>
                {detailItem.recipeIngredients &&
                detailItem.recipeIngredients.length > 0 ? (
                  <div className="space-y-2">
                    {detailItem.recipeIngredients.map((ri) => (
                      <div
                        key={ri.id}
                        className="flex items-center justify-between rounded-md border p-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">
                            {ri.recipe.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {ri.recipe.mealType}
                          </Badge>
                          <span className="text-muted-foreground">
                            {ri.quantity} {ri.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Not used in any recipes yet.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailOpen(false)}
            >
              Close
            </Button>
            {detailItem && (
              <Button
                variant="outline"
                onClick={() =>
                  openHistoryForIngredient({
                    id: detailItem.id,
                    name: detailItem.name,
                  })
                }
              >
                <History className="h-4 w-4" />
                View Movement History
              </Button>
            )}
            {detailItem && (
              <Button
                onClick={() => {
                  setDetailOpen(false);
                  openEditDialog(detailItem);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Movement History Dialog ──────────────────────────────────────── */}
      <StockMovementsView
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        initialIngredientId={historyIngredientId}
        initialIngredientName={historyIngredientName}
        ingredients={ingredientOptionsForHistory}
      />
    </div>
  );
}

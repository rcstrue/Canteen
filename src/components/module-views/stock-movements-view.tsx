"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ScrollArea,
} from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DialogFooter,
} from "@/components/ui/dialog";

import { toast as sonnerToast } from "sonner";
import { downloadCSV } from "@/lib/export-utils";

import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  Sigma,
  ShoppingCart,
  UtensilsCrossed,
  Trash2,
  Settings2,
  Download,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Link2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  createdAt: string;
  ingredient: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
}

interface MovementSummary {
  totalIn: number;
  totalInValue: number;
  totalOut: number;
  totalOutValue: number;
  totalValue: number;
  count: number;
}

interface MovementsResponse {
  data: StockMovement[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  summary: MovementSummary;
}

interface IngredientOption {
  id: string;
  name: string;
  unit: string;
  category: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  StockMovementType,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PURCHASE: {
    label: "Purchase",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
    Icon: ShoppingCart,
  },
  CONSUMPTION: {
    label: "Consumption",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    dotClass: "bg-blue-500",
    Icon: UtensilsCrossed,
  },
  WASTAGE: {
    label: "Wastage",
    badgeClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    dotClass: "bg-rose-500",
    Icon: Trash2,
  },
  ADJUSTMENT: {
    label: "Adjustment",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dotClass: "bg-amber-500",
    Icon: Settings2,
  },
};

const ALL_TYPES: StockMovementType[] = [
  "PURCHASE",
  "CONSUMPTION",
  "WASTAGE",
  "ADJUSTMENT",
];

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const parsed = parseISO(dateStr);
    if (isNaN(parsed.getTime())) return "—";
    return format(parsed, "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value || 0);
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface StockMovementsViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIngredientId?: string;
  initialIngredientName?: string;
  ingredients?: IngredientOption[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StockMovementsView({
  open,
  onOpenChange,
  initialIngredientId,
  initialIngredientName,
  ingredients: ingredientsProp,
}: StockMovementsViewProps) {
  // ── Filter state ──────────────────────────────────────────────────────
  const [types, setTypes] = useState<StockMovementType[]>([]);
  const [ingredientId, setIngredientId] = useState<string>(
    initialIngredientId ?? "ALL"
  );
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchApplied, setSearchApplied] = useState<string>("");

  // ── Pagination state ──────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // ── Data state ────────────────────────────────────────────────────────
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState<MovementSummary>({
    totalIn: 0,
    totalInValue: 0,
    totalOut: 0,
    totalOutValue: 0,
    totalValue: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Ingredients list (fall back to fetch if not provided) ─────────────
  const [ingredients, setIngredients] = useState<IngredientOption[]>(
    ingredientsProp ?? []
  );

  useEffect(() => {
    if (ingredientsProp && ingredientsProp.length > 0) {
      setIngredients(ingredientsProp);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ingredients?limit=500");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data)) {
            setIngredients(
              data.map((i: IngredientOption) => ({
                id: i.id,
                name: i.name,
                unit: i.unit,
                category: i.category,
              }))
            );
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ingredientsProp]);

  // ── Sync incoming `initialIngredientId` whenever the dialog opens ────
  useEffect(() => {
    if (open) {
      setIngredientId(initialIngredientId ?? "ALL");
      setTypes([]);
      setFrom("");
      setTo("");
      setSearchInput("");
      setSearchApplied("");
      setPage(1);
    }
  }, [open, initialIngredientId]);

  // ── Build query params ───────────────────────────────────────────────
  const buildQuery = useCallback(
    (overrides?: {
      page?: number;
      limit?: number;
      forExport?: boolean;
    }): string => {
      const params = new URLSearchParams();
      params.set(
        "page",
        String(overrides?.page ?? page ?? 1)
      );
      params.set(
        "limit",
        String(overrides?.limit ?? (overrides?.forExport ? 5000 : pageSize))
      );
      if (types.length > 0) params.set("type", types.join(","));
      if (ingredientId !== "ALL") params.set("ingredientId", ingredientId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (searchApplied) params.set("search", searchApplied);
      return params.toString();
    },
    [page, pageSize, types, ingredientId, from, to, searchApplied]
  );

  // ── Fetch movements ──────────────────────────────────────────────────
  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stock-movements?${buildQuery()}`);
      if (res.ok) {
        const json: MovementsResponse = await res.json();
        setMovements(Array.isArray(json?.data) ? json.data : []);
        setTotal(json?.total ?? 0);
        setHasMore(Boolean(json?.hasMore));
        setSummary(
          json?.summary ?? {
            totalIn: 0,
            totalInValue: 0,
            totalOut: 0,
            totalOutValue: 0,
            totalValue: 0,
            count: 0,
          }
        );
      } else {
        setMovements([]);
        setTotal(0);
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to fetch stock movements:", err);
      setMovements([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    if (!open) return;
    fetchMovements();
  }, [open, fetchMovements]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const toggleType = (t: StockMovementType) => {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
    setPage(1);
  };

  const handleApplyFilters = () => {
    setSearchApplied(searchInput.trim());
    setPage(1);
    // fetchMovements will run automatically because buildQuery depends on
    // searchApplied + page; the useEffect on [open, fetchMovements] re-runs.
  };

  const handleClearFilters = () => {
    setTypes([]);
    setIngredientId("ALL");
    setFrom("");
    setTo("");
    setSearchInput("");
    setSearchApplied("");
    setPage(1);
  };

  const hasActiveFilters =
    types.length > 0 ||
    ingredientId !== "ALL" ||
    Boolean(from) ||
    Boolean(to) ||
    Boolean(searchApplied);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // ── Export CSV ───────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const qs = buildQuery({ page: 1, limit: 5000, forExport: true });
      const res = await fetch(`/api/stock-movements?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch movements for export");
      const json: MovementsResponse = await res.json();
      const rows = (json?.data ?? []).map((m) => ({
        Date: formatDateDDMMYYYY(m.date),
        Type: m.type,
        "Ingredient Name": m.ingredient?.name ?? "",
        Category: m.ingredient?.category ?? "",
        Quantity: m.quantity,
        Unit: m.ingredient?.unit ?? "",
        "Unit Price": m.unitPrice,
        "Total Amount": m.totalAmount,
        Notes: m.notes ?? "",
        "Reference ID": m.referenceId ?? "",
      }));
      if (rows.length === 0) {
        sonnerToast.warning("Nothing to export", {
          description: "No movements match the current filters.",
        });
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      downloadCSV(`stock-movements-${today}.csv`, rows);
      sonnerToast.success("Export complete", {
        description: `${rows.length} movement${
          rows.length === 1 ? "" : "s"
        } exported as CSV.`,
      });
    } catch (err) {
      console.error("Failed to export CSV:", err);
      sonnerToast.error("Export failed", {
        description: "Could not generate the CSV. Please try again.",
      });
    } finally {
      setExporting(false);
    }
  };

  // ── Derived values ───────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const fromIdx = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const toIdx = Math.min(safePage * pageSize, total);
  const netMovement = summary.totalIn - summary.totalOut;

  const ingredientLabel =
    ingredientId === "ALL"
      ? "All Ingredients"
      : ingredients.find((i) => i.id === ingredientId)?.name ??
        initialIngredientName ??
        "Selected Ingredient";

  // ── Pagination page list (with ellipsis) ─────────────────────────────
  const pageList = useMemo(() => {
    const out: (number | "…")[] = [];
    const push = (n: number | "…") => {
      if (out[out.length - 1] !== n) out.push(n);
    };
    for (let p = 1; p <= totalPages; p++) {
      if (
        p === 1 ||
        p === totalPages ||
        Math.abs(p - safePage) <= 1
      ) {
        push(p);
      } else {
        push("…");
      }
    }
    return out;
  }, [safePage, totalPages]);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40 shrink-0">
                <History className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  Stock Movement History
                </DialogTitle>
                <DialogDescription>
                  Complete audit trail of all stock transactions
                  {ingredientId !== "ALL" && (
                    <span className="ml-1 text-orange-700 dark:text-orange-300 font-medium">
                      · {ingredientLabel}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {/* ─── Summary Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total IN */}
              <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                      <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Total IN (Purchase)
                      </p>
                      <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300 truncate">
                        {formatNumber(summary.totalIn)} units
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatINR(summary.totalInValue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total OUT */}
              <Card className="border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/50">
                      <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Total OUT (Consumed + Wasted)
                      </p>
                      <p className="text-lg font-bold tabular-nums text-rose-700 dark:text-rose-300 truncate">
                        {formatNumber(summary.totalOut)} units
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatINR(summary.totalOutValue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Transactions */}
              <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                      <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Total Transactions
                      </p>
                      <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300 truncate">
                        {formatNumber(summary.count, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatINR(summary.totalValue)} value
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Net Movement */}
              <Card className="border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-200 dark:bg-stone-800">
                      <Sigma className="h-4 w-4 text-stone-700 dark:text-stone-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Net Movement (IN − OUT)
                      </p>
                      <p
                        className={`text-lg font-bold tabular-nums truncate ${
                          netMovement >= 0
                            ? "text-stone-700 dark:text-stone-200"
                            : "text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {netMovement >= 0 ? "+" : "−"}
                        {formatNumber(Math.abs(netMovement))} units
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {netMovement >= 0 ? "Net stock added" : "Net stock used"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ─── Filters Bar ───────────────────────────────────────── */}
            <div className="rounded-lg border bg-card text-card-foreground p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                {/* Type multi-select badges */}
                <div className="md:col-span-12 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Movement Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_TYPES.map((t) => {
                      const cfg = TYPE_CONFIG[t];
                      const Icon = cfg.Icon;
                      const active = types.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleType(t)}
                          aria-pressed={active}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            active
                              ? `${cfg.badgeClass}`
                              : "bg-background text-muted-foreground border-input hover:bg-muted"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {cfg.label}
                          {active && <X className="h-3 w-3 ml-0.5 opacity-70" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ingredient select */}
                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Ingredient
                  </label>
                  <Select
                    value={ingredientId}
                    onValueChange={(v) => {
                      setIngredientId(v);
                      setPage(1);
                    }}
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
                            <span className="ml-2 text-[10px] text-muted-foreground">
                              {ing.category}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* From date */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setPage(1);
                    }}
                    max={to || undefined}
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                {/* To date */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setPage(1);
                    }}
                    min={from || undefined}
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                {/* Search */}
                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Search (notes / ingredient)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="e.g. monthly purchase, rice…"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyFilters();
                        }
                      }}
                      className="pl-9"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          setSearchApplied("");
                          setPage(1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters && !searchInput}
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={exporting || loading || total === 0}
                >
                  {exporting ? (
                    <History className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyFilters}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Filter className="h-4 w-4" />
                  Apply Filters
                </Button>
              </div>

              {/* Active filter chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">
                    Active:
                  </span>
                  {types.map((t) => {
                    const cfg = TYPE_CONFIG[t];
                    return (
                      <Badge
                        key={t}
                        variant="secondary"
                        className={`gap-1 ${cfg.badgeClass}`}
                      >
                        {cfg.label}
                        <button
                          onClick={() => toggleType(t)}
                          className="ml-1 hover:text-foreground"
                          aria-label={`Remove ${cfg.label} filter`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                  {ingredientId !== "ALL" && (
                    <Badge variant="secondary" className="gap-1">
                      {ingredientLabel}
                      <button
                        onClick={() => {
                          setIngredientId("ALL");
                          setPage(1);
                        }}
                        className="ml-1 hover:text-foreground"
                        aria-label="Clear ingredient filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {from && (
                    <Badge variant="secondary" className="gap-1">
                      From: {formatDateDDMMYYYY(from)}
                      <button
                        onClick={() => {
                          setFrom("");
                          setPage(1);
                        }}
                        className="ml-1 hover:text-foreground"
                        aria-label="Clear from date"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {to && (
                    <Badge variant="secondary" className="gap-1">
                      To: {formatDateDDMMYYYY(to)}
                      <button
                        onClick={() => {
                          setTo("");
                          setPage(1);
                        }}
                        className="ml-1 hover:text-foreground"
                        aria-label="Clear to date"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {searchApplied && (
                    <Badge variant="secondary" className="gap-1">
                      Search: “{searchApplied}”
                      <button
                        onClick={() => {
                          setSearchInput("");
                          setSearchApplied("");
                          setPage(1);
                        }}
                        className="ml-1 hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* ─── History Table ─────────────────────────────────────── */}
            {loading ? (
              <div className="rounded-md border">
                <div className="space-y-0">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                    >
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <History className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-base font-semibold text-foreground">
                  No Movements Found
                </p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Try adjusting your filters to find what you're looking for."
                    : "Adjust filters or record new stock movements to see them here."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters}
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[110px]">Date</TableHead>
                      <TableHead className="w-[140px]">Type</TableHead>
                      <TableHead className="min-w-[180px]">Ingredient</TableHead>
                      <TableHead className="text-right w-[110px]">Qty</TableHead>
                      <TableHead className="text-right w-[110px]">
                        Unit Price
                      </TableHead>
                      <TableHead className="text-right w-[130px]">
                        Total
                      </TableHead>
                      <TableHead className="min-w-[200px]">Notes</TableHead>
                      <TableHead className="w-[120px]">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => {
                      const cfg = TYPE_CONFIG[m.type] ?? {
                        label: m.type,
                        badgeClass:
                          "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300 border-gray-200 dark:border-gray-800",
                        dotClass: "bg-gray-500",
                        Icon: History as React.ComponentType<{
                          className?: string;
                        }>,
                      };
                      const TypeIcon = cfg.Icon;
                      const isOutgoing =
                        m.type === "CONSUMPTION" || m.type === "WASTAGE";
                      return (
                        <TableRow
                          key={m.id}
                          className="transition-colors hover:bg-muted/50"
                        >
                          <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap">
                            {formatDateDDMMYYYY(m.date)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`gap-1 ${cfg.badgeClass}`}
                            >
                              <TypeIcon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {m.ingredient?.name ?? "—"}
                              </span>
                              {m.ingredient?.category && (
                                <span className="text-[10px] text-muted-foreground">
                                  {m.ingredient.category}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                            <span
                              className={
                                isOutgoing
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }
                            >
                              {isOutgoing ? "−" : "+"}
                              {formatNumber(m.quantity)}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              {m.ingredient?.unit ?? ""}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                            {formatINR(m.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums whitespace-nowrap font-semibold">
                            {formatINR(m.totalAmount)}
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            {m.notes ? (
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate text-sm text-muted-foreground cursor-help">
                                      {m.notes}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-sm break-words"
                                  >
                                    {m.notes}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {m.referenceId ? (
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="gap-1 font-mono text-[10px] cursor-help"
                                    >
                                      <Link2 className="h-3 w-3" />
                                      {m.referenceId.length > 8
                                        ? `${m.referenceId.slice(0, 8)}…`
                                        : m.referenceId}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <span className="font-mono">
                                      {m.referenceId}
                                    </span>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* ─── Pagination ────────────────────────────────────────── */}
            {!loading && movements.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    Showing{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {fromIdx}
                    </span>
                    {"–"}
                    <span className="font-medium text-foreground tabular-nums">
                      {toIdx}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {total}
                    </span>{" "}
                    entries
                  </p>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground">
                      Rows:
                    </label>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) =>
                        handlePageSizeChange(parseInt(v, 10))
                      }
                    >
                      <SelectTrigger className="h-8 w-[72px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {pageList.map((p, idx) =>
                      p === "…" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-muted-foreground select-none"
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={p}
                          variant={safePage === p ? "default" : "outline"}
                          size="sm"
                          className={`h-8 w-8 p-0 ${
                            safePage === p
                              ? "bg-orange-600 hover:bg-orange-700 text-white"
                              : ""
                          }`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages || !hasMore}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t bg-muted/30">
          <div className="flex w-full items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {total > 0
                ? `${movements.length} of ${total} movements shown`
                : "No movements to display"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StockMovementsView;

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import {
  Trash2,
  Plus,
  ArrowUpDown,
  IndianRupee,
  CalendarDays,
  AlertTriangle,
  TrendingDown,
  Loader2,
  X,
  AlertCircle,
  Flame,
  Download,
  BarChart3,
  Trophy,
} from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { downloadCSV } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/utils";

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
}

interface WastageEntry {
  id: string;
  ingredientId: string;
  type: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: string;
  notes: string | null;
  createdAt: string;
  ingredient: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
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
];

const COMMON_REASONS = [
  "Spoiled",
  "Expired",
  "Dropped",
  "Overcooked",
  "Burnt",
  "Spillage",
  "Contamination",
  "Pest damage",
];

const CATEGORY_COLORS: Record<string, string> = {
  Vegetables: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Grains: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Oil: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Spices: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Dairy: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Meat: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  Pulses: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// formatINR from @/lib/utils is used for currency formatting

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getTodayStr(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function getMonthStartStr(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

type Severity = "LOW" | "MEDIUM" | "HIGH";

function getWastageSeverity(amount: number): Severity {
  if (amount < 100) return "LOW";
  if (amount < 500) return "MEDIUM";
  return "HIGH";
}

function getSeverityConfig(severity: Severity): { label: string; badgeClass: string } {
  switch (severity) {
    case "HIGH":
      return {
        label: "HIGH",
        badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
      };
    case "MEDIUM":
      return {
        label: "MEDIUM",
        badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    case "LOW":
    default:
      return {
        label: "LOW",
        badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
  }
}

const WASTAGE_CHART_CONFIG: ChartConfig = {
  wastageCost: {
    label: "Wastage Cost",
    color: "oklch(0.6 0.15 30)",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function WastageView() {
  const { toast } = useToast();
  // Data state
  const [wastageEntries, setWastageEntries] = useState<WastageEntry[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [dateFilter, setDateFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formIngredientId, setFormIngredientId] = useState<string>("");
  const [formQuantity, setFormQuantity] = useState<string>("");
  const [formUnitPrice, setFormUnitPrice] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(getTodayStr());
  const [formNotes, setFormNotes] = useState<string>("");
  const [formError, setFormError] = useState<string>("");

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchWastage = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "WASTAGE", limit: "200" });
      if (dateFilter) {
        params.set("startDate", dateFilter);
        params.set("endDate", dateFilter);
      }
      const res = await fetch(`/api/stock-movements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        let data: WastageEntry[] = json.data || [];
        if (categoryFilter !== "All") {
          data = data.filter((e) => e.ingredient?.category === categoryFilter);
        }
        setWastageEntries(data);
      }
    } catch (err) {
      console.error("Error fetching wastage:", err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, categoryFilter]);

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await fetch("/api/ingredients");
      if (res.ok) {
        const data = await res.json();
        setIngredients(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching ingredients:", err);
    }
  }, []);

  useEffect(() => {
    fetchWastage();
  }, [fetchWastage]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const today = getTodayStr();
  const monthStart = getMonthStartStr();

  const todayEntries = wastageEntries.filter((e) => {
    const entryDate = new Date(e.date).toISOString().split("T")[0];
    return entryDate === today;
  });

  const monthEntries = wastageEntries.filter((e) => {
    const entryDate = new Date(e.date).toISOString().split("T")[0];
    return entryDate >= monthStart;
  });

  const totalWastageMonth = monthEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalWastageToday = todayEntries.reduce((sum, e) => sum + e.totalAmount, 0);
  const wastageCountMonth = monthEntries.length;

  // Sorted entries
  const sortedEntries = [...wastageEntries].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortDir === "desc" ? dateB - dateA : dateA - dateB;
  });

  // ─── 7-Day Wastage Trend Chart Data ────────────────────────────────────────
  const sevenDayTrend = useMemo(() => {
    const days: { date: string; label: string; wastageCost: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
      const dayTotal = wastageEntries
        .filter((e) => e.date.split("T")[0] === dateStr)
        .reduce((sum, e) => sum + e.totalAmount, 0);
      days.push({ date: dateStr, label: dayLabel, wastageCost: Math.round(dayTotal * 100) / 100 });
    }
    return days;
  }, [wastageEntries]);

  // ─── Top Wasted Items ─────────────────────────────────────────────────────
  const topWastedItems = useMemo(() => {
    const byItem: Record<string, { name: string; category: string; totalLoss: number; totalQty: number; unit: string }> = {};
    wastageEntries.forEach((e) => {
      const key = e.ingredientId;
      if (!byItem[key]) {
        byItem[key] = {
          name: e.ingredient?.name || "Unknown",
          category: e.ingredient?.category || "Other",
          totalLoss: 0,
          totalQty: 0,
          unit: e.ingredient?.unit || "",
        };
      }
      byItem[key].totalLoss += e.totalAmount;
      byItem[key].totalQty += e.quantity;
    });
    return Object.values(byItem)
      .sort((a, b) => b.totalLoss - a.totalLoss)
      .slice(0, 5);
  }, [wastageEntries]);

  // ─── Form Logic ────────────────────────────────────────────────────────────

  const selectedIngredient = ingredients.find((i) => i.id === formIngredientId);

  const totalLossPreview =
    (parseFloat(formQuantity) || 0) * (parseFloat(formUnitPrice) || 0);

  function handleIngredientChange(id: string) {
    setFormIngredientId(id);
    const ing = ingredients.find((i) => i.id === id);
    if (ing) {
      setFormUnitPrice(ing.avgCost > 0 ? String(ing.avgCost) : String(ing.lastPurchasePrice));
    } else {
      setFormUnitPrice("");
    }
  }

  function handleReasonSelect(reason: string) {
    setFormNotes((prev) => {
      const parts = prev.split("; ").filter(Boolean);
      if (parts.includes(reason)) return prev;
      return prev ? `${prev}; ${reason}` : reason;
    });
  }

  function resetForm() {
    setFormIngredientId("");
    setFormQuantity("");
    setFormUnitPrice("");
    setFormDate(getTodayStr());
    setFormNotes("");
    setFormError("");
  }

  async function handleSubmit() {
    setFormError("");

    if (!formIngredientId) {
      setFormError("Please select an ingredient.");
      return;
    }
    const qty = parseFloat(formQuantity);
    if (!qty || qty <= 0) {
      setFormError("Please enter a valid quantity greater than 0.");
      return;
    }
    const price = parseFloat(formUnitPrice);
    if (isNaN(price) || price < 0) {
      setFormError("Please enter a valid unit price.");
      return;
    }
    if (!formDate) {
      setFormError("Please select a date.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: formIngredientId,
          type: "WASTAGE",
          quantity: qty,
          unitPrice: price,
          totalAmount: qty * price,
          date: formDate,
          notes: formNotes || null,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        fetchWastage();
      } else {
        const json = await res.json();
        setFormError(json.error || "Failed to record wastage.");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 view-enter">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Wastage Tracking</h1>
            <p className="text-muted-foreground">
              Record spoilage and waste, analyze cost impact
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 w-[150px]"
              placeholder="Filter by date"
            />
            {dateFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setDateFilter("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-[150px]">
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

          {/* Export CSV Button */}
          <Button
            variant="outline"
            onClick={() => {
              const rows = sortedEntries.map((e) => ({
                Date: formatDate(e.date),
                Ingredient: e.ingredient?.name ?? "—",
                Category: e.ingredient?.category ?? "—",
                Quantity: String(e.quantity),
                Unit: e.ingredient?.unit ?? "—",
                "Unit Cost": String(e.unitPrice),
                "Total Loss": String(e.totalAmount),
                Reason: e.notes || "—",
              }));
              downloadCSV("wastage.csv", rows);
              toast({
                title: "Export successful",
                description: `${rows.length} wastage entr${rows.length === 1 ? "y" : "ies"} exported as CSV.`,
              });
            }}
            disabled={wastageEntries.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          {/* Record Wastage Button */}
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Wastage
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Total Wastage This Month */}
        <Card className="card-hover card-elevated border-red-200 dark:border-red-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Wastage This Month
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30">
              <IndianRupee className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatINR(totalWastageMonth)}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Financial loss from wastage
            </p>
          </CardContent>
        </Card>

        {/* Total Wastage Today */}
        <Card className="card-hover card-elevated border-orange-200 dark:border-orange-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Wastage Today
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-900/30">
              <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatINR(totalWastageToday)}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Today&apos;s waste cost
            </p>
          </CardContent>
        </Card>

        {/* Wastage Entries This Month */}
        <Card className="card-hover card-elevated border-red-200 dark:border-red-900/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entries This Month
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {wastageCountMonth}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Wastage incidents recorded
                </p>
                {wastageCountMonth > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                      {monthEntries.filter((e) => getWastageSeverity(e.totalAmount) === "LOW").length} LOW
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                      {monthEntries.filter((e) => getWastageSeverity(e.totalAmount) === "MEDIUM").length} MED
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800">
                      {monthEntries.filter((e) => getWastageSeverity(e.totalAmount) === "HIGH").length} HIGH
                    </Badge>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Total Wastage Value Highlight Card */}
      <Card className="card-elevated border-red-300/60 dark:border-red-800/40 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/5 dark:from-red-500/20 dark:via-orange-500/15 dark:to-red-500/10">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-200/60 dark:bg-red-800/40 shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-700 dark:text-red-300" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-red-700 dark:text-red-400">
                    Total Wastage Value
                  </p>
                  <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                    <span className="text-4xl font-bold tabular-nums text-red-900 dark:text-red-100">
                      {loading ? "—" : formatINR(totalWastageMonth)}
                    </span>
                    <span className="text-sm text-red-700 dark:text-red-400">
                      this month
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                    Today: <span className="font-semibold tabular-nums">{loading ? "—" : formatINR(totalWastageToday)}</span> · {wastageCountMonth} incidents
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800">
                  {monthEntries.filter((e) => getWastageSeverity(e.totalAmount) === "HIGH").length} High
                </Badge>
                <Badge variant="outline" className="gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  {monthEntries.filter((e) => getWastageSeverity(e.totalAmount) === "MEDIUM").length} Medium
                </Badge>
                <Badge variant="outline" className="gap-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                  {monthEntries.filter((e) => getWastageSeverity(e.totalAmount) === "LOW").length} Low
                </Badge>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* 7-Day Wastage Trend + Top Wasted Items */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 7-Day Trend Chart */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-red-500" />
              7-Day Wastage Trend
            </CardTitle>
            <CardDescription>
              Daily wastage cost over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : sevenDayTrend.every((d) => d.wastageCost === 0) ? (
              <div className="flex h-[180px] flex-col items-center justify-center text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No wastage in the last 7 days</p>
              </div>
            ) : (
              <ChartContainer config={WASTAGE_CHART_CONFIG} className="h-[180px] w-full">
                <LineChart data={sevenDayTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(v: number) => `₹${v}`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [formatINR(value), "Wastage Cost"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="wastageCost"
                    stroke="oklch(0.6 0.15 30)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "oklch(0.6 0.15 30)" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Wasted Items */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-amber-500" />
              Top Wasted Items
            </CardTitle>
            <CardDescription>
              Items with highest total wastage loss
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : topWastedItems.length === 0 ? (
              <div className="flex h-[180px] flex-col items-center justify-center text-center">
                <Trash2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No wastage data to rank</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topWastedItems.map((item, idx) => {
                  const maxLoss = topWastedItems[0]?.totalLoss || 1;
                  const barWidth = Math.max(5, (item.totalLoss / maxLoss) * 100);
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-[10px] font-bold text-red-600 dark:text-red-400 shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium truncate">{item.name}</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[item.category] || ""}`}
                          >
                            {item.category}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums whitespace-nowrap">
                          {formatINR(item.totalLoss)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-400 transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Wastage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Wastage Log
          </CardTitle>
          <CardDescription>
            All recorded wastage entries sorted by date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 py-12">
              <Trash2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No wastage entries found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dateFilter || categoryFilter !== "All"
                  ? "Try adjusting your filters"
                  : "Click \"Record Wastage\" to add your first entry"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </div>
                    </TableHead>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Loss</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Reason / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry) => {
                    const severity = getWastageSeverity(entry.totalAmount);
                    const severityConfig = getSeverityConfig(severity);
                    return (
                    <TableRow
                      key={entry.id}
                      className="hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{entry.ingredient?.name || "Unknown"}</span>
                          {entry.ingredient?.category && (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 ${
                                CATEGORY_COLORS[entry.ingredient.category] || ""
                              }`}
                            >
                              {entry.ingredient.category}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.ingredient?.unit || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatINR(entry.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600 dark:text-red-400">
                        {formatINR(entry.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1 text-[11px] font-bold px-2 py-0.5 ${severityConfig.badgeClass}`}
                        >
                          {severityConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {entry.notes || "-"}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Wastage Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              Record Wastage
            </DialogTitle>
            <DialogDescription>
              Log spoilage, expired items, or other waste to track losses and
              update stock levels automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Ingredient */}
            <div className="grid gap-2">
              <Label htmlFor="wastage-ingredient">Ingredient *</Label>
              <Select
                value={formIngredientId}
                onValueChange={handleIngredientChange}
              >
                <SelectTrigger id="wastage-ingredient">
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit}) — Stock: {ing.currentStock} {ing.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedIngredient && (
                <p className="text-xs text-muted-foreground">
                  Current stock:{" "}
                  <span className="font-medium">
                    {selectedIngredient.currentStock} {selectedIngredient.unit}
                  </span>{" "}
                  | Avg cost:{" "}
                  <span className="font-medium">
                    {formatINR(selectedIngredient.avgCost)}/{selectedIngredient.unit}
                  </span>
                </p>
              )}
            </div>

            {/* Quantity & Unit Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wastage-quantity">Quantity *</Label>
                <Input
                  id="wastage-quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                />
                {selectedIngredient && (
                  <p className="text-xs text-muted-foreground">
                    Unit: {selectedIngredient.unit}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wastage-unitprice">
                  Unit Price (₹) *
                </Label>
                <Input
                  id="wastage-unitprice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formUnitPrice}
                  onChange={(e) => setFormUnitPrice(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-filled from avg cost
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="wastage-date">Date *</Label>
              <Input
                id="wastage-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            {/* Wastage Reason Dropdown */}
            <div className="grid gap-2">
              <Label htmlFor="wastage-reason">Wastage Reason</Label>
              <Select
                value=""
                onValueChange={(val) => {
                  if (val) handleReasonSelect(val);
                }}
              >
                <SelectTrigger id="wastage-reason">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spoilage">Spoilage</SelectItem>
                  <SelectItem value="Overcooking">Overcooking</SelectItem>
                  <SelectItem value="Excess">Excess</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Reason Buttons */}
            <div className="grid gap-2">
              <Label>Quick Reason</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_REASONS.map((reason) => (
                  <Button
                    key={reason}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`h-7 text-xs ${
                      formNotes
                        .split("; ")
                        .includes(reason)
                        ? "border-red-400 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-400"
                        : "hover:border-red-300 hover:bg-red-50/50 dark:hover:border-red-800 dark:hover:bg-red-950/20"
                    }`}
                    onClick={() => handleReasonSelect(reason)}
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            </div>

            {/* Notes / Reason */}
            <div className="grid gap-2">
              <Label htmlFor="wastage-notes">Reason / Notes</Label>
              <Textarea
                id="wastage-notes"
                placeholder="e.g., Spoiled; Expired — describe the reason for wastage"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Total Loss Preview */}
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    Total Loss Preview
                  </span>
                </div>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatINR(totalLossPreview)}
                </span>
              </div>
              <p className="mt-1 text-xs text-red-600/70 dark:text-red-400/70">
                {parseFloat(formQuantity) || 0} {selectedIngredient?.unit || "units"} ×{" "}
                {formatINR(parseFloat(formUnitPrice) || 0)} per unit
              </p>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Record Wastage
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  IndianRupee,
  CalendarDays,
  Flame,
  Zap,
  Droplets,
  Wrench,
  MoreHorizontal,
  Loader2,
  X,
  TrendingUp,
  ArrowUpDown,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = ["Gas", "Electricity", "Water", "Maintenance", "Other"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<Category, string> = {
  Gas: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  Electricity: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  Water: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  Maintenance: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300 border-gray-200 dark:border-gray-800",
};

const CATEGORY_PIE_COLORS: Record<Category, string> = {
  Gas: "#f97316",
  Electricity: "#eab308",
  Water: "#3b82f6",
  Maintenance: "#22c55e",
  Other: "#6b7280",
};

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  Gas: <Flame className="h-3 w-3" />,
  Electricity: <Zap className="h-3 w-3" />,
  Water: <Droplets className="h-3 w-3" />,
  Maintenance: <Wrench className="h-3 w-3" />,
  Other: <MoreHorizontal className="h-3 w-3" />,
};

const CHART_CONFIG: ChartConfig = {
  Gas: { label: "Gas", color: "#f97316" },
  Electricity: { label: "Electricity", color: "#eab308" },
  Water: { label: "Water", color: "#3b82f6" },
  Maintenance: { label: "Maintenance", color: "#22c55e" },
  Other: { label: "Other", color: "#6b7280" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

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
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExpensesView() {
  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<"date" | "amount" | "category">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Form state
  const [formDate, setFormDate] = useState(getTodayStr());
  const [formCategory, setFormCategory] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("limit", "200");

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setExpenses(json.data || []);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, startDate, endDate]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // ─── Computed ──────────────────────────────────────────────────────────────

  const todayStr = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const totalThisMonth = expenses
    .filter((e) => new Date(e.date) >= monthStart)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalToday = expenses
    .filter((e) => e.date.split("T")[0] === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const categoryBreakdown = CATEGORIES.map((cat) => ({
    category: cat,
    total: expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0),
  })).filter((c) => c.total > 0);

  const pieData = categoryBreakdown.map((c) => ({
    name: c.category,
    value: c.total,
    fill: CATEGORY_PIE_COLORS[c.category as Category],
  }));

  // ─── Sort ──────────────────────────────────────────────────────────────────

  const sortedExpenses = [...expenses].sort((a, b) => {
    let cmp = 0;
    if (sortField === "date") {
      cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortField === "amount") {
      cmp = a.amount - b.amount;
    } else {
      cmp = a.category.localeCompare(b.category);
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  function handleSort(field: "date" | "amount" | "category") {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  // ─── Dialog handlers ───────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingExpense(null);
    setFormDate(getTodayStr());
    setFormCategory("");
    setFormAmount("");
    setFormDescription("");
    setDialogOpen(true);
  }

  function openEditDialog(expense: Expense) {
    setEditingExpense(expense);
    setFormDate(expense.date.split("T")[0]);
    setFormCategory(expense.category);
    setFormAmount(String(expense.amount));
    setFormDescription(expense.description || "");
    setDialogOpen(true);
  }

  function openDeleteDialog(expense: Expense) {
    setDeletingExpense(expense);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit() {
    if (!formDate || !formCategory || !formAmount || Number(formAmount) <= 0) return;

    setSubmitting(true);
    try {
      const body = {
        date: formDate,
        category: formCategory,
        amount: Number(formAmount),
        description: formDescription || null,
      };

      if (editingExpense) {
        const res = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update");
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create");
      }

      setDialogOpen(false);
      fetchExpenses();
    } catch (err) {
      console.error("Error saving expense:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingExpense) return;
    try {
      const res = await fetch(`/api/expenses/${deletingExpense.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteDialogOpen(false);
      setDeletingExpense(null);
      fetchExpenses();
    } catch (err) {
      console.error("Error deleting expense:", err);
    }
  }

  // ─── Custom Tooltip for Pie ────────────────────────────────────────────────

  function PieTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
      <div className="border-border/50 bg-background rounded-lg border px-3 py-2 text-xs shadow-xl">
        <p className="font-medium">{item.name}</p>
        <p className="text-muted-foreground">{formatCurrency(item.value)}</p>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
            <Receipt className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground text-sm">
              Track overhead expenses, utility bills &amp; non-food costs
            </p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* ─── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[160px]"
          />
        </div>
        {(categoryFilter !== "all" || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            onClick={() => {
              setCategoryFilter("all");
              setStartDate("");
              setEndDate("");
            }}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* ─── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total This Month */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
                <CalendarDays className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total This Month</p>
                {loading ? (
                  <Skeleton className="h-7 w-32" />
                ) : (
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(totalThisMonth)}
                  </p>
                )}
              </div>
              <TrendingUp className="h-5 w-5 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        {/* Total Today */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                <IndianRupee className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Today</p>
                {loading ? (
                  <Skeleton className="h-7 w-32" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(totalToday)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown Inline */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-3">By Category</p>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : categoryBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No expenses recorded</p>
            ) : (
              <div className="space-y-2">
                {categoryBreakdown.map((c) => (
                  <div key={c.category} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {CATEGORY_ICONS[c.category as Category]}
                      <span className="text-xs font-medium">{c.category}</span>
                    </div>
                    <span className="text-xs font-semibold">{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Main Content: Table + Pie Chart ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Expenses Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Expense Records</CardTitle>
            <CardDescription>
              {loading
                ? "Loading..."
                : `${expenses.length} expense${expenses.length !== 1 ? "s" : ""} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : sortedExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm font-medium">No expenses found</p>
                <p className="text-muted-foreground/70 text-xs mt-1">
                  Add your first expense or adjust filters
                </p>
                <Button
                  onClick={openAddDialog}
                  variant="outline"
                  className="mt-4 gap-2 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer select-none hover:text-foreground"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:text-foreground"
                        onClick={() => handleSort("category")}
                      >
                        <div className="flex items-center gap-1">
                          Category
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:text-foreground text-right"
                        onClick={() => handleSort("amount")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Amount
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedExpenses.map((expense) => (
                      <TableRow
                        key={expense.id}
                        className="hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors"
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatDate(expense.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1 ${CATEGORY_COLORS[expense.category as Category] || CATEGORY_COLORS.Other}`}
                          >
                            {CATEGORY_ICONS[expense.category as Category]}
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold whitespace-nowrap">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                          {expense.description || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-orange-600"
                              onClick={() => openEditDialog(expense)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              onClick={() => openDeleteDialog(expense)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown Pie Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
            <CardDescription>Expense distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-[200px] w-[200px] rounded-full" />
                <div className="w-full space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ) : pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground text-xs">No data for chart</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ChartContainer config={CHART_CONFIG} className="mx-auto aspect-square max-h-[220px] w-full">
                  <PieChart>
                    <ChartTooltip content={<PieTooltipContent />} />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      strokeWidth={2}
                      stroke="var(--background)"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 w-full space-y-2">
                  {categoryBreakdown.map((c) => {
                    const total = categoryBreakdown.reduce((s, x) => s + x.total, 0);
                    const pct = total > 0 ? ((c.total / total) * 100).toFixed(1) : "0";
                    return (
                      <div key={c.category} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: CATEGORY_PIE_COLORS[c.category as Category] }}
                          />
                          <span className="text-xs font-medium">{c.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{formatCurrency(c.total)}</span>
                          <span className="text-xs text-muted-foreground">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Add/Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? "Update the expense details below"
                : "Record a new expense entry"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="exp-date" className="text-sm font-medium">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="exp-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="exp-category" className="text-sm font-medium">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger id="exp-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[cat]}
                        {cat}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="exp-amount" className="text-sm font-medium">
                Amount (₹) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="exp-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="exp-desc" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="exp-desc"
                placeholder="Optional notes about this expense..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
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
              disabled={submitting || !formDate || !formCategory || !formAmount || Number(formAmount) <= 0}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingExpense ? "Update" : "Add"} Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense record?
              {deletingExpense && (
                <span className="mt-2 block font-medium text-foreground">
                  {deletingExpense.category} — {formatCurrency(deletingExpense.amount)} on{" "}
                  {formatDate(deletingExpense.date)}
                </span>
              )}
              <span className="mt-1 block">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

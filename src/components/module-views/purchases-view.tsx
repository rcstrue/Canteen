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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ShoppingCart,
  Plus,
  Search,
  Trash2,
  Eye,
  X,
  Loader2,
  CalendarDays,
  FileText,
  IndianRupee,
  Package,
  ChevronLeft,
  ChevronRight,
  Minus,
  AlertTriangle,
  Download,
  Clock,
  CheckCircle2,
  Banknote,
  CircleDot,
  Printer,
  Flame,
  ListChecks,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { downloadCSV } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

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

interface PurchaseItem {
  id: string;
  purchaseId: string;
  ingredientId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  ingredient: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
}

interface Purchase {
  id: string;
  date: string;
  supplier: string | null;
  invoiceNo: string | null;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  items: PurchaseItem[];
}

interface NewPurchaseItem {
  ingredientId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
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

/** Build a friendly PUR-XXXX invoice number from a purchase id. */
function getInvoiceNumber(purchase: Purchase): string {
  if (purchase.invoiceNo && purchase.invoiceNo.trim()) {
    return purchase.invoiceNo.trim();
  }
  // Derive a deterministic short id from the purchase id
  const short = purchase.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return `PUR-${short || "0000"}`;
}

// Purchase status based on date (simulated since no status field in DB)
type PurchaseStatus = "Pending" | "Received" | "Paid";

function getPurchaseStatus(purchase: Purchase): PurchaseStatus {
  const purchaseDate = new Date(purchase.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Pending";
  if (diffDays <= 7) return "Received";
  return "Paid";
}

function getStatusConfig(status: PurchaseStatus): {
  label: string;
  badgeClass: string;
  Icon: React.ComponentType<{ className?: string }>;
} {
  switch (status) {
    case "Pending":
      return {
        label: "Pending",
        badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        Icon: Clock,
      };
    case "Received":
      return {
        label: "Received",
        badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        Icon: CheckCircle2,
      };
    case "Paid":
      return {
        label: "Paid",
        badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        Icon: Banknote,
      };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PurchasesView() {
  const { toast } = useToast();
  // ── State ────────────────────────────────────────────────────────────────
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false);
  const [newPurchaseOpen, setNewPurchaseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkPrintListOpen, setBulkPrintListOpen] = useState(false);

  // New purchase form
  const [formDate, setFormDate] = useState(getTodayStr());
  const [formSupplier, setFormSupplier] = useState("");
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<NewPurchaseItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String((page - 1) * pageSize));
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (search) params.set("supplier", search);

      const res = await fetch(`/api/purchases?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, search]);

  // Reset selection whenever the page or filter changes — selected ids from
  // a previous page no longer correspond to visible rows.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, startDate, endDate, search]);

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
    fetchPurchases();
  }, [fetchPurchases]);

  useEffect(() => {
    if (newPurchaseOpen) {
      fetchIngredients();
    }
  }, [newPurchaseOpen, fetchIngredients]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleViewDetail = async (purchase: Purchase) => {
    try {
      const res = await fetch(`/api/purchases/${purchase.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPurchase(data);
        setDetailOpen(true);
      }
    } catch (err) {
      console.error("Error fetching purchase detail:", err);
    }
  };

  const handleViewInvoice = async (purchase: Purchase) => {
    try {
      const res = await fetch(`/api/purchases/${purchase.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPurchase(data);
        setInvoiceOpen(true);
      }
    } catch (err) {
      console.error("Error fetching purchase for invoice:", err);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/purchases/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchPurchases();
        setDeleteOpen(false);
        setDeleteId(null);
      }
    } catch (err) {
      console.error("Error deleting purchase:", err);
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  // ── Bulk selection handlers ─────────────────────────────────────────────

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

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      // If every visible purchase is already selected, clear; else select all.
      const allSelected = purchases.length > 0 && purchases.every((p) => prev.has(p.id));
      if (allSelected) {
        return new Set();
      }
      const next = new Set(prev);
      for (const p of purchases) {
        next.add(p.id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedCount = selectedIds.size;
  const isSelectionMode = selectedCount > 0;
  const allVisibleSelected =
    purchases.length > 0 && purchases.every((p) => selectedIds.has(p.id));
  const someVisibleSelected =
    purchases.some((p) => selectedIds.has(p.id)) && !allVisibleSelected;

  // Get the actual purchase objects for the selected ids (those on the current page).
  const selectedPurchases = useMemo(
    () => purchases.filter((p) => selectedIds.has(p.id)),
    [purchases, selectedIds]
  );

  const handleBulkExport = () => {
    if (selectedPurchases.length === 0) {
      sonnerToast.warning("No purchases selected", {
        description: "Select at least one purchase to export.",
      });
      return;
    }
    const rows = selectedPurchases.map((p) => {
      const status = getPurchaseStatus(p);
      return {
        Date: formatDate(p.date),
        Supplier: p.supplier || "—",
        "Invoice No": p.invoiceNo || "—",
        "Items Count": String(p.items?.length ?? 0),
        "Total Amount": String(p.totalAmount),
        Status: status,
      };
    });
    const today = getTodayStr();
    downloadCSV(`purchases-selected-${today}.csv`, rows);
    sonnerToast.success("Export complete", {
      description: `${rows.length} purchase(s) exported as CSV.`,
    });
  };

  const handleBulkDelete = async () => {
    if (selectedPurchases.length === 0) return;
    setBulkDeleting(true);
    let success = 0;
    let failed = 0;
    try {
      // Delete sequentially to avoid race conditions / DB locks.
      for (const p of selectedPurchases) {
        try {
          const res = await fetch(`/api/purchases/${p.id}`, { method: "DELETE" });
          if (res.ok) {
            success++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }
      if (success > 0) {
        sonnerToast.success(
          `${success} purchase${success === 1 ? "" : "s"} deleted`,
          {
            description:
              failed > 0
                ? `${failed} could not be deleted.`
                : "Selection cleared. Stock movements remain unchanged.",
          }
        );
      } else if (failed > 0) {
        sonnerToast.error("Bulk delete failed", {
          description: "Could not delete any of the selected purchases.",
        });
      }
      clearSelection();
      setBulkDeleteOpen(false);
      await fetchPurchases();
    } catch (err) {
      console.error("Error in bulk delete:", err);
      sonnerToast.error("Bulk delete failed", {
        description: "An unexpected error occurred.",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkPrintFirst = async () => {
    if (selectedPurchases.length === 0) return;
    // Fetch full detail for the first selected purchase and open the invoice dialog.
    const first = selectedPurchases[0];
    try {
      const res = await fetch(`/api/purchases/${first.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPurchase(data);
        setBulkPrintListOpen(false);
        setInvoiceOpen(true);
        sonnerToast.info("Invoice opened", {
          description: `Showing invoice for ${first.supplier || "this purchase"}. Print it, then re-open bulk print to view the next one.`,
        });
      } else {
        sonnerToast.error("Failed to load invoice");
      }
    } catch (err) {
      console.error("Error fetching invoice for bulk print:", err);
      sonnerToast.error("Failed to load invoice");
    }
  };

  // ── New Purchase Form ────────────────────────────────────────────────────

  const openNewPurchase = () => {
    setFormDate(getTodayStr());
    setFormSupplier("");
    setFormInvoiceNo("");
    setFormNotes("");
    setFormItems([{ ingredientId: "", quantity: 0, unitPrice: 0, totalAmount: 0 }]);
    setNewPurchaseOpen(true);
  };

  const addItemRow = () => {
    setFormItems([...formItems, { ingredientId: "", quantity: 0, unitPrice: 0, totalAmount: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof NewPurchaseItem, value: string | number) => {
    const updated = [...formItems];
    if (field === "ingredientId") {
      updated[index] = { ...updated[index], ingredientId: value as string };
      // Auto-fill unit price from ingredient's lastPurchasePrice
      const ingredient = ingredients.find((i) => i.id === value);
      if (ingredient) {
        updated[index].unitPrice = ingredient.lastPurchasePrice;
        updated[index].totalAmount = updated[index].quantity * updated[index].unitPrice;
      }
    } else if (field === "quantity") {
      const qty = parseFloat(value as string) || 0;
      updated[index] = { ...updated[index], quantity: qty, totalAmount: qty * updated[index].unitPrice };
    } else if (field === "unitPrice") {
      const price = parseFloat(value as string) || 0;
      updated[index] = { ...updated[index], unitPrice: price, totalAmount: updated[index].quantity * price };
    }
    setFormItems(updated);
  };

  const formGrandTotal = formItems.reduce((sum, item) => sum + item.totalAmount, 0);

  const handleSubmitPurchase = async () => {
    // Validate
    if (!formSupplier.trim()) {
      alert("Please enter a supplier name.");
      return;
    }
    const validItems = formItems.filter((item) => item.ingredientId && item.quantity > 0);
    if (validItems.length === 0) {
      alert("Please add at least one item with an ingredient and quantity.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          supplier: formSupplier.trim(),
          invoiceNo: formInvoiceNo.trim() || null,
          notes: formNotes.trim() || null,
          items: validItems.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
          })),
        }),
      });

      if (res.ok) {
        setNewPurchaseOpen(false);
        await fetchPurchases();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create purchase");
      }
    } catch (err) {
      console.error("Error creating purchase:", err);
      alert("Failed to create purchase");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Pagination ───────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / pageSize);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // ── Summary stats ────────────────────────────────────────────────────────

  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <ShoppingCart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
            <p className="text-muted-foreground text-sm">
              Record vendor purchases, track incoming stock, and manage supplier invoices
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const rows = purchases.map((p) => ({
                Date: formatDate(p.date),
                Supplier: p.supplier || "—",
                "Invoice No": p.invoiceNo || "—",
                "Items Count": String(p.items?.length ?? 0),
                "Total Amount": String(p.totalAmount),
              }));
              downloadCSV("purchases.csv", rows);
              toast({
                title: "Export successful",
                description: `${rows.length} purchase(s) exported as CSV.`,
              });
            }}
            disabled={purchases.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openNewPurchase} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="transition-all hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Page Total</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(totalPurchaseAmount)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <IndianRupee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items on Page</p>
                <p className="text-2xl font-bold">{purchases.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label className="mb-1.5 block text-sm font-medium">Search Supplier / Invoice</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by supplier or invoice..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">From</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-40"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">To</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-40"
                />
              </div>
              {(startDate || endDate || search) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto"
                  onClick={() => {
                    setSearch("");
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5 text-amber-600" />
            Purchase Records
          </CardTitle>
          <CardDescription>
            Showing {purchases.length} of {total} purchases
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Bulk Actions Bar — sticky at top of table area */}
          <AnimatePresence>
            {isSelectionMode && (
              <motion.div
                key="bulk-actions-bar"
                initial={{ opacity: 0, y: -12, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -12, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="sticky top-0 z-20 overflow-hidden border-b border-amber-200 dark:border-amber-800/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30"
              >
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        {selectedCount} purchase{selectedCount === 1 ? "" : "s"} selected
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
                      onClick={handleBulkExport}
                      className="border-amber-300 bg-white/70 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-950/40"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Export Selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkPrintListOpen(true)}
                      className="border-amber-300 bg-white/70 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-950/40"
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      Print Invoices
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBulkDeleteOpen(true)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete Selected
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
              </motion.div>
            )}
          </AnimatePresence>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <span className="ml-3 text-muted-foreground">Loading purchases...</span>
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                <ShoppingCart className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-base font-medium text-foreground">No purchases found</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                {startDate || endDate || search
                  ? "Try adjusting your filters to find what you're looking for."
                  : "Record your first purchase to start tracking incoming stock."}
              </p>
              {!startDate && !endDate && !search && (
                <Button
                  onClick={openNewPurchase}
                  className="mt-4 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Purchase
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[44px] pl-4">
                        <Checkbox
                          aria-label="Select all visible purchases"
                          checked={
                            allVisibleSelected
                              ? true
                              : someVisibleSelected
                              ? "indeterminate"
                              : false
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Invoice No</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => {
                      const status = getPurchaseStatus(purchase);
                      const statusConfig = getStatusConfig(status);
                      const StatusIcon = statusConfig.Icon;
                      const isSelected = selectedIds.has(purchase.id);
                      return (
                      <TableRow
                        key={purchase.id}
                        data-state={isSelected ? "selected" : undefined}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/40"
                            : "hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                        }`}
                        onClick={() =>
                          isSelectionMode
                            ? toggleSelect(purchase.id)
                            : handleViewDetail(purchase)
                        }
                      >
                        <TableCell className="pl-4">
                          <Checkbox
                            aria-label={`Select purchase ${purchase.supplier || "without supplier"} from ${formatDate(purchase.date)}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(purchase.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            {formatDate(purchase.date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {purchase.supplier || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {purchase.invoiceNo ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {purchase.invoiceNo}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                            {purchase.items?.length || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1 text-[11px] font-bold px-2 py-0.5 ${statusConfig.badgeClass}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-amber-700 dark:text-amber-400">
                          {formatCurrency(purchase.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSelectionMode}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetail(purchase);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSelectionMode}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewInvoice(purchase);
                              }}
                              className="text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                              title="View / Print Invoice"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSelectionMode}
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(purchase.id);
                              }}
                              className="text-destructive hover:text-destructive"
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

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 p-4">
                {purchases.map((purchase) => {
                  const isSelected = selectedIds.has(purchase.id);
                  return (
                  <Card
                    key={purchase.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30"
                        : "hover:border-amber-300 dark:hover:border-amber-700"
                    }`}
                    onClick={() =>
                      isSelectionMode
                        ? toggleSelect(purchase.id)
                        : handleViewDetail(purchase)
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            aria-label={`Select purchase ${purchase.supplier || "without supplier"}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(purchase.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                          />
                          <div>
                            <p className="font-semibold text-sm">{purchase.supplier || "No Supplier"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(purchase.date)}
                              {purchase.invoiceNo && ` · ${purchase.invoiceNo}`}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-amber-700 dark:text-amber-400">
                          {formatCurrency(purchase.totalAmount)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs">
                            {purchase.items?.length || 0} items
                          </Badge>
                          {(() => {
                            const s = getPurchaseStatus(purchase);
                            const sc = getStatusConfig(s);
                            const SI = sc.Icon;
                            return (
                              <Badge
                                variant="outline"
                                className={`gap-1 text-[10px] font-semibold ${sc.badgeClass}`}
                              >
                                <SI className="h-3 w-3" />
                                {sc.label}
                              </Badge>
                            );
                          })()}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isSelectionMode}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(purchase);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isSelectionMode}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewInvoice(purchase);
                            }}
                            className="text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                            title="View / Print Invoice"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isSelectionMode}
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDelete(purchase.id);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Purchase Activity Timeline */}
      {purchases.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CircleDot className="h-5 w-5 text-amber-600" />
              Recent Purchase Activity
            </CardTitle>
            <CardDescription>
              Latest purchase timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-amber-200 dark:bg-amber-800" />
              <div className="space-y-4">
                {purchases.slice(0, 5).map((purchase, idx) => {
                  const status = getPurchaseStatus(purchase);
                  const statusConfig = getStatusConfig(status);
                  const TIcon = statusConfig.Icon;
                  return (
                    <div key={purchase.id} className="relative flex items-start gap-4 pl-2">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                        idx === 0
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-background border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                      }`}>
                        <TIcon className="h-3.5 w-3.5" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {purchase.supplier || "No Supplier"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(purchase.date)}
                              {purchase.invoiceNo && ` · ${purchase.invoiceNo}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${statusConfig.badgeClass}`}
                            >
                              {statusConfig.label}
                            </Badge>
                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                              {formatCurrency(purchase.totalAmount)}
                            </span>
                          </div>
                        </div>
                        {purchase.items && purchase.items.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {purchase.items.slice(0, 3).map((item) => (
                              <Badge
                                key={item.id}
                                variant="secondary"
                                className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                              >
                                {item.ingredient?.name || "Unknown"}
                              </Badge>
                            ))}
                            {purchase.items.length > 3 && (
                              <Badge variant="secondary" className="text-[10px]">
                                +{purchase.items.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total} total records
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers().map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className={p === page ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Purchase Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              Purchase Details
            </DialogTitle>
            <DialogDescription>
              Full purchase record with item breakdown
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-5">
              {/* Purchase Info Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold text-sm">{formatDate(selectedPurchase.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="font-semibold text-sm">{selectedPurchase.supplier || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice No</p>
                  <p className="font-semibold text-sm">
                    {selectedPurchase.invoiceNo || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="font-semibold text-sm">
                    {selectedPurchase.notes || "—"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Items Table */}
              <div>
                <h4 className="mb-3 font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  Items ({selectedPurchase.items?.length || 0})
                </h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs">Ingredient</TableHead>
                        <TableHead className="text-xs text-center">Quantity</TableHead>
                        <TableHead className="text-xs text-right">Unit Price</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchase.items?.map((item, idx) => (
                        <TableRow
                          key={item.id}
                          className={`hover:bg-muted/50 transition-colors ${idx % 2 === 1 ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}
                        >
                          <TableCell className="text-sm font-medium">
                            {item.ingredient?.name || "Unknown"}
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({item.ingredient?.unit || ""})
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-center">
                            {item.quantity} {item.ingredient?.unit || ""}
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-sm text-right font-semibold">
                            {formatCurrency(item.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800">
                <span className="font-semibold text-amber-800 dark:text-amber-300">Grand Total</span>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(selectedPurchase.totalAmount)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDetailOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setDetailOpen(false);
                setInvoiceOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Purchase Dialog ────────────────────────────────────────────── */}
      <Dialog open={newPurchaseOpen} onOpenChange={setNewPurchaseOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-600" />
              New Purchase
            </DialogTitle>
            <DialogDescription>
              Record a new purchase with vendor details and line items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Purchase Info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  Supplier <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Enter supplier name"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Invoice No</Label>
                <Input
                  placeholder="Optional invoice number"
                  value={formInvoiceNo}
                  onChange={(e) => setFormInvoiceNo(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Notes</Label>
                <Input
                  placeholder="Optional notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Dynamic Items Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  Purchase Items
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItemRow}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {formItems.map((item, index) => {
                  const selectedIngredient = ingredients.find(
                    (i) => i.id === item.ingredientId
                  );
                  return (
                    <div
                      key={index}
                      className="rounded-lg border p-3 bg-card space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Item #{index + 1}
                        </span>
                        {formItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItemRow(index)}
                            className="h-7 text-destructive hover:text-destructive"
                          >
                            <Minus className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        {/* Ingredient Select */}
                        <div className="sm:col-span-2">
                          <Label className="mb-1 block text-xs font-medium">
                            Ingredient <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={item.ingredientId}
                            onValueChange={(val) => updateItem(index, "ingredientId", val)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select ingredient" />
                            </SelectTrigger>
                            <SelectContent>
                              {ingredients.map((ing) => (
                                <SelectItem key={ing.id} value={ing.id}>
                                  {ing.name} ({ing.unit})
                                  {ing.lastPurchasePrice > 0 &&
                                    ` · ₹${ing.lastPurchasePrice.toFixed(2)}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Quantity */}
                        <div>
                          <Label className="mb-1 block text-xs font-medium">
                            Quantity <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={item.quantity || ""}
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                          />
                          {selectedIngredient && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              in {selectedIngredient.unit}
                            </p>
                          )}
                        </div>
                        {/* Unit Price */}
                        <div>
                          <Label className="mb-1 block text-xs font-medium">
                            Unit Price (₹)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.unitPrice || ""}
                            onChange={(e) =>
                              updateItem(index, "unitPrice", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      {/* Row Total */}
                      {item.totalAmount > 0 && (
                        <div className="flex justify-end">
                          <span className="text-xs text-muted-foreground">
                            Row Total:{" "}
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              {formatCurrency(item.totalAmount)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grand Total Preview */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800">
                <span className="font-semibold text-amber-800 dark:text-amber-300">
                  Grand Total
                </span>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                  {formatCurrency(formGrandTotal)}
                </span>
              </div>
            </div>

            {/* Info Note */}
            <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-700 dark:text-blue-300">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Submitting this purchase will automatically create stock movements and update
                ingredient stock levels, last purchase price, and average cost.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewPurchaseOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPurchase}
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Record Purchase
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Purchase
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this purchase? This action cannot be undone.
              The purchase record and all its items will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <strong>Note:</strong> Deleting a purchase does NOT reverse the stock movements that
            were created. Stock levels will remain as updated.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Purchase"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Delete Confirmation Dialog ───────────────────────────────── */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete {selectedPurchases.length} Purchase{selectedPurchases.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete{" "}
              <strong>{selectedPurchases.length}</strong> purchase
              {selectedPurchases.length === 1 ? "" : "s"}. This action cannot be
              undone. All selected purchase records and their items will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-44 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="mb-2 font-semibold text-destructive">
              Selected purchases:
            </p>
            <ul className="space-y-1 text-xs">
              {selectedPurchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {p.supplier || "No Supplier"}
                    <span className="text-muted-foreground">
                      {" · "}
                      {formatDate(p.date)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatCurrency(p.totalAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            <strong>Note:</strong> Deleting purchases does NOT reverse the stock
            movements that were created. Stock levels will remain as updated.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting {selectedPurchases.length}...
                </>
              ) : (
                `Delete ${selectedPurchases.length} Purchase${selectedPurchases.length === 1 ? "" : "s"}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Print: Choose Invoice Dialog ──────────────────────────────── */}
      <Dialog open={bulkPrintListOpen} onOpenChange={setBulkPrintListOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-amber-600" />
              Print {selectedPurchases.length} Invoice{selectedPurchases.length === 1 ? "" : "s"}
            </DialogTitle>
            <DialogDescription>
              Select an invoice to preview and print. After printing, come back
              to this dialog to open the next one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {selectedPurchases.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  // Open this specific invoice immediately
                  (async () => {
                    try {
                      const res = await fetch(`/api/purchases/${p.id}`);
                      if (res.ok) {
                        const data = await res.json();
                        setSelectedPurchase(data);
                        setBulkPrintListOpen(false);
                        setInvoiceOpen(true);
                      } else {
                        sonnerToast.error("Failed to load invoice");
                      }
                    } catch {
                      sonnerToast.error("Failed to load invoice");
                    }
                  })();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/10 p-3 text-left transition-all hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {p.supplier || "No Supplier"}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(p.date)}
                      {p.invoiceNo && ` · ${p.invoiceNo}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                    {formatCurrency(p.totalAmount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.items?.length || 0} items
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <strong>Tip:</strong> Click <em>Print Invoice</em> in the preview to
            send it to your printer, then re-open this dialog to view the next
            invoice.
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setBulkPrintListOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={handleBulkPrintFirst}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Open First Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Purchase Invoice Dialog (Printable) ─────────────────────────────── */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-amber-600" />
              Purchase Invoice
            </DialogTitle>
            <DialogDescription>
              Review the invoice below, then click Print to send it to your printer.
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="printable-invoice rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-background p-6 sm:p-8 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-amber-200 dark:border-amber-800 pb-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
                    <Flame className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
                      RCS Canteen
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Dahej, Gujarat, India
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Canteen Stock &amp; Cost Management
                    </p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    Purchase Invoice
                  </p>
                  <p className="text-sm font-mono font-semibold">
                    {getInvoiceNumber(selectedPurchase)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Date: <span className="font-medium text-foreground tabular-nums">{formatDate(selectedPurchase.date)}</span>
                  </p>
                </div>
              </div>

              {/* Supplier + meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-amber-100 dark:border-amber-900/40 p-4 bg-amber-50/40 dark:bg-amber-950/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2">
                    Supplier
                  </p>
                  <p className="font-semibold text-sm">
                    {selectedPurchase.supplier || "—"}
                  </p>
                  {selectedPurchase.invoiceNo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ref Invoice: <span className="font-mono">{selectedPurchase.invoiceNo}</span>
                    </p>
                  )}
                  {selectedPurchase.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Notes: {selectedPurchase.notes}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-amber-100 dark:border-amber-900/40 p-4 bg-amber-50/40 dark:bg-amber-950/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2">
                    Payment Summary
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-semibold tabular-nums">
                      {selectedPurchase.items?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Status</span>
                    {(() => {
                      const s = getPurchaseStatus(selectedPurchase);
                      const sc = getStatusConfig(s);
                      const SI = sc.Icon;
                      return (
                        <Badge
                          variant="outline"
                          className={`gap-1 text-[10px] font-semibold ${sc.badgeClass}`}
                        >
                          <SI className="h-3 w-3" />
                          {sc.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="mb-2 text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-600" />
                  Items
                </h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-amber-100/70 dark:bg-amber-900/30">
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Ingredient</TableHead>
                        <TableHead className="text-xs text-center">Qty</TableHead>
                        <TableHead className="text-xs">Unit</TableHead>
                        <TableHead className="text-xs text-right">Unit Price</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchase.items?.map((item, idx) => (
                        <TableRow
                          key={item.id}
                          className={idx % 2 === 1 ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}
                        >
                          <TableCell className="text-xs tabular-nums">{idx + 1}</TableCell>
                          <TableCell className="text-sm font-medium">
                            {item.ingredient?.name || "Unknown"}
                          </TableCell>
                          <TableCell className="text-sm text-center tabular-nums">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.ingredient?.unit || ""}
                          </TableCell>
                          <TableCell className="text-sm text-right tabular-nums">
                            {formatCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-sm text-right font-semibold tabular-nums">
                            {formatCurrency(item.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(selectedPurchase.items?.length || 0) === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                            No items in this purchase.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-full sm:w-72 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(selectedPurchase.totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium tabular-nums">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-amber-500 text-white p-3 mt-2">
                    <span className="font-semibold">Grand Total</span>
                    <span className="text-lg font-bold tabular-nums">
                      {formatCurrency(selectedPurchase.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer — signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-amber-200 dark:border-amber-800">
                <div>
                  <p className="text-xs text-muted-foreground mb-12">
                    Received by:
                  </p>
                  <div className="border-t border-foreground/40" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Name &amp; Signature
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-12">
                    Authorized by:
                  </p>
                  <div className="border-t border-foreground/40" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Name &amp; Signature
                  </p>
                </div>
              </div>

              <p className="text-center text-[10px] text-muted-foreground pt-2">
                This is a system-generated invoice from RCS Canteen Management.
                Generated on {formatDate(new Date().toISOString())}.
              </p>
            </div>
          )}

          <DialogFooter className="no-print gap-2">
            <Button
              variant="outline"
              onClick={() => setInvoiceOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={handlePrintInvoice}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

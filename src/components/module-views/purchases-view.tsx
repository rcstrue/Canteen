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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { downloadCSV } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
        <Card>
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
        <Card>
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
        <Card>
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
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <span className="ml-3 text-muted-foreground">Loading purchases...</span>
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-3 text-lg font-medium text-muted-foreground">No purchases found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {startDate || endDate || search
                  ? "Try adjusting your filters"
                  : "Click \"New Purchase\" to record your first purchase"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Invoice No</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow
                        key={purchase.id}
                        className="cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                        onClick={() => handleViewDetail(purchase)}
                      >
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
                        <TableCell className="text-right font-semibold text-amber-700 dark:text-amber-400">
                          {formatCurrency(purchase.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
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
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 p-4">
                {purchases.map((purchase) => (
                  <Card
                    key={purchase.id}
                    className="cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                    onClick={() => handleViewDetail(purchase)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">{purchase.supplier || "No Supplier"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(purchase.date)}
                            {purchase.invoiceNo && ` · ${purchase.invoiceNo}`}
                          </p>
                        </div>
                        <p className="font-bold text-amber-700 dark:text-amber-400">
                          {formatCurrency(purchase.totalAmount)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs">
                          {purchase.items?.length || 0} items
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
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
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                          className={idx % 2 === 1 ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}
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
    </div>
  );
}

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Truck,
  Plus,
  Search,
  Trash2,
  Pencil,
  Eye,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  FileText,
  IndianRupee,
  Package,
  ShoppingCart,
  Download,
  ChevronUp,
  ChevronDown,
  PackageSearch,
  AlertCircle,
} from "lucide-react";
import { downloadCSV } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  category: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  ingredientCount: number;
  purchaseCount: number;
  totalPurchaseValue: number;
}

interface SupplierDetail extends Supplier {
  ingredients: Array<{
    id: string;
    name: string;
    unit: string;
    category: string;
    currentStock: number;
    minStock: number;
    avgCost: number;
  }>;
  purchases: Array<{
    id: string;
    date: string;
    invoiceNo: string | null;
    totalAmount: number;
    notes: string | null;
  }>;
}

interface SupplierFormValues {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  category: string;
  notes: string;
}

type SortField = "name" | "category" | "ingredientCount" | "totalPurchaseValue" | "createdAt";
type SortDir = "asc" | "desc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return formatCurrency(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const EMPTY_FORM: SupplierFormValues = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstin: "",
  category: "",
  notes: "",
};

// Category color map for badges
const CATEGORY_COLORS: Record<string, string> = {
  Grains: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Vegetables: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Pulses: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  Oil: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  Spices: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  Dairy: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Meat: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  Beverages: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Mixed: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
};

function getCategoryBadgeClass(category: string | null): string {
  if (!category) return "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300";
  return CATEGORY_COLORS[category] || "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SuppliersView() {
  const { toast } = useToast();

  // ── State ────────────────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SupplierDetail | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state
  const [form, setForm] = useState<SupplierFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SupplierFormValues, string>>>({});

  // ── Derived list of categories present in data ──────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [suppliers]);

  // ── Fetch suppliers ─────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter && categoryFilter !== "All") params.set("category", categoryFilter);

      const res = await fetch(`/api/suppliers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch suppliers",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      toast({
        title: "Error",
        description: "Failed to fetch suppliers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ── Sorting ──────────────────────────────────────────────────────────────
  const sortedSuppliers = useMemo(() => {
    const arr = [...suppliers];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        case "ingredientCount":
          cmp = a.ingredientCount - b.ingredientCount;
          break;
        case "totalPurchaseValue":
          cmp = a.totalPurchaseValue - b.totalPurchaseValue;
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [suppliers, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3" />
    );
  };

  // ── Summary stats ───────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total = suppliers.length;
    const totalPurchaseValue = suppliers.reduce(
      (sum, s) => sum + s.totalPurchaseValue,
      0
    );
    // Active = supplier with at least 1 ingredient OR 1 purchase
    const active = suppliers.filter(
      (s) => s.ingredientCount > 0 || s.purchaseCount > 0
    ).length;
    return { total, totalPurchaseValue, active };
  }, [suppliers]);

  // ── Form actions ────────────────────────────────────────────────────────
  const openAddForm = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setEditingId(null);
    setFormOpen(true);
  };

  const openEditForm = (supplier: Supplier) => {
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      gstin: supplier.gstin || "",
      category: supplier.category || "",
      notes: supplier.notes || "",
    });
    setFormErrors({});
    setEditingId(supplier.id);
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Partial<Record<keyof SupplierFormValues, string>> = {};
    if (!form.name.trim()) errs.name = "Supplier name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Invalid email format";
    }
    if (form.gstin && form.gstin.trim().length !== 15) {
      errs.gstin = "GSTIN must be 15 characters";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        gstin: form.gstin.trim().toUpperCase() || null,
        category: form.category.trim() || null,
        notes: form.notes.trim() || null,
      };

      const url = editingId
        ? `/api/suppliers/${editingId}`
        : `/api/suppliers`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: editingId ? "Supplier updated" : "Supplier created",
          description: `${payload.name} has been ${editingId ? "updated" : "added"} successfully.`,
        });
        setFormOpen(false);
        await fetchSuppliers();
      } else {
        const data = await res.json();
        toast({
          title: "Failed",
          description: data.error || "Operation failed",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error submitting supplier:", err);
      toast({
        title: "Error",
        description: "Failed to save supplier",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Detail view ──────────────────────────────────────────────────────────
  const handleViewDetail = async (supplier: Supplier) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDetail(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load supplier details",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error fetching supplier detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({
          title: "Supplier deleted",
          description: "The supplier has been removed. Linked items were detached.",
        });
        setDeleteOpen(false);
        setDeleteId(null);
        await fetchSuppliers();
      } else {
        const data = await res.json();
        toast({
          title: "Failed",
          description: data.error || "Failed to delete supplier",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error deleting supplier:", err);
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── CSV export ──────────────────────────────────────────────────────────
  const handleExport = () => {
    if (sortedSuppliers.length === 0) {
      toast({
        title: "Nothing to export",
        description: "There are no suppliers to export.",
        variant: "destructive",
      });
      return;
    }
    const rows = sortedSuppliers.map((s) => ({
      Name: s.name,
      "Contact Person": s.contactPerson || "",
      Phone: s.phone || "",
      Email: s.email || "",
      Address: s.address || "",
      GSTIN: s.gstin || "",
      Category: s.category || "",
      "Ingredient Count": String(s.ingredientCount),
      "Purchase Count": String(s.purchaseCount),
      "Total Purchase Value": String(s.totalPurchaseValue),
      "Created At": formatDate(s.createdAt),
    }));
    const today = new Date().toISOString().split("T")[0];
    downloadCSV(`suppliers-${today}.csv`, rows);
    toast({
      title: "Export successful",
      description: `${rows.length} suppliers exported to CSV.`,
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
            <p className="text-sm text-muted-foreground">
              Manage vendor master data, contact details, and track supplier relationships
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading || suppliers.length === 0}
            className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button
            onClick={openAddForm}
            className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Supplier</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="card-hover border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Building2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Total Suppliers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <IndianRupee className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{formatCurrencyShort(summary.totalPurchaseValue)}</p>
              <p className="text-xs text-muted-foreground">Total Purchase Value</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">{summary.active}</p>
              <p className="text-xs text-muted-foreground">Active Suppliers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-amber-200/60 dark:border-amber-800/30">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search suppliers by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Category:</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table / Loading / Empty States */}
      <Card className="border-amber-200/60 dark:border-amber-800/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Supplier Directory
          </CardTitle>
          <CardDescription>
            {loading
              ? "Loading suppliers..."
              : `${sortedSuppliers.length} supplier${sortedSuppliers.length === 1 ? "" : "s"} found`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedSuppliers.length === 0 ? (
            <EmptyState
              hasSearch={!!search || categoryFilter !== "All"}
              onClear={() => {
                setSearch("");
                setCategoryFilter("All");
              }}
              onAdd={openAddForm}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handleSort("name")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Name <SortIcon field="name" />
                        </button>
                      </TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handleSort("category")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Category <SortIcon field="category" />
                        </button>
                      </TableHead>
                      <TableHead>GSTIN</TableHead>
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("ingredientCount")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Ingredients <SortIcon field="ingredientCount" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={() => handleSort("totalPurchaseValue")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Purchase Value <SortIcon field="totalPurchaseValue" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSuppliers.map((supplier) => (
                      <TableRow
                        key={supplier.id}
                        className="cursor-pointer hover:bg-amber-50/60 dark:hover:bg-amber-900/10 transition-colors"
                        onClick={() => handleViewDetail(supplier)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{supplier.name}</p>
                              {supplier.contactPerson && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {supplier.contactPerson}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            {supplier.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span className="font-mono">{supplier.phone}</span>
                              </div>
                            )}
                            {supplier.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{supplier.email}</span>
                              </div>
                            )}
                            {!supplier.phone && !supplier.email && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {supplier.category ? (
                            <Badge className={getCategoryBadgeClass(supplier.category)} variant="secondary">
                              {supplier.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {supplier.gstin || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">
                            {supplier.ingredientCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {supplier.totalPurchaseValue > 0 ? (
                            formatCurrency(supplier.totalPurchaseValue)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditForm(supplier)}
                              aria-label="Edit supplier"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                              onClick={() => confirmDelete(supplier.id)}
                              aria-label="Delete supplier"
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
              <div className="space-y-3 p-4 md:hidden">
                {sortedSuppliers.map((supplier) => (
                  <Card
                    key={supplier.id}
                    className="cursor-pointer border-amber-200/60 dark:border-amber-800/30"
                    onClick={() => handleViewDetail(supplier)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{supplier.name}</p>
                            {supplier.contactPerson && (
                              <p className="truncate text-xs text-muted-foreground">
                                {supplier.contactPerson}
                              </p>
                            )}
                          </div>
                        </div>
                        {supplier.category && (
                          <Badge className={getCategoryBadgeClass(supplier.category)} variant="secondary">
                            {supplier.category}
                          </Badge>
                        )}
                      </div>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-mono truncate">{supplier.phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">GSTIN</p>
                          <p className="font-mono truncate">{supplier.gstin || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ingredients</p>
                          <p className="font-mono">{supplier.ingredientCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Purchase Value</p>
                          <p className="font-mono">
                            {supplier.totalPurchaseValue > 0
                              ? formatCurrencyShort(supplier.totalPurchaseValue)
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(supplier);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(supplier.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              {editingId ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update supplier contact and category details."
                : "Create a new supplier record with contact information."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rajesh Grains & Co."
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>

            {/* Contact Person + Phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="contactPerson" className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Contact Person
                </Label>
                <Input
                  id="contactPerson"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="e.g. Rajesh Patel"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone" className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>

            {/* Email + GSTIN */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. rajesh@grains.com"
                  className={formErrors.email ? "border-red-500" : ""}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500">{formErrors.email}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gstin" className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> GSTIN
                </Label>
                <Input
                  id="gstin"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="15-character GST number"
                  maxLength={15}
                  className={`font-mono ${formErrors.gstin ? "border-red-500" : ""}`}
                />
                {formErrors.gstin && (
                  <p className="text-xs text-red-500">{formErrors.gstin}</p>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category" className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" /> Category
              </Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Grains, Vegetables, Dairy, Meat, Spices..."
                list="supplier-categories"
              />
              <datalist id="supplier-categories">
                <option value="Grains" />
                <option value="Vegetables" />
                <option value="Pulses" />
                <option value="Oil" />
                <option value="Spices" />
                <option value="Dairy" />
                <option value="Meat" />
                <option value="Beverages" />
                <option value="Mixed" />
              </datalist>
              <p className="text-xs text-muted-foreground">
                What does this supplier primarily provide?
              </p>
            </div>

            {/* Address */}
            <div className="grid gap-2">
              <Label htmlFor="address" className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Address
              </Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Shop address, area, city, PIN code"
                rows={2}
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Delivery schedule, payment terms, or any other notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save Changes" : "Create Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Supplier Details
            </SheetTitle>
            <SheetDescription>
              Contact information, linked ingredients, and purchase history
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedDetail ? (
            <div className="space-y-4 px-4 pb-6">
              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold">{selectedDetail.name}</h3>
                  {selectedDetail.category && (
                    <Badge className={`mt-1 ${getCategoryBadgeClass(selectedDetail.category)}`} variant="secondary">
                      {selectedDetail.category}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <Card className="border-amber-200/40 dark:border-amber-800/20">
                <CardContent className="space-y-2 p-4 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contact Information
                  </p>
                  {selectedDetail.contactPerson && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedDetail.contactPerson}</span>
                    </div>
                  )}
                  {selectedDetail.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedDetail.phone}`} className="font-mono hover:underline">
                        {selectedDetail.phone}
                      </a>
                    </div>
                  )}
                  {selectedDetail.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${selectedDetail.email}`} className="truncate hover:underline">
                        {selectedDetail.email}
                      </a>
                    </div>
                  )}
                  {selectedDetail.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="whitespace-pre-wrap">{selectedDetail.address}</span>
                    </div>
                  )}
                  {selectedDetail.gstin && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">{selectedDetail.gstin}</span>
                    </div>
                  )}
                  {!selectedDetail.contactPerson &&
                    !selectedDetail.phone &&
                    !selectedDetail.email &&
                    !selectedDetail.address &&
                    !selectedDetail.gstin && (
                      <p className="text-muted-foreground italic text-xs">
                        No contact information provided
                      </p>
                    )}
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-amber-200/40 dark:border-amber-800/20">
                  <CardContent className="p-3 text-center">
                    <Package className="mx-auto h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <p className="mt-1 text-xl font-bold">{selectedDetail.ingredientCount}</p>
                    <p className="text-xs text-muted-foreground">Ingredients</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200/40 dark:border-amber-800/20">
                  <CardContent className="p-3 text-center">
                    <ShoppingCart className="mx-auto h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <p className="mt-1 text-xl font-bold">{selectedDetail.purchaseCount}</p>
                    <p className="text-xs text-muted-foreground">Purchases</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200/40 dark:border-amber-800/20">
                  <CardContent className="p-3 text-center">
                    <IndianRupee className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <p className="mt-1 text-base font-bold">
                      {formatCurrencyShort(selectedDetail.totalPurchaseValue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Value</p>
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              {selectedDetail.notes && (
                <Card className="border-amber-200/40 dark:border-amber-800/20">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{selectedDetail.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Linked Ingredients */}
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Linked Ingredients ({selectedDetail.ingredients.length})
                </p>
                {selectedDetail.ingredients.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    No ingredients linked to this supplier
                  </p>
                ) : (
                  <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
                    {selectedDetail.ingredients.map((ing) => (
                      <div
                        key={ing.id}
                        className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{ing.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ing.category} · {ing.currentStock} {ing.unit} in stock
                          </p>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatCurrency(ing.avgCost)}/{ing.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Purchases */}
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Recent Purchases ({selectedDetail.purchaseCount})
                </p>
                {selectedDetail.purchases.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    No purchases recorded from this supplier
                  </p>
                ) : (
                  <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
                    {selectedDetail.purchases.slice(0, 20).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {p.invoiceNo || `Purchase ${formatDate(p.date)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                        </div>
                        <span className="font-mono text-xs">
                          {formatCurrency(p.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDetailOpen(false);
                    openEditForm(selectedDetail);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    setDetailOpen(false);
                    confirmDelete(selectedDetail.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Failed to load supplier details.
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Delete Supplier?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the supplier from the directory. Any
              ingredients and purchases linked to this supplier will have their
              supplier reference cleared (the records themselves will not be deleted).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Supplier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({
  hasSearch,
  onClear,
  onAdd,
}: {
  hasSearch: boolean;
  onClear: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        {hasSearch ? (
          <PackageSearch className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        ) : (
          <Truck className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold">
        {hasSearch ? "No suppliers found" : "No suppliers yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasSearch
          ? "Try adjusting your search terms or category filter to find what you're looking for."
          : "Get started by adding your first supplier to manage vendor contacts and track purchases."}
      </p>
      <div className="mt-4 flex gap-2">
        {hasSearch && (
          <Button variant="outline" onClick={onClear}>
            Clear Filters
          </Button>
        )}
        <Button
          onClick={onAdd}
          className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>
    </div>
  );
}

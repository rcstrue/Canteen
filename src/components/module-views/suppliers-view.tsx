"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Star,
  Trophy,
  ShieldCheck,
  Clock,
  TrendingUp,
  Award,
  Medal,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast as sonnerToast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip as RTooltip,
} from "recharts";
import { downloadCSV } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/utils";

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

// ─── Performance Types ───────────────────────────────────────────────────────

interface OverviewEntry {
  id: string;
  name: string;
  category: string | null;
  totalOrders: number;
  totalSpend: number;
  avgOrderValue: number;
  rating: number | null;
  qualityScore: number | null;
  onTimeRate: number | null;
  lastOrderDate: string | null;
  ingredientCount: number;
  notes: string | null;
}

interface OverviewSummary {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  totalSpend: number;
  avgRating: number | null;
  ratedCount: number;
  topSupplier: { id: string; name: string; totalSpend: number } | null;
}

interface OverviewResponse {
  sortBy: string;
  order: string;
  summary: OverviewSummary;
  suppliers: OverviewEntry[];
}

interface SupplierPerformance {
  supplier: {
    id: string;
    name: string;
    category: string | null;
    rating: number | null;
    qualityScore: number | null;
    onTimeRate: number | null;
    calculatedOnTimeRate: number | null;
    effectiveOnTimeRate: number | null;
    notes: string | null;
  };
  metrics: {
    totalOrders: number;
    totalSpend: number;
    avgOrderValue: number;
    lastOrderDate: string | null;
  };
  topIngredients: Array<{
    ingredientId: string;
    name: string;
    unit: string;
    count: number;
    totalQty: number;
  }>;
  monthlySpend: Array<{ month: string; total: number; count: number }>;
  recentOrders: Array<{
    id: string;
    date: string;
    invoiceNo: string | null;
    totalAmount: number;
    status: string;
  }>;
}

interface RatingFormValues {
  rating: number | null;
  qualityScore: number | null;
  onTimeRate: number | null;
  notes: string;
}

type SortField = "name" | "category" | "ingredientCount" | "totalPurchaseValue" | "createdAt";
type SortDir = "asc" | "desc";
type PerfSortKey = "name" | "category" | "orders" | "spend" | "avgOrder" | "rating" | "quality" | "onTime" | "lastOrder";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return formatINR(amount);
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

  // ── Performance state ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"directory" | "performance">("directory");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewSortBy, setOverviewSortBy] = useState<string>("spend");
  const [overviewOrder, setOverviewOrder] = useState<"asc" | "desc">("desc");
  // Client-side sort that reorders the already-fetched overview suppliers.
  // We still keep the server query param in sync (so re-fetches preserve order),
  // but for instant UX we re-sort locally without re-fetching.
  const [perfSortKey, setPerfSortKey] = useState<PerfSortKey>("spend");
  const [perfSortDir, setPerfSortDir] = useState<SortDir>("desc");

  // Rating dialog
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingSupplier, setRatingSupplier] = useState<OverviewEntry | null>(null);
  const [ratingForm, setRatingForm] = useState<RatingFormValues>({
    rating: null,
    qualityScore: null,
    onTimeRate: null,
    notes: "",
  });
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [hoverQuality, setHoverQuality] = useState<number>(0);

  // Detail sheet performance tab
  const [detailTab, setDetailTab] = useState<"details" | "performance">("details");
  const [detailPerformance, setDetailPerformance] = useState<SupplierPerformance | null>(null);
  const [detailPerfLoading, setDetailPerfLoading] = useState(false);

  // Ref for "View All" leaderboard link → scroll to performance table
  const performanceTableRef = useRef<HTMLDivElement | null>(null);


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

  // ── Performance: fetch overview ─────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sortBy", overviewSortBy);
      params.set("order", overviewOrder);
      const res = await fetch(
        `/api/suppliers/performance/overview?${params.toString()}`
      );
      if (res.ok) {
        const data = (await res.json()) as OverviewResponse;
        setOverview(data);
      } else {
        sonnerToast.error("Failed to load performance overview");
      }
    } catch (err) {
      console.error("Error fetching performance overview:", err);
      sonnerToast.error("Failed to load performance overview");
    } finally {
      setOverviewLoading(false);
    }
  }, [overviewSortBy, overviewOrder]);

  // Fetch overview whenever the Performance tab is opened.
  useEffect(() => {
    if (activeTab === "performance" && !overview && !overviewLoading) {
      fetchOverview();
    }
  }, [activeTab, overview, overviewLoading, fetchOverview]);

  // Re-fetch when sort/order change (server-side sort for initial ordering,
  // then client-side sort reorders without an extra request).
  useEffect(() => {
    if (activeTab === "performance") {
      fetchOverview();
    }
  }, [overviewSortBy, overviewOrder, activeTab, fetchOverview]);

  // Client-side sort of overview.suppliers based on perfSortKey/perfSortDir.
  // This gives instant header-click sorting without re-fetching.
  const sortedOverview = useMemo(() => {
    if (!overview) return [] as OverviewEntry[];
    const arr = [...overview.suppliers];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (perfSortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        case "orders":
          cmp = a.totalOrders - b.totalOrders;
          break;
        case "spend":
          cmp = a.totalSpend - b.totalSpend;
          break;
        case "avgOrder":
          cmp = a.avgOrderValue - b.avgOrderValue;
          break;
        case "rating":
          cmp = (a.rating ?? 0) - (b.rating ?? 0);
          break;
        case "quality":
          cmp = (a.qualityScore ?? 0) - (b.qualityScore ?? 0);
          break;
        case "onTime":
          cmp = (a.onTimeRate ?? 0) - (b.onTimeRate ?? 0);
          break;
        case "lastOrder":
          cmp =
            (a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0) -
            (b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0);
          break;
      }
      return perfSortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [overview, perfSortKey, perfSortDir]);

  const handlePerfSort = (key: PerfSortKey) => {
    if (perfSortKey === key) {
      setPerfSortDir(perfSortDir === "asc" ? "desc" : "asc");
    } else {
      setPerfSortKey(key);
      // Default descending for numeric columns, ascending for text columns
      setPerfSortDir(key === "name" || key === "category" ? "asc" : "desc");
    }
  };

  const PerfSortIcon = ({ field }: { field: PerfSortKey }) => {
    if (perfSortKey !== field) return null;
    return perfSortDir === "asc" ? (
      <ChevronUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3" />
    );
  };

  // Top 5 suppliers by spend (for leaderboard + bar chart)
  const topSuppliers = useMemo(() => {
    return [...sortedOverview]
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);
  }, [sortedOverview]);

  // ── Performance: rating dialog ──────────────────────────────────────────
  const openRatingDialog = (entry: OverviewEntry) => {
    setRatingSupplier(entry);
    setRatingForm({
      rating: entry.rating,
      qualityScore: entry.qualityScore,
      onTimeRate: entry.onTimeRate,
      notes: entry.notes || "",
    });
    setHoverRating(0);
    setHoverQuality(0);
    setRatingOpen(true);
  };

  const handleRatingSubmit = async () => {
    if (!ratingSupplier) return;
    // Validate
    if (
      ratingForm.onTimeRate != null &&
      (Number.isNaN(ratingForm.onTimeRate) ||
        ratingForm.onTimeRate < 0 ||
        ratingForm.onTimeRate > 100)
    ) {
      sonnerToast.error("On-time rate must be between 0 and 100");
      return;
    }
    if (
      ratingForm.rating != null &&
      (![1, 2, 3, 4, 5].includes(ratingForm.rating))
    ) {
      sonnerToast.error("Rating must be between 1 and 5");
      return;
    }
    if (
      ratingForm.qualityScore != null &&
      (![1, 2, 3, 4, 5].includes(ratingForm.qualityScore))
    ) {
      sonnerToast.error("Quality score must be between 1 and 5");
      return;
    }

    setRatingSubmitting(true);
    try {
      const res = await fetch(
        `/api/suppliers/${ratingSupplier.id}/performance`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: ratingForm.rating,
            qualityScore: ratingForm.qualityScore,
            onTimeRate: ratingForm.onTimeRate,
            notes: ratingForm.notes,
          }),
        }
      );
      if (res.ok) {
        sonnerToast.success("Rating saved", {
          description: `${ratingSupplier.name} performance updated.`,
        });
        setRatingOpen(false);
        setRatingSupplier(null);
        // Refresh overview + detail performance if open
        fetchOverview();
        if (selectedDetail && detailTab === "performance") {
          fetchDetailPerformance(selectedDetail.id);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        sonnerToast.error("Failed to save rating", {
          description: data.error || "Unknown error",
        });
      }
    } catch (err) {
      console.error("Error saving rating:", err);
      sonnerToast.error("Failed to save rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  // ── Performance: detail sheet ───────────────────────────────────────────
  const fetchDetailPerformance = useCallback(async (supplierId: string) => {
    setDetailPerfLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/performance`);
      if (res.ok) {
        const data = (await res.json()) as SupplierPerformance;
        setDetailPerformance(data);
      } else {
        sonnerToast.error("Failed to load performance details");
      }
    } catch (err) {
      console.error("Error fetching detail performance:", err);
      sonnerToast.error("Failed to load performance details");
    } finally {
      setDetailPerfLoading(false);
    }
  }, []);

  const handleScrollToPerfTable = () => {
    if (performanceTableRef.current) {
      performanceTableRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

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
    setDetailTab("details");
    setDetailPerformance(null);
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
    <div className="view-enter space-y-6">
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

      {/* Tabs: Directory + Performance */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "directory" | "performance")}
        className="space-y-2"
      >
        <TabsList className="bg-amber-100/60 dark:bg-amber-900/20">
          <TabsTrigger
            value="directory"
            className="data-[state=active]:bg-amber-600 data-[state=active]:text-white dark:data-[state=active]:bg-amber-600"
          >
            <Truck className="h-4 w-4" />
            Directory
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="data-[state=active]:bg-amber-600 data-[state=active]:text-white dark:data-[state=active]:bg-amber-600"
          >
            <Trophy className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-6 outline-none">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="card-elevated metric-card border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Building2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums">{summary.total}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Suppliers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated metric-card border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <IndianRupee className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums">{formatCurrencyShort(summary.totalPurchaseValue)}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Purchase Value</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated metric-card border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums">{summary.active}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active Suppliers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-elevated border-amber-200/60 dark:border-amber-800/30">
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
      <Card className="card-elevated border-amber-200/60 dark:border-amber-800/30">
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
                        className="table-row-interactive"
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
                    className="card-elevated card-hover cursor-pointer border-amber-200/60 dark:border-amber-800/30"
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
                          <p className="text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</p>
                          <p className="font-mono truncate">{supplier.phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                          <p className="truncate">{supplier.email || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">GSTIN</p>
                          <p className="font-mono truncate">{supplier.gstin || "—"}</p>
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
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6 outline-none">
          <PerformanceTabContent
            overview={overview}
            loading={overviewLoading}
            sortedOverview={sortedOverview}
            topSuppliers={topSuppliers}
            perfSortKey={perfSortKey}
            perfSortDir={perfSortDir}
            handlePerfSort={handlePerfSort}
            PerfSortIcon={PerfSortIcon}
            openRatingDialog={openRatingDialog}
            onViewDetail={(entry) => {
              // Find the matching Supplier from the directory list (if present)
              // and open the detail sheet.
              const match = suppliers.find((s) => s.id === entry.id);
              if (match) handleViewDetail(match);
            }}
            tableRef={performanceTableRef}
            scrollToTable={handleScrollToPerfTable}
          />
        </TabsContent>
      </Tabs>

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

              {/* In-sheet tabs: Details + Performance */}
              <Tabs
                value={detailTab}
                onValueChange={(v) => {
                  const next = v as "details" | "performance";
                  setDetailTab(next);
                  if (next === "performance" && !detailPerformance && !detailPerfLoading) {
                    fetchDetailPerformance(selectedDetail.id);
                  }
                }}
                className="space-y-2"
              >
                <TabsList className="bg-amber-100/60 dark:bg-amber-900/20">
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:bg-amber-600 data-[state=active]:text-white dark:data-[state=active]:bg-amber-600"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="performance"
                    className="data-[state=active]:bg-amber-600 data-[state=active]:text-white dark:data-[state=active]:bg-amber-600"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    Performance
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 outline-none">
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
                </TabsContent>

                {/* Performance tab inside detail sheet */}
                <TabsContent value="performance" className="space-y-4 outline-none">
                  {detailPerfLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-40 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : detailPerformance ? (
                    <DetailPerformanceContent
                      data={detailPerformance}
                      onRate={() => {
                        if (overview) {
                          const entry = overview.suppliers.find(
                            (s) => s.id === selectedDetail.id
                          );
                          if (entry) openRatingDialog(entry);
                        } else {
                          // Build a minimal entry from selectedDetail
                          openRatingDialog({
                            id: selectedDetail.id,
                            name: selectedDetail.name,
                            category: selectedDetail.category,
                            totalOrders: selectedDetail.purchaseCount,
                            totalSpend: selectedDetail.totalPurchaseValue,
                            avgOrderValue:
                              selectedDetail.purchaseCount > 0
                                ? selectedDetail.totalPurchaseValue /
                                  selectedDetail.purchaseCount
                                : 0,
                            rating: null,
                            qualityScore: null,
                            onTimeRate: null,
                            lastOrderDate:
                              selectedDetail.purchases.length > 0
                                ? selectedDetail.purchases[0].date
                                : null,
                            ingredientCount: selectedDetail.ingredientCount,
                            notes: selectedDetail.notes,
                          });
                        }
                      }}
                    />
                  ) : (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No performance data available.
                    </div>
                  )}
                </TabsContent>
              </Tabs>

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

      {/* Rating Dialog */}
      <Dialog open={ratingOpen} onOpenChange={(o) => { setRatingOpen(o); if (!o) setRatingSupplier(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Rate Supplier Performance
            </DialogTitle>
            <DialogDescription>
              {ratingSupplier
                ? `Set performance ratings and notes for ${ratingSupplier.name}.`
                : "Set performance ratings and notes."}
              {ratingSupplier?.category && (
                <span className="ml-1">
                  Category: <span className="font-medium">{ratingSupplier.category}</span>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {ratingSupplier && (
            <div className="grid gap-4 py-2">
              {/* Supplier header */}
              <div className="flex items-center gap-3 rounded-lg border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{ratingSupplier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ratingSupplier.totalOrders} order{ratingSupplier.totalOrders === 1 ? "" : "s"}
                    {" · "}
                    {formatCurrencyShort(ratingSupplier.totalSpend)} total spend
                  </p>
                </div>
              </div>

              {/* Rating stars */}
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  Overall Rating
                  <span className="text-xs text-muted-foreground font-normal">
                    (1 = poor, 5 = excellent)
                  </span>
                </Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = (hoverRating || ratingForm.rating || 0) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setRatingForm((prev) => ({
                            ...prev,
                            rating: prev.rating === n ? null : n,
                          }))
                        }
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="rounded p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            active
                              ? "fill-amber-400 text-amber-400"
                              : "fill-transparent text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-2 text-sm font-medium">
                    {hoverRating || ratingForm.rating || "—"}
                  </span>
                  {ratingForm.rating != null && (
                    <button
                      type="button"
                      onClick={() => setRatingForm((prev) => ({ ...prev, rating: null }))}
                      className="ml-2 text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Quality stars */}
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                  Quality Score
                  <span className="text-xs text-muted-foreground font-normal">
                    (1 = poor, 5 = excellent)
                  </span>
                </Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = (hoverQuality || ratingForm.qualityScore || 0) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setRatingForm((prev) => ({
                            ...prev,
                            qualityScore: prev.qualityScore === n ? null : n,
                          }))
                        }
                        onMouseEnter={() => setHoverQuality(n)}
                        onMouseLeave={() => setHoverQuality(0)}
                        className="rounded p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        aria-label={`Quality score ${n}`}
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            active
                              ? "fill-amber-400 text-amber-400"
                              : "fill-transparent text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-2 text-sm font-medium">
                    {hoverQuality || ratingForm.qualityScore || "—"}
                  </span>
                  {ratingForm.qualityScore != null && (
                    <button
                      type="button"
                      onClick={() => setRatingForm((prev) => ({ ...prev, qualityScore: null }))}
                      className="ml-2 text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* On-time rate */}
              <div className="grid gap-2">
                <Label htmlFor="onTimeRate" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  On-Time Delivery Rate (%)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="onTimeRate"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={ratingForm.onTimeRate ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        setRatingForm((prev) => ({ ...prev, onTimeRate: null }));
                      } else {
                        const n = Number(v);
                        if (!Number.isNaN(n)) {
                          setRatingForm((prev) => ({
                            ...prev,
                            onTimeRate: Math.max(0, Math.min(100, n)),
                          }));
                        }
                      }
                    }}
                    placeholder="e.g. 92"
                    className="font-mono"
                  />
                  <span className="text-sm font-medium text-muted-foreground">%</span>
                  {ratingForm.onTimeRate != null && (
                    <button
                      type="button"
                      onClick={() => setRatingForm((prev) => ({ ...prev, onTimeRate: null }))}
                      className="text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Percentage of orders delivered on or before the expected date.
                </p>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="ratingNotes" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  Performance Notes
                </Label>
                <Textarea
                  id="ratingNotes"
                  value={ratingForm.notes}
                  onChange={(e) =>
                    setRatingForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Internal notes about delivery reliability, quality consistency, communication, etc."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRatingOpen(false); setRatingSupplier(null); }}
              disabled={ratingSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRatingSubmit}
              disabled={ratingSubmitting}
              className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              {ratingSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Star className="h-4 w-4" />
              Save Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

// ─── Performance Helper Components ───────────────────────────────────────────

const PERF_CHART_COLORS = [
  "#f59e0b", // amber-500
  "#f97316", // orange-500
  "#d97706", // amber-600
  "#ea580c", // orange-600
  "#fbbf24", // amber-400
];

/** Read-only star rating display (5 stars, filled = amber-400, empty = muted). */
function StarRating({
  value,
  size = "sm",
}: {
  value: number | null;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  if (value == null) {
    return (
      <span className="text-xs text-muted-foreground italic">Not rated</span>
    );
  }
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${dim} ${
            n <= value
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/40"
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-muted-foreground">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

/** Colored badge for quality score (1-2 red, 3 amber, 4-5 emerald). */
function QualityBadge({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-xs text-muted-foreground italic">N/A</span>;
  }
  let cls = "";
  let label = "";
  if (score <= 2) {
    cls = "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/40";
    label = score === 1 ? "1 · Poor" : "2 · Fair";
  } else if (score === 3) {
    cls = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40";
    label = "3 · Good";
  } else {
    cls = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40";
    label = score === 4 ? "4 · V. Good" : "5 · Excellent";
  }
  return (
    <Badge variant="outline" className={`gap-1 ${cls}`}>
      <ShieldCheck className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/** Colored badge for on-time rate (≥90 emerald, 70-89 amber, <70 rose, null N/A). */
function OnTimeBadge({ rate }: { rate: number | null }) {
  if (rate == null) {
    return <span className="text-xs text-muted-foreground italic">N/A</span>;
  }
  const rounded = Math.round(rate);
  let cls = "";
  if (rounded >= 90) {
    cls = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40";
  } else if (rounded >= 70) {
    cls = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40";
  } else {
    cls = "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/40";
  }
  return (
    <Badge variant="outline" className={`gap-1 ${cls}`}>
      <Clock className="h-3 w-3" />
      {rounded}%
    </Badge>
  );
}

/** Status badge for purchase status (received/pending/cancelled). */
function StatusBadge({ status }: { status: string }) {
  const s = (status || "received").toLowerCase();
  let cls = "";
  let label = s.charAt(0).toUpperCase() + s.slice(1);
  if (s === "received") {
    cls = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40";
  } else if (s === "pending") {
    cls = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40";
  } else if (s === "cancelled") {
    cls = "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/40";
  } else {
    cls = "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800/40";
  }
  return (
    <Badge variant="outline" className={cls}>
      {label}
    </Badge>
  );
}

/** Medal icon (gold/silver/bronze) for leaderboard top 3. */
function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="h-5 w-5 text-amber-500" aria-label="Gold" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" aria-label="Silver" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-orange-700" aria-label="Bronze" />;
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
      {rank}
    </span>
  );
}

// ─── Performance Tab Content ─────────────────────────────────────────────────

interface PerformanceTabContentProps {
  overview: OverviewResponse | null;
  loading: boolean;
  sortedOverview: OverviewEntry[];
  topSuppliers: OverviewEntry[];
  perfSortKey: PerfSortKey;
  perfSortDir: SortDir;
  handlePerfSort: (key: PerfSortKey) => void;
  PerfSortIcon: ({ field }: { field: PerfSortKey }) => React.ReactNode;
  openRatingDialog: (entry: OverviewEntry) => void;
  onViewDetail: (entry: OverviewEntry) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
  scrollToTable: () => void;
}

function PerformanceTabContent({
  overview,
  loading,
  sortedOverview,
  topSuppliers,
  perfSortKey,
  perfSortDir,
  handlePerfSort,
  PerfSortIcon,
  openRatingDialog,
  onViewDetail,
  tableRef,
  scrollToTable,
}: PerformanceTabContentProps) {
  const summary = overview?.summary;
  const hasData = sortedOverview.length > 0;

  // Bar chart data: top 5 by spend (already sorted desc in topSuppliers).
  const barData = topSuppliers
    .filter((s) => s.totalSpend > 0)
    .map((s, i) => ({
      name: s.name.length > 18 ? s.name.slice(0, 17) + "…" : s.name,
      fullName: s.name,
      spend: s.totalSpend,
      color: PERF_CHART_COLORS[i % PERF_CHART_COLORS.length],
    }));

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Suppliers */}
        <Card className="card-hover border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Building2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">
                {loading ? "—" : summary?.totalSuppliers ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Total Suppliers</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {summary?.activeSuppliers ?? 0} active
                </span>
                {" · "}
                <span className="font-medium text-rose-600 dark:text-rose-400">
                  {summary?.inactiveSuppliers ?? 0} inactive
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Spend */}
        <Card className="card-hover border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <IndianRupee className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">
                {loading ? "—" : formatCurrency(summary?.totalSpend ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Spend (all-time)</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Across all suppliers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Avg Rating */}
        <Card className="card-hover border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Star className="h-6 w-6 text-amber-500 fill-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold">
                {loading
                  ? "—"
                  : summary?.avgRating != null
                  ? summary.avgRating.toFixed(2)
                  : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Average Rating</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {summary?.ratedCount ?? 0} supplier{(summary?.ratedCount ?? 0) === 1 ? "" : "s"} rated
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Top Supplier */}
        <Card className="card-hover border-amber-200/60 dark:border-amber-800/30">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold">
                {loading
                  ? "—"
                  : summary?.topSupplier?.name ?? "No purchases yet"}
              </p>
              <p className="text-xs text-muted-foreground">Top Supplier (by spend)</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {summary?.topSupplier
                  ? formatCurrency(summary.topSupplier.totalSpend)
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main layout: table on left, leaderboard + chart on right */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Performance Table */}
        <Card
          ref={tableRef}
          className="border-amber-200/60 dark:border-amber-800/30 xl:col-span-2 scroll-mt-4"
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Supplier Performance Table
            </CardTitle>
            <CardDescription>
              {loading
                ? "Loading performance data..."
                : `${sortedOverview.length} supplier${sortedOverview.length === 1 ? "" : "s"} · sorted by ${perfSortKey} (${perfSortDir})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !hasData ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Trophy className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="mt-3 text-base font-semibold">No performance data</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add suppliers and record purchases to start tracking performance metrics here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handlePerfSort("name")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Supplier <PerfSortIcon field="name" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handlePerfSort("category")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Category <PerfSortIcon field="category" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={() => handlePerfSort("orders")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Orders <PerfSortIcon field="orders" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={() => handlePerfSort("spend")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Total Spend <PerfSortIcon field="spend" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          type="button"
                          onClick={() => handlePerfSort("avgOrder")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Avg Order <PerfSortIcon field="avgOrder" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handlePerfSort("rating")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Rating <PerfSortIcon field="rating" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handlePerfSort("quality")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Quality <PerfSortIcon field="quality" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handlePerfSort("onTime")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          On-Time <PerfSortIcon field="onTime" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          onClick={() => handlePerfSort("lastOrder")}
                          className="inline-flex items-center font-medium hover:text-foreground"
                        >
                          Last Order <PerfSortIcon field="lastOrder" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedOverview.map((entry, idx) => (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.015, 0.3) }}
                        className="border-b transition-colors hover:bg-amber-50/60 dark:hover:bg-amber-900/10 cursor-pointer"
                        onClick={() => onViewDetail(entry)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <span className="truncate font-medium max-w-[140px]">
                              {entry.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.category ? (
                            <Badge
                              className={getCategoryBadgeClass(entry.category)}
                              variant="secondary"
                            >
                              {entry.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {entry.totalOrders}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {entry.totalSpend > 0 ? (
                            formatCurrency(entry.totalSpend)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {entry.totalOrders > 0
                            ? formatCurrencyShort(entry.avgOrderValue)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <StarRating value={entry.rating} />
                        </TableCell>
                        <TableCell>
                          <QualityBadge score={entry.qualityScore} />
                        </TableCell>
                        <TableCell>
                          <OnTimeBadge rate={entry.onTimeRate} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {entry.lastOrderDate ? formatDate(entry.lastOrderDate) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRatingDialog(entry)}
                              className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                            >
                              <Star className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Rate</span>
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right sidebar: Leaderboard + Bar Chart */}
        <div className="space-y-6">
          {/* Top 5 Leaderboard */}
          <Card className="border-amber-200/60 dark:border-amber-800/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top 5 Suppliers
              </CardTitle>
              <CardDescription>Ranked by total spend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              ) : topSuppliers.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No supplier purchases recorded yet.
                </p>
              ) : (
                topSuppliers.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-amber-50/60 dark:hover:bg-amber-900/10 ${
                      i === 0
                        ? "border-amber-300 bg-amber-50/40 dark:border-amber-700/40 dark:bg-amber-900/10"
                        : "border-amber-200/40 dark:border-amber-800/20"
                    }`}
                  >
                    <RankMedal rank={i + 1} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-400">
                          {formatCurrencyShort(s.totalSpend)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          · {s.totalOrders} order{s.totalOrders === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-1">
                        <StarRating value={s.rating} size="sm" />
                      </div>
                    </div>
                    {i < 3 && (
                      <Award className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
                    )}
                  </motion.div>
                ))
              )}
              {topSuppliers.length > 0 && (
                <button
                  type="button"
                  onClick={scrollToTable}
                  className="mt-1 flex w-full items-center justify-center gap-1 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  View All
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart: top 5 by spend */}
          <Card className="border-amber-200/60 dark:border-amber-800/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Spend by Supplier
              </CardTitle>
              <CardDescription>Top 5 · total spend (₹)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : barData.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                  No spend data to chart yet.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted/30" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatCurrencyShort(Number(v))}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={90}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        className="text-muted-foreground"
                      />
                      <RTooltip
                        cursor={{ fill: "rgba(245,158,11,0.08)" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid rgba(245,158,11,0.3)",
                          background: "var(--background)",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Spend"]}
                        labelFormatter={(_label, payload) => {
                          const p = payload?.[0]?.payload as { fullName?: string } | undefined;
                          return p?.fullName ?? "";
                        }}
                      />
                      <Bar dataKey="spend" radius={[0, 6, 6, 0]}>
                        {barData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── Detail Sheet Performance Content ────────────────────────────────────────

interface DetailPerformanceContentProps {
  data: SupplierPerformance;
  onRate: () => void;
}

function DetailPerformanceContent({
  data,
  onRate,
}: DetailPerformanceContentProps) {
  const { supplier, metrics, topIngredients, monthlySpend, recentOrders } = data;

  // Mini line chart data
  const trendData = monthlySpend.map((m) => ({
    month: m.month,
    spend: m.total,
    count: m.count,
  }));

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-amber-200/40 dark:border-amber-800/20">
          <CardContent className="p-3 text-center">
            <ShoppingCart className="mx-auto h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="mt-1 text-xl font-bold">{metrics.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200/40 dark:border-amber-800/20">
          <CardContent className="p-3 text-center">
            <IndianRupee className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="mt-1 text-base font-bold">
              {formatCurrencyShort(metrics.totalSpend)}
            </p>
            <p className="text-xs text-muted-foreground">Total Spend</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200/40 dark:border-amber-800/20">
          <CardContent className="p-3 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="mt-1 text-base font-bold">
              {formatCurrencyShort(metrics.avgOrderValue)}
            </p>
            <p className="text-xs text-muted-foreground">Avg Order Value</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200/40 dark:border-amber-800/20">
          <CardContent className="p-3 text-center">
            <Clock className="mx-auto h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="mt-1 text-xs font-bold">
              {metrics.lastOrderDate ? formatDate(metrics.lastOrderDate) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Last Order</p>
          </CardContent>
        </Card>
      </div>

      {/* Rating summary */}
      <Card className="border-amber-200/40 dark:border-amber-800/20">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current Ratings
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRate}
              className="h-7 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
            >
              <Star className="h-3 w-3" />
              Edit
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Rating</p>
              <div className="mt-0.5 flex justify-center">
                <StarRating value={supplier.rating} size="sm" />
              </div>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Quality</p>
              <div className="mt-0.5 flex justify-center">
                <QualityBadge score={supplier.qualityScore} />
              </div>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-[10px] uppercase text-muted-foreground">On-Time</p>
              <div className="mt-0.5 flex justify-center">
                <OnTimeBadge
                  rate={
                    supplier.effectiveOnTimeRate != null
                      ? supplier.effectiveOnTimeRate
                      : supplier.onTimeRate
                  }
                />
              </div>
            </div>
          </div>
          {supplier.calculatedOnTimeRate != null &&
            supplier.onTimeRate == null && (
              <p className="text-[11px] text-muted-foreground italic">
                On-time rate auto-calculated from {metrics.totalOrders} orders with
                delivery & expected dates.
              </p>
            )}
          {supplier.notes && (
            <div className="pt-1">
              <p className="text-[10px] uppercase text-muted-foreground">Notes</p>
              <p className="mt-0.5 text-sm whitespace-pre-wrap">{supplier.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mini trend chart */}
      <Card className="border-amber-200/40 dark:border-amber-800/20">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            6-Month Spend Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(v) => formatCurrencyShort(Number(v))}
                  className="text-muted-foreground"
                />
                <RTooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid rgba(245,158,11,0.3)",
                    background: "var(--background)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "spend") return [formatCurrency(value), "Spend"];
                    return [value, name];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="spend"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#f59e0b" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top ingredients supplied */}
      <Card className="border-amber-200/40 dark:border-amber-800/20">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Top Ingredients Supplied
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {topIngredients.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
              No ingredient-level data available.
            </p>
          ) : (
            <div className="space-y-1">
              {topIngredients.map((ing) => (
                <div
                  key={ing.ingredientId}
                  className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ing.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ing.count} order{ing.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {ing.totalQty.toLocaleString("en-IN", { maximumFractionDigits: 2 })} {ing.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent orders (last 5) */}
      <Card className="border-amber-200/40 dark:border-amber-800/20">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShoppingCart className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Recent Orders (last 5)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentOrders.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
              No purchases recorded from this supplier.
            </p>
          ) : (
            <div className="space-y-1">
              {recentOrders.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.invoiceNo || `Purchase ${formatDate(p.date)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">
                      {formatCurrency(p.totalAmount)}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-provider";
import {
  Settings,
  Building2,
  MapPin,
  Users,
  FileText,
  Database,
  Trash2,
  RefreshCw,
  Loader2,
  Package,
  ChefHat,
  ShoppingCart,
  Receipt,
  Info,
  Code,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Target,
  TrendingUp,
  IndianRupee,
  ArrowRight,
  ShieldAlert,
  Bell,
  Save,
  PackageOpen,
  Download,
  Upload,
  FileJson,
  FileUp,
  CalendarClock,
  HardDriveDownload,
  Truck,
  UserPlus,
  Pencil,
  UserCircle,
  KeyRound,
} from "lucide-react";
import type { ViewId } from "@/components/app-sidebar";
import { AuditLogSection } from "@/components/module-views/audit-log-section";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DataSummary {
  totalIngredients: number;
  totalRecipes: number;
  totalPurchases: number;
  totalExpenses: number;
  totalSuppliers: number;
}

interface CanteenInfo {
  name: string;
  location: string;
  employeeCount: number;
  contractType: string;
}

interface BudgetData {
  monthlyFoodBudget: number;
  monthlyOperatingBudget: number;
}

interface AlertSettings {
  foodThreshold: number;
  operatingThreshold: number;
}

interface BudgetRecord {
  id: string;
  month: string;
  foodBudget: number;
  operatingBudget: number;
  totalBudget: number;
  alertThreshold: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardData {
  foodCost: { today: number; week: number; month: number };
  meals: { today: number; month: number };
  costPerMeal: number;
  totalOperatingCost: number;
  expenses: { month: number; breakdown: Array<{ category: string; amount: number }> };
}

interface CostReportData {
  foodCost: { total: number; costPerMeal: number };
  expenses: { total: number };
  totalOperatingCost: number;
}

// ─── User Management Types ────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  name: string;
  email: string;
  role: string;
  password: string;
}

// ─── Backup / Restore Types ───────────────────────────────────────────────────

interface BackupCounts {
  ingredients: number;
  recipes: number;
  recipeIngredients?: number;
  stockMovements: number;
  dailyMeals: number;
  purchases: number;
  purchaseItems?: number;
  expenses: number;
  suppliers?: number;
  users?: number;
  total: number;
}

interface BackupMetadata {
  version: string;
  exportDate: string;
  app: string;
  counts: BackupCounts;
}

interface BackupFile {
  metadata: BackupMetadata;
  data: Record<string, unknown>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CANTEEN_INFO_KEY = "rcs-canteen-info";
const BUDGET_KEY = "rcs-canteen-budget";
const ALERTS_KEY = "rcs-canteen-alerts";
const LAST_BACKUP_KEY = "rcs-canteen-last-backup";

const DEFAULT_CANTEEN_INFO: CanteenInfo = {
  name: "RCS Canteen",
  location: "Dahej",
  employeeCount: 600,
  contractType: "Industrial",
};

const DEFAULT_BUDGET: BudgetData = {
  monthlyFoodBudget: 500000,
  monthlyOperatingBudget: 750000,
};

const DEFAULT_ALERTS: AlertSettings = {
  foodThreshold: 80,
  operatingThreshold: 80,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(value: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
  return `₹${formatted}`;
}

function formatINRShort(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return formatINR(value);
}

function getBudgetColor(pct: number): string {
  if (pct > 100) return "#ef4444"; // red-500
  if (pct >= 80) return "#f59e0b"; // amber-500
  return "#10b981"; // emerald-500
}

function getBudgetColorClass(pct: number): string {
  if (pct > 100) return "text-red-500";
  if (pct >= 80) return "text-amber-500";
  return "text-emerald-500";
}

function getProgressClass(pct: number): string {
  if (pct > 100) return "[&>div]:bg-red-500";
  if (pct >= 80) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-emerald-500";
}

// ─── Backup / Restore Helpers ─────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const v = bytes / Math.pow(1024, i);
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "Never";
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? "Just now" : `${diffMins} minutes ago`;
      }
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

function isStaleBackup(iso: string | null, days = 7): boolean {
  if (!iso) return true;
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    return diffMs > days * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function validateBackupFile(parsed: unknown): {
  valid: boolean;
  error?: string;
  file?: BackupFile;
} {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { valid: false, error: "Invalid format: expected a JSON object." };
  }
  const obj = parsed as Record<string, unknown>;
  const metadata = obj.metadata as Record<string, unknown> | undefined;
  const data = obj.data as Record<string, unknown> | undefined;
  if (!metadata || typeof metadata !== "object") {
    return { valid: false, error: 'Missing "metadata" object.' };
  }
  if (!data || typeof data !== "object") {
    return { valid: false, error: 'Missing "data" object.' };
  }
  // At least one collection must be an array
  const collections = ["ingredients", "recipes", "stockMovements", "dailyMeals", "purchases", "expenses", "suppliers", "users"];
  const hasAny = collections.some((k) => Array.isArray((data as Record<string, unknown>)[k]));
  if (!hasAny) {
    return { valid: false, error: "Backup contains no recognizable data collections." };
  }
  return {
    valid: true,
    file: {
      metadata: metadata as unknown as BackupMetadata,
      data,
    },
  };
}

// ─── Circular Budget Gauge ───────────────────────────────────────────────────

function BudgetGauge({ percent, label, spent, budget }: {
  percent: number;
  label: string;
  spent: number;
  budget: number;
}) {
  const size = 140;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(percent, 150)); // allow up to 150% for visual
  const dashOffset = circumference - (Math.min(clamped, 100) / 100) * circumference;
  const color = getBudgetColor(percent);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="meter"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} budget utilization`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color }}
          >
            {Math.round(percent)}%
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            Used
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatINRShort(spent)} / {formatINRShort(budget)}
        </p>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SettingsViewProps {
  onNavigate?: (view: ViewId) => void;
}

export function SettingsView({ onNavigate }: SettingsViewProps) {
  const [canteenInfo, setCanteenInfo] = useState<CanteenInfo>(DEFAULT_CANTEEN_INFO);
  const [dataSummary, setDataSummary] = useState<DataSummary>({
    totalIngredients: 0,
    totalRecipes: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    totalSuppliers: 0,
  });
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Budget & Alerts state
  const [budget, setBudget] = useState<BudgetData>(DEFAULT_BUDGET);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERTS);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isLoadingBudget, setIsLoadingBudget] = useState(true);
  const [budgetSaved, setBudgetSaved] = useState(false);
  const [alertsSaved, setAlertsSaved] = useState(false);
  const [costReport, setCostReport] = useState<CostReportData | null>(null);

  // DB-backed budget state
  const [budgetHistory, setBudgetHistory] = useState<BudgetRecord[]>([]);
  const [currentMonthBudget, setCurrentMonthBudget] = useState<BudgetRecord | null>(null);

  // Editable budget inputs
  const [foodBudgetInput, setFoodBudgetInput] = useState("");
  const [operatingBudgetInput, setOperatingBudgetInput] = useState("");
  const [totalBudgetInput, setTotalBudgetInput] = useState("");
  const [foodThresholdInput, setFoodThresholdInput] = useState("");
  const [operatingThresholdInput, setOperatingThresholdInput] = useState("");
  const [alertThresholdInput, setAlertThresholdInput] = useState("");

  // Backup / Restore state
  const { toast } = useToast();
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportInfo, setLastExportInfo] = useState<{
    size: number;
    counts: BackupCounts;
  } | null>(null);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    fileSize: number;
    file: BackupFile;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSuccess, setImportSuccess] = useState<{
    counts: BackupCounts;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // User Management state
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState<UserFormData>({
    name: "",
    email: "",
    role: "staff",
    password: "",
  });
  const [editUserForm, setEditUserForm] = useState<UserFormData>({
    name: "",
    email: "",
    role: "staff",
    password: "",
  });

  // Load canteen info from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CANTEEN_INFO_KEY);
      if (stored) {
        setCanteenInfo(JSON.parse(stored));
      } else {
        localStorage.setItem(CANTEEN_INFO_KEY, JSON.stringify(DEFAULT_CANTEEN_INFO));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Load last backup date from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_BACKUP_KEY);
      if (stored) {
        setLastBackupDate(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  // Load budget & alerts from localStorage (fallback) and DB
  useEffect(() => {
    try {
      const storedBudget = localStorage.getItem(BUDGET_KEY);
      if (storedBudget) {
        const parsed = JSON.parse(storedBudget) as BudgetData;
        setBudget(parsed);
        setFoodBudgetInput(String(parsed.monthlyFoodBudget));
        setOperatingBudgetInput(String(parsed.monthlyOperatingBudget));
        setTotalBudgetInput(String(parsed.monthlyOperatingBudget)); // Default total = operating
      } else {
        localStorage.setItem(BUDGET_KEY, JSON.stringify(DEFAULT_BUDGET));
        setFoodBudgetInput(String(DEFAULT_BUDGET.monthlyFoodBudget));
        setOperatingBudgetInput(String(DEFAULT_BUDGET.monthlyOperatingBudget));
        setTotalBudgetInput(String(DEFAULT_BUDGET.monthlyOperatingBudget));
      }

      const storedAlerts = localStorage.getItem(ALERTS_KEY);
      if (storedAlerts) {
        const parsed = JSON.parse(storedAlerts) as AlertSettings;
        setAlertSettings(parsed);
        setFoodThresholdInput(String(parsed.foodThreshold));
        setOperatingThresholdInput(String(parsed.operatingThreshold));
        setAlertThresholdInput(String(parsed.foodThreshold));
      } else {
        localStorage.setItem(ALERTS_KEY, JSON.stringify(DEFAULT_ALERTS));
        setFoodThresholdInput(String(DEFAULT_ALERTS.foodThreshold));
        setOperatingThresholdInput(String(DEFAULT_ALERTS.operatingThreshold));
        setAlertThresholdInput(String(DEFAULT_ALERTS.foodThreshold));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Fetch dashboard data for budget tracking (including DB budgets)
  const fetchBudgetData = useCallback(async () => {
    setIsLoadingBudget(true);
    try {
      const [dashboardRes, lowStockRes, costRes, budgetsRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/ingredients?lowStock=true"),
        fetch("/api/reports/cost?period=month"),
        fetch("/api/budgets"),
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboardData(data);
      }

      if (lowStockRes.ok) {
        const lowStockItems = await lowStockRes.json();
        setLowStockCount(Array.isArray(lowStockItems) ? lowStockItems.length : 0);
      }

      if (costRes.ok) {
        const data = await costRes.json();
        setCostReport(data);
      }

      if (budgetsRes.ok) {
        const budgets = (await budgetsRes.json()) as BudgetRecord[];
        setBudgetHistory(budgets);
        // Find current month's budget
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const currentBudget = budgets.find((b) => b.month === currentMonth);
        if (currentBudget) {
          setCurrentMonthBudget(currentBudget);
          // Override localStorage values with DB values
          setBudget({
            monthlyFoodBudget: currentBudget.foodBudget,
            monthlyOperatingBudget: currentBudget.operatingBudget,
          });
          setFoodBudgetInput(String(currentBudget.foodBudget));
          setOperatingBudgetInput(String(currentBudget.operatingBudget));
          setTotalBudgetInput(String(currentBudget.totalBudget));
          setAlertThresholdInput(String(currentBudget.alertThreshold));
          setAlertSettings({
            foodThreshold: currentBudget.alertThreshold,
            operatingThreshold: currentBudget.alertThreshold,
          });
          setFoodThresholdInput(String(currentBudget.alertThreshold));
          setOperatingThresholdInput(String(currentBudget.alertThreshold));
        }
      }
    } catch (error) {
      console.error("Error fetching budget data:", error);
    } finally {
      setIsLoadingBudget(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  // Save budget (to DB + localStorage)
  const handleSaveBudget = async () => {
    const foodVal = parseFloat(foodBudgetInput) || DEFAULT_BUDGET.monthlyFoodBudget;
    const opVal = parseFloat(operatingBudgetInput) || DEFAULT_BUDGET.monthlyOperatingBudget;
    const totalVal = parseFloat(totalBudgetInput) || opVal;
    const newBudget: BudgetData = { monthlyFoodBudget: foodVal, monthlyOperatingBudget: opVal };
    setBudget(newBudget);
    localStorage.setItem(BUDGET_KEY, JSON.stringify(newBudget));

    // Save to DB via API
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const alertTh = parseFloat(alertThresholdInput) || 80;
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          foodBudget: foodVal,
          operatingBudget: opVal,
          totalBudget: totalVal,
          alertThreshold: alertTh,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setCurrentMonthBudget(saved);
        // Refresh budget history
        const budgetsRes = await fetch("/api/budgets");
        if (budgetsRes.ok) {
          setBudgetHistory((await budgetsRes.json()) as BudgetRecord[]);
        }
      }
    } catch (error) {
      console.error("Error saving budget to DB:", error);
    }

    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 3000);
  };

  // Save alerts (to DB + localStorage)
  const handleSaveAlerts = async () => {
    const foodTh = parseFloat(foodThresholdInput) || DEFAULT_ALERTS.foodThreshold;
    const opTh = parseFloat(operatingThresholdInput) || DEFAULT_ALERTS.operatingThreshold;
    const newAlerts: AlertSettings = {
      foodThreshold: Math.min(100, Math.max(1, foodTh)),
      operatingThreshold: Math.min(100, Math.max(1, opTh)),
    };
    setAlertSettings(newAlerts);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(newAlerts));

    // Update DB budget record with alert threshold
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const alertTh = parseFloat(alertThresholdInput) || 80;
      await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          foodBudget: budget.monthlyFoodBudget,
          operatingBudget: budget.monthlyOperatingBudget,
          totalBudget: currentMonthBudget?.totalBudget ?? budget.monthlyOperatingBudget,
          alertThreshold: alertTh,
        }),
      });
    } catch (error) {
      console.error("Error saving alert thresholds to DB:", error);
    }

    setAlertsSaved(true);
    setTimeout(() => setAlertsSaved(false), 3000);
  };

  // Fetch data summary from APIs
  const fetchDataSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const [ingredientsRes, recipesRes, purchasesRes, expensesRes, suppliersRes] =
        await Promise.all([
          fetch("/api/ingredients"),
          fetch("/api/recipes"),
          fetch("/api/purchases"),
          fetch("/api/expenses"),
          fetch("/api/suppliers"),
        ]);

      const ingredients = await ingredientsRes.json();
      const recipes = await recipesRes.json();
      const purchases = await purchasesRes.json();
      const expenses = await expensesRes.json();
      const suppliers = await suppliersRes.json();

      setDataSummary({
        totalIngredients: Array.isArray(ingredients) ? ingredients.length : 0,
        totalRecipes: Array.isArray(recipes) ? recipes.length : 0,
        totalPurchases: purchases?.total ?? 0,
        totalExpenses: expenses?.total ?? 0,
        totalSuppliers: Array.isArray(suppliers) ? suppliers.length : 0,
      });
    } catch (error) {
      console.error("Error fetching data summary:", error);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchDataSummary();
  }, [fetchDataSummary]);

  // ─── User Management ──────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUser = async () => {
    if (!addUserForm.name || !addUserForm.email || !addUserForm.password) {
      toast({
        title: "Missing fields",
        description: "Name, email, and password are required.",
        variant: "destructive",
      });
      return;
    }
    setIsSavingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addUserForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create user");
      }
      setAddUserOpen(false);
      setAddUserForm({ name: "", email: "", role: "staff", password: "" });
      await fetchUsers();
      toast({ title: "User created", description: "The new user has been added successfully." });
    } catch (error) {
      toast({
        title: "Failed to create user",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    if (!editUserForm.name || !editUserForm.email) {
      toast({
        title: "Missing fields",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }
    setIsSavingUser(true);
    try {
      const payload: Record<string, string> = {
        name: editUserForm.name,
        email: editUserForm.email,
        role: editUserForm.role,
      };
      if (editUserForm.password.trim().length > 0) {
        payload.password = editUserForm.password;
      }
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update user");
      }
      setEditUserOpen(false);
      setSelectedUser(null);
      setEditUserForm({ name: "", email: "", role: "staff", password: "" });
      await fetchUsers();
      toast({ title: "User updated", description: "User details have been saved." });
    } catch (error) {
      toast({
        title: "Failed to update user",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSavingUser(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete user");
      }
      setDeleteUserOpen(false);
      setSelectedUser(null);
      await fetchUsers();
      toast({ title: "User deleted", description: "The user has been removed." });
    } catch (error) {
      toast({
        title: "Failed to delete user",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  const openEditDialog = (user: UserRecord) => {
    setSelectedUser(user);
    setEditUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    });
    setEditUserOpen(true);
  };

  const openDeleteDialog = (user: UserRecord) => {
    setSelectedUser(user);
    setDeleteUserOpen(true);
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "store":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "kitchen":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      default:
        return "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-400 border-stone-200 dark:border-stone-800";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Admin";
      case "store": return "Store";
      case "kitchen": return "Kitchen";
      default: return "Staff";
    }
  };

  // Seed sample data
  const handleSeedData = async () => {
    setIsSeeding(true);
    setSeedSuccess(false);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        setSeedSuccess(true);
        await fetchDataSummary();
        await fetchBudgetData();
        setTimeout(() => setSeedSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error seeding data:", error);
    } finally {
      setIsSeeding(false);
    }
  };

  // Clear all data
  const handleClearData = async () => {
    try {
      const res = await fetch("/api/ingredients");
      if (res.ok) {
        const ingredients = await res.json();
        for (const ing of ingredients) {
          await fetch(`/api/ingredients/${ing.id}`, { method: "DELETE" });
        }
      }
      setClearSuccess(true);
      await fetchDataSummary();
      await fetchBudgetData();
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  };

  // ─── Backup: Export (GET /api/backup) ───────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    setLastExportInfo(null);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const size = blob.size;

      // Read counts from metadata for display
      let counts: BackupCounts | null = null;
      try {
        const text = await blob.text();
        const parsed = JSON.parse(text) as BackupFile;
        counts = parsed.metadata?.counts ?? null;
      } catch {
        // ignore parse error for display purposes
      }

      // Re-create blob from text to ensure the download works even after .text()
      const downloadBlob = new Blob([await blob.arrayBuffer()], {
        type: "application/json",
      });
      const url = URL.createObjectURL(downloadBlob);
      const filename = `rcs-canteen-backup-${new Date().toISOString().split("T")[0]}.json`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Persist last backup date
      const nowIso = new Date().toISOString();
      try {
        localStorage.setItem(LAST_BACKUP_KEY, nowIso);
        setLastBackupDate(nowIso);
      } catch {
        // ignore
      }

      if (counts) {
        setLastExportInfo({ size, counts });
      }

      toast({
        title: "Backup exported",
        description: `Saved ${filename} (${formatBytes(size)}, ${counts?.total ?? 0} records).`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // ─── Restore: File selection & validation ──────────────────────────────────
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again later
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (file.size > 50 * 1024 * 1024) {
      setImportError("File is too large (max 50 MB).");
      toast({
        title: "File too large",
        description: "Backup files must be under 50 MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = validateBackupFile(parsed);
      if (!result.valid || !result.file) {
        setImportError(result.error ?? "Invalid backup file.");
        toast({
          title: "Invalid backup file",
          description: result.error ?? "Could not read this file.",
          variant: "destructive",
        });
        return;
      }
      setPendingImport({
        fileName: file.name,
        fileSize: file.size,
        file: result.file,
      });
      setConfirmOpen(true);
    } catch {
      setImportError("Could not parse JSON file.");
      toast({
        title: "Invalid file",
        description: "The selected file is not valid JSON.",
        variant: "destructive",
      });
    }
  };

  // ─── Restore: Confirm import (POST /api/backup) ────────────────────────────
  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setConfirmOpen(false);
    setIsImporting(true);
    setImportProgress(8);
    setImportError(null);
    setImportSuccess(null);

    try {
      // Simulated progress feedback while request is in flight
      const progressInterval = setInterval(() => {
        setImportProgress((p) => (p < 90 ? p + Math.max(1, Math.floor((90 - p) / 5)) : p));
      }, 250);

      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: pendingImport.file.metadata,
          data: pendingImport.file.data,
        }),
      });

      clearInterval(progressInterval);
      setImportProgress(95);

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Import failed (${res.status})`);
      }

      setImportProgress(100);
      const counts = (body?.counts ?? pendingImport.file.metadata.counts) as BackupCounts;
      setImportSuccess({ counts });

      // Refresh data summary + budget data after restore
      await Promise.all([fetchDataSummary(), fetchBudgetData()]);

      toast({
        title: "Data restored successfully",
        description: `Imported ${counts?.total ?? 0} records from ${pendingImport.fileName}.`,
      });

      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
        setPendingImport(null);
      }, 800);
    } catch (error) {
      console.error("Import error:", error);
      setIsImporting(false);
      setImportProgress(0);
      setImportError(error instanceof Error ? error.message : "Unknown error");
      toast({
        title: "Restore failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCancelImport = () => {
    setConfirmOpen(false);
    setPendingImport(null);
  };

  // ─── Derived display values ────────────────────────────────────────────────
  const backupStale = isStaleBackup(lastBackupDate, 7);
  const totalRecords =
    dataSummary.totalIngredients +
    dataSummary.totalRecipes +
    dataSummary.totalPurchases +
    dataSummary.totalExpenses;

  // Budget calculations
  const foodSpent = dashboardData?.foodCost?.month ?? 0;
  const operatingSpent = dashboardData?.totalOperatingCost ?? 0;
  const foodBudgetPct = budget.monthlyFoodBudget > 0 ? (foodSpent / budget.monthlyFoodBudget) * 100 : 0;
  const operatingBudgetPct = budget.monthlyOperatingBudget > 0 ? (operatingSpent / budget.monthlyOperatingBudget) * 100 : 0;
  const foodRemaining = budget.monthlyFoodBudget - foodSpent;
  const operatingRemaining = budget.monthlyOperatingBudget - operatingSpent;

  // Alert thresholds triggered
  const foodAlertTriggered = foodBudgetPct >= alertSettings.foodThreshold;
  const operatingAlertTriggered = operatingBudgetPct >= alertSettings.operatingThreshold;
  const foodOverBudget = foodBudgetPct > 100;
  const operatingOverBudget = operatingBudgetPct > 100;

  // Get current month name
  const currentMonth = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 view-enter">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Settings className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage canteen information, budget, alerts, and system preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ─── Budget & Alerts Card ─────────────────────────────────────── */}
        <Card className="md:col-span-2 card-elevated border-amber-200/60 dark:border-amber-800/30 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-amber-500/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Budget & Alerts
                  </CardTitle>
                  <CardDescription>
                    Set monthly budgets, track spending, and configure alert thresholds
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchBudgetData}
                  disabled={isLoadingBudget}
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingBudget ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
          </div>

          <CardContent className="space-y-6 pt-6">
            {/* ─── Visual Budget Summary (Circular Gauges) ──────────────── */}
            {isLoadingBudget ? (
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="h-[140px] w-[140px] rounded-full bg-muted/50 animate-pulse" />
                <div className="h-[140px] w-[140px] rounded-full bg-muted/50 animate-pulse" />
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Budget Utilization — {currentMonth}
                  </h3>
                </div>
                <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
                  <BudgetGauge
                    percent={foodBudgetPct}
                    label="Food Budget"
                    spent={foodSpent}
                    budget={budget.monthlyFoodBudget}
                  />
                  <BudgetGauge
                    percent={operatingBudgetPct}
                    label="Operating Budget"
                    spent={operatingSpent}
                    budget={budget.monthlyOperatingBudget}
                  />
                </div>
                {/* Over Budget Warnings */}
                {(foodOverBudget || operatingOverBudget) && (
                  <div className="mt-4 flex flex-col gap-2">
                    {foodOverBudget && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 px-3 py-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-400">
                          Food budget exceeded by {formatINR(Math.abs(foodRemaining))}!
                        </span>
                      </div>
                    )}
                    {operatingOverBudget && (
                      <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 px-3 py-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-400">
                          Operating budget exceeded by {formatINR(Math.abs(operatingRemaining))}!
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── Budget vs Actual Progress Bars ───────────────────────── */}
            {isLoadingBudget ? (
              <div className="space-y-4">
                <div className="h-20 rounded-lg bg-muted/50 animate-pulse" />
                <div className="h-20 rounded-lg bg-muted/50 animate-pulse" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Food Budget Progress */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                        <IndianRupee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Food Budget</p>
                        <p className="text-xs text-muted-foreground">Monthly food purchase costs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {foodOverBudget ? (
                        <Badge variant="destructive" className="text-xs">
                          Over Budget!
                        </Badge>
                      ) : foodAlertTriggered ? (
                        <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                          <Bell className="h-3 w-3 mr-1" />
                          Alert
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          On Track
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress
                    value={Math.min(foodBudgetPct, 100)}
                    className={`h-3 ${getProgressClass(foodBudgetPct)}`}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      <span className={getBudgetColorClass(foodBudgetPct)}>{Math.round(foodBudgetPct)}%</span>{" "}
                      used — {formatINR(foodSpent)}
                    </span>
                    <span className="tabular-nums">
                      {foodRemaining >= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{formatINR(foodRemaining)} remaining</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">{formatINR(Math.abs(foodRemaining))} over</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Operating Budget Progress */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-900/30">
                        <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Operating Budget</p>
                        <p className="text-xs text-muted-foreground">Food + operating expenses combined</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {operatingOverBudget ? (
                        <Badge variant="destructive" className="text-xs">
                          Over Budget!
                        </Badge>
                      ) : operatingAlertTriggered ? (
                        <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                          <Bell className="h-3 w-3 mr-1" />
                          Alert
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          On Track
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress
                    value={Math.min(operatingBudgetPct, 100)}
                    className={`h-3 ${getProgressClass(operatingBudgetPct)}`}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      <span className={getBudgetColorClass(operatingBudgetPct)}>{Math.round(operatingBudgetPct)}%</span>{" "}
                      used — {formatINR(operatingSpent)}
                    </span>
                    <span className="tabular-nums">
                      {operatingRemaining >= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">{formatINR(operatingRemaining)} remaining</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">{formatINR(Math.abs(operatingRemaining))} over</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* ─── Budget Setup ─────────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold">Monthly Budget Setup</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="foodBudget" className="text-xs text-muted-foreground">
                    Food Budget (₹)
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="foodBudget"
                      type="number"
                      value={foodBudgetInput}
                      onChange={(e) => setFoodBudgetInput(e.target.value)}
                      placeholder="500000"
                      className="pl-9 tabular-nums"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current: {formatINR(budget.monthlyFoodBudget)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operatingBudget" className="text-xs text-muted-foreground">
                    Operating Budget (₹)
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="operatingBudget"
                      type="number"
                      value={operatingBudgetInput}
                      onChange={(e) => setOperatingBudgetInput(e.target.value)}
                      placeholder="750000"
                      className="pl-9 tabular-nums"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current: {formatINR(budget.monthlyOperatingBudget)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalBudget" className="text-xs text-muted-foreground">
                    Total Budget (₹)
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="totalBudget"
                      type="number"
                      value={totalBudgetInput}
                      onChange={(e) => setTotalBudgetInput(e.target.value)}
                      placeholder="750000"
                      className="pl-9 tabular-nums"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current: {formatINR(currentMonthBudget?.totalBudget ?? budget.monthlyOperatingBudget)}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSaveBudget}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {budgetSaved ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Budget Saved!
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Budget
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* ─── Alert Thresholds ─────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold">Alert Thresholds</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Get notified when spending reaches a certain percentage of your budget.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="foodThreshold" className="text-xs text-muted-foreground">
                    Food Budget Alert (%)
                  </Label>
                  <div className="relative">
                    <Bell className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="foodThreshold"
                      type="number"
                      min={1}
                      max={100}
                      value={foodThresholdInput}
                      onChange={(e) => setFoodThresholdInput(e.target.value)}
                      placeholder="80"
                      className="pl-9 tabular-nums"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Alert at {alertSettings.foodThreshold}% — Currently{" "}
                      <span className={foodAlertTriggered ? "text-amber-600 dark:text-amber-400 font-medium" : "text-emerald-600 dark:text-emerald-400"}>
                        {Math.round(foodBudgetPct)}%
                      </span>
                    </p>
                    {foodAlertTriggered && (
                      <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 px-1.5 py-0">
                        Triggered
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operatingThreshold" className="text-xs text-muted-foreground">
                    Operating Budget Alert (%)
                  </Label>
                  <div className="relative">
                    <Bell className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="operatingThreshold"
                      type="number"
                      min={1}
                      max={100}
                      value={operatingThresholdInput}
                      onChange={(e) => setOperatingThresholdInput(e.target.value)}
                      placeholder="80"
                      className="pl-9 tabular-nums"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Alert at {alertSettings.operatingThreshold}% — Currently{" "}
                      <span className={operatingAlertTriggered ? "text-amber-600 dark:text-amber-400 font-medium" : "text-emerald-600 dark:text-emerald-400"}>
                        {Math.round(operatingBudgetPct)}%
                      </span>
                    </p>
                    {operatingAlertTriggered && (
                      <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 px-1.5 py-0">
                        Triggered
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alertThreshold" className="text-xs text-muted-foreground">
                    Default Alert Threshold (%)
                  </Label>
                  <div className="relative">
                    <Bell className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="alertThreshold"
                      type="number"
                      min={1}
                      max={100}
                      value={alertThresholdInput}
                      onChange={(e) => setAlertThresholdInput(e.target.value)}
                      placeholder="80"
                      className="pl-9 tabular-nums"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saved to DB for this month: {currentMonthBudget?.alertThreshold ?? 80}%
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSaveAlerts}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {alertsSaved ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Alerts Saved!
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Alert Thresholds
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* ─── Low Stock Alerts & Quick Link ────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <PackageOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold">Low Stock Alerts</h3>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                    <PackageOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold tabular-nums">
                      {isLoadingBudget ? "..." : lowStockCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ingredients below minimum stock level
                    </p>
                  </div>
                </div>
                {onNavigate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate("stock")}
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                  >
                    View Stock
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* ─── Budget History Table ─────────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-semibold">Budget History — Current Month</h3>
              </div>
              {isLoadingBudget ? (
                <div className="h-24 rounded-lg bg-muted/50 animate-pulse" />
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Category</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Budget</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actual</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Variance</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b last:border-0">
                        <td className="px-4 py-2.5 font-medium">Food Cost</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(budget.monthlyFoodBudget)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(foodSpent)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${foodRemaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {foodRemaining >= 0 ? "+" : ""}{formatINR(foodRemaining)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {foodOverBudget ? (
                            <Badge variant="destructive" className="text-xs">Over</Badge>
                          ) : foodAlertTriggered ? (
                            <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">Warning</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">OK</Badge>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b last:border-0">
                        <td className="px-4 py-2.5 font-medium">Operating Cost</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(budget.monthlyOperatingBudget)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(operatingSpent)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${operatingRemaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {operatingRemaining >= 0 ? "+" : ""}{formatINR(operatingRemaining)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {operatingOverBudget ? (
                            <Badge variant="destructive" className="text-xs">Over</Badge>
                          ) : operatingAlertTriggered ? (
                            <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">Warning</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">OK</Badge>
                          )}
                        </td>
                      </tr>
                      {costReport && (
                        <tr className="border-b last:border-0 bg-muted/20">
                          <td className="px-4 py-2.5 font-medium">Expenses</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">—</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(costReport.expenses?.total ?? 0)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">—</td>
                          <td className="px-4 py-2.5 text-right">
                            <Badge variant="outline" className="text-xs border-amber-200 dark:border-amber-800">Info</Badge>
                          </td>
                        </tr>
                      )}
                      {currentMonthBudget && currentMonthBudget.totalBudget > 0 && (
                        <tr className="border-b last:border-0 bg-amber-50/50 dark:bg-amber-900/10">
                          <td className="px-4 py-2.5 font-medium">Total Budget</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(currentMonthBudget.totalBudget)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(operatingSpent)}</td>
                          <td className={`px-4 py-2.5 text-right tabular-nums ${(currentMonthBudget.totalBudget - operatingSpent) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {(currentMonthBudget.totalBudget - operatingSpent) >= 0 ? "+" : ""}{formatINR(currentMonthBudget.totalBudget - operatingSpent)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {operatingSpent > currentMonthBudget.totalBudget ? (
                              <Badge variant="destructive" className="text-xs">Over</Badge>
                            ) : (operatingSpent / currentMonthBudget.totalBudget) * 100 >= (currentMonthBudget.alertThreshold ?? 80) ? (
                              <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800">Warning</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">OK</Badge>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <Separator />

            {/* ─── Past Months Budget History ────────────────────────────── */}
            {budgetHistory.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-semibold">Budget History — Past Months</h3>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Month</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Food Budget</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Operating Budget</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Total Budget</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Alert %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetHistory
                        .filter((b) => b.month !== new Date().toISOString().slice(0, 7))
                        .slice(0, 6)
                        .map((b) => (
                          <tr key={b.id} className="border-b last:border-0">
                            <td className="px-4 py-2.5 font-medium">
                              {new Date(b.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(b.foodBudget)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(b.operatingBudget)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(b.totalBudget)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <Badge variant="outline" className="text-xs border-amber-200 dark:border-amber-800">
                                {b.alertThreshold}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      {budgetHistory.filter((b) => b.month !== new Date().toISOString().slice(0, 7)).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground text-sm">
                            No past months&apos; budget data yet. Save a budget to start tracking.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Data Backup & Restore Card ─────────────────────────────────── */}
        <Card className="md:col-span-2 card-elevated border-amber-300/70 dark:border-amber-700/40 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-amber-500/10">
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HardDriveDownload className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Data Backup &amp; Restore
                  </CardTitle>
                  <CardDescription>
                    Export all canteen data to a JSON file or restore from a previous backup
                  </CardDescription>
                </div>
                {/* Last backup + total records badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                  >
                    <CalendarClock className="h-3 w-3 mr-1" />
                    Last backup: {formatRelativeDate(lastBackupDate)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                  >
                    <Database className="h-3 w-3 mr-1" />
                    {totalRecords} records
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </div>

          <CardContent className="space-y-5 pt-6">
            {/* ─── Auto-backup reminder banner ──────────────────────────── */}
            {backupStale && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/20 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {lastBackupDate
                      ? "It's been more than 7 days since your last backup"
                      : "No backup has been created yet"}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Regular backups protect your data. Export a backup now to keep it safe.
                  </p>
                </div>
              </div>
            )}

            {/* ─── Two-column layout: Export / Import ───────────────────── */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Export (Backup) */}
              <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/40 to-orange-50/30 dark:from-amber-900/10 dark:to-orange-900/10 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Download className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Export Data (Backup)</h3>
                    <p className="text-xs text-muted-foreground">
                      Download all data as a JSON file
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Exports ingredients, recipes, stock movements, daily meals, purchases, and expenses
                  with metadata (version, export date, record counts).
                </p>

                <Button
                  onClick={handleExport}
                  disabled={isExporting || isImporting}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download Backup
                    </>
                  )}
                </Button>

                {/* Last export summary */}
                {lastExportInfo && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/20 px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">
                        Last export: {formatBytes(lastExportInfo.size)}
                      </p>
                      <p className="text-emerald-600/80 dark:text-emerald-400/80 tabular-nums">
                        {lastExportInfo.counts.total} records •{" "}
                        {lastExportInfo.counts.ingredients} ingredients •{" "}
                        {lastExportInfo.counts.recipes} recipes •{" "}
                        {lastExportInfo.counts.purchases} purchases •{" "}
                        {lastExportInfo.counts.expenses} expenses
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Import (Restore) */}
              <div className="rounded-xl border-2 border-amber-300/80 dark:border-amber-700/50 bg-gradient-to-br from-amber-50/30 to-orange-50/20 dark:from-amber-900/5 dark:to-orange-900/5 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Upload className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Import Data (Restore)</h3>
                    <p className="text-xs text-muted-foreground">
                      Restore from a previously exported backup file
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">Warning:</span> Importing will{" "}
                    <span className="font-bold">REPLACE ALL</span> current data with the contents
                    of the selected file. This action cannot be undone.
                  </p>
                </div>

                {/* Hidden file input triggered by button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelected}
                  className="hidden"
                  aria-hidden="true"
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExporting || isImporting}
                  variant="outline"
                  className="w-full border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  Select Backup File
                </Button>

                {/* Import progress */}
                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Restoring data...
                      </span>
                      <span className="font-medium tabular-nums">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2 [&>div]:bg-amber-500" />
                  </div>
                )}

                {/* Import error */}
                {importError && !isImporting && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-300">{importError}</p>
                  </div>
                )}

                {/* Import success */}
                {importSuccess && !isImporting && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/20 px-3 py-2 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">
                        Restore complete — {importSuccess.counts.total} records imported
                      </p>
                      <p className="text-emerald-600/80 dark:text-emerald-400/80 tabular-nums">
                        {importSuccess.counts.ingredients} ingredients •{" "}
                        {importSuccess.counts.recipes} recipes •{" "}
                        {importSuccess.counts.purchases} purchases •{" "}
                        {importSuccess.counts.expenses} expenses
                        {importSuccess.counts.suppliers ? ` • ${importSuccess.counts.suppliers} suppliers` : ""}
                        {importSuccess.counts.users ? ` • ${importSuccess.counts.users} users` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Restore Confirmation Dialog ──────────────────────────── */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Confirm Data Restore
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm">
                      <p>
                        You are about to restore data from{" "}
                        <span className="font-semibold text-foreground">
                          {pendingImport?.fileName}
                        </span>{" "}
                        ({pendingImport ? formatBytes(pendingImport.fileSize) : "—"}).
                      </p>
                      {pendingImport && (
                        <div className="rounded-md border bg-muted/40 p-3 space-y-1.5">
                          <p className="font-medium text-foreground text-xs uppercase tracking-wide">
                            Records in backup
                          </p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums">
                            <span className="text-muted-foreground">Ingredients:</span>
                            <span className="font-medium">{pendingImport.file.metadata.counts.ingredients}</span>
                            <span className="text-muted-foreground">Recipes:</span>
                            <span className="font-medium">{pendingImport.file.metadata.counts.recipes}</span>
                            <span className="text-muted-foreground">Stock Movements:</span>
                            <span className="font-medium">{pendingImport.file.metadata.counts.stockMovements}</span>
                            <span className="text-muted-foreground">Daily Meals:</span>
                            <span className="font-medium">{pendingImport.file.metadata.counts.dailyMeals}</span>
                            <span className="text-muted-foreground">Purchases:</span>
                            <span className="font-medium">{pendingImport.file.metadata.counts.purchases}</span>
                            <span className="text-muted-foreground">Expenses:</span>
                            <span className="font-medium">{pendingImport.file.metadata.counts.expenses}</span>
                            {pendingImport.file.metadata.counts.suppliers ? (
                              <>
                                <span className="text-muted-foreground">Suppliers:</span>
                                <span className="font-medium">{pendingImport.file.metadata.counts.suppliers}</span>
                              </>
                            ) : null}
                            {pendingImport.file.metadata.counts.users ? (
                              <>
                                <span className="text-muted-foreground">Users:</span>
                                <span className="font-medium">{pendingImport.file.metadata.counts.users}</span>
                              </>
                            ) : null}
                            <span className="text-muted-foreground font-semibold">Total:</span>
                            <span className="font-bold">{pendingImport.file.metadata.counts.total}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-amber-800 dark:text-amber-300">
                          This will <span className="font-bold">permanently delete</span> all current
                          data and replace it with the contents of this backup file. This action
                          cannot be undone.
                        </p>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={handleCancelImport}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmImport}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <FileJson className="mr-2 h-4 w-4" />
                    Yes, restore data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* ─── Info footer ──────────────────────────────────────────── */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 border px-3 py-2.5">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Backup files contain all canteen data (ingredients, recipes, stock movements, daily meals,
                purchases, expenses, suppliers, users) including IDs and timestamps, allowing a
                complete restore to the exact state at export time. User passwords are not exported —
                restored users will receive a default password. Keep your backups in a safe
                location — they may contain sensitive financial information.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ─── User Management Card ─────────────────────────────────────────── */}
        <Card className="md:col-span-2 card-elevated border-amber-200/60 dark:border-amber-800/30 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-amber-500/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage users, roles, and access control for the canteen system
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchUsers}
                    disabled={isLoadingUsers}
                    className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setAddUserForm({ name: "", email: "", role: "staff", password: "" });
                      setAddUserOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                </div>
              </div>
            </CardHeader>
          </div>

          <CardContent className="pt-6">
            {isLoadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No users found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add users to manage access to the canteen system
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{u.name}</span>
                            {currentUser?.id === u.id && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                You
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRoleBadgeClass(u.role)}>
                            {getRoleLabel(u.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(u.createdAt).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(u)}
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(u)}
                              disabled={currentUser?.id === u.id}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-40"
                              title={currentUser?.id === u.id ? "Cannot delete your own account" : "Delete user"}
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

            {/* Users count summary */}
            {!isLoadingUsers && users.length > 0 && (
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{users.length} user{users.length !== 1 ? "s" : ""} total</span>
                <span>•</span>
                <span>{users.filter((u) => u.role === "admin").length} admin</span>
                <span>•</span>
                <span>{users.filter((u) => u.role === "store").length} store</span>
                <span>•</span>
                <span>{users.filter((u) => u.role === "kitchen").length} kitchen</span>
                <span>•</span>
                <span>{users.filter((u) => u.role === "staff").length} staff</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Add User Dialog ───────────────────────────────────────────────── */}
        <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Add New User
              </DialogTitle>
              <DialogDescription>
                Create a new user account with access to the canteen system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-name">Full Name</Label>
                <Input
                  id="add-name"
                  placeholder="Enter full name"
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email Address</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="user@rcs-canteen.com"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-role">Role</Label>
                <Select
                  value={addUserForm.role}
                  onValueChange={(val) => setAddUserForm({ ...addUserForm, role: val })}
                >
                  <SelectTrigger className="w-full" id="add-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="store">Store Manager</SelectItem>
                    <SelectItem value="kitchen">Kitchen Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-password">Password</Label>
                <Input
                  id="add-password"
                  type="password"
                  placeholder="Enter password"
                  value={addUserForm.password}
                  onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddUserOpen(false)}
                disabled={isSavingUser}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={isSavingUser}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSavingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Edit User Dialog ──────────────────────────────────────────────── */}
        <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Edit User
              </DialogTitle>
              <DialogDescription>
                Update user details. Leave password blank to keep the current password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter full name"
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="user@rcs-canteen.com"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editUserForm.role}
                  onValueChange={(val) => setEditUserForm({ ...editUserForm, role: val })}
                >
                  <SelectTrigger className="w-full" id="edit-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="store">Store Manager</SelectItem>
                    <SelectItem value="kitchen">Kitchen Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password" className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  New Password
                  <span className="text-xs text-muted-foreground font-normal">(leave blank to keep current)</span>
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Enter new password (optional)"
                  value={editUserForm.password}
                  onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditUserOpen(false);
                  setSelectedUser(null);
                }}
                disabled={isSavingUser}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditUser}
                disabled={isSavingUser}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSavingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Delete User Confirmation Dialog ──────────────────────────────── */}
        <AlertDialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete User
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">{selectedUser?.name}</span>{" "}
                ({selectedUser?.email})? This action cannot be undone. The user will permanently
                lose access to the canteen system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setDeleteUserOpen(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isSavingUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSavingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Canteen Information Card ─────────────────────────────────── */}
        <Card className="card-elevated border-amber-200/60 dark:border-amber-800/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Canteen Information
            </CardTitle>
            <CardDescription>
              Current canteen details and contract information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Canteen Name</p>
                  <p className="font-semibold">{canteenInfo.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold">{canteenInfo.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Employee Count</p>
                  <p className="font-semibold">{canteenInfo.employeeCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contract Type</p>
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  >
                    {canteenInfo.contractType}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Quick Actions Card ───────────────────────────────────────── */}
        <Card className="card-elevated border-amber-200/60 dark:border-amber-800/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Manage database content with sample data or clear existing records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seed Sample Data */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Seed Sample Data</p>
                  <p className="text-xs text-muted-foreground">
                    Populate the database with sample ingredients, recipes, purchases, and expenses for testing
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSeedData}
                disabled={isSeeding}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Database...
                  </>
                ) : seedSuccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Data Seeded Successfully!
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Seed Sample Data
                  </>
                )}
              </Button>
            </div>

            {/* Clear All Data */}
            <div className="rounded-lg border border-destructive/30 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm text-destructive">Clear All Data</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently remove all ingredients, recipes, purchases, and expenses from the database
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isSeeding}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all
                      ingredients, recipes, purchases, expenses, stock movements, and
                      daily meal records from the database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, clear all data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {clearSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  All data cleared successfully
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Data Summary Card ────────────────────────────────────────── */}
        <Card className="card-elevated border-amber-200/60 dark:border-amber-800/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  Data Summary
                </CardTitle>
                <CardDescription>
                  Overview of records across all modules
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDataSummary}
                disabled={isLoadingSummary}
                className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingSummary ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                    <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dataSummary.totalIngredients}</p>
                    <p className="text-xs text-muted-foreground">Ingredients</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                    <ChefHat className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dataSummary.totalRecipes}</p>
                    <p className="text-xs text-muted-foreground">Recipes</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                    <ShoppingCart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dataSummary.totalPurchases}</p>
                    <p className="text-xs text-muted-foreground">Purchases</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                    <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dataSummary.totalExpenses}</p>
                    <p className="text-xs text-muted-foreground">Expenses</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                    <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dataSummary.totalSuppliers}</p>
                    <p className="text-xs text-muted-foreground">Suppliers</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── About Card ───────────────────────────────────────────────── */}
        <Card className="card-elevated border-amber-200/60 dark:border-amber-800/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              About
            </CardTitle>
            <CardDescription>
              Application information and technology stack
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-lg">
                  RCS Canteen – Stock & Cost Management
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Internal canteen management for Dahej industrial contract
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  >
                    1.0.0
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Purpose</span>
                  <span className="text-sm font-medium">
                    Internal canteen management
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Contract</span>
                  <span className="text-sm font-medium">
                    Dahej Industrial
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Built with
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs border-amber-200 dark:border-amber-800"
                  >
                    Next.js 16
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs border-amber-200 dark:border-amber-800"
                  >
                    TypeScript
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs border-amber-200 dark:border-amber-800"
                  >
                    Tailwind CSS
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs border-amber-200 dark:border-amber-800"
                  >
                    shadcn/ui
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs border-amber-200 dark:border-amber-800"
                  >
                    Prisma
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Notification Preferences ──────────────────────────────────── */}
      <Card className="card-elevated border-amber-200/60 dark:border-amber-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Configure which alerts and notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              id: "lowStock",
              label: "Low Stock Alerts",
              description: "Get notified when ingredients fall below minimum stock level",
              defaultChecked: true,
            },
            {
              id: "budgetThreshold",
              label: "Budget Threshold Alerts",
              description: "Get notified when spending exceeds the alert threshold percentage",
              defaultChecked: true,
            },
            {
              id: "dailySummary",
              label: "Daily Summary Email",
              description: "Receive a daily summary of meals served, purchases, and wastage",
              defaultChecked: false,
            },
          ].map((pref) => (
            <div
              key={pref.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-0.5">
                <Label htmlFor={pref.id} className="text-sm font-medium cursor-pointer">
                  {pref.label}
                </Label>
                <p className="text-xs text-muted-foreground">{pref.description}</p>
              </div>
              <Button
                id={pref.id}
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 min-w-[80px]",
                  pref.defaultChecked
                    ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
                    : "text-muted-foreground"
                )}
                onClick={() => {
                  toast({
                    title: pref.defaultChecked ? "Notification disabled" : "Notification enabled",
                    description: pref.label,
                  });
                }}
              >
                {pref.defaultChecked ? "On" : "Off"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── Data Management ──────────────────────────────────────────── */}
      <Card className="card-elevated border-amber-200/60 dark:border-amber-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export, import, and manage your canteen data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4 space-y-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 mx-auto">
                <Download className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Export All Data</p>
                <p className="text-xs text-muted-foreground">
                  Download a complete backup of all canteen records
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export
              </Button>
            </div>
            <div className="rounded-lg border p-4 space-y-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 mx-auto">
                <Upload className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Import Data</p>
                <p className="text-xs text-muted-foreground">
                  Restore from a previously exported backup file
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Import
              </Button>
            </div>
            <div className="rounded-lg border border-destructive/30 p-4 space-y-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 mx-auto">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-destructive">Clear Demo Data</p>
                <p className="text-xs text-muted-foreground">
                  Remove all sample data and start fresh
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleClearData}
                disabled={isSeeding}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Canteen Configuration ────────────────────────────────────── */}
      <Card className="card-elevated border-amber-200/60 dark:border-amber-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Canteen Configuration
          </CardTitle>
          <CardDescription>
            Configure canteen-specific settings like employee count, meal times, and currency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="config-employee-count" className="text-xs text-muted-foreground">
                Employee Count
              </Label>
              <Input
                id="config-employee-count"
                type="number"
                value={canteenInfo.employeeCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setCanteenInfo((prev) => ({ ...prev, employeeCount: val }));
                  try {
                    localStorage.setItem(CANTEEN_INFO_KEY, JSON.stringify({ ...canteenInfo, employeeCount: val }));
                  } catch { /* ignore */ }
                }}
                className="tabular-nums"
              />
              <p className="text-xs text-muted-foreground">Used for meal quantity calculations</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="config-meal-times" className="text-xs text-muted-foreground">
                Default Meal Times
              </Label>
              <Select defaultValue="standard">
                <SelectTrigger id="config-meal-times">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (7AM / 12PM / 8PM)</SelectItem>
                  <SelectItem value="shift-a">Shift A (6AM / 11AM / 7PM)</SelectItem>
                  <SelectItem value="shift-b">Shift B (8AM / 1PM / 9PM)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Breakfast / Lunch / Dinner times</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="config-currency" className="text-xs text-muted-foreground">
                Currency
              </Label>
              <Select defaultValue="INR">
                <SelectTrigger id="config-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                  <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                  <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Currency for all financial displays</p>
            </div>
          </div>
          <Button
            onClick={() => {
              toast({
                title: "Configuration saved",
                description: "Canteen configuration updated successfully.",
              });
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* ─── Audit Log (admin-only) ─────────────────────────────────────── */}
      {currentUser?.role === "admin" && <AuditLogSection />}
    </div>
  );
}

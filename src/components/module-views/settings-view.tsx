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
} from "lucide-react";
import type { ViewId } from "@/components/app-sidebar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DataSummary {
  totalIngredients: number;
  totalRecipes: number;
  totalPurchases: number;
  totalExpenses: number;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const CANTEEN_INFO_KEY = "rcs-canteen-info";
const BUDGET_KEY = "rcs-canteen-budget";
const ALERTS_KEY = "rcs-canteen-alerts";

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

  // Editable budget inputs
  const [foodBudgetInput, setFoodBudgetInput] = useState("");
  const [operatingBudgetInput, setOperatingBudgetInput] = useState("");
  const [foodThresholdInput, setFoodThresholdInput] = useState("");
  const [operatingThresholdInput, setOperatingThresholdInput] = useState("");

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

  // Load budget & alerts from localStorage
  useEffect(() => {
    try {
      const storedBudget = localStorage.getItem(BUDGET_KEY);
      if (storedBudget) {
        const parsed = JSON.parse(storedBudget) as BudgetData;
        setBudget(parsed);
        setFoodBudgetInput(String(parsed.monthlyFoodBudget));
        setOperatingBudgetInput(String(parsed.monthlyOperatingBudget));
      } else {
        localStorage.setItem(BUDGET_KEY, JSON.stringify(DEFAULT_BUDGET));
        setFoodBudgetInput(String(DEFAULT_BUDGET.monthlyFoodBudget));
        setOperatingBudgetInput(String(DEFAULT_BUDGET.monthlyOperatingBudget));
      }

      const storedAlerts = localStorage.getItem(ALERTS_KEY);
      if (storedAlerts) {
        const parsed = JSON.parse(storedAlerts) as AlertSettings;
        setAlertSettings(parsed);
        setFoodThresholdInput(String(parsed.foodThreshold));
        setOperatingThresholdInput(String(parsed.operatingThreshold));
      } else {
        localStorage.setItem(ALERTS_KEY, JSON.stringify(DEFAULT_ALERTS));
        setFoodThresholdInput(String(DEFAULT_ALERTS.foodThreshold));
        setOperatingThresholdInput(String(DEFAULT_ALERTS.operatingThreshold));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Fetch dashboard data for budget tracking
  const fetchBudgetData = useCallback(async () => {
    setIsLoadingBudget(true);
    try {
      const [dashboardRes, lowStockRes, costRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/ingredients?lowStock=true"),
        fetch("/api/reports/cost?period=month"),
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
    } catch (error) {
      console.error("Error fetching budget data:", error);
    } finally {
      setIsLoadingBudget(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  // Save budget
  const handleSaveBudget = () => {
    const foodVal = parseFloat(foodBudgetInput) || DEFAULT_BUDGET.monthlyFoodBudget;
    const opVal = parseFloat(operatingBudgetInput) || DEFAULT_BUDGET.monthlyOperatingBudget;
    const newBudget: BudgetData = { monthlyFoodBudget: foodVal, monthlyOperatingBudget: opVal };
    setBudget(newBudget);
    localStorage.setItem(BUDGET_KEY, JSON.stringify(newBudget));
    setBudgetSaved(true);
    setTimeout(() => setBudgetSaved(false), 3000);
  };

  // Save alerts
  const handleSaveAlerts = () => {
    const foodTh = parseFloat(foodThresholdInput) || DEFAULT_ALERTS.foodThreshold;
    const opTh = parseFloat(operatingThresholdInput) || DEFAULT_ALERTS.operatingThreshold;
    const newAlerts: AlertSettings = {
      foodThreshold: Math.min(100, Math.max(1, foodTh)),
      operatingThreshold: Math.min(100, Math.max(1, opTh)),
    };
    setAlertSettings(newAlerts);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(newAlerts));
    setAlertsSaved(true);
    setTimeout(() => setAlertsSaved(false), 3000);
  };

  // Fetch data summary from APIs
  const fetchDataSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const [ingredientsRes, recipesRes, purchasesRes, expensesRes] =
        await Promise.all([
          fetch("/api/ingredients"),
          fetch("/api/recipes"),
          fetch("/api/purchases"),
          fetch("/api/expenses"),
        ]);

      const ingredients = await ingredientsRes.json();
      const recipes = await recipesRes.json();
      const purchases = await purchasesRes.json();
      const expenses = await expensesRes.json();

      setDataSummary({
        totalIngredients: Array.isArray(ingredients) ? ingredients.length : 0,
        totalRecipes: Array.isArray(recipes) ? recipes.length : 0,
        totalPurchases: purchases?.total ?? 0,
        totalExpenses: expenses?.total ?? 0,
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
    <div className="space-y-6">
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
        <Card className="md:col-span-2 border-amber-200/60 dark:border-amber-800/30 overflow-hidden">
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
              <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="grid gap-4 sm:grid-cols-2">
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
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Canteen Information Card ─────────────────────────────────── */}
        <Card className="border-amber-200/60 dark:border-amber-800/30">
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
        <Card className="border-amber-200/60 dark:border-amber-800/30">
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
        <Card className="border-amber-200/60 dark:border-amber-800/30">
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
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── About Card ───────────────────────────────────────────────── */}
        <Card className="border-amber-200/60 dark:border-amber-800/30">
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
    </div>
  );
}

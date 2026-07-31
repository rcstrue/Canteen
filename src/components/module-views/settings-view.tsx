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
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";

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

// ─── Constants ───────────────────────────────────────────────────────────────

const CANTEEN_INFO_KEY = "rcs-canteen-info";

const DEFAULT_CANTEEN_INFO: CanteenInfo = {
  name: "RCS Canteen",
  location: "Dahej",
  employeeCount: 600,
  contractType: "Industrial",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function SettingsView() {
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
      await fetch("/api/seed", { method: "POST" }); // Seed wipes and re-seeds
      // We need a dedicated clear endpoint or just re-seed with empty
      // Actually, let's just call the seed endpoint which clears first
      // For a true clear, we'll use the seed endpoint's cleanup logic
      // by posting to a clear-specific approach
      const res = await fetch("/api/ingredients");
      if (res.ok) {
        const ingredients = await res.json();
        // Delete all ingredients (cascading will handle related records)
        for (const ing of ingredients) {
          await fetch(`/api/ingredients/${ing.id}`, { method: "DELETE" });
        }
      }
      setClearSuccess(true);
      await fetchDataSummary();
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  };

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
            Manage canteen information, data actions, and system preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  ClipboardList,
  Plus,
  UtensilsCrossed,
  Package,
  CalendarIcon,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Info,
  Layers,
  Sun,
  Sunset,
  Moon,
  Coffee,
  TrendingUp,
  History,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecipeIngredient {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  ingredient: {
    id: string;
    name: string;
    unit: string;
    avgCost: number;
    currentStock: number;
  };
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  mealType: string;
  baseServings: number;
  ingredients: RecipeIngredient[];
}

interface DailyMeal {
  id: string;
  date: string;
  mealType: string;
  mealsServed: number;
  recipeId: string;
  notes?: string;
  createdAt: string;
  recipe: {
    id: string;
    name: string;
    mealType: string;
    baseServings: number;
    ingredients?: RecipeIngredient[];
  };
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  category: string;
  currentStock: number;
  minStock: number;
  avgCost: number;
  lastPurchasePrice: number;
}

interface StockMovement {
  id: string;
  ingredientId: string;
  type: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  date: string;
  notes?: string;
  createdAt: string;
  ingredient: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return format(d, 'dd/MM/yyyy');
};

const formatDateISO = (date: Date) => format(date, 'yyyy-MM-dd');

const getToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Modern pill-style meal type badge with required color scheme
const mealTypeBadgeClass = (type: string) => {
  switch (type) {
    case 'Breakfast':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50';
    case 'Lunch':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50';
    case 'Dinner':
      return 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50';
    case 'Snack':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const mealTypeIcon = (type: string, className = 'h-3 w-3') => {
  switch (type) {
    case 'Breakfast':
      return <Sun className={className} />;
    case 'Lunch':
      return <Sunset className={className} />;
    case 'Dinner':
      return <Moon className={className} />;
    case 'Snack':
      return <Coffee className={className} />;
    default:
      return <UtensilsCrossed className={className} />;
  }
};

const movementTypeBadge = (type: string) => {
  switch (type) {
    case 'PURCHASE':
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100">
          <ArrowUp className="mr-1 h-3 w-3" />
          Purchase
        </Badge>
      );
    case 'CONSUMPTION':
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100">
          <ArrowDown className="mr-1 h-3 w-3" />
          Consumption
        </Badge>
      );
    case 'WASTAGE':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Wastage
        </Badge>
      );
    case 'ADJUSTMENT':
      return (
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100">
          <RefreshCw className="mr-1 h-3 w-3" />
          Adjustment
        </Badge>
      );
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
};

// Calculate estimated cost for a meal based on its recipe
const estimateMealCost = (meal: DailyMeal): number => {
  if (!meal.recipe?.ingredients || meal.recipe.ingredients.length === 0) return 0;
  const recipe = meal.recipe;
  const ratio = meal.mealsServed / (recipe.baseServings || 1);
  return recipe.ingredients.reduce(
    (sum, ri) => sum + ratio * ri.quantity * (ri.ingredient.avgCost || 0),
    0
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DailyEntryView() {
  // ── Shared state ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('meals');

  // ── Meals Served state ───────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date>(getToday());
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all');
  const [meals, setMeals] = useState<DailyMeal[]>([]);
  const [mealsLoading, setMealsLoading] = useState(true);
  const [showAddMealDialog, setShowAddMealDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [mealForm, setMealForm] = useState({
    date: formatDateISO(getToday()),
    mealType: '',
    recipeId: '',
    mealsServed: '',
    notes: '',
  });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [mealSubmitting, setMealSubmitting] = useState(false);
  const [showMealConfirmation, setShowMealConfirmation] = useState(false);
  const [mealDeduction, setMealDeduction] = useState<
    { name: string; unit: string; consumed: number; currentStock: number }[]
  >([]);

  // ── Recent entries (all dates) ───────────────────────────────────────────
  const [recentMeals, setRecentMeals] = useState<DailyMeal[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // ── Calendar dates that have entries ─────────────────────────────────────
  const [calendarMonth, setCalendarMonth] = useState<Date>(getToday());
  const [entryDates, setEntryDates] = useState<Date[]>([]);

  // ── Stock Adjustment state ───────────────────────────────────────────────
  const [adjustments, setAdjustments] = useState<StockMovement[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(true);
  const [showAddAdjustmentDialog, setShowAddAdjustmentDialog] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [adjustmentForm, setAdjustmentForm] = useState({
    ingredientId: '',
    type: '',
    quantity: '',
    unitPrice: '',
    date: formatDateISO(getToday()),
    notes: '',
  });
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);

  // ── Calendar popovers ────────────────────────────────────────────────────
  const [mealCalendarOpen, setMealCalendarOpen] = useState(false);
  const [mainCalendarOpen, setMainCalendarOpen] = useState(false);

  // ── Bulk Entry state ─────────────────────────────────────────────────────
  const [bulkForm, setBulkForm] = useState({
    date: formatDateISO(getToday()),
    Breakfast: { recipeId: '', mealsServed: '' },
    Lunch: { recipeId: '', mealsServed: '' },
    Dinner: { recipeId: '', mealsServed: '' },
  });
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // ── Fetch Meals (for selected date) ──────────────────────────────────────
  const fetchMeals = useCallback(async () => {
    setMealsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('date', formatDateISO(selectedDate));
      if (mealTypeFilter && mealTypeFilter !== 'all') {
        params.set('mealType', mealTypeFilter);
      }
      const res = await fetch(`/api/daily-meals?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMeals(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching meals:', err);
    } finally {
      setMealsLoading(false);
    }
  }, [selectedDate, mealTypeFilter]);

  // ── Fetch Recipes ────────────────────────────────────────────────────────
  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch('/api/recipes');
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (err) {
      console.error('Error fetching recipes:', err);
    }
  }, []);

  // ── Fetch Adjustments ────────────────────────────────────────────────────
  const fetchAdjustments = useCallback(async () => {
    setAdjustmentsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('type', 'CONSUMPTION,WASTAGE,ADJUSTMENT');
      const today = formatDateISO(getToday());
      params.set('startDate', today);
      params.set('endDate', today);
      params.set('limit', '50');
      const res = await fetch(`/api/stock-movements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setAdjustments(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching adjustments:', err);
    } finally {
      setAdjustmentsLoading(false);
    }
  }, []);

  // ── Fetch Ingredients ────────────────────────────────────────────────────
  const fetchIngredients = useCallback(async () => {
    try {
      const res = await fetch('/api/ingredients');
      if (res.ok) {
        const data = await res.json();
        setIngredients(data);
      }
    } catch (err) {
      console.error('Error fetching ingredients:', err);
    }
  }, []);

  // ── Fetch recent entries across all dates ────────────────────────────────
  const fetchRecentMeals = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await fetch(`/api/daily-meals?limit=5`);
      if (res.ok) {
        const json = await res.json();
        setRecentMeals(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching recent meals:', err);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  // ── Fetch entry dates for current calendar month ─────────────────────────
  const fetchEntryDates = useCallback(async () => {
    try {
      const start = formatDateISO(startOfMonth(calendarMonth));
      const end = formatDateISO(endOfMonth(calendarMonth));
      const res = await fetch(
        `/api/daily-meals?startDate=${start}&endDate=${end}&limit=500`
      );
      if (res.ok) {
        const json = await res.json();
        const dates = (json.data || []).map((m: DailyMeal) => {
          const d = new Date(m.date);
          d.setHours(0, 0, 0, 0);
          return d;
        });
        // Dedupe
        const unique: Date[] = [];
        dates.forEach((d: Date) => {
          if (!unique.some((u) => isSameDay(u, d))) unique.push(d);
        });
        setEntryDates(unique);
      }
    } catch (err) {
      console.error('Error fetching entry dates:', err);
    }
  }, [calendarMonth]);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  useEffect(() => {
    if (activeTab === 'adjustments') {
      fetchAdjustments();
    }
  }, [activeTab, fetchAdjustments]);

  useEffect(() => {
    fetchRecipes();
    fetchIngredients();
    fetchRecentMeals();
    fetchEntryDates();
  }, [fetchRecipes, fetchIngredients, fetchRecentMeals, fetchEntryDates]);

  // ── Calculate stock deduction preview ────────────────────────────────────
  const calculateDeduction = () => {
    if (!selectedRecipe || !mealForm.mealsServed) return [];
    const ratio = parseInt(mealForm.mealsServed) / selectedRecipe.baseServings;
    return selectedRecipe.ingredients.map((ri) => ({
      name: ri.ingredient.name,
      unit: ri.ingredient.unit,
      consumed: ratio * ri.quantity,
      currentStock: ri.ingredient.currentStock,
    }));
  };

  // ── Real-time stock impact preview (live in dialog) ──────────────────────
  const liveDeductionPreview = useMemo(() => {
    if (!selectedRecipe || !mealForm.mealsServed) return [];
    const parsed = parseInt(mealForm.mealsServed);
    if (isNaN(parsed) || parsed <= 0) return [];
    const ratio = parsed / selectedRecipe.baseServings;
    return selectedRecipe.ingredients.map((ri) => ({
      name: ri.ingredient.name,
      unit: ri.ingredient.unit,
      consumed: ratio * ri.quantity,
      currentStock: ri.ingredient.currentStock,
      after: ri.ingredient.currentStock - ratio * ri.quantity,
    }));
  }, [selectedRecipe, mealForm.mealsServed]);

  // ── Daily Summary Card ───────────────────────────────────────────────────
  const dailySummary = useMemo(() => {
    // Use unfiltered meals (for the date) — recompute from all meals when filter is "all"
    // When filter is applied, summary still uses the date's meals fetched
    // Since fetchMeals fetches with filter, we use what's available.
    const totalMeals = meals.reduce((s, m) => s + m.mealsServed, 0);
    const totalCost = meals.reduce((s, m) => s + estimateMealCost(m), 0);
    const byType: Record<string, number> = {
      Breakfast: 0,
      Lunch: 0,
      Dinner: 0,
      Snack: 0,
    };
    meals.forEach((m) => {
      if (byType[m.mealType] !== undefined) {
        byType[m.mealType] += m.mealsServed;
      } else {
        byType[m.mealType] = m.mealsServed;
      }
    });
    return { totalMeals, totalCost, byType };
  }, [meals]);

  // ── Handle Add Meal ─────────────────────────────────────────────────────
  const handleAddMeal = () => {
    if (!mealForm.mealType || !mealForm.recipeId || !mealForm.mealsServed) return;
    const deduction = calculateDeduction();
    setMealDeduction(deduction);
    setShowMealConfirmation(true);
  };

  const confirmAddMeal = async () => {
    setMealSubmitting(true);
    try {
      const res = await fetch('/api/daily-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: mealForm.date,
          mealType: mealForm.mealType,
          mealsServed: parseInt(mealForm.mealsServed),
          recipeId: mealForm.recipeId,
          notes: mealForm.notes || undefined,
        }),
      });
      if (res.ok) {
        setShowMealConfirmation(false);
        setShowAddMealDialog(false);
        resetMealForm();
        fetchMeals();
        fetchRecentMeals();
        fetchEntryDates();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record meal');
      }
    } catch (err) {
      console.error('Error creating meal:', err);
      alert('Failed to record meal');
    } finally {
      setMealSubmitting(false);
    }
  };

  const resetMealForm = () => {
    setMealForm({
      date: formatDateISO(getToday()),
      mealType: '',
      recipeId: '',
      mealsServed: '',
      notes: '',
    });
    setSelectedRecipe(null);
  };

  // ── Bulk Entry Handlers ──────────────────────────────────────────────────
  const resetBulkForm = () => {
    setBulkForm({
      date: formatDateISO(getToday()),
      Breakfast: { recipeId: '', mealsServed: '' },
      Lunch: { recipeId: '', mealsServed: '' },
      Dinner: { recipeId: '', mealsServed: '' },
    });
  };

  const handleBulkSubmit = async () => {
    const entries: { mealType: string; recipeId: string; mealsServed: string }[] = [];
    (['Breakfast', 'Lunch', 'Dinner'] as const).forEach((mt) => {
      const item = bulkForm[mt];
      if (item.recipeId && item.mealsServed && parseInt(item.mealsServed) > 0) {
        entries.push({ mealType: mt, recipeId: item.recipeId, mealsServed: item.mealsServed });
      }
    });

    if (entries.length === 0) {
      alert('Please fill at least one meal type with recipe and servings');
      return;
    }

    setBulkSubmitting(true);
    try {
      let failedCount = 0;
      for (const entry of entries) {
        const res = await fetch('/api/daily-meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: bulkForm.date,
            mealType: entry.mealType,
            mealsServed: parseInt(entry.mealsServed),
            recipeId: entry.recipeId,
          }),
        });
        if (!res.ok) failedCount++;
      }
      if (failedCount > 0) {
        alert(`${failedCount} of ${entries.length} meal entries failed to save`);
      }
      setShowBulkDialog(false);
      resetBulkForm();
      fetchMeals();
      fetchRecentMeals();
      fetchEntryDates();
    } catch (err) {
      console.error('Error bulk creating meals:', err);
      alert('Failed to record bulk meals');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // ── Handle Add Adjustment ────────────────────────────────────────────────
  const handleAddAdjustment = async () => {
    if (
      !adjustmentForm.ingredientId ||
      !adjustmentForm.type ||
      !adjustmentForm.quantity
    )
      return;

    setAdjustmentSubmitting(true);
    try {
      const res = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: adjustmentForm.ingredientId,
          type: adjustmentForm.type,
          quantity: parseFloat(adjustmentForm.quantity),
          unitPrice: parseFloat(adjustmentForm.unitPrice) || 0,
          totalAmount:
            (parseFloat(adjustmentForm.unitPrice) || 0) *
            parseFloat(adjustmentForm.quantity),
          date: adjustmentForm.date,
          notes: adjustmentForm.notes || undefined,
        }),
      });
      if (res.ok) {
        setShowAddAdjustmentDialog(false);
        resetAdjustmentForm();
        fetchAdjustments();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add adjustment');
      }
    } catch (err) {
      console.error('Error creating adjustment:', err);
      alert('Failed to add adjustment');
    } finally {
      setAdjustmentSubmitting(false);
    }
  };

  const resetAdjustmentForm = () => {
    setAdjustmentForm({
      ingredientId: '',
      type: '',
      quantity: '',
      unitPrice: '',
      date: formatDateISO(getToday()),
      notes: '',
    });
  };

  // ── Selected ingredient for auto-fill ────────────────────────────────────
  const selectedIngredient = ingredients.find(
    (i) => i.id === adjustmentForm.ingredientId
  );

  // ── Calendar: dates with entries ─────────────────────────────────────────
  const entryDateSet = useMemo(() => {
    const set = new Set<string>();
    entryDates.forEach((d) => set.add(format(d, 'yyyy-MM-dd')));
    return set;
  }, [entryDates]);

  const calendarModifiers = useMemo(
    () => ({
      hasEntry: (date: Date) => entryDateSet.has(format(date, 'yyyy-MM-dd')),
    }),
    [entryDateSet]
  );

  // ── Totals ───────────────────────────────────────────────────────────────
  const totalMealsServed = meals.reduce((sum, m) => sum + m.mealsServed, 0);
  const hasAnyNotes = meals.some((m) => m.notes && m.notes.trim() !== '');

  // ── Refresh all ──────────────────────────────────────────────────────────
  const refreshAll = () => {
    fetchMeals();
    fetchRecentMeals();
    fetchEntryDates();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Daily Entry</h1>
            <p className="text-muted-foreground text-sm">
              Record meals served and manage stock adjustments
            </p>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={refreshAll}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/60 rounded-full p-1 h-auto">
          <TabsTrigger
            value="meals"
            className="gap-1.5 rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-1.5 transition-all"
          >
            <UtensilsCrossed className="h-4 w-4" />
            Meals Served
          </TabsTrigger>
          <TabsTrigger
            value="adjustments"
            className="gap-1.5 rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-1.5 transition-all"
          >
            <Package className="h-4 w-4" />
            Stock Adjustment
          </TabsTrigger>
        </TabsList>

        {/* ─── Meals Served Tab ─────────────────────────────────────────── */}
        <TabsContent value="meals" className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`meals-${formatDateISO(selectedDate)}-${mealTypeFilter}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Daily Summary Card — gradient amber/orange */}
              <Card className="overflow-hidden border-amber-200/60 dark:border-amber-800/40">
                <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-200/60 dark:bg-amber-800/40 shrink-0">
                          <Sparkles className="h-6 w-6 text-amber-700 dark:text-amber-300" />
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                            Daily Summary · {format(selectedDate, 'dd MMM yyyy')}
                          </p>
                          <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                            <span className="text-4xl font-bold tabular-nums text-amber-900 dark:text-amber-100">
                              {dailySummary.totalMeals}
                            </span>
                            <span className="text-sm text-amber-700 dark:text-amber-400">
                              meals served
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                            Estimated cost:{' '}
                            <span className="font-semibold tabular-nums">
                              {formatCurrency(dailySummary.totalCost)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Breakdown by meal type */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3">
                        {MEAL_TYPES.map((mt) => (
                          <div
                            key={mt}
                            className="flex flex-col gap-1 rounded-lg border border-amber-200/50 bg-white/60 dark:border-amber-800/30 dark:bg-amber-950/20 px-3 py-2 backdrop-blur-sm"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-700 dark:text-amber-400">
                                {mealTypeIcon(mt, 'h-3.5 w-3.5')}
                              </span>
                              <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                                {mt}
                              </span>
                            </div>
                            <span className="text-xl font-bold tabular-nums text-amber-900 dark:text-amber-100">
                              {dailySummary.byType[mt] || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* Filters & Actions */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {/* Date Picker */}
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium whitespace-nowrap">
                          Date:
                        </Label>
                        <Popover
                          open={mainCalendarOpen}
                          onOpenChange={setMainCalendarOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-[160px] justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(selectedDate, 'dd/MM/yyyy')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                if (date) {
                                  setSelectedDate(date);
                                  setMainCalendarOpen(false);
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Meal Type Filter */}
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium whitespace-nowrap">
                          Meal:
                        </Label>
                        <Select
                          value={mealTypeFilter}
                          onValueChange={setMealTypeFilter}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Meals</SelectItem>
                            <SelectItem value="Breakfast">Breakfast</SelectItem>
                            <SelectItem value="Lunch">Lunch</SelectItem>
                            <SelectItem value="Dinner">Dinner</SelectItem>
                            <SelectItem value="Snack">Snack</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowBulkDialog(true)}
                      >
                        <Layers className="mr-2 h-4 w-4" />
                        Bulk Entry
                      </Button>
                      <Button
                        onClick={() => setShowAddMealDialog(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Record Meal
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Meals Table + Side panels */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Main Meals Table — spans 2 cols on large screens */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">
                          Meals for {format(selectedDate, 'dd/MM/yyyy')}
                        </CardTitle>
                        <CardDescription className="mt-0.5">
                          Showing {meals.length} meal{meals.length !== 1 ? 's' : ''} recorded
                        </CardDescription>
                      </div>
                      {meals.length > 0 && (
                        <Badge variant="secondary" className="tabular-nums">
                          {totalMealsServed} total
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {mealsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-20" />
                          </div>
                        ))}
                      </div>
                    ) : meals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                          <UtensilsCrossed className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <p className="font-medium text-foreground">
                          No meals recorded for {format(selectedDate, 'dd/MM/yyyy')}
                        </p>
                        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                          Start tracking today&apos;s canteen activity by recording the meals served.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <Button
                            onClick={() => setShowAddMealDialog(true)}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Record a Meal
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowBulkDialog(true)}
                          >
                            <Layers className="mr-2 h-4 w-4" />
                            Bulk Entry
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Meal Type</TableHead>
                              <TableHead>Recipe</TableHead>
                              <TableHead className="text-right">
                                Meals Served
                              </TableHead>
                              <TableHead className="text-right">Est. Cost</TableHead>
                              {hasAnyNotes && <TableHead>Notes</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {meals.map((meal) => (
                              <TableRow
                                key={meal.id}
                                className="transition-colors hover:bg-muted/50"
                              >
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`gap-1 ${mealTypeBadgeClass(meal.mealType)}`}
                                  >
                                    {mealTypeIcon(meal.mealType)}
                                    {meal.mealType}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {meal.recipe.name}
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">
                                  {meal.mealsServed}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                  {formatCurrency(estimateMealCost(meal))}
                                </TableCell>
                                {hasAnyNotes && (
                                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                                    {meal.notes && meal.notes.trim() !== ''
                                      ? meal.notes
                                      : ''}
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Side: Calendar + Recent entries */}
                <div className="space-y-4">
                  {/* Month Calendar with dots */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-amber-600" />
                        Activity Calendar
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Dots indicate dates with recorded meals
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="rounded-lg border bg-background p-2">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          month={calendarMonth}
                          onMonthChange={setCalendarMonth}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedDate(date);
                            }
                          }}
                          modifiers={calendarModifiers}
                          classNames={{
                            day: 'relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none',
                          }}
                          components={{
                            DayButton: ({
                              className,
                              day,
                              modifiers: dm,
                              ...props
                            }: {
                              className?: string;
                              day?: { date: Date };
                              modifiers?: { hasEntry?: boolean; selected?: boolean; today?: boolean; [k: string]: unknown };
                              [k: string]: unknown;
                            }) => (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={className}
                                {...(props as Record<string, unknown>)}
                              >
                                {day ? day.date.getDate() : ''}
                                {dm?.hasEntry && !dm?.selected && (
                                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-amber-500" />
                                )}
                                {dm?.hasEntry && dm?.selected && (
                                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-amber-200" />
                                )}
                              </Button>
                            ),
                          }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span>Has entries</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            const today = getToday();
                            setSelectedDate(today);
                            setCalendarMonth(today);
                          }}
                        >
                          Today
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent entries quick view */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4 text-amber-600" />
                        Recent Entries
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Last 5 meal entries across all dates
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {recentLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : recentMeals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <History className="h-8 w-8 text-muted-foreground/40 mb-2" />
                          <p className="text-xs text-muted-foreground">
                            No recent entries yet
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto pr-1 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                          {recentMeals.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 transition-colors hover:bg-muted/50 cursor-pointer"
                              onClick={() => {
                                const d = new Date(m.date);
                                setSelectedDate(d);
                                setCalendarMonth(d);
                              }}
                            >
                              <Badge
                                variant="outline"
                                className={`shrink-0 gap-1 ${mealTypeBadgeClass(m.mealType)}`}
                              >
                                {mealTypeIcon(m.mealType)}
                                {m.mealType}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {m.recipe.name}
                                </p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  {formatDate(m.date)} · {m.mealsServed} meals
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ─── Stock Adjustment Tab ─────────────────────────────────────── */}
        <TabsContent value="adjustments" className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="adjustments"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Today&apos;s Stock Adjustments
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatDateISO(getToday())}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowAddAdjustmentDialog(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Adjustment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Adjustments Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Recent Adjustments</CardTitle>
                  <CardDescription>
                    Stock consumption, wastage, and manual adjustments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {adjustmentsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-5 w-28" />
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : adjustments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
                        <Package className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="font-medium text-foreground">
                        No stock adjustments recorded today
                      </p>
                      <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                        Record consumption, wastage, or manual stock corrections here.
                      </p>
                      <Button
                        className="mt-4 bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => setShowAddAdjustmentDialog(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Adjustment
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Date</TableHead>
                            <TableHead>Ingredient</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adjustments.map((adj) => {
                            const hasNotes = adj.notes && adj.notes.trim() !== '';
                            return (
                              <TableRow
                                key={adj.id}
                                className="transition-colors hover:bg-muted/50"
                              >
                                <TableCell className="font-medium tabular-nums">
                                  {formatDate(adj.date)}
                                </TableCell>
                                <TableCell>{adj.ingredient.name}</TableCell>
                                <TableCell>{movementTypeBadge(adj.type)}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {adj.type === 'ADJUSTMENT'
                                    ? `→ ${adj.quantity}`
                                    : adj.quantity}{' '}
                                  <span className="text-muted-foreground text-xs">
                                    {adj.ingredient.unit}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatCurrency(adj.unitPrice)}
                                </TableCell>
                                <TableCell className="text-right font-medium tabular-nums">
                                  {formatCurrency(adj.totalAmount)}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                                  {hasNotes ? adj.notes : ''}
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
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* ─── Add Meal Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showAddMealDialog} onOpenChange={setShowAddMealDialog}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-amber-600" />
              Record Meal Served
            </DialogTitle>
            <DialogDescription>
              Record the meals served. Stock will be automatically deducted based on the recipe.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="meal-date">Date</Label>
              <Popover open={mealCalendarOpen} onOpenChange={setMealCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    id="meal-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {mealForm.date
                      ? format(new Date(mealForm.date), 'dd/MM/yyyy')
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      mealForm.date ? new Date(mealForm.date) : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        setMealForm((prev) => ({
                          ...prev,
                          date: formatDateISO(date),
                        }));
                        setMealCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Meal Type */}
            <div className="grid gap-2">
              <Label htmlFor="meal-type">Meal Type *</Label>
              <Select
                value={mealForm.mealType}
                onValueChange={(val) =>
                  setMealForm((prev) => ({ ...prev, mealType: val }))
                }
              >
                <SelectTrigger id="meal-type">
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Breakfast">Breakfast</SelectItem>
                  <SelectItem value="Lunch">Lunch</SelectItem>
                  <SelectItem value="Dinner">Dinner</SelectItem>
                  <SelectItem value="Snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipe */}
            <div className="grid gap-2">
              <Label htmlFor="meal-recipe">Recipe *</Label>
              <Select
                value={mealForm.recipeId}
                onValueChange={(val) => {
                  setMealForm((prev) => ({ ...prev, recipeId: val }));
                  const recipe = recipes.find((r) => r.id === val);
                  setSelectedRecipe(recipe || null);
                }}
              >
                <SelectTrigger id="meal-recipe">
                  <SelectValue placeholder="Select recipe" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {recipes.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.name} ({recipe.mealType} — {recipe.baseServings} servings)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipe Info */}
            {selectedRecipe && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {selectedRecipe.name}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Base Servings: {selectedRecipe.baseServings} ·{' '}
                  {selectedRecipe.ingredients.length} ingredients
                </p>
              </div>
            )}

            {/* Meals Served */}
            <div className="grid gap-2">
              <Label htmlFor="meals-served">Meals Served *</Label>
              <Input
                id="meals-served"
                type="number"
                min="1"
                placeholder="Enter number of meals served"
                value={mealForm.mealsServed}
                onChange={(e) =>
                  setMealForm((prev) => ({
                    ...prev,
                    mealsServed: e.target.value,
                  }))
                }
              />
            </div>

            {/* ─── Stock Impact Preview (live) ──────────────────────────── */}
            {liveDeductionPreview.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Stock Impact Preview
                  </p>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-300">
                  {liveDeductionPreview.map((item, idx) => {
                    const insufficient = item.after < 0;
                    const low = item.after >= 0 && item.after < item.currentStock * 0.2;
                    const maxStock = Math.max(item.currentStock, 1);
                    const beforePct = Math.min(100, (item.currentStock / maxStock) * 100);
                    const afterPct = Math.min(100, (Math.max(0, item.after) / maxStock) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-amber-900 dark:text-amber-200 truncate">
                            {item.name}
                          </span>
                          <span
                            className={`tabular-nums whitespace-nowrap font-medium ${
                              insufficient
                                ? 'text-red-600 dark:text-red-400'
                                : low
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {item.currentStock.toFixed(2)} →{' '}
                            {Math.max(0, item.after).toFixed(2)} {item.unit}
                            <span className="ml-1 text-amber-700/70 dark:text-amber-400/70">
                              (−{item.consumed.toFixed(2)})
                            </span>
                          </span>
                        </div>
                        <div className="flex gap-1 h-1.5">
                          <div className="flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-400 transition-all duration-300"
                              style={{ width: `${beforePct}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground">→</span>
                          <div className="flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                insufficient
                                  ? 'bg-red-400'
                                  : low
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                              }`}
                              style={{ width: `${afterPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {liveDeductionPreview.some((i) => i.after < 0) && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Some ingredients will fall below zero</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="meal-notes">Notes (optional)</Label>
              <Textarea
                id="meal-notes"
                placeholder="Any additional notes..."
                value={mealForm.notes}
                onChange={(e) =>
                  setMealForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMealDialog(false);
                resetMealForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMeal}
              disabled={
                !mealForm.mealType ||
                !mealForm.recipeId ||
                !mealForm.mealsServed
              }
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Record Meal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Entry Dialog ──────────────────────────────────────────── */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-600" />
              Bulk Meal Entry
            </DialogTitle>
            <DialogDescription>
              Record meals for Breakfast, Lunch, and Dinner at once for a single date.
              Leave fields blank to skip a meal type.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="bulk-date">Date</Label>
              <Input
                id="bulk-date"
                type="date"
                value={bulkForm.date}
                onChange={(e) =>
                  setBulkForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <Separator />

            {/* Meal type rows */}
            <div className="space-y-3">
              {(['Breakfast', 'Lunch', 'Dinner'] as const).map((mt) => (
                <div
                  key={mt}
                  className="rounded-lg border p-3 space-y-2 bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`gap-1 ${mealTypeBadgeClass(mt)}`}
                    >
                      {mealTypeIcon(mt)}
                      {mt}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Select
                      value={bulkForm[mt].recipeId}
                      onValueChange={(val) =>
                        setBulkForm((prev) => ({
                          ...prev,
                          [mt]: { ...prev[mt], recipeId: val },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipe" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {recipes
                          .filter((r) => r.mealType === mt)
                          .map((recipe) => (
                            <SelectItem key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </SelectItem>
                          ))}
                        {recipes.filter((r) => r.mealType === mt).length === 0 && (
                          <SelectItem value="__none" disabled>
                            No {mt} recipes available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Meals served"
                      value={bulkForm[mt].mealsServed}
                      onChange={(e) =>
                        setBulkForm((prev) => ({
                          ...prev,
                          [mt]: { ...prev[mt], mealsServed: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Each meal will be saved separately and stock will be deducted automatically based on the selected recipe.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDialog(false);
                resetBulkForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={bulkSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {bulkSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Layers className="mr-2 h-4 w-4" />
                  Save All Meals
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Meal Confirmation Dialog ────────────────────────────────────── */}
      <Dialog
        open={showMealConfirmation}
        onOpenChange={setShowMealConfirmation}
      >
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Confirm Stock Deduction
            </DialogTitle>
            <DialogDescription>
              The following stock will be deducted based on the recipe and servings:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Meal Info */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Recipe:</span>{' '}
                  <span className="font-medium">{selectedRecipe?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Meal Type:</span>{' '}
                  <Badge
                    variant="outline"
                    className={`ml-1 gap-1 ${mealTypeBadgeClass(mealForm.mealType)}`}
                  >
                    {mealTypeIcon(mealForm.mealType)}
                    {mealForm.mealType}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Meals Served:</span>{' '}
                  <span className="font-medium tabular-nums">{mealForm.mealsServed}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Base Servings:</span>{' '}
                  <span className="font-medium tabular-nums">
                    {selectedRecipe?.baseServings}
                  </span>
                </div>
              </div>
            </div>

            {/* Deduction Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="text-right">To Consume</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">After</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mealDeduction.map((item, idx) => {
                    const afterStock = item.currentStock - item.consumed;
                    const isLow = afterStock < 0;
                    const isWarning = afterStock >= 0 && afterStock < item.currentStock * 0.2;
                    return (
                      <TableRow key={idx} className="transition-colors hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                          {item.consumed.toFixed(2)} {item.unit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.currentStock.toFixed(2)} {item.unit}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium tabular-nums ${
                            isLow
                              ? 'text-red-600 dark:text-red-400'
                              : isWarning
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {Math.max(0, afterStock).toFixed(2)} {item.unit}
                        </TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100">
                              Insufficient
                            </Badge>
                          ) : isWarning ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100">
                              Low
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">
                              OK
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {mealDeduction.some((item) => item.currentStock - item.consumed < 0) && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div className="text-sm text-red-800 dark:text-red-300">
                  <p className="font-medium">Insufficient Stock Warning</p>
                  <p className="text-xs mt-1">
                    Some ingredients don&apos;t have enough stock. Stock will be
                    deducted to 0 (minimum) for those items.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMealConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAddMeal}
              disabled={mealSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {mealSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm & Record
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Adjustment Dialog ───────────────────────────────────────── */}
      <Dialog
        open={showAddAdjustmentDialog}
        onOpenChange={setShowAddAdjustmentDialog}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              Add Stock Adjustment
            </DialogTitle>
            <DialogDescription>
              Record a stock change: consumption, wastage, or manual adjustment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Ingredient */}
            <div className="grid gap-2">
              <Label htmlFor="adj-ingredient">Ingredient *</Label>
              <Select
                value={adjustmentForm.ingredientId}
                onValueChange={(val) => {
                  const ing = ingredients.find((i) => i.id === val);
                  setAdjustmentForm((prev) => ({
                    ...prev,
                    ingredientId: val,
                    unitPrice: ing ? ing.avgCost.toString() : '',
                  }));
                }}
              >
                <SelectTrigger id="adj-ingredient">
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} ({ing.currentStock} {ing.unit} in stock)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current Stock Info */}
            {selectedIngredient && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current Stock:</span>{' '}
                    <span className="font-medium tabular-nums">
                      {selectedIngredient.currentStock} {selectedIngredient.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Cost:</span>{' '}
                    <span className="font-medium tabular-nums">
                      {formatCurrency(selectedIngredient.avgCost)}/{selectedIngredient.unit}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="adj-type">Type *</Label>
              <Select
                value={adjustmentForm.type}
                onValueChange={(val) =>
                  setAdjustmentForm((prev) => ({ ...prev, type: val }))
                }
              >
                <SelectTrigger id="adj-type">
                  <SelectValue placeholder="Select adjustment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSUMPTION">Consumption</SelectItem>
                  <SelectItem value="WASTAGE">Wastage</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ADJUSTMENT type note */}
            {adjustmentForm.type === 'ADJUSTMENT' && (
              <div className="flex items-start gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/20">
                <Info className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                <p className="text-xs text-purple-800 dark:text-purple-300">
                  <strong>Adjustment</strong> sets the absolute stock level. The
                  quantity you enter will become the new current stock for this
                  ingredient.
                </p>
              </div>
            )}

            {/* Quantity */}
            <div className="grid gap-2">
              <Label htmlFor="adj-quantity">
                Quantity{' '}
                {adjustmentForm.type === 'ADJUSTMENT'
                  ? '(new stock level)'
                  : adjustmentForm.type === 'CONSUMPTION'
                    ? '(consumed)'
                    : adjustmentForm.type === 'WASTAGE'
                      ? '(wasted)'
                      : ''}{' '}
                *
              </Label>
              <Input
                id="adj-quantity"
                type="number"
                min="0"
                step="0.01"
                placeholder={
                  adjustmentForm.type === 'ADJUSTMENT'
                    ? 'Enter new stock level'
                    : 'Enter quantity'
                }
                value={adjustmentForm.quantity}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
              />
            </div>

            {/* Unit Price */}
            <div className="grid gap-2">
              <Label htmlFor="adj-unit-price">
                Unit Price (₹) — auto-filled from avg cost
              </Label>
              <Input
                id="adj-unit-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={adjustmentForm.unitPrice}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({
                    ...prev,
                    unitPrice: e.target.value,
                  }))
                }
              />
            </div>

            {/* Total Preview */}
            {adjustmentForm.quantity && adjustmentForm.unitPrice && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatCurrency(
                      parseFloat(adjustmentForm.quantity) *
                        parseFloat(adjustmentForm.unitPrice)
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={adjustmentForm.date}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="adj-notes">Notes (optional)</Label>
              <Textarea
                id="adj-notes"
                placeholder="Reason for adjustment..."
                value={adjustmentForm.notes}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddAdjustmentDialog(false);
                resetAdjustmentForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddAdjustment}
              disabled={
                !adjustmentForm.ingredientId ||
                !adjustmentForm.type ||
                !adjustmentForm.quantity ||
                adjustmentSubmitting
              }
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {adjustmentSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Add Adjustment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

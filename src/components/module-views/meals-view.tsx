"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import {
  UtensilsCrossed,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChefHat,
  Users,
  IndianRupee,
  X,
  Calculator,
  BookOpen,
  AlertTriangle,
  Star,
  Copy,
  LayoutGrid,
  Table as TableIcon,
  ArrowDownUp,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Hash,
  ArrowDownAZ,
  Clock,
  Soup,
  Sparkles,
  Upload,
  ImagePlus,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

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

interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  ingredient: Ingredient;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  mealType: string;
  baseServings: number;
  instructions: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
}

interface IngredientRow {
  ingredientId: string;
  quantity: string;
  unit: string;
}

type SortOption = "name" | "cost" | "created";
type ViewMode = "grid" | "table";

interface CategoryBreakdownEntry {
  category: string;
  amount: number;
  percent: number;
}

// ─── Constants ───────────────────────────────────────────────────

const MEAL_TYPES = ["All", "Breakfast", "Lunch", "Dinner", "Snack"] as const;

const MEAL_TYPE_STYLES: Record<
  string,
  { accent: string; badge: string; soft: string; icon: string; borderLeft: string }
> = {
  Breakfast: {
    accent: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    soft: "bg-amber-50 dark:bg-amber-950/20",
    icon: "text-amber-600 dark:text-amber-400",
    borderLeft: "border-l-amber-500",
  },
  Lunch: {
    accent: "bg-orange-500",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    soft: "bg-orange-50 dark:bg-orange-950/20",
    icon: "text-orange-600 dark:text-orange-400",
    borderLeft: "border-l-orange-500",
  },
  Dinner: {
    accent: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    soft: "bg-rose-50 dark:bg-rose-950/20",
    icon: "text-rose-600 dark:text-rose-400",
    borderLeft: "border-l-rose-500",
  },
  Snack: {
    accent: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    soft: "bg-emerald-50 dark:bg-emerald-950/20",
    icon: "text-emerald-600 dark:text-emerald-400",
    borderLeft: "border-l-emerald-500",
  },
  default: {
    accent: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    soft: "bg-slate-50 dark:bg-slate-900/30",
    icon: "text-slate-600 dark:text-slate-400",
    borderLeft: "border-l-slate-400",
  },
};

const CATEGORY_COLORS = [
  "bg-orange-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-violet-400",
  "bg-sky-400",
  "bg-rose-400",
  "bg-slate-400",
];

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof ArrowDownAZ }[] = [
  { value: "name", label: "By Name (A-Z)", icon: ArrowDownAZ },
  { value: "cost", label: "By Cost per Meal", icon: TrendingUp },
  { value: "created", label: "By Recently Created", icon: Clock },
];

const FAVORITES_KEY = "rcs-recipe-favorites";
const VIEW_KEY = "rcs-recipe-view-mode";

// ─── Helpers ─────────────────────────────────────────────────────

function getMealTypeStyle(mealType: string) {
  return MEAL_TYPE_STYLES[mealType] ?? MEAL_TYPE_STYLES.default;
}

function formatRupee(amount: number): string {
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function calcTotalIngredientCost(ingredients: RecipeIngredient[]): number {
  return ingredients.reduce((sum, ri) => sum + ri.quantity * ri.ingredient.avgCost, 0);
}

function calcCostPerMeal(ingredients: RecipeIngredient[], baseServings: number): number {
  if (baseServings <= 0) return 0;
  return calcTotalIngredientCost(ingredients) / baseServings;
}

function calcCostFor600(ingredients: RecipeIngredient[], baseServings: number): number {
  return calcCostPerMeal(ingredients, baseServings) * 600;
}

function calcCostBreakdown(ingredients: RecipeIngredient[]): {
  entries: CategoryBreakdownEntry[];
  total: number;
} {
  const byCategory: Record<string, number> = {};
  let total = 0;
  ingredients.forEach((ri) => {
    const cost = ri.quantity * ri.ingredient.avgCost;
    const cat = ri.ingredient.category || "Other";
    byCategory[cat] = (byCategory[cat] || 0) + cost;
    total += cost;
  });
  const entries = Object.entries(byCategory)
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  return { entries, total };
}

// Compare cost using lastPurchasePrice vs avgCost to show trend
function calcCostTrend(ingredients: RecipeIngredient[]): {
  direction: "up" | "down" | "stable";
  percentChange: number;
} {
  let costByAvg = 0;
  let costByLast = 0;
  ingredients.forEach((ri) => {
    costByAvg += ri.quantity * ri.ingredient.avgCost;
    costByLast += ri.quantity * ri.ingredient.lastPurchasePrice;
  });
  if (costByAvg === 0) return { direction: "stable", percentChange: 0 };
  const pctChange = ((costByLast - costByAvg) / costByAvg) * 100;
  if (Math.abs(pctChange) < 2) return { direction: "stable", percentChange: pctChange };
  return { direction: pctChange > 0 ? "up" : "down", percentChange: pctChange };
}

// ─── Recipe Image Component ─────────────────────────────────────

interface RecipeImageProps {
  imageUrl: string | null;
  name: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  rounded?: string;
}

/**
 * Renders a recipe image. If no image is provided, shows a beautiful
 * gradient placeholder with a UtensilsCrossed icon and the recipe's
 * first letter as fallback.
 */
function RecipeImage({
  imageUrl,
  name,
  className,
  imgClassName,
  eager = false,
  rounded = "rounded-t-xl",
}: RecipeImageProps) {
  const firstLetter = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-100 to-amber-50 dark:from-amber-900/40 dark:via-orange-900/30 dark:to-amber-950/20",
        rounded,
        className
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          loading={eager ? "eager" : "lazy"}
          className={cn(
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
            imgClassName
          )}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <UtensilsCrossed className="h-8 w-8 text-orange-400/70 dark:text-orange-500/50" />
          <span className="bg-gradient-to-br from-orange-500 to-amber-500 bg-clip-text text-3xl font-black text-transparent dark:from-orange-300 dark:to-amber-300">
            {firstLetter}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────

export function MealsView() {
  const { toast } = useToast();

  // Data state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [mealTypeFilter, setMealTypeFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  // View / sort state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("name");

  // Favorites (localStorage)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  // Detail dialog
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [scalingServings, setScalingServings] = useState<string>("600");

  // Add/Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMealType, setFormMealType] = useState("Lunch");
  const [formBaseServings, setFormBaseServings] = useState("100");
  const [formInstructions, setFormInstructions] = useState("");
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formIngredients, setFormIngredients] = useState<IngredientRow[]>([
    { ingredientId: "", quantity: "", unit: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<Recipe | null>(null);

  // ─── LocalStorage hydration ──────────────────────────────────

  useEffect(() => {
    try {
      const storedFav = localStorage.getItem(FAVORITES_KEY);
      if (storedFav) setFavorites(new Set(JSON.parse(storedFav) as string[]));
    } catch {
      /* ignore */
    }
    try {
      const storedView = localStorage.getItem(VIEW_KEY);
      if (storedView === "grid" || storedView === "table") setViewMode(storedView);
    } catch {
      /* ignore */
    }
    setFavoritesLoaded(true);
  }, []);

  useEffect(() => {
    if (!favoritesLoaded) return;
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    } catch {
      /* ignore */
    }
  }, [favorites, favoritesLoaded]);

  useEffect(() => {
    if (!favoritesLoaded) return;
    try {
      localStorage.setItem(VIEW_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode, favoritesLoaded]);

  // ─── Data Fetching ──────────────────────────────────────────

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (mealTypeFilter !== "All") params.set("mealType", mealTypeFilter);
      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (err) {
      console.error("Error fetching recipes:", err);
    } finally {
      setLoading(false);
    }
  }, [search, mealTypeFilter]);

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await fetch("/api/ingredients");
      if (res.ok) {
        const data = await res.json();
        setAllIngredients(data);
      }
    } catch (err) {
      console.error("Error fetching ingredients:", err);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // ─── Derived data ───────────────────────────────────────────

  const sortedRecipes = useMemo(() => {
    const copy = [...recipes];
    copy.sort((a, b) => {
      // Favorites first
      const af = favorites.has(a.id) ? 1 : 0;
      const bf = favorites.has(b.id) ? 1 : 0;
      if (af !== bf) return bf - af;

      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "cost":
          return (
            calcCostPerMeal(b.ingredients, b.baseServings) -
            calcCostPerMeal(a.ingredients, a.baseServings)
          );
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
    return copy;
  }, [recipes, sortBy, favorites]);

  const stats = useMemo(() => {
    const total = recipes.length;
    const avgCost =
      total > 0
        ? recipes.reduce(
            (s, r) => s + calcCostPerMeal(r.ingredients, r.baseServings),
            0
          ) / total
        : 0;
    const totalIngredients = new Set<string>();
    let totalRecipeIngredients = 0;
    recipes.forEach((r) => {
      r.ingredients.forEach((ri) => {
        totalIngredients.add(ri.ingredientId);
        totalRecipeIngredients += 1;
      });
    });
    return {
      total,
      avgCost,
      totalUniqueIngredients: totalIngredients.size,
      totalRecipeIngredients,
    };
  }, [recipes]);

  // ─── Actions ────────────────────────────────────────────────

  const toggleFavorite = (recipe: Recipe) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      const wasFav = next.has(recipe.id);
      if (wasFav) {
        next.delete(recipe.id);
      } else {
        next.add(recipe.id);
      }
      toast({
        title: wasFav ? "Removed from favorites" : "Added to favorites",
        description: recipe.name,
      });
      return next;
    });
  };

  const openAddForm = () => {
    setEditingRecipe(null);
    setFormName("");
    setFormDescription("");
    setFormMealType("Lunch");
    setFormBaseServings("100");
    setFormInstructions("");
    setFormImageUrl(null);
    setFormIngredients([{ ingredientId: "", quantity: "", unit: "" }]);
    setFormOpen(true);
  };

  const openEditForm = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormName(recipe.name);
    setFormDescription(recipe.description || "");
    setFormMealType(recipe.mealType);
    setFormBaseServings(String(recipe.baseServings));
    setFormInstructions(recipe.instructions || "");
    setFormImageUrl(recipe.imageUrl);
    setFormIngredients(
      recipe.ingredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        quantity: String(ri.quantity),
        unit: ri.unit,
      }))
    );
    setFormOpen(true);
  };

  const openDuplicateForm = (recipe: Recipe) => {
    setEditingRecipe(null);
    setFormName(`${recipe.name} (Copy)`);
    setFormDescription(recipe.description || "");
    setFormMealType(recipe.mealType);
    setFormBaseServings(String(recipe.baseServings));
    setFormInstructions(recipe.instructions || "");
    setFormImageUrl(recipe.imageUrl);
    setFormIngredients(
      recipe.ingredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        quantity: String(ri.quantity),
        unit: ri.unit,
      }))
    );
    setFormOpen(true);
    toast({
      title: "Recipe duplicated",
      description: `Editing a copy of "${recipe.name}". Click Create to save.`,
    });
  };

  const addIngredientRow = () => {
    setFormIngredients([
      ...formIngredients,
      { ingredientId: "", quantity: "", unit: "" },
    ]);
  };

  const removeIngredientRow = (index: number) => {
    if (formIngredients.length <= 1) return;
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const updateIngredientRow = (
    index: number,
    field: keyof IngredientRow,
    value: string
  ) => {
    const updated = [...formIngredients];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "ingredientId" && value) {
      const ing = allIngredients.find((i) => i.id === value);
      if (ing) {
        updated[index].unit = ing.unit;
      }
    }
    setFormIngredients(updated);
  };

  const calcFormTotalCost = (): number => {
    return formIngredients.reduce((sum, row) => {
      if (!row.ingredientId || !row.quantity) return sum;
      const ing = allIngredients.find((i) => i.id === row.ingredientId);
      if (!ing) return sum;
      const qty = parseFloat(row.quantity) || 0;
      return sum + qty * ing.avgCost;
    }, 0);
  };

  const handleImageUpload = async (file: File) => {
    // Client-side validation
    if (file.size > 2 * 1024 * 1024) {
      sonnerToast.error("File too large", {
        description: `Maximum allowed size is 2MB (selected file is ${(file.size / 1024 / 1024).toFixed(2)}MB).`,
      });
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      sonnerToast.error("Invalid file type", {
        description: `Allowed: JPEG, PNG, WebP, GIF (got ${file.type || "unknown"}).`,
      });
      return;
    }

    if (!editingRecipe) {
      sonnerToast.info("Save the recipe first", {
        description: "Please create the recipe before uploading an image.",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/recipes/${editingRecipe.id}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormImageUrl(data.imageUrl);
        sonnerToast.success("Image uploaded", {
          description: file.name,
        });
      } else {
        sonnerToast.error("Upload failed", {
          description: data.error || "Unknown error",
        });
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      sonnerToast.error("Upload failed", {
        description: "Network error while uploading image.",
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageRemove = async () => {
    if (!editingRecipe) {
      setFormImageUrl(null);
      return;
    }
    setUploadingImage(true);
    try {
      const res = await fetch(`/api/recipes/${editingRecipe.id}/upload`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFormImageUrl(null);
        sonnerToast.success("Image removed");
      } else {
        const data = await res.json().catch(() => ({}));
        sonnerToast.error("Remove failed", {
          description: data.error || "Unknown error",
        });
      }
    } catch (err) {
      console.error("Error removing image:", err);
      sonnerToast.error("Remove failed", {
        description: "Network error while removing image.",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleSubmit = async () => {
    if (!formName || !formMealType) return;
    const validIngredients = formIngredients.filter(
      (row) => row.ingredientId && row.quantity && parseFloat(row.quantity) > 0
    );
    if (validIngredients.length === 0) return;

    setSubmitting(true);
    try {
      const body = {
        name: formName,
        description: formDescription || null,
        mealType: formMealType,
        baseServings: parseInt(formBaseServings) || 100,
        instructions: formInstructions || null,
        imageUrl: formImageUrl,
        ingredients: validIngredients.map((row) => ({
          ingredientId: row.ingredientId,
          quantity: parseFloat(row.quantity),
          unit: row.unit,
        })),
      };

      if (editingRecipe) {
        const res = await fetch(`/api/recipes/${editingRecipe.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setFormOpen(false);
          fetchRecipes();
          toast({ title: "Recipe updated", description: formName });
        }
      } else {
        const res = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setFormOpen(false);
          fetchRecipes();
          toast({ title: "Recipe created", description: formName });
        }
      }
    } catch (err) {
      console.error("Error saving recipe:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recipe: Recipe) => {
    try {
      // Best-effort: remove image file before deleting the recipe.
      if (recipe.imageUrl) {
        try {
          await fetch(`/api/recipes/${recipe.id}/upload`, { method: "DELETE" });
        } catch {
          /* ignore – recipe deletion will still proceed */
        }
      }
      const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirm(null);
        setDetailRecipe(null);
        fetchRecipes();
        toast({ title: "Recipe deleted", description: recipe.name });
      }
    } catch (err) {
      console.error("Error deleting recipe:", err);
    }
  };

  const openDetail = (recipe: Recipe) => {
    setDetailRecipe(recipe);
    setScalingServings("600");
  };

  // ─── Render helpers ─────────────────────────────────────────

  const formTotalCost = calcFormTotalCost();
  const formBaseServingsNum = parseInt(formBaseServings) || 100;

  const currentSort = SORT_OPTIONS.find((s) => s.value === sortBy) ?? SORT_OPTIONS[0];
  const SortIcon = currentSort.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30 ring-1 ring-orange-200/60 dark:ring-orange-800/40">
          <UtensilsCrossed className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meals / Recipes</h1>
          <p className="text-sm text-muted-foreground">
            Define meal recipes, ingredient lists, and per-meal cost calculations
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <ChefHat className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total Recipes</p>
              <p className="text-2xl font-bold leading-tight">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Avg Cost / Meal</p>
              <p className="text-2xl font-bold leading-tight text-orange-600 dark:text-orange-400">
                {formatRupee(stats.avgCost)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Layers className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Ingredients Used</p>
              <p className="text-2xl font-bold leading-tight">
                {stats.totalUniqueIngredients}
                <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                  unique
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Meal type filter */}
          <Select value={mealTypeFilter} onValueChange={setMealTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Meal Type" />
            </SelectTrigger>
            <SelectContent>
              {MEAL_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "All" ? "All Types" : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 sm:w-[180px] justify-start">
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Sort:</span>
                <span className="font-medium truncate">{currentSort.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Sort by
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={cn(
                      "gap-2 cursor-pointer",
                      sortBy === opt.value && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{opt.label}</span>
                    {sortBy === opt.value && (
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(val) => {
              if (val === "grid" || val === "table") setViewMode(val);
            }}
            className="rounded-md border bg-background"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Grid view"
              className="px-2.5 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/30 dark:data-[state=on]:text-orange-300"
            >
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="table"
              aria-label="Table view"
              className="px-2.5 data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/30 dark:data-[state=on]:text-orange-300"
            >
              <TableIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            onClick={openAddForm}
            className="bg-orange-600 hover:bg-orange-700 text-white gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Recipe
          </Button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse overflow-hidden">
                <div className="h-1 w-full bg-muted" />
                <CardHeader className="pb-3">
                  <div className="flex justify-between gap-2">
                    <div className="h-5 w-2/3 rounded bg-muted" />
                    <div className="h-5 w-16 rounded-full bg-muted" />
                  </div>
                  <div className="h-3 w-full rounded bg-muted mt-2" />
                  <div className="h-3 w-2/3 rounded bg-muted mt-1" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-8 w-1/2 rounded bg-muted" />
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-1.5 w-full rounded-full bg-muted" />
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : sortedRecipes.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="relative mb-5">
                  <div className="absolute inset-0 -z-10 mx-auto h-24 w-24 rounded-full bg-orange-100/60 blur-2xl dark:bg-orange-900/20" />
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/30 ring-1 ring-orange-200/60 dark:ring-orange-800/40">
                    <Soup className="h-10 w-10 text-orange-500 dark:text-orange-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold">No recipes yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Start by creating your first recipe. Add ingredients, set
                  servings, and the cost-per-meal will be calculated
                  automatically.
                </p>
                <Button
                  onClick={openAddForm}
                  className="mt-5 bg-orange-600 hover:bg-orange-700 text-white gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create First Recipe
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {sortedRecipes.map((recipe) => {
              const costPerMeal = calcCostPerMeal(
                recipe.ingredients,
                recipe.baseServings
              );
              const costFor600 = calcCostFor600(
                recipe.ingredients,
                recipe.baseServings
              );
              const breakdown = calcCostBreakdown(recipe.ingredients);
              const trend = calcCostTrend(recipe.ingredients);
              const style = getMealTypeStyle(recipe.mealType);
              const isFav = favorites.has(recipe.id);
              return (
                <motion.div
                  key={recipe.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.25 }}
                  className="h-full"
                >
                  <Card
                    className={cn(
                      "group relative h-full flex flex-col overflow-hidden cursor-pointer",
                      "border-l-4 transition-all duration-200",
                      style.borderLeft,
                      "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30"
                    )}
                    onClick={() => openDetail(recipe)}
                  >
                    {/* Recipe image header */}
                    <RecipeImage
                      imageUrl={recipe.imageUrl}
                      name={recipe.name}
                      className="h-32 w-full shrink-0 border-b border-orange-100/60 dark:border-orange-900/30"
                      rounded="rounded-none"
                    />
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-bold leading-tight truncate">
                            {recipe.name}
                          </CardTitle>
                          {recipe.description ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CardDescription className="mt-1 text-xs line-clamp-2 min-h-[2rem]">
                                  {recipe.description}
                                </CardDescription>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="max-w-xs text-xs"
                              >
                                {recipe.description}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <CardDescription className="mt-1 text-xs italic min-h-[2rem]">
                              No description
                            </CardDescription>
                          )}
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(recipe);
                              }}
                              className={cn(
                                "shrink-0 rounded-full p-1 transition-colors",
                                "hover:bg-amber-100 dark:hover:bg-amber-900/30",
                                isFav
                                  ? "text-amber-500"
                                  : "text-muted-foreground/40 hover:text-amber-500"
                              )}
                              aria-label={
                                isFav ? "Remove from favorites" : "Add to favorites"
                              }
                            >
                              <Star
                                className={cn(
                                  "h-4 w-4",
                                  isFav && "fill-amber-400 text-amber-500"
                                )}
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {isFav ? "Remove favorite" : "Add to favorites"}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Meal type pill */}
                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                            style.badge
                          )}
                        >
                          {recipe.mealType}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col gap-3 pb-3">
                      {/* Cost per meal - primary accent */}
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Cost per Meal
                        </p>
                        <div className="flex items-baseline gap-1">
                          <IndianRupee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          <span className="text-2xl font-bold leading-none text-orange-600 dark:text-orange-400">
                            {costPerMeal.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            / meal
                          </span>
                          {/* Cost trend indicator */}
                          {trend.direction !== "stable" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(
                                  "ml-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                  trend.direction === "up"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                )}>
                                  {trend.direction === "up" ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {Math.abs(trend.percentChange).toFixed(0)}%
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-xs">
                                {trend.direction === "up"
                                  ? "Ingredient costs trending up vs. average"
                                  : "Ingredient costs trending down vs. average"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>

                      {/* Secondary stat row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calculator className="h-3.5 w-3.5" />
                          <span>
                            600 meals:{" "}
                            <span className="font-medium text-foreground">
                              {formatRupee(costFor600)}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {recipe.baseServings} servings
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          {recipe.ingredients.length} ingredient
                          {recipe.ingredients.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Cost breakdown bar */}
                      {breakdown.entries.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium">
                              <Layers className="h-3 w-3" />
                              Cost Breakdown
                            </span>
                            <span className="text-[9px]">
                              {breakdown.entries.length} categor
                              {breakdown.entries.length === 1 ? "y" : "ies"}
                            </span>
                          </div>
                          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            {breakdown.entries.map((e, i) => (
                              <Tooltip key={e.category}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "h-full transition-all",
                                      CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                                    )}
                                    style={{ width: `${e.percent}%` }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  className="text-xs"
                                >
                                  <p className="font-medium">{e.category}</p>
                                  <p className="text-muted-foreground">
                                    {formatRupee(e.amount)} ·{" "}
                                    {e.percent.toFixed(0)}%
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5">
                            {breakdown.entries.slice(0, 3).map((e, i) => (
                              <div
                                key={e.category}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground"
                              >
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-sm",
                                    CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                                  )}
                                />
                                <span className="truncate max-w-[80px]">
                                  {e.category}
                                </span>
                                <span className="font-medium text-foreground">
                                  {e.percent.toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="border-t bg-muted/20 px-4 py-2 mt-auto">
                      <div className="flex items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetail(recipe);
                              }}
                            >
                              <BookOpen className="h-4 w-4" />
                              <span className="sr-only">View details</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View details</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDuplicateForm(recipe);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Duplicate</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicate recipe</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditForm(recipe);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit recipe</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(recipe);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete recipe</TooltipContent>
                        </Tooltip>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10" />
                    <TableHead className="min-w-[180px]">Recipe</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Servings</TableHead>
                    <TableHead className="text-right">Ingr.</TableHead>
                    <TableHead className="text-right">Cost / Meal</TableHead>
                    <TableHead className="text-right">Cost / 600</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRecipes.map((recipe) => {
                    const costPerMeal = calcCostPerMeal(
                      recipe.ingredients,
                      recipe.baseServings
                    );
                    const costFor600 = calcCostFor600(
                      recipe.ingredients,
                      recipe.baseServings
                    );
                    const style = getMealTypeStyle(recipe.mealType);
                    const isFav = favorites.has(recipe.id);
                    return (
                      <TableRow
                        key={recipe.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => openDetail(recipe)}
                      >
                        <TableCell>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(recipe);
                            }}
                            className={cn(
                              "rounded-full p-1 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30",
                              isFav
                                ? "text-amber-500"
                                : "text-muted-foreground/40 hover:text-amber-500"
                            )}
                            aria-label="Toggle favorite"
                          >
                            <Star
                              className={cn(
                                "h-4 w-4",
                                isFav && "fill-amber-400 text-amber-500"
                              )}
                            />
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-8 w-1 rounded-full",
                                style.accent
                              )}
                            />
                            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border bg-muted/40">
                              {recipe.imageUrl ? (
                                <img
                                  src={recipe.imageUrl}
                                  alt={recipe.name}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30">
                                  <span className="bg-gradient-to-br from-orange-500 to-amber-500 bg-clip-text text-sm font-bold text-transparent dark:from-orange-300 dark:to-amber-300">
                                    {(recipe.name || "?").charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{recipe.name}</p>
                              {recipe.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-[260px]">
                                  {recipe.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                              style.badge
                            )}
                          >
                            {recipe.mealType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {recipe.baseServings}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {recipe.ingredients.length}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-orange-600 dark:text-orange-400">
                            {formatRupee(costPerMeal)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatRupee(costFor600)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex items-center justify-end gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openDetail(recipe)}
                            >
                              <BookOpen className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openDuplicateForm(recipe)}
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Duplicate</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditForm(recipe)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteConfirm(recipe)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Detail Dialog ─────────────────────────────────────── */}
      <Dialog
        open={!!detailRecipe}
        onOpenChange={(open) => !open && setDetailRecipe(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailRecipe && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-1.5 w-12 rounded-full",
                      getMealTypeStyle(detailRecipe.mealType).accent
                    )}
                  />
                  <DialogTitle className="text-xl flex-1">
                    {detailRecipe.name}
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(detailRecipe)}
                    className={cn(
                      "rounded-full p-1.5 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30",
                      favorites.has(detailRecipe.id)
                        ? "text-amber-500"
                        : "text-muted-foreground/50 hover:text-amber-500"
                    )}
                    aria-label="Toggle favorite"
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        favorites.has(detailRecipe.id) &&
                          "fill-amber-400 text-amber-500"
                      )}
                    />
                  </button>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      getMealTypeStyle(detailRecipe.mealType).badge
                    )}
                  >
                    {detailRecipe.mealType}
                  </span>
                </div>
                {detailRecipe.description && (
                  <DialogDescription className="pt-2">
                    {detailRecipe.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-4">
                {/* Recipe hero image */}
                <RecipeImage
                  imageUrl={detailRecipe.imageUrl}
                  name={detailRecipe.name}
                  className="h-56 w-full"
                  eager
                />

                {/* Meta row */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      Base Servings:{" "}
                      <span className="font-semibold text-foreground">
                        {detailRecipe.baseServings}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>
                      Ingredients:{" "}
                      <span className="font-semibold text-foreground">
                        {detailRecipe.ingredients.length}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                {detailRecipe.instructions && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Instructions
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {detailRecipe.instructions}
                    </p>
                  </div>
                )}

                {/* Cost breakdown visualization */}
                {(() => {
                  const breakdown = calcCostBreakdown(detailRecipe.ingredients);
                  if (breakdown.entries.length === 0) return null;
                  return (
                    <div className="rounded-lg border p-4 space-y-3">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Layers className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        Cost Breakdown by Category
                      </p>
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                        {breakdown.entries.map((e, i) => (
                          <Tooltip key={e.category}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "h-full transition-all",
                                  CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                                )}
                                style={{ width: `${e.percent}%` }}
                              />
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="text-xs"
                            >
                              <p className="font-medium">{e.category}</p>
                              <p className="text-muted-foreground">
                                {formatRupee(e.amount)} · {e.percent.toFixed(1)}%
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {breakdown.entries.map((e, i) => (
                          <div
                            key={e.category}
                            className="flex items-center justify-between gap-2 text-xs rounded-md border bg-muted/30 px-2.5 py-1.5"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 rounded-sm shrink-0",
                                  CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                                )}
                              />
                              <span className="truncate">{e.category}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-semibold">
                                {formatRupee(e.amount)}
                              </span>
                              <span className="text-muted-foreground ml-1">
                                {e.percent.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Ingredients Table */}
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Ingredient</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailRecipe.ingredients.map((ri, idx) => {
                        const unitCost = ri.ingredient.avgCost;
                        const totalCost = ri.quantity * unitCost;
                        return (
                          <TableRow
                            key={ri.id}
                            className={`hover:bg-muted/50 transition-colors ${idx % 2 === 1 ? "bg-muted/30" : ""}`}
                          >
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{ri.ingredient.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {ri.ingredient.category}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {ri.quantity}
                            </TableCell>
                            <TableCell>{ri.unit}</TableCell>
                            <TableCell className="text-right">
                              {formatRupee(unitCost)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatRupee(totalCost)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Cost Summary */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">
                        Total Ingredient Cost
                      </p>
                      <p className="text-lg font-bold">
                        {formatRupee(
                          calcTotalIngredientCost(detailRecipe.ingredients)
                        )}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">
                        Cost per Meal
                      </p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {formatRupee(
                          calcCostPerMeal(
                            detailRecipe.ingredients,
                            detailRecipe.baseServings
                          )
                        )}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">
                        Cost for 600
                      </p>
                      <p className="text-lg font-bold">
                        {formatRupee(
                          calcCostFor600(
                            detailRecipe.ingredients,
                            detailRecipe.baseServings
                          )
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Scaling Section */}
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    Cost Scaling Calculator
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Label
                      htmlFor="scaling-servings"
                      className="text-sm text-muted-foreground whitespace-nowrap"
                    >
                      Servings:
                    </Label>
                    <Input
                      id="scaling-servings"
                      type="number"
                      min={1}
                      value={scalingServings}
                      onChange={(e) => setScalingServings(e.target.value)}
                      className="w-28"
                    />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Total Cost: </span>
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {formatRupee(
                          calcCostPerMeal(
                            detailRecipe.ingredients,
                            detailRecipe.baseServings
                          ) * (parseInt(scalingServings) || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detail actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setDetailRecipe(null);
                      openEditForm(detailRecipe);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Recipe
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setDetailRecipe(null);
                      openDuplicateForm(detailRecipe);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setDeleteConfirm(detailRecipe);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Recipe
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Add / Edit Dialog ─────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingRecipe ? (
                <>
                  <Pencil className="h-4 w-4 text-orange-600" />
                  Edit Recipe
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-orange-600" />
                  Add New Recipe
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingRecipe
                ? "Update recipe details and ingredient list"
                : "Create a new recipe with ingredients and cost calculation"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Recipe Image</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                {/* Preview / placeholder */}
                <div className="relative shrink-0 overflow-hidden rounded-lg border bg-muted/30">
                  <RecipeImage
                    imageUrl={formImageUrl}
                    name={formName || "?"}
                    className="h-32 w-full sm:w-48"
                    rounded="rounded-lg"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-600 dark:text-orange-400" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Uploading...
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-1 flex-col justify-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2 w-full sm:w-auto"
                          disabled={uploadingImage || !editingRecipe}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploadingImage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {formImageUrl ? "Replace Image" : "Upload Image"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {!editingRecipe
                        ? "Save the recipe first to enable image upload"
                        : "JPEG, PNG, WebP or GIF · max 2MB"}
                    </TooltipContent>
                  </Tooltip>
                  {formImageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={uploadingImage}
                      onClick={handleImageRemove}
                    >
                      <X className="h-4 w-4" />
                      Remove Image
                    </Button>
                  )}
                  {!editingRecipe && !formImageUrl && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ImagePlus className="h-3 w-3" />
                      Save the recipe first, then edit to upload an image.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="recipe-name">Recipe Name *</Label>
              <Input
                id="recipe-name"
                placeholder="e.g., Dal Rice"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="recipe-desc">Description</Label>
              <Input
                id="recipe-desc"
                placeholder="Brief description of the recipe"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            {/* Meal Type & Base Servings */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Meal Type *</Label>
                <Select value={formMealType} onValueChange={setFormMealType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                    <SelectItem value="Snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="base-servings">Base Servings</Label>
                <Input
                  id="base-servings"
                  type="number"
                  min={1}
                  value={formBaseServings}
                  onChange={(e) => setFormBaseServings(e.target.value)}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <Label htmlFor="recipe-instructions">Instructions</Label>
              <Textarea
                id="recipe-instructions"
                placeholder="Cooking instructions (optional)"
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            {/* Ingredients Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Ingredients *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={addIngredientRow}
                >
                  <Plus className="h-3 w-3" />
                  Add Ingredient
                </Button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {formIngredients.map((row, idx) => (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      {idx === 0 && (
                        <p className="text-[10px] text-muted-foreground mb-1">
                          Ingredient
                        </p>
                      )}
                      <Select
                        value={row.ingredientId}
                        onValueChange={(val) =>
                          updateIngredientRow(idx, "ingredientId", val)
                        }
                      >
                        <SelectTrigger className="w-full h-9 text-sm">
                          <SelectValue placeholder="Select ingredient" />
                        </SelectTrigger>
                        <SelectContent>
                          {allIngredients.map((ing) => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      {idx === 0 && (
                        <p className="text-[10px] text-muted-foreground mb-1">
                          Qty
                        </p>
                      )}
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="0"
                        value={row.quantity}
                        onChange={(e) =>
                          updateIngredientRow(idx, "quantity", e.target.value)
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="w-20">
                      {idx === 0 && (
                        <p className="text-[10px] text-muted-foreground mb-1">
                          Unit
                        </p>
                      )}
                      <Input
                        placeholder="unit"
                        value={row.unit}
                        onChange={(e) =>
                          updateIngredientRow(idx, "unit", e.target.value)
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={formIngredients.length <= 1}
                      onClick={() => removeIngredientRow(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Real-time cost summary in form */}
              <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/20 p-3 space-y-1.5">
                <p className="text-xs font-medium text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5" />
                  Cost Preview
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Total Cost: </span>
                    <span className="font-semibold">
                      {formatRupee(formTotalCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Per Meal: </span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {formatRupee(
                        formBaseServingsNum > 0
                          ? formTotalCost / formBaseServingsNum
                          : 0
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">For 600: </span>
                    <span className="font-semibold">
                      {formatRupee(
                        formBaseServingsNum > 0
                          ? (formTotalCost / formBaseServingsNum) * 600
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !formName ||
                !formMealType ||
                formIngredients.every((r) => !r.ingredientId)
              }
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
            >
              {submitting ? (
                "Saving..."
              ) : (
                <>
                  <ChefHat className="h-4 w-4" />
                  {editingRecipe ? "Update Recipe" : "Create Recipe"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────── */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Recipe
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuthStore, authFetch } from '@/lib/auth-store'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { format, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Icons
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  ClipboardList,
  ShoppingCart,
  Truck,
  Trash2,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  Sun,
  Moon,
  LogOut,
  User,
  ChevronDown,
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Download,
  RefreshCw,
  CalendarDays,
  CircleDot,
  Edit,
  Eye,
  X,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Flame,
  Leaf,
  DollarSign,
} from 'lucide-react'

// Charts
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ─── Helper Functions ────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num)
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a')
  } catch {
    return dateStr
  }
}

const INGREDIENT_CATEGORIES = ['Grains', 'Vegetables', 'Meat', 'Dairy', 'Spices', 'Oil', 'Beverages', 'Pulses', 'Other']
const EXPENSE_CATEGORIES = ['Gas', 'Electricity', 'Water', 'Maintenance', 'Salary', 'Transport', 'Other']
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner']
const CHART_COLORS = ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

// ─── Types ───────────────────────────────────────────────────────────

interface DashboardData {
  foodCost: { today: number; week: number; month: number }
  meals: { today: number; month: number; week: number }
  costPerMeal: number
  lowStockAlerts: Array<{ id: string; name: string; currentStock: number; minStock: number; unit: string; category: string }>
  topConsumingIngredients: Array<{ ingredient: { id: string; name: string; unit: string; category: string }; totalQuantity: number; totalCost: number }>
  todayMeals: Array<{ id: string; mealType: string; mealsServed: number; recipe: { id: string; name: string; mealType: string } }>
  expenses: { month: number; breakdown: Array<{ category: string; amount: number }> }
  totalOperatingCost: number
  costTrend: Array<{ date: string; cost: number }>
  quickStats: { todayPurchasesTotal: number; weekMealsCount: number; monthWastageValue: number; activeSuppliersCount: number }
  currentBudget: { id: string; month: string; foodBudget: number; operatingBudget: number; totalBudget: number; alertThreshold: number } | null
  activities: Array<{ id: string; type: string; title: string; description: string; amount: number | null; timestamp: string }>
  totalIngredientCount: number
}

interface Ingredient {
  id: string; name: string; unit: string; category: string; currentStock: number; minStock: number; lastPurchasePrice: number; avgCost: number; supplier: string | null; supplierId: string | null; supplierLink?: { id: string; name: string } | null; createdAt: string; updatedAt: string
}

interface Recipe {
  id: string; name: string; description: string | null; mealType: string; baseServings: number; instructions: string | null; ingredients: Array<{ id: string; ingredientId: string; quantity: number; unit: string; ingredient: { id: string; name: string; unit: string; avgCost: number; lastPurchasePrice: number } }>; _count?: { dailyMeals: number }; createdAt: string; updatedAt: string
}

interface DailyMeal {
  id: string; date: string; mealType: string; mealsServed: number; recipeId: string; notes: string | null; recipe: { id: string; name: string; mealType: string; ingredients?: Array<{ ingredientId: string; quantity: number; unit: string; ingredient: { id: string; name: string; unit: string; avgCost: number; currentStock: number } }> }; createdAt: string
}

interface Purchase {
  id: string; date: string; supplier: string | null; supplierId: string | null; invoiceNo: string | null; totalAmount: number; notes: string | null; status: string; items: Array<{ id: string; ingredientId: string; quantity: number; unitPrice: number; totalAmount: number; ingredient: { id: string; name: string; unit: string; category: string } }>; supplierLink?: { id: string; name: string } | null; createdAt: string
}

interface Supplier {
  id: string; name: string; contactPerson: string | null; phone: string | null; email: string | null; address: string | null; gstin: string | null; category: string | null; notes: string | null; ingredientCount: number; purchaseCount: number; totalPurchaseValue: number; createdAt: string; updatedAt: string
}

interface Expense {
  id: string; date: string; category: string; amount: number; description: string | null; createdAt: string
}

interface Budget {
  id: string; month: string; foodBudget: number; operatingBudget: number; totalBudget: number; alertThreshold: number; createdAt: string; updatedAt: string
}

interface StockMovement {
  id: string; ingredientId: string; type: string; quantity: number; unitPrice: number; totalAmount: number; date: string; notes: string | null; ingredient: { id: string; name: string; unit: string; category: string }; createdAt: string
}

interface AuditLog {
  id: string; userId: string | null; userName: string | null; action: string; entityType: string; entityId: string | null; entityName: string | null; description: string; createdAt: string
}

type ViewType = 'dashboard' | 'stock' | 'meals' | 'daily-entry' | 'purchases' | 'suppliers' | 'wastage' | 'budget' | 'expenses' | 'reports' | 'settings'

// ─── Login View ──────────────────────────────────────────────────────

function LoginView() {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('admin@rcs-canteen.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (!seeded) {
      fetch('/api/auth/seed', { method: 'POST' }).then(() => setSeeded(true)).catch(() => setSeeded(true))
    }
  }, [seeded])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-background dark:to-background p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Flame className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">RCS Canteen</CardTitle>
          <CardDescription>Management System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@rcs-canteen.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Default Credentials:</p>
            <p>Admin: admin@rcs-canteen.com / admin123</p>
            <p>Staff: staff@rcs-canteen.com / staff123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Dashboard View ──────────────────────────────────────────────────

function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch { toast.error('Failed to load dashboard') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  const budgetUtilization = data.currentBudget
    ? Math.round((data.foodCost.month / data.currentBudget.foodBudget) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Food Cost Today</CardTitle>
            <IndianRupee className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.foodCost.today)}</div>
            <p className="text-xs text-muted-foreground mt-1">Month: {formatCurrency(data.foodCost.month)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meals Served Today</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.meals.today)}</div>
            <p className="text-xs text-muted-foreground mt-1">Week: {formatNumber(data.meals.week)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost Per Meal</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.costPerMeal)}</div>
            <p className="text-xs text-muted-foreground mt-1">This month average</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.lowStockAlerts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">of {data.totalIngredientCount} ingredients</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Status */}
      {data.currentBudget && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Budget Status — {data.currentBudget.month}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Food Budget Utilization</span>
                  <span className={budgetUtilization > data.currentBudget.alertThreshold ? 'text-red-500 font-bold' : ''}>{budgetUtilization}%</span>
                </div>
                <Progress value={Math.min(budgetUtilization, 100)} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div>Food: {formatCurrency(data.currentBudget.foodBudget)}</div>
                <div>Operating: {formatCurrency(data.currentBudget.operatingBudget)}</div>
                <div>Total: {formatCurrency(data.currentBudget.totalBudget)}</div>
              </div>
              {budgetUtilization > data.currentBudget.alertThreshold && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Budget utilization exceeds {data.currentBudget.alertThreshold}% threshold!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">7-Day Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.costTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => format(parseISO(v), 'dd MMM')} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => format(parseISO(l as string), 'dd MMM yyyy')} />
                <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Consuming Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topConsumingIngredients.map((item) => (
                    <TableRow key={item.ingredient.id}>
                      <TableCell className="font-medium">{item.ingredient.name}</TableCell>
                      <TableCell><Badge variant="secondary">{item.ingredient.category}</Badge></TableCell>
                      <TableCell className="text-right">{formatNumber(item.totalQuantity)} {item.ingredient.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2">
                <ShoppingCart className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today Purchases</p>
                <p className="font-bold">{formatCurrency(data.quickStats.todayPurchasesTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2">
                <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Week Meals</p>
                <p className="font-bold">{formatNumber(data.quickStats.weekMealsCount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-2">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Month Wastage</p>
                <p className="font-bold">{formatCurrency(data.quickStats.monthWastageValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Suppliers</p>
                <p className="font-bold">{data.quickStats.activeSuppliersCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {data.activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`rounded-full p-1.5 mt-0.5 ${
                    activity.type === 'purchase' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    activity.type === 'consumption' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    activity.type === 'wastage' ? 'bg-red-100 dark:bg-red-900/30' :
                    activity.type === 'meal' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    'bg-gray-100 dark:bg-gray-900/30'
                  }`}>
                    {activity.type === 'purchase' ? <ArrowUpRight className="h-3 w-3 text-amber-600" /> :
                     activity.type === 'consumption' ? <ArrowDownRight className="h-3 w-3 text-emerald-600" /> :
                     activity.type === 'wastage' ? <Trash2 className="h-3 w-3 text-red-600" /> :
                     activity.type === 'meal' ? <UtensilsCrossed className="h-3 w-3 text-blue-600" /> :
                     <Activity className="h-3 w-3 text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {activity.amount != null && <p className="text-sm font-medium">{formatCurrency(activity.amount)}</p>}
                    <p className="text-xs text-muted-foreground">{formatDateTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
              {data.activities.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No recent activities</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Stock View ──────────────────────────────────────────────────────

function StockView() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null)
  const [deleteItem, setDeleteItem] = useState<Ingredient | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [form, setForm] = useState({ name: '', unit: 'kg', category: 'Grains', currentStock: '0', minStock: '0', lastPurchasePrice: '0', avgCost: '0', supplierId: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      const res = await authFetch(`/api/ingredients?${params}`)
      if (res.ok) setIngredients(await res.json())
      const sRes = await authFetch('/api/suppliers')
      if (sRes.ok) setSuppliers(await sRes.json())
    } catch { toast.error('Failed to load ingredients') }
    finally { setLoading(false) }
  }, [search, categoryFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditingItem(null)
    setForm({ name: '', unit: 'kg', category: 'Grains', currentStock: '0', minStock: '0', lastPurchasePrice: '0', avgCost: '0', supplierId: '' })
    setShowDialog(true)
  }

  const openEdit = (item: Ingredient) => {
    setEditingItem(item)
    setForm({
      name: item.name, unit: item.unit, category: item.category,
      currentStock: String(item.currentStock), minStock: String(item.minStock),
      lastPurchasePrice: String(item.lastPurchasePrice), avgCost: String(item.avgCost),
      supplierId: item.supplierId || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      const body = { ...form, currentStock: parseFloat(form.currentStock) || 0, minStock: parseFloat(form.minStock) || 0, lastPurchasePrice: parseFloat(form.lastPurchasePrice) || 0, avgCost: parseFloat(form.avgCost) || 0 }
      if (editingItem) {
        const res = await authFetch(`/api/ingredients/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(body) })
        if (!res.ok) throw new Error('Failed to update')
        toast.success('Ingredient updated')
      } else {
        const res = await authFetch('/api/ingredients', { method: 'POST', body: JSON.stringify(body) })
        if (!res.ok) throw new Error('Failed to create')
        toast.success('Ingredient created')
      }
      setShowDialog(false)
      fetchData()
    } catch { toast.error('Failed to save ingredient') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/ingredients/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Ingredient deleted')
      setDeleteItem(null)
      fetchData()
    } catch { toast.error('Failed to delete ingredient') }
  }

  const filtered = ingredients

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search ingredients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {INGREDIENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Ingredient</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <Card>
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id} className={item.currentStock < item.minStock ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                    <TableCell className="font-medium">
                      {item.name}
                      {item.currentStock < item.minStock && (
                        <Badge variant="destructive" className="ml-2 text-[10px]">Low</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(item.currentStock)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatNumber(item.minStock)}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.avgCost)}</TableCell>
                    <TableCell className="text-muted-foreground">{item.supplierLink?.name || item.supplier || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Edit className="h-3.5 w-3.5" /></Button>
                        <AlertDialog open={deleteItem?.id === item.id} onOpenChange={(o) => !o && setDeleteItem(null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteItem(item)}><X className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete &quot;{item.name}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No ingredients found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Ingredient' : 'Add Ingredient'}</DialogTitle>
            <DialogDescription>{editingItem ? 'Update ingredient details' : 'Add a new ingredient to the inventory'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INGREDIENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div className="space-y-2"><Label>Current Stock</Label><Input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} /></div>
              <div className="space-y-2"><Label>Min Stock</Label><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Last Purchase Price</Label><Input type="number" value={form.lastPurchasePrice} onChange={(e) => setForm({ ...form, lastPurchasePrice: e.target.value })} /></div>
              <div className="space-y-2"><Label>Avg Cost</Label><Input type="number" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Meals View ──────────────────────────────────────────────────────

function MealsView() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [ingredients, setIngredientsList] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null)
  const [editingItem, setEditingItem] = useState<Recipe | null>(null)
  const [deleteItem, setDeleteItem] = useState<Recipe | null>(null)

  const [form, setForm] = useState({ name: '', description: '', mealType: 'Lunch', baseServings: '100', instructions: '', ingredients: [] as Array<{ ingredientId: string; quantity: string; unit: string }> })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, iRes] = await Promise.all([authFetch('/api/recipes'), authFetch('/api/ingredients')])
      if (rRes.ok) setRecipes(await rRes.json())
      if (iRes.ok) setIngredientsList(await iRes.json())
    } catch { toast.error('Failed to load recipes') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditingItem(null)
    setForm({ name: '', description: '', mealType: 'Lunch', baseServings: '100', instructions: '', ingredients: [{ ingredientId: '', quantity: '', unit: 'kg' }] })
    setShowDialog(true)
  }

  const openEdit = (item: Recipe) => {
    setEditingItem(item)
    setForm({
      name: item.name, description: item.description || '', mealType: item.mealType,
      baseServings: String(item.baseServings), instructions: item.instructions || '',
      ingredients: item.ingredients.map(ri => ({ ingredientId: ri.ingredientId, quantity: String(ri.quantity), unit: ri.unit })),
    })
    setShowDialog(true)
  }

  const addIngredientRow = () => setForm({ ...form, ingredients: [...form.ingredients, { ingredientId: '', quantity: '', unit: 'kg' }] })
  const removeIngredientRow = (idx: number) => setForm({ ...form, ingredients: form.ingredients.filter((_, i) => i !== idx) })
  const updateIngredientRow = (idx: number, field: string, value: string) => {
    const updated = [...form.ingredients]
    updated[idx] = { ...updated[idx], [field]: value }
    if (field === 'ingredientId') {
      const ing = ingredients.find(i => i.id === value)
      if (ing) updated[idx].unit = ing.unit
    }
    setForm({ ...form, ingredients: updated })
  }

  const handleSave = async () => {
    try {
      const body = {
        name: form.name, description: form.description, mealType: form.mealType,
        baseServings: parseInt(form.baseServings) || 100, instructions: form.instructions,
        ingredients: form.ingredients.filter(i => i.ingredientId && i.quantity).map(i => ({ ingredientId: i.ingredientId, quantity: parseFloat(i.quantity), unit: i.unit })),
      }
      if (editingItem) {
        const res = await authFetch(`/api/recipes/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(body) })
        if (!res.ok) throw new Error('Failed to update')
        toast.success('Recipe updated')
      } else {
        const res = await authFetch('/api/recipes', { method: 'POST', body: JSON.stringify(body) })
        if (!res.ok) throw new Error('Failed to create')
        toast.success('Recipe created')
      }
      setShowDialog(false)
      fetchData()
    } catch { toast.error('Failed to save recipe') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/recipes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Recipe deleted')
      setDeleteItem(null)
      fetchData()
    } catch { toast.error('Failed to delete recipe') }
  }

  const calcRecipeCost = (recipe: Recipe) => {
    return recipe.ingredients.reduce((sum, ri) => sum + ri.quantity * ri.ingredient.avgCost, 0)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Recipes</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Recipe</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <Card>
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Meal Type</TableHead>
                  <TableHead className="text-right">Base Servings</TableHead>
                  <TableHead className="text-right">Ingredients</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map(recipe => (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">{recipe.name}</TableCell>
                    <TableCell><Badge variant="secondary">{recipe.mealType}</Badge></TableCell>
                    <TableCell className="text-right">{recipe.baseServings}</TableCell>
                    <TableCell className="text-right">{recipe.ingredients.length}</TableCell>
                    <TableCell className="text-right">{formatCurrency(calcRecipeCost(recipe))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewRecipe(recipe)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(recipe)}><Edit className="h-3.5 w-3.5" /></Button>
                        <AlertDialog open={deleteItem?.id === recipe.id} onOpenChange={(o) => !o && setDeleteItem(null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteItem(recipe)}><X className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete &quot;{recipe.name}&quot;?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(recipe.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {recipes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No recipes found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* View Recipe Dialog */}
      <Dialog open={!!viewRecipe} onOpenChange={() => setViewRecipe(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewRecipe?.name}</DialogTitle>
            <DialogDescription>{viewRecipe?.description}</DialogDescription>
          </DialogHeader>
          {viewRecipe && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge variant="secondary">{viewRecipe.mealType}</Badge>
                <span className="text-sm text-muted-foreground">{viewRecipe.baseServings} servings</span>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Ingredients</h4>
                <Table>
                  <TableHeader><TableRow><TableHead>Ingredient</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewRecipe.ingredients.map(ri => (
                      <TableRow key={ri.id}>
                        <TableCell>{ri.ingredient.name}</TableCell>
                        <TableCell className="text-right">{ri.quantity}</TableCell>
                        <TableCell>{ri.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ri.quantity * ri.ingredient.avgCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-right mt-2 font-bold">Total: {formatCurrency(calcRecipeCost(viewRecipe))}</div>
              </div>
              {viewRecipe.instructions && (
                <div>
                  <h4 className="font-medium mb-1">Instructions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewRecipe.instructions}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Recipe Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Recipe' : 'Add Recipe'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Meal Type</Label>
                <Select value={form.mealType} onValueChange={(v) => setForm({ ...form, mealType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEAL_TYPES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Base Servings</Label><Input type="number" value={form.baseServings} onChange={(e) => setForm({ ...form, baseServings: e.target.value })} /></div>
              <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Instructions</Label><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3} /></div>
            <Separator />
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Ingredients</Label>
                <Button variant="outline" size="sm" onClick={addIngredientRow}><Plus className="h-3 w-3 mr-1" />Add</Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {form.ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_100px_80px_32px] gap-2 items-end">
                    <Select value={ing.ingredientId} onValueChange={(v) => updateIngredientRow(idx, 'ingredientId', v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" placeholder="Qty" value={ing.quantity} onChange={(e) => updateIngredientRow(idx, 'quantity', e.target.value)} />
                    <Input value={ing.unit} onChange={(e) => updateIngredientRow(idx, 'unit', e.target.value)} />
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeIngredientRow(idx)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Daily Entry View ────────────────────────────────────────────────

function DailyEntryView() {
  const [meals, setMeals] = useState<DailyMeal[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), mealType: 'Lunch', mealsServed: '100', recipeId: '', notes: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, rRes] = await Promise.all([
        authFetch(`/api/daily-meals?startDate=${format(startOfMonth(new Date()), 'yyyy-MM-dd')}&endDate=${format(endOfMonth(new Date()), 'yyyy-MM-dd')}`),
        authFetch('/api/recipes'),
      ])
      if (mRes.ok) { const d = await mRes.json(); setMeals(d.data || d) }
      if (rRes.ok) setRecipes(await rRes.json())
    } catch { toast.error('Failed to load daily meals') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async () => {
    try {
      const body = { ...form, mealsServed: parseInt(form.mealsServed) || 0 }
      const res = await authFetch('/api/daily-meals', { method: 'POST', body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      toast.success('Daily meal recorded')
      setShowForm(false)
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), mealType: 'Lunch', mealsServed: '100', recipeId: '', notes: '' })
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record meal')
    }
  }

  const selectedRecipe = recipes.find(r => r.id === form.recipeId)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Daily Meal Entry</h2>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Record Meal</Button>
      </div>

      {/* Quick Entry Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Record Daily Meal</CardTitle>
            <CardDescription>Stock will be automatically deducted based on the recipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Meal Type</Label>
                <Select value={form.mealType} onValueChange={(v) => setForm({ ...form, mealType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEAL_TYPES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Recipe</Label>
                <Select value={form.recipeId} onValueChange={(v) => setForm({ ...form, recipeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select recipe" /></SelectTrigger>
                  <SelectContent>{recipes.filter(r => r.mealType === form.mealType || r.mealType === 'Any').map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Meals Served</Label><Input type="number" value={form.mealsServed} onChange={(e) => setForm({ ...form, mealsServed: e.target.value })} /></div>
            </div>
            <div className="space-y-2 mt-4"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." /></div>
            {selectedRecipe && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium">Recipe: {selectedRecipe.name} ({selectedRecipe.baseServings} base servings)</p>
                <p className="text-muted-foreground">{selectedRecipe.ingredients.length} ingredients — Stock will be deducted proportionally</p>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSubmit}>Record Meal</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <Card>
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Meal Type</TableHead>
                  <TableHead>Recipe</TableHead>
                  <TableHead className="text-right">Meals Served</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meals.map(meal => (
                  <TableRow key={meal.id}>
                    <TableCell>{formatDate(meal.date)}</TableCell>
                    <TableCell><Badge variant="secondary">{meal.mealType}</Badge></TableCell>
                    <TableCell className="font-medium">{meal.recipe?.name || '-'}</TableCell>
                    <TableCell className="text-right">{formatNumber(meal.mealsServed)}</TableCell>
                    <TableCell className="text-muted-foreground">{meal.notes || '-'}</TableCell>
                  </TableRow>
                ))}
                {meals.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No meals recorded this month</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}

// ─── Purchases View ──────────────────────────────────────────────────

function PurchasesView() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [ingredients, setIngredientsList] = useState<Ingredient[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Purchase | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'), supplier: '', supplierId: '', invoiceNo: '', notes: '',
    items: [{ ingredientId: '', quantity: '', unitPrice: '' }] as Array<{ ingredientId: string; quantity: string; unitPrice: string }>,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('startDate', dateFrom)
      if (dateTo) params.set('endDate', dateTo)
      const [pRes, iRes, sRes] = await Promise.all([
        authFetch(`/api/purchases?${params}`),
        authFetch('/api/ingredients'),
        authFetch('/api/suppliers'),
      ])
      if (pRes.ok) { const d = await pRes.json(); setPurchases(d.data || d) }
      if (iRes.ok) setIngredientsList(await iRes.json())
      if (sRes.ok) setSuppliers(await sRes.json())
    } catch { toast.error('Failed to load purchases') }
    finally { setLoading(false) }
  }, [dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setForm({ date: format(new Date(), 'yyyy-MM-dd'), supplier: '', supplierId: '', invoiceNo: '', notes: '', items: [{ ingredientId: '', quantity: '', unitPrice: '' }] })
    setShowDialog(true)
  }

  const addItemRow = () => setForm({ ...form, items: [...form.items, { ingredientId: '', quantity: '', unitPrice: '' }] })
  const removeItemRow = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  const updateItemRow = (idx: number, field: string, value: string) => {
    const updated = [...form.items]
    updated[idx] = { ...updated[idx], [field]: value }
    setForm({ ...form, items: updated })
  }

  const handleSave = async () => {
    try {
      const items = form.items.filter(i => i.ingredientId && i.quantity && i.unitPrice).map(i => ({
        ingredientId: i.ingredientId, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice),
      }))
      if (items.length === 0) { toast.error('Add at least one item'); return }
      const body = { date: form.date, supplier: form.supplier, supplierId: form.supplierId || undefined, invoiceNo: form.invoiceNo, notes: form.notes, items }
      const res = await authFetch('/api/purchases', { method: 'POST', body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to create')
      toast.success('Purchase recorded')
      setShowDialog(false)
      fetchData()
    } catch { toast.error('Failed to record purchase') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/purchases/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Purchase deleted (stock reversed)')
      setDeleteItem(null)
      fetchData()
    } catch { toast.error('Failed to delete purchase') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" /></div>
          <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" /></div>
          {(dateFrom || dateTo) && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}><X className="h-4 w-4" /></Button>}
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Purchase</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <Card>
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell>{p.supplierLink?.name || p.supplier || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.invoiceNo || '-'}</TableCell>
                    <TableCell className="text-right">{p.items?.length || 0}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog open={deleteItem?.id === p.id} onOpenChange={(o) => !o && setDeleteItem(null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteItem(p)}><X className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Purchase?</AlertDialogTitle><AlertDialogDescription>Stock will be reversed for all items.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {purchases.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchases found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Add Purchase Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase</DialogTitle>
            <DialogDescription>Record a new purchase. Stock will be updated automatically.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Supplier</Label>
                <Select value={form.supplierId} onValueChange={(v) => { const s = suppliers.find(s => s.id === v); setForm({ ...form, supplierId: v, supplier: s?.name || '' }) }}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Invoice No</Label><Input value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} /></div>
              <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <Separator />
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Purchase Items</Label>
                <Button variant="outline" size="sm" onClick={addItemRow}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                    <Select value={item.ingredientId} onValueChange={(v) => updateItemRow(idx, 'ingredientId', v)}>
                      <SelectTrigger><SelectValue placeholder="Ingredient..." /></SelectTrigger>
                      <SelectContent>{ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)} />
                    <Input type="number" placeholder="Unit Price" value={item.unitPrice} onChange={(e) => updateItemRow(idx, 'unitPrice', e.target.value)} />
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItemRow(idx)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
              {form.items.length > 0 && (
                <div className="text-right mt-2 text-sm font-medium">
                  Total: {formatCurrency(form.items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Record Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Suppliers View ──────────────────────────────────────────────────

function SuppliersView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<Supplier | null>(null)
  const [deleteItem, setDeleteItem] = useState<Supplier | null>(null)

  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', gstin: '', category: '', notes: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/suppliers')
      if (res.ok) setSuppliers(await res.json())
    } catch { toast.error('Failed to load suppliers') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditingItem(null)
    setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', gstin: '', category: '', notes: '' })
    setShowDialog(true)
  }

  const openEdit = (item: Supplier) => {
    setEditingItem(item)
    setForm({ name: item.name, contactPerson: item.contactPerson || '', phone: item.phone || '', email: item.email || '', address: item.address || '', gstin: item.gstin || '', category: item.category || '', notes: item.notes || '' })
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      if (editingItem) {
        const res = await authFetch(`/api/suppliers/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(form) })
        if (!res.ok) throw new Error('Failed to update')
        toast.success('Supplier updated')
      } else {
        const res = await authFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(form) })
        if (!res.ok) throw new Error('Failed to create')
        toast.success('Supplier created')
      }
      setShowDialog(false)
      fetchData()
    } catch { toast.error('Failed to save supplier') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Supplier deleted')
      setDeleteItem(null)
      fetchData()
    } catch { toast.error('Failed to delete supplier') }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Suppliers</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Supplier</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <Card>
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Ingredients</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contactPerson || '-'}</TableCell>
                    <TableCell>{s.phone || '-'}</TableCell>
                    <TableCell><Badge variant="secondary">{s.category || '-'}</Badge></TableCell>
                    <TableCell className="text-right">{s.ingredientCount}</TableCell>
                    <TableCell className="text-right">{s.purchaseCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.totalPurchaseValue)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit className="h-3.5 w-3.5" /></Button>
                        <AlertDialog open={deleteItem?.id === s.id} onOpenChange={(o) => !o && setDeleteItem(null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteItem(s)}><X className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete &quot;{s.name}&quot;?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {suppliers.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No suppliers found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></div>
              <div className="space-y-2"><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {['Grains', 'Vegetables', 'Meat', 'Dairy', 'Spices', 'Oil', 'Beverages', 'General'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Wastage View ────────────────────────────────────────────────────

function WastageView() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [ingredients, setIngredientsList] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ingredientId: '', quantity: '', unitPrice: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, iRes] = await Promise.all([
        authFetch('/api/stock-movements?type=WASTAGE'),
        authFetch('/api/ingredients'),
      ])
      if (mRes.ok) { const d = await mRes.json(); setMovements(d.data || d) }
      if (iRes.ok) setIngredientsList(await iRes.json())
    } catch { toast.error('Failed to load wastage records') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async () => {
    try {
      const body = { ingredientId: form.ingredientId, type: 'WASTAGE', quantity: parseFloat(form.quantity) || 0, unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined, date: form.date, notes: form.notes }
      const res = await authFetch('/api/stock-movements', { method: 'POST', body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to record')
      toast.success('Wastage recorded')
      setShowForm(false)
      setForm({ ingredientId: '', quantity: '', unitPrice: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
      fetchData()
    } catch { toast.error('Failed to record wastage') }
  }

  const totalWastage = movements.reduce((sum, m) => sum + m.totalAmount, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Wastage Records</h2>
          <p className="text-sm text-muted-foreground">Total wastage value: {formatCurrency(totalWastage)}</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Record Wastage</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Record Wastage</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2"><Label>Ingredient</Label>
                <Select value={form.ingredientId} onValueChange={(v) => setForm({ ...form, ingredientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="space-y-2"><Label>Unit Price (optional)</Label><Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="space-y-2 mt-4"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Reason for wastage..." /></div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSubmit}>Record Wastage</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <Card>
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{formatDate(m.date)}</TableCell>
                    <TableCell className="font-medium">{m.ingredient.name}</TableCell>
                    <TableCell className="text-right">{formatNumber(m.quantity)} {m.ingredient.unit}</TableCell>
                    <TableCell className="text-right text-red-500 font-medium">{formatCurrency(m.totalAmount)}</TableCell>
                    <TableCell className="text-muted-foreground">{m.notes || '-'}</TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No wastage records found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}

// ─── Budget View ─────────────────────────────────────────────────────

function BudgetView() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<Budget | null>(null)
  const [deleteItem, setDeleteItem] = useState<Budget | null>(null)

  const [form, setForm] = useState({ month: format(new Date(), 'yyyy-MM'), foodBudget: '0', operatingBudget: '0', totalBudget: '0', alertThreshold: '80' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [bRes, dRes] = await Promise.all([authFetch('/api/budgets'), authFetch('/api/dashboard')])
      if (bRes.ok) setBudgets(await bRes.json())
      if (dRes.ok) setDashboardData(await dRes.json())
    } catch { toast.error('Failed to load budgets') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditingItem(null)
    setForm({ month: format(new Date(), 'yyyy-MM'), foodBudget: '0', operatingBudget: '0', totalBudget: '0', alertThreshold: '80' })
    setShowDialog(true)
  }

  const openEdit = (item: Budget) => {
    setEditingItem(item)
    setForm({ month: item.month, foodBudget: String(item.foodBudget), operatingBudget: String(item.operatingBudget), totalBudget: String(item.totalBudget), alertThreshold: String(item.alertThreshold) })
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      const body = { month: form.month, foodBudget: parseFloat(form.foodBudget) || 0, operatingBudget: parseFloat(form.operatingBudget) || 0, totalBudget: parseFloat(form.totalBudget) || 0, alertThreshold: parseFloat(form.alertThreshold) || 80 }
      const res = await authFetch('/api/budgets', { method: 'POST', body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(editingItem ? 'Budget updated' : 'Budget created')
      setShowDialog(false)
      fetchData()
    } catch { toast.error('Failed to save budget') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/budgets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Budget deleted')
      setDeleteItem(null)
      fetchData()
    } catch { toast.error('Failed to delete budget') }
  }

  const budgetChartData = budgets.map(b => {
    const monthFoodCost = b.month === dashboardData?.currentBudget?.month ? dashboardData.foodCost.month : 0
    return { month: b.month, food: b.foodBudget, operating: b.operatingBudget, utilized: monthFoodCost }
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Monthly Budgets</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Set Budget</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <>
          <Card>
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Food Budget</TableHead>
                    <TableHead className="text-right">Operating Budget</TableHead>
                    <TableHead className="text-right">Total Budget</TableHead>
                    <TableHead className="text-right">Alert %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map(b => {
                    const isCurrentMonth = b.month === dashboardData?.currentBudget?.month
                    const utilization = isCurrentMonth && dashboardData ? Math.round((dashboardData.foodCost.month / b.foodBudget) * 100) : 0
                    return (
                      <TableRow key={b.id} className={isCurrentMonth ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                        <TableCell className="font-medium">{b.month}{isCurrentMonth && <Badge className="ml-2">Current</Badge>}</TableCell>
                        <TableCell className="text-right">{formatCurrency(b.foodBudget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(b.operatingBudget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(b.totalBudget)}</TableCell>
                        <TableCell className="text-right">
                          <span className={utilization > b.alertThreshold ? 'text-red-500 font-bold' : ''}>{b.alertThreshold}%</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Edit className="h-3.5 w-3.5" /></Button>
                            <AlertDialog open={deleteItem?.id === b.id} onOpenChange={(o) => !o && setDeleteItem(null)}>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteItem(b)}><X className="h-3.5 w-3.5" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete budget for {b.month}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {budgets.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No budgets set</TableCell></TableRow>}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>

          {budgetChartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Budget Utilization</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="food" name="Food Budget" fill="#f59e0b" />
                    <Bar dataKey="operating" name="Operating Budget" fill="#10b981" />
                    <Bar dataKey="utilized" name="Utilized" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Budget' : 'Set Budget'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Month</Label><Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Food Budget (₹)</Label><Input type="number" value={form.foodBudget} onChange={(e) => setForm({ ...form, foodBudget: e.target.value })} /></div>
              <div className="space-y-2"><Label>Operating Budget (₹)</Label><Input type="number" value={form.operatingBudget} onChange={(e) => setForm({ ...form, operatingBudget: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Total Budget (₹)</Label><Input type="number" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} /></div>
              <div className="space-y-2"><Label>Alert Threshold (%)</Label><Input type="number" value={form.alertThreshold} onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingItem ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Expenses View ───────────────────────────────────────────────────

function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [deleteItem, setDeleteItem] = useState<Expense | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), category: 'Gas', amount: '', description: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      const res = await authFetch(`/api/expenses?${params}`)
      if (res.ok) { const d = await res.json(); setExpenses(d.data || d) }
    } catch { toast.error('Failed to load expenses') }
    finally { setLoading(false) }
  }, [categoryFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    try {
      const body = { date: form.date, category: form.category, amount: parseFloat(form.amount) || 0, description: form.description }
      const res = await authFetch('/api/expenses', { method: 'POST', body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to create')
      toast.success('Expense recorded')
      setShowDialog(false)
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), category: 'Gas', amount: '', description: '' })
      fetchData()
    } catch { toast.error('Failed to record expense') }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Expense deleted')
      setDeleteItem(null)
      fetchData()
    } catch { toast.error('Failed to delete expense') }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Monthly expense chart data
  const expenseByMonth = new Map<string, number>()
  expenses.forEach(e => {
    const month = e.date.slice(0, 7)
    expenseByMonth.set(month, (expenseByMonth.get(month) || 0) + e.amount)
  })
  const monthlyChartData = Array.from(expenseByMonth.entries()).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 items-center">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">Total: {formatCurrency(totalExpenses)}</span>
        </div>
        <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{e.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog open={deleteItem?.id === e.id} onOpenChange={(o) => !o && setDeleteItem(null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteItem(e)}><X className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete this expense?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No expenses found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>

        {monthlyChartData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Monthly Expense Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="amount" name="Amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Add Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Reports View ────────────────────────────────────────────────────

function ReportsView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/dashboard')
      if (res.ok) setData(await res.json())
    } catch { toast.error('Failed to load reports') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading || !data) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
  }

  const expensePieData = data.expenses.breakdown.map(b => ({ name: b.category, value: b.amount }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Food Cost (Month)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(data.foodCost.month)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Expenses (Month)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(data.expenses.month)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Operating Cost</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(data.totalOperatingCost)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Cost Per Meal</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(data.costPerMeal)}</div></CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">7-Day Cost Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.costTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => format(parseISO(v), 'dd MMM')} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => format(parseISO(l as string), 'dd MMM yyyy')} />
                <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Expense Breakdown</CardTitle></CardHeader>
          <CardContent>
            {expensePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={expensePieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {expensePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">No expense data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Consuming Ingredients */}
      <Card>
        <CardHeader><CardTitle className="text-base">Category-wise Consumption</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Quantity</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topConsumingIngredients.map((item) => {
                const totalCost = data.topConsumingIngredients.reduce((s, i) => s + i.totalCost, 0)
                const pct = totalCost > 0 ? ((item.totalCost / totalCost) * 100).toFixed(1) : '0'
                return (
                  <TableRow key={item.ingredient.id}>
                    <TableCell className="font-medium">{item.ingredient.name}</TableCell>
                    <TableCell><Badge variant="secondary">{item.ingredient.category}</Badge></TableCell>
                    <TableCell className="text-right">{formatNumber(item.totalQuantity)} {item.ingredient.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalCost)}</TableCell>
                    <TableCell className="text-right">{pct}%</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Settings View ───────────────────────────────────────────────────

function SettingsView() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; createdAt: string }>>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, aRes] = await Promise.all([
        authFetch('/api/users'),
        authFetch('/api/audit-logs?limit=50'),
      ])
      if (uRes.ok) setUsers(await uRes.json())
      if (aRes.ok) { const d = await aRes.json(); setAuditLogs(d.data || d) }
    } catch { /* silently fail */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleBackup = async () => {
    try {
      const res = await authFetch('/api/backup')
      if (!res.ok) throw new Error('Failed to create backup')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rcs-canteen-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup downloaded successfully')
    } catch { toast.error('Failed to create backup') }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Settings</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="backup">Backup & Export</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">User Management</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-40" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                        <TableCell>{formatDate(u.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users found (admin only)</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Audit Log</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-40" /> : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                          <TableCell><Badge variant={log.action === 'DELETE' ? 'destructive' : log.action === 'CREATE' ? 'default' : 'secondary'}>{log.action}</Badge></TableCell>
                          <TableCell className="text-sm">{log.entityType}</TableCell>
                          <TableCell className="text-sm max-w-[300px] truncate">{log.description}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{log.userName || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {auditLogs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit logs found</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Backup & Export</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button onClick={handleBackup}><Download className="h-4 w-4 mr-2" />Download Full Backup</Button>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Database Info</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Current User:</div>
                  <div>{user?.name} ({user?.role})</div>
                  <div className="text-muted-foreground">Database:</div>
                  <div>SQLite</div>
                  <div className="text-muted-foreground">App Version:</div>
                  <div>2.0</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Main App Component ──────────────────────────────────────────────

function CanteenApp() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard')
  const { user, logout, isAuthenticated, isLoading, init } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { init() }, [init])
  useEffect(() => {
    const timeout = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timeout)
  }, [])

  if (!mounted) return null

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) return <LoginView />

  const navItems: Array<{ id: ViewType; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'meals', label: 'Meals', icon: UtensilsCrossed },
    { id: 'daily-entry', label: 'Daily Entry', icon: ClipboardList },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'wastage', label: 'Wastage', icon: Trash2 },
    { id: 'budget', label: 'Budget', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />
      case 'stock': return <StockView />
      case 'meals': return <MealsView />
      case 'daily-entry': return <DailyEntryView />
      case 'purchases': return <PurchasesView />
      case 'suppliers': return <SuppliersView />
      case 'wastage': return <WastageView />
      case 'budget': return <BudgetView />
      case 'expenses': return <ExpensesView />
      case 'reports': return <ReportsView />
      case 'settings': return <SettingsView />
      default: return <DashboardView />
    }
  }

  const viewTitles: Record<ViewType, string> = {
    'dashboard': 'Dashboard',
    'stock': 'Stock Management',
    'meals': 'Recipes & Meals',
    'daily-entry': 'Daily Meal Entry',
    'purchases': 'Purchases',
    'suppliers': 'Suppliers',
    'wastage': 'Wastage Tracking',
    'budget': 'Budget Management',
    'expenses': 'Expenses',
    'reports': 'Reports & Analytics',
    'settings': 'Settings',
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Flame className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">RCS Canteen</span>
                  <span className="truncate text-xs text-muted-foreground">Management System</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(item => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeView === item.id}
                      onClick={() => setActiveView(item.id)}
                      tooltip={item.label}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
                      <User className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name || 'User'}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.email || ''}</span>
                    </div>
                    <ChevronDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-[220px]">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-semibold">{viewTitles[activeView]}</h1>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CircleDot className="h-3 w-3 fill-current animate-pulse" />
                <span className="hidden sm:inline">Live</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle theme</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs text-muted-foreground">{user?.role}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6">
            {renderView()}
          </main>

          {/* Footer */}
          <footer className="border-t px-4 py-3 text-center text-sm text-muted-foreground bg-background">
            RCS Canteen &copy; 2026
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// ─── Default Export ──────────────────────────────────────────────────

export default function Home() {
  return <CanteenApp />
}

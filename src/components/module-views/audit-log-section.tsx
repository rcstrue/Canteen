"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { downloadCSV } from "@/lib/export-utils";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  History,
  Shield,
  Activity,
  Download,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditLogUser {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
}

interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  description: string;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: AuditLogUser | null;
}

interface AuditLogListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface AuditStats {
  counts: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  topUsers: Array<{
    userId: string | null;
    userName: string | null;
    userRole: string | null;
    count: number;
  }>;
  actionDistribution: Array<{ action: string; count: number }>;
  entityDistribution: Array<{ entityType: string; count: number }>;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  "Ingredient",
  "Recipe",
  "Purchase",
  "Supplier",
  "Expense",
  "User",
  "Budget",
  "DailyMeal",
  "StockMovement",
  "Auth",
] as const;

const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "BULK_DELETE",
  "BULK_EXPORT",
  "IMPORT",
  "EXPORT",
  "PRINT",
] as const;

const ACTION_BADGE_CLASS: Record<string, string> = {
  CREATE:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  UPDATE:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  DELETE:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  BULK_DELETE:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  LOGIN:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  LOGOUT:
    "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300 border-stone-200 dark:border-stone-800",
  LOGOUT_: "",
  BULK_EXPORT:
    "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300 border-stone-200 dark:border-stone-800",
  EXPORT:
    "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300 border-stone-200 dark:border-stone-800",
  IMPORT:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  PRINT:
    "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300 border-stone-200 dark:border-stone-800",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  store:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  kitchen:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  staff:
    "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-400 border-stone-200 dark:border-stone-800",
};

function getActionBadgeClass(action: string): string {
  return (
    ACTION_BADGE_CLASS[action] ??
    "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-300 border-stone-200 dark:border-stone-800"
  );
}

function getRoleBadgeClass(role?: string | null): string {
  if (!role) return "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-400 border-stone-200 dark:border-stone-800";
  return (
    ROLE_BADGE_CLASS[role] ??
    "bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-400 border-stone-200 dark:border-stone-800"
  );
}

function getRoleLabel(role?: string | null): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "store":
      return "Store";
    case "kitchen":
      return "Kitchen";
    case "staff":
      return "Staff";
    default:
      return role ?? "Unknown";
  }
}

function safeParseMetadata(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export function AuditLogSection() {
  // Stats
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Logs
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Users for filter dropdown
  const [users, setUsers] = useState<UserOption[]>([]);

  // Filters
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  // Applied filters (only updated when "Apply Filters" is clicked)
  const [appliedFilters, setAppliedFilters] = useState({
    userId: "all",
    entityType: "all",
    action: "all",
    from: "",
    to: "",
  });

  // Detail dialog
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Fetch stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch("/api/audit-logs/stats");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as AuditStats;
      setStats(data);
    } catch (error) {
      console.error("Error fetching audit stats:", error);
      toast.error("Failed to load audit stats", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // ── Fetch users (for filter dropdown) ─────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = (await res.json()) as UserOption[];
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching users for filter:", error);
    }
  }, []);

  // ── Fetch logs ──────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      if (appliedFilters.userId && appliedFilters.userId !== "all") {
        params.set("userId", appliedFilters.userId);
      }
      if (appliedFilters.entityType && appliedFilters.entityType !== "all") {
        params.set("entityType", appliedFilters.entityType);
      }
      if (appliedFilters.action && appliedFilters.action !== "all") {
        params.set("action", appliedFilters.action);
      }
      if (appliedFilters.from) params.set("from", appliedFilters.from);
      if (appliedFilters.to) params.set("to", appliedFilters.to);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      const data = (await res.json()) as AuditLogListResponse;
      setLogs(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load audit logs", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setLogs([]);
      setTotal(0);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [fetchStats, fetchUsers]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleApplyFilters = () => {
    setAppliedFilters({
      userId: filterUserId,
      entityType: filterEntityType,
      action: filterAction,
      from: filterFrom,
      to: filterTo,
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilterUserId("all");
    setFilterEntityType("all");
    setFilterAction("all");
    setFilterFrom("");
    setFilterTo("");
    setAppliedFilters({
      userId: "all",
      entityType: "all",
      action: "all",
      from: "",
      to: "",
    });
    setPage(1);
  };

  const handleExportCSV = () => {
    if (!logs.length) {
      toast.error("Nothing to export", {
        description: "No audit logs match the current filters.",
      });
      return;
    }
    const rows = logs.map((log) => ({
      Timestamp: format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss"),
      User: log.userName ?? log.user?.name ?? "—",
      Role: log.userRole ?? log.user?.role ?? "—",
      Action: log.action,
      "Entity Type": log.entityType,
      "Entity Name": log.entityName ?? "",
      Description: log.description,
      "IP Address": log.ipAddress ?? "",
      "User Agent": log.userAgent ?? "",
    }));
    const today = format(new Date(), "yyyy-MM-dd");
    downloadCSV(`audit-logs-${today}.csv`, rows);
    toast.success("Export complete", {
      description: `${logs.length} audit log(s) exported as CSV.`,
    });
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await fetch(`/api/audit-logs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed (${res.status})`);
      }
      toast.success("Audit log deleted");
      setDetailOpen(false);
      setDetailLog(null);
      await Promise.all([fetchLogs(), fetchStats()]);
    } catch (error) {
      toast.error("Failed to delete audit log", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const openDetail = (log: AuditLog) => {
    setDetailLog(log);
    setDetailOpen(true);
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterUserId !== "all") n++;
    if (filterEntityType !== "all") n++;
    if (filterAction !== "all") n++;
    if (filterFrom) n++;
    if (filterTo) n++;
    return n;
  }, [filterUserId, filterEntityType, filterAction, filterFrom, filterTo]);

  const statsCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "Today's Activities",
        value: stats.counts.today,
        icon: Activity,
        accent: "amber",
      },
      {
        label: "This Week",
        value: stats.counts.week,
        icon: History,
        accent: "orange",
      },
      {
        label: "This Month",
        value: stats.counts.month,
        icon: Shield,
        accent: "emerald",
      },
      {
        label: "All Time",
        value: stats.counts.total,
        icon: Activity,
        accent: "stone",
      },
    ];
  }, [stats]);

  return (
    <Card className="border-amber-200/60 dark:border-amber-800/30 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-amber-500/10">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Audit Log
              </CardTitle>
              <CardDescription>
                Track every create / update / delete action across all modules
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchStats();
                fetchLogs();
              }}
              disabled={isLoadingLogs || isLoadingStats}
              className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
            >
              <RefreshIcon loading={isLoadingLogs || isLoadingStats} />
            </Button>
          </div>
        </CardHeader>
      </div>

      <CardContent className="space-y-6 pt-6">
        {/* ─── Stats Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {isLoadingStats || !stats ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-lg bg-muted/40 animate-pulse"
                />
              ))}
            </>
          ) : (
            statsCards.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-900/10 dark:to-orange-900/10 p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <card.icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums">{card.value}</p>
              </div>
            ))
          )}
        </div>

        {/* ─── Filters Bar ───────────────────────────────────────────────── */}
        <div className="rounded-lg border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-900/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold">Filters</span>
            {activeFilterCount > 0 && (
              <Badge
                variant="outline"
                className="ml-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              >
                {activeFilterCount} active
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* User */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                User
              </label>
              <Select value={filterUserId} onValueChange={setFilterUserId}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({getRoleLabel(u.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Entity Type
              </label>
              <Select value={filterEntityType} onValueChange={setFilterEntityType}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All entity types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entity types</SelectItem>
                  {ENTITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Action
              </label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                From
              </label>
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="h-9 w-full"
              />
            </div>

            {/* To */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                To
              </label>
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="h-9 w-full"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={handleApplyFilters}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Apply Filters
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearFilters}
              disabled={activeFilterCount === 0}
              className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear Filters
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={!logs.length}
              className="ml-auto border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* ─── Audit Log Table ──────────────────────────────────────────── */}
        {isLoadingLogs ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-muted/40 animate-pulse"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          /* ─── Empty State ─── */
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-900/10 dark:to-orange-900/10 p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/30">
              <History className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200">
              No Activities Logged Yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              Activities will appear here as users interact with the system.
              Create, update, or delete records across modules to populate this
              audit log.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-amber-200/50 dark:border-amber-800/30">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50/60 dark:hover:bg-amber-900/10">
                    <TableHead className="w-[160px]">Timestamp</TableHead>
                    <TableHead className="w-[180px]">User</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                    <TableHead className="w-[140px]">Entity Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[130px]">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const displayName =
                      log.userName ?? log.user?.name ?? "Unknown";
                    const displayRole =
                      log.userRole ?? log.user?.role ?? null;
                    return (
                      <TableRow
                        key={log.id}
                        onClick={() => openDetail(log)}
                        className="cursor-pointer hover:bg-amber-50/60 dark:hover:bg-amber-900/10 transition-colors"
                      >
                        <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">
                              {displayName}
                            </span>
                            {displayRole && (
                              <Badge
                                variant="outline"
                                className={`w-fit text-[10px] px-1.5 py-0 ${getRoleBadgeClass(
                                  displayRole
                                )}`}
                              >
                                {getRoleLabel(displayRole)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${getActionBadgeClass(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {log.entityType}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="line-clamp-2 max-w-xl">
                            {log.description}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {log.ipAddress ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* ─── Pagination ──────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(page - 1) * PAGE_SIZE + 1}
                </span>
                –
                <span className="font-medium text-foreground">
                  {Math.min(page * PAGE_SIZE, total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">{total}</span>{" "}
                activities
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!hasPrev}
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </Button>
                <span className="text-sm font-medium tabular-nums px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={!hasNext}
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ─── Detail Dialog ─────────────────────────────────────────────── */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Audit Log Detail
              </DialogTitle>
              <DialogDescription>
                Full metadata for this activity record.
              </DialogDescription>
            </DialogHeader>

            {detailLog && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailField
                    label="Timestamp"
                    value={format(
                      new Date(detailLog.createdAt),
                      "dd/MM/yyyy HH:mm:ss"
                    )}
                    mono
                  />
                  <DetailField
                    label="Action"
                    value={
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold ${getActionBadgeClass(
                          detailLog.action
                        )}`}
                      >
                        {detailLog.action}
                      </Badge>
                    }
                  />
                  <DetailField
                    label="Entity Type"
                    value={detailLog.entityType}
                  />
                  <DetailField
                    label="Entity Name"
                    value={detailLog.entityName ?? "—"}
                  />
                  <DetailField
                    label="User"
                    value={
                      <span className="flex items-center gap-2">
                        <span>{detailLog.userName ?? detailLog.user?.name ?? "—"}</span>
                        {(detailLog.userRole ?? detailLog.user?.role) && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${getRoleBadgeClass(
                              detailLog.userRole ?? detailLog.user?.role
                            )}`}
                          >
                            {getRoleLabel(
                              detailLog.userRole ?? detailLog.user?.role
                            )}
                          </Badge>
                        )}
                      </span>
                    }
                  />
                  <DetailField
                    label="IP Address"
                    value={detailLog.ipAddress ?? "—"}
                    mono
                  />
                </div>

                <DetailField
                  label="Description"
                  value={detailLog.description}
                />

                {detailLog.userAgent && (
                  <DetailField
                    label="User Agent"
                    value={detailLog.userAgent}
                    mono
                    small
                  />
                )}

                {/* Metadata JSON */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Metadata (JSON)
                  </label>
                  <pre className="rounded-lg border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/40 dark:bg-amber-900/10 p-3 text-xs font-mono overflow-x-auto max-h-72">
                    {JSON.stringify(
                      safeParseMetadata(detailLog.metadata),
                      null,
                      2
                    )}
                  </pre>
                </div>

                {/* Delete button */}
                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteLog(detailLog.id)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete Log
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Small sub-components ────────────────────────────────────────────────────

function RefreshIcon({ loading }: { loading: boolean }) {
  return loading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function DetailField({
  label,
  value,
  mono = false,
  small = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div
        className={`rounded-md border border-amber-200/40 dark:border-amber-800/20 bg-amber-50/30 dark:bg-amber-900/5 px-3 py-2 ${
          mono ? "font-mono text-xs" : "text-sm"
        } ${small ? "break-all" : "break-words"}`}
      >
        {value}
      </div>
    </div>
  );
}

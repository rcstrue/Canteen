// ─── Formatting Helpers ─────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyShort(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return formatCurrency(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatNumberDecimal(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function mealTypeLabel(type: string): string {
  const map: Record<string, string> = {
    BREAKFAST: "Breakfast",
    LUNCH: "Lunch",
    DINNER: "Dinner",
    SNACKS: "Snacks",
    TEA: "Tea",
  };
  return map[type] || type;
}

/** Compute percentage change between current and baseline. Returns null if invalid. */
export function pctChange(current: number, baseline: number): number | null {
  if (!baseline || baseline <= 0) return null;
  return ((current - baseline) / baseline) * 100;
}

export function formatDateLong(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

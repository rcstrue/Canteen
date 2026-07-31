"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format, startOfWeek, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { DateRangePreset, DateRangeState } from "./types";

// ─── Date Range Presets & Helpers ───────────────────────────────────────────

export function getDateRangeForPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 0 }), to: now };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

function formatRangeLabel(preset: DateRangePreset, range: DateRange | undefined): string {
  switch (preset) {
    case "today":
      return "Today";
    case "week":
      return "This Week";
    case "month":
      return "This Month";
    case "custom":
      if (range?.from && range?.to) {
        return `${format(range.from, "dd MMM")} – ${format(range.to, "dd MMM")}`;
      }
      return "Custom Range";
    default:
      return "Today";
  }
}

// ─── Date Range Selector ────────────────────────────────────────────────────

interface DateRangeSelectorProps {
  value: DateRangeState;
  onChange: (state: DateRangeState) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false);

  const presets: Array<{ label: string; value: DateRangePreset }> = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
  ];

  return (
    <div className="flex items-center gap-2">
      {presets.map((p) => (
        <Button
          key={p.value}
          variant={value.preset === p.value ? "default" : "outline"}
          size="sm"
          onClick={() => {
            const range = getDateRangeForPreset(p.value);
            onChange({ preset: p.value, range });
          }}
          className={
            value.preset === p.value
              ? "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
              : "border-amber-300/60 bg-white/70 text-amber-900 hover:bg-amber-50 hover:text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/30"
          }
        >
          {p.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={
              value.preset === "custom"
                ? "bg-amber-600 text-white hover:bg-amber-700 border-amber-600 shadow-sm"
                : "border-amber-300/60 bg-white/70 text-amber-900 hover:bg-amber-50 hover:text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/30"
            }
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {formatRangeLabel(value.preset, value.range)}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={value.range}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onChange({ preset: "custom", range });
                setOpen(false);
              } else if (range?.from) {
                onChange({ preset: "custom", range: { from: range.from, to: range.from } });
              }
            }}
            numberOfMonths={2}
            defaultMonth={subDays(new Date(), 7)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

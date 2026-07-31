"use client";

import { Area, AreaChart, Line, LineChart, ResponsiveContainer } from "recharts";

interface SparklineProps {
  /** Array of numeric values — x-axis is implicitly the array index. */
  data: number[];
  /** Stroke / fill color (CSS var or hex). Defaults to `var(--chart-1)`. */
  color?: string;
  /** Pixel height. If omitted, the parent container height is used. */
  height?: number;
  /** Pixel width. If omitted, the parent container width is used. */
  width?: number;
  /** 'line' draws just the stroke; 'area' adds a translucent gradient fill. */
  type?: "line" | "area";
}

/**
 * Sparkline — a tiny chart for inline trend visualization.
 * No axes, no tooltips, no grid — just the line/area.
 *
 * Pass `width` & `height` for a fixed-size sparkline. If both are omitted
 * the chart fills its parent (use inside a sized container).
 */
export function Sparkline({
  data,
  color = "var(--chart-1)",
  height,
  width,
  type = "line",
}: SparklineProps) {
  // Recharts expects an array of objects with a known key.
  const chartData = data.map((v, i) => ({ i, v }));

  // Stable gradient id — multiple sparklines on one page must not collide.
  const gradientId = `sparkline-grad-${type}-${color.replace(/[^a-z0-9]/gi, "")}`;

  const chart =
    type === "area" ? (
      <AreaChart
        data={chartData}
        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={600}
        />
      </AreaChart>
    ) : (
      <LineChart
        data={chartData}
        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
      >
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.75}
          dot={false}
          isAnimationActive={true}
          animationDuration={600}
        />
      </LineChart>
    );

  // Fixed-size mode
  if (width !== undefined && height !== undefined) {
    return (
      <div style={{ width, height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          {chart}
        </ResponsiveContainer>
      </div>
    );
  }

  // Fluid mode — fills parent (parent must have explicit width/height).
  return (
    <div
      style={{ width: width ?? "100%", height: height ?? "100%" }}
      aria-hidden="true"
    >
      <ResponsiveContainer width="100%" height="100%">
        {chart}
      </ResponsiveContainer>
    </div>
  );
}

export default Sparkline;

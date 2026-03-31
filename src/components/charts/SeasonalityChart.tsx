"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getChartColors } from "@/lib/utils/colors";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useDashboardStore } from "@/stores/dashboard-store";
import { TrendingUp } from "lucide-react";
import type { SeasonalityMonth } from "@/types";

// UK health drink defaults shown when no analysis has run
const UK_DEFAULTS: SeasonalityMonth[] = [
  { month: 1,  label: "Jan", index: 1.15, isPeak: false, isTrough: false },
  { month: 2,  label: "Feb", index: 0.82, isPeak: false, isTrough: true  },
  { month: 3,  label: "Mar", index: 0.88, isPeak: false, isTrough: false },
  { month: 4,  label: "Apr", index: 0.95, isPeak: false, isTrough: false },
  { month: 5,  label: "May", index: 1.05, isPeak: false, isTrough: false },
  { month: 6,  label: "Jun", index: 1.12, isPeak: false, isTrough: false },
  { month: 7,  label: "Jul", index: 1.18, isPeak: false, isTrough: false },
  { month: 8,  label: "Aug", index: 1.22, isPeak: true,  isTrough: false },
  { month: 9,  label: "Sep", index: 1.08, isPeak: false, isTrough: false },
  { month: 10, label: "Oct", index: 0.95, isPeak: false, isTrough: false },
  { month: 11, label: "Nov", index: 1.18, isPeak: false, isTrough: false },
  { month: 12, label: "Dec", index: 1.08, isPeak: false, isTrough: false },
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: SeasonalityMonth }>;
  isDark?: boolean;
  colors: ReturnType<typeof getChartColors>;
}

function SeasonalTooltip({ active, payload, colors }: TooltipProps) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const pct = Math.round((d.index - 1) * 100);
  return (
    <div
      className="rounded-lg border p-2.5 shadow-lg text-xs"
      style={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.tooltipText }}
    >
      <p className="font-semibold mb-1">{d.label}</p>
      <p>Index: <span className="font-medium">{d.index.toFixed(2)}</span></p>
      <p className={pct >= 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
        {pct >= 0 ? "+" : ""}{pct}% vs average
      </p>
      {d.isPeak && <p className="text-green-600 dark:text-green-400 font-medium mt-0.5">Peak month</p>}
      {d.isTrough && <p className="text-amber-600 dark:text-amber-400 font-medium mt-0.5">Trough month</p>}
    </div>
  );
}

export function SeasonalityChart() {
  const { runAnalysisResult } = useDashboardStore();
  const selectedMonth = useDashboardStore((s) => s.filters.selectedMonth);
  const isDark = useDarkMode();
  const colors = getChartColors(isDark);
  // Highlight the month the dashboard is currently filtered to (not the server's current month)
  const currentMonth = selectedMonth
    ? parseInt(selectedMonth.split("-")[1], 10)
    : new Date().getMonth() + 1;

  const data = runAnalysisResult?.seasonality ?? UK_DEFAULTS;
  const isLive = runAnalysisResult?.seasonalityComputed === true;

  const getBarColor = (entry: SeasonalityMonth) => {
    if (entry.month === currentMonth) return colors.brand;
    if (entry.isPeak) return colors.actual;
    if (entry.isTrough) return colors.warning;
    return entry.index >= 1.0 ? colors.brandLight : colors.neutral;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Seasonal Demand Pattern
        </CardTitle>
        <CardDescription className="text-xs">
          {isLive
            ? "Computed from your Shopify sales history"
            : "UK health drink market benchmarks — run analysis with Shopify connected for your actual pattern"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: colors.axisTickFill }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0.5, 1.5]}
                tick={{ fontSize: 11, fill: colors.axisTickFill }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v.toFixed(1)}
              />
              <Tooltip content={<SeasonalTooltip isDark={isDark} colors={colors} />} />
              <ReferenceLine y={1.0} stroke={colors.neutral} strokeDasharray="4 2" />
              <Bar dataKey="index" radius={[3, 3, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.month} fill={getBarColor(entry)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colors.actual }} /> Peak
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colors.warning }} /> Trough
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: colors.brand }} /> Current month
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

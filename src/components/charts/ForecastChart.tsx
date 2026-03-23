"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_CHART_DATA } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";
import { getChartColors } from "@/lib/utils/colors";
import {
  getMonthsForTimeRange,
  filterChartDataByTimeRange,
} from "@/lib/utils/filters";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Search } from "lucide-react";

interface ForecastTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  isDark?: boolean;
}

function CustomTooltip({ active, payload, label, isDark }: ForecastTooltipProps) {
  if (!active || !payload) return null;

  const colors = getChartColors(isDark ?? false);
  const baseline = payload.find((p) => p.name === "Baseline")?.value;
  const ambitious = payload.find((p) => p.name === "Ambitious")?.value;
  const actual = payload.find((p) => p.name === "Actual")?.value;
  const accuracy = baseline && actual ? ((actual / baseline) * 100).toFixed(1) : null;
  const gap = baseline && actual ? actual - baseline : null;

  return (
    <div
      className="rounded-lg border p-3 shadow-lg text-sm"
      style={{
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        color: colors.tooltipText,
      }}
    >
      <p className="font-semibold font-heading mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: isDark ? '#94a3b8' : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Baseline:</span>
          <span className="font-medium tabular-nums">{baseline ? formatNumber(baseline) : "\u2014"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: isDark ? '#94a3b8' : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Ambitious:</span>
          <span className="font-medium tabular-nums">{ambitious ? formatNumber(ambitious) : "\u2014"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: isDark ? '#94a3b8' : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Actual:</span>
          <span className="font-medium tabular-nums">{actual ? formatNumber(actual) : "\u2014"}</span>
        </div>
        {accuracy && (
          <div className="flex justify-between gap-4 pt-1 border-t mt-1" style={{ borderColor: colors.tooltipBorder }}>
            <span style={{ color: isDark ? '#94a3b8' : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Accuracy:</span>
            <span className={`font-medium ${Number(accuracy) >= 95 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {accuracy}%
            </span>
          </div>
        )}
        {gap !== null && (
          <div className="flex justify-between gap-4">
            <span style={{ color: isDark ? '#94a3b8' : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Gap:</span>
            <span className={`font-medium ${gap >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {gap >= 0 ? "+" : ""}{formatNumber(gap)} units
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ForecastChart() {
  const { timeRange, selectedMonth } = useDashboardStore((s) => s.filters);
  const isDark = useDarkMode();
  const colors = getChartColors(isDark);

  const data = useMemo(() => {
    const months = getMonthsForTimeRange(selectedMonth, timeRange);
    return filterChartDataByTimeRange(MOCK_CHART_DATA.forecastVsActual, months);
  }, [selectedMonth, timeRange]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Forecast vs Actual — Units by Month</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[350px] text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No data matches your current filters</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters or selecting a different time range</p>
          </div>
        ) : (
        <div className="h-[350px]" role="img" aria-label="Forecast vs Actual line chart showing units by month">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: colors.axisTickFill }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: colors.axisTickFill }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline"
                stroke={colors.brandLight}
                strokeWidth={2}
                dot={{ r: 4, fill: colors.brandLight }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="ambitious"
                name="Ambitious"
                stroke={colors.brand}
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={{ r: 3, fill: colors.brand, strokeDasharray: "0" }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke={colors.actual}
                strokeWidth={2.5}
                dot={{ r: 4, fill: colors.actual }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

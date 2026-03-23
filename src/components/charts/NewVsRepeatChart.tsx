"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  isDark?: boolean;
}

function CustomTooltip({ active, payload, label, isDark }: TooltipProps) {
  if (!active || !payload) return null;
  const colors = getChartColors(isDark ?? false);
  const newC = payload.find((p) => p.name === "New Customers")?.value ?? 0;
  const retC = payload.find((p) => p.name === "Returning Customers")?.value ?? 0;
  const total = newC + retC;

  const returningColor = isDark ? "rgba(96, 165, 250, 0.45)" : "rgba(26, 43, 74, 0.35)";

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
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: colors.brand }}
            />
            New:
          </span>
          <span className="font-medium tabular-nums">{formatNumber(newC)} ({total > 0 ? ((newC/total)*100).toFixed(0) : 0}%)</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: returningColor }}
            />
            Returning:
          </span>
          <span className="font-medium tabular-nums">{formatNumber(retC)} ({total > 0 ? ((retC/total)*100).toFixed(0) : 0}%)</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t" style={{ borderColor: colors.tooltipBorder }}>
          <span style={{ color: isDark ? '#94a3b8' : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Total:</span>
          <span className="font-medium tabular-nums">{formatNumber(total)}</span>
        </div>
      </div>
    </div>
  );
}

export function NewVsRepeatChart() {
  const { customerType, timeRange, selectedMonth } = useDashboardStore((s) => s.filters);
  const isDark = useDarkMode();
  const colors = getChartColors(isDark);

  const returningColor = isDark ? "rgba(96, 165, 250, 0.45)" : "rgba(26, 43, 74, 0.35)";

  const data = useMemo(() => {
    const months = getMonthsForTimeRange(selectedMonth, timeRange);
    const filtered = filterChartDataByTimeRange(MOCK_CHART_DATA.newVsRepeat, months);

    // If customerType is filtered, zero out the other series
    if (customerType === "new") {
      return filtered.map((d) => ({ ...d, returning_customers: 0 }));
    }
    if (customerType === "returning") {
      return filtered.map((d) => ({ ...d, new_customers: 0 }));
    }
    return filtered;
  }, [selectedMonth, timeRange, customerType]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">New vs Returning Customers</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[350px] text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No data matches your current filters</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters or selecting a different time range</p>
          </div>
        ) : (
          <div className="h-[350px]" role="img" aria-label="Area chart showing new vs returning customers over time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: colors.axisTickFill }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: colors.axisTickFill }}
                />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area
                  type="monotone"
                  dataKey="returning_customers"
                  name="Returning Customers"
                  stackId="1"
                  stroke={returningColor}
                  fill={returningColor}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="new_customers"
                  name="New Customers"
                  stackId="1"
                  stroke={colors.brand}
                  fill={colors.brand}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
import { CHART_COLORS } from "@/lib/utils/colors";
import {
  getMonthsForTimeRange,
  filterChartDataByTimeRange,
} from "@/lib/utils/filters";
import { useDashboardStore } from "@/stores/dashboard-store";

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload) return null;
  const newC = payload.find((p) => p.name === "New Customers")?.value ?? 0;
  const retC = payload.find((p) => p.name === "Returning Customers")?.value ?? 0;
  const total = newC + retC;

  return (
    <div className="rounded-lg border bg-card text-card-foreground p-3 shadow-lg text-sm">
      <p className="font-semibold font-heading mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: CHART_COLORS.brand }}
            />
            New:
          </span>
          <span className="font-medium tabular-nums">{formatNumber(newC)} ({total > 0 ? ((newC/total)*100).toFixed(0) : 0}%)</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: "rgba(26, 43, 74, 0.35)" }}
            />
            Returning:
          </span>
          <span className="font-medium tabular-nums">{formatNumber(retC)} ({total > 0 ? ((retC/total)*100).toFixed(0) : 0}%)</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium tabular-nums">{formatNumber(total)}</span>
        </div>
      </div>
    </div>
  );
}

export function NewVsRepeatChart() {
  const { customerType, timeRange, selectedMonth } = useDashboardStore((s) => s.filters);

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
        <div className="h-[350px]" role="img" aria-label="Area chart showing new vs returning customers over time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="returning_customers"
                name="Returning Customers"
                stackId="1"
                stroke="rgba(26, 43, 74, 0.35)"
                fill="rgba(26, 43, 74, 0.35)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="new_customers"
                name="New Customers"
                stackId="1"
                stroke={CHART_COLORS.brand}
                fill={CHART_COLORS.brand}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

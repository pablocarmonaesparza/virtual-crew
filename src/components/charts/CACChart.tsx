"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
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
import { Search } from "lucide-react";

interface CACTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; fill?: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CACTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-lg border bg-card text-card-foreground p-3 shadow-lg text-sm">
      <p className="font-semibold font-heading mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.fill || p.color }} />
              {p.name}:
            </span>
            <span className="font-medium tabular-nums">
              {p.name.includes("CAC") ? `\u00A3${p.value.toFixed(2)}` : formatNumber(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CACChart() {
  const { channel, timeRange, selectedMonth } = useDashboardStore((s) => s.filters);

  const data = useMemo(() => {
    const months = getMonthsForTimeRange(selectedMonth, timeRange);
    // Note: chart data is aggregated "all" channel. Channel filter mainly affects tables.
    // We still filter by time range for charts.
    return filterChartDataByTimeRange(MOCK_CHART_DATA.cacTrend, months);
  }, [selectedMonth, timeRange, channel]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">CAC Trend vs New Customers</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[350px] text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No data matches your current filters</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters or selecting a different time range</p>
          </div>
        ) : (
        <div className="h-[350px]" role="img" aria-label="Dual-axis chart showing CAC trend and new customer count">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{ value: "New Customers", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `\u00A3${v}`}
                label={{ value: "CAC (\u00A3)", angle: 90, position: "insideRight", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar
                yAxisId="left"
                dataKey="new_customers"
                name="New Customers"
                fill={CHART_COLORS.brand}
                opacity={0.7}
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cac"
                name="CAC (\u00A3)"
                stroke="rgba(26, 43, 74, 0.5)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "rgba(26, 43, 74, 0.5)" }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

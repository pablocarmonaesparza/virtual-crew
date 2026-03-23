"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_CHART_DATA } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { getChartColors } from "@/lib/utils/colors";
import {
  getMonthsForTimeRange,
  filterChartDataByTimeRange,
} from "@/lib/utils/filters";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Search } from "lucide-react";

interface AdSpendTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; fill: string }>;
  label?: string;
  isDark?: boolean;
}

function CustomTooltip({ active, payload, label, isDark }: AdSpendTooltipProps) {
  if (!active || !payload) return null;

  const colors = getChartColors(isDark ?? false);

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
        {payload.map((p) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.fill || p.color }} />
              {p.name}:
            </span>
            <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdSpendChart() {
  const { adsPlatform, timeRange, selectedMonth } = useDashboardStore((s) => s.filters);
  const isDark = useDarkMode();
  const colors = getChartColors(isDark);

  const data = useMemo(() => {
    const months = getMonthsForTimeRange(selectedMonth, timeRange);
    return filterChartDataByTimeRange(MOCK_CHART_DATA.adSpend, months);
  }, [selectedMonth, timeRange, adsPlatform]);

  // Determine which bars to show based on platform filter
  const showMeta = adsPlatform === "all" || adsPlatform === "meta";
  const showAmazon = adsPlatform === "all" || adsPlatform === "amazon_ads";

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Ad Spend — Actual vs Budget</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[350px] text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No data matches your current filters</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters or selecting a different time range</p>
          </div>
        ) : (
        <div className="h-[350px]" role="img" aria-label="Ad spend grouped bar chart showing actual vs budget">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: colors.axisTickFill }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: colors.axisTickFill }}
                tickFormatter={(v) => `\u00A3${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {showMeta && (
                <Bar dataKey="meta_actual" name="Meta Actual" fill={colors.brand} radius={[2, 2, 0, 0]} />
              )}
              {showMeta && (
                <Bar dataKey="meta_budget" name="Meta Budget" fill={colors.brand} opacity={0.25} radius={[2, 2, 0, 0]} />
              )}
              {showAmazon && (
                <Bar dataKey="amazon_actual" name="Amazon Actual" fill={colors.brandMedium} radius={[2, 2, 0, 0]} />
              )}
              {showAmazon && (
                <Bar dataKey="amazon_budget" name="Amazon Budget" fill={colors.brandMedium} opacity={0.25} radius={[2, 2, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

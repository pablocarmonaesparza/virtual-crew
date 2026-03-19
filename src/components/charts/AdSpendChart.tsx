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
import { CHART_COLORS } from "@/lib/utils/colors";
import {
  getMonthsForTimeRange,
  filterChartDataByTimeRange,
} from "@/lib/utils/filters";
import { useDashboardStore } from "@/stores/dashboard-store";

interface AdSpendTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; fill: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: AdSpendTooltipProps) {
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
            <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdSpendChart() {
  const { adsPlatform, timeRange, selectedMonth } = useDashboardStore((s) => s.filters);

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
        <div className="h-[350px]" role="img" aria-label="Ad spend grouped bar chart showing actual vs budget">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `\u00A3${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {showMeta && (
                <Bar dataKey="meta_actual" name="Meta Actual" fill={CHART_COLORS.brand} radius={[2, 2, 0, 0]} />
              )}
              {showMeta && (
                <Bar dataKey="meta_budget" name="Meta Budget" fill={CHART_COLORS.brand} opacity={0.25} radius={[2, 2, 0, 0]} />
              )}
              {showAmazon && (
                <Bar dataKey="amazon_actual" name="Amazon Actual" fill={CHART_COLORS.brandMedium} radius={[2, 2, 0, 0]} />
              )}
              {showAmazon && (
                <Bar dataKey="amazon_budget" name="Amazon Budget" fill={CHART_COLORS.brandMedium} opacity={0.25} radius={[2, 2, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

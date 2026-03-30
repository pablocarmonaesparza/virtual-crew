"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/layout/EmptyState";
import { getChartColors } from "@/lib/utils/colors";
import { useDashboardStore } from "@/stores/dashboard-store";
import { SourceBadge } from "@/components/layout/SourceBadge";
import { useDarkMode } from "@/hooks/useDarkMode";

function CustomTooltip({ active, payload, label, isDark }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; isDark: boolean }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={`rounded-lg border px-3 py-2 shadow-md text-xs ${isDark ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-border text-foreground"}`}>
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.name.includes("Purchases") ? entry.value.toLocaleString() : formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function AdSpendChart() {
  const { adsPlatform, timeRange, selectedMonth } = useDashboardStore((s) => s.filters);
  const { metaConnected } = useDashboardStore();
  const isDark = useDarkMode();
  const colors = getChartColors(isDark);

  // TODO: Replace with live chart data query when available
  const data: { month: string; meta_spend: number; amazon_spend: number; total_spend: number }[] = [];

  const showMeta = adsPlatform === "all" || adsPlatform === "meta";
  const showAmazon = adsPlatform === "all" || adsPlatform === "amazon_ads";

  const purchasesColor = isDark ? "#34d399" : "#16a34a";

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">Ad Spend by Platform <SourceBadge source={metaConnected ? "meta" : "mock"} size="sm" /></CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState integration="Meta Ads" metric="ad spend charts" />
        ) : (
        <div className="h-[350px]" role="img" aria-label="Ad spend chart showing spend by platform">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: colors.axisTickFill }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: colors.axisTickFill }}
                tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip isDark={isDark} />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {showMeta && (
                <Bar dataKey="meta_spend" name="Meta Ads" fill={colors.brand} radius={[2, 2, 0, 0]} stackId="spend" />
              )}
              {showAmazon && (
                <Bar dataKey="amazon_spend" name="Amazon Ads" fill={colors.brandMedium} radius={[2, 2, 0, 0]} stackId="spend" />
              )}
              <Line
                dataKey="total_spend"
                name="Total Spend"
                stroke={purchasesColor}
                strokeWidth={2}
                dot={{ r: 3, fill: purchasesColor }}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { EmptyState } from "@/components/layout/EmptyState";
import { getChartColors } from "@/lib/utils/colors";
import { useDashboardStore } from "@/stores/dashboard-store";
import { SourceBadge } from "@/components/layout/SourceBadge";
import { useDarkMode } from "@/hooks/useDarkMode";

type ChartPoint = {
  month: string;
  actual: number | null;
  forecast: number | null;
  confidenceLower: number | null;
  confidenceUpper: number | null;
  ambitious: number | null;
};

interface ForecastTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
  isDark?: boolean;
}

function CustomTooltip({ active, payload, label, isDark }: ForecastTooltipProps) {
  if (!active || !payload) return null;

  const colors = getChartColors(isDark ?? false);
  const actual = payload.find((p) => p.name === "Actual")?.value ?? null;
  const forecast = payload.find((p) => p.name === "Forecast")?.value ?? null;
  const ambitious = payload.find((p) => p.name === "Ambitious")?.value ?? null;
  const lower = payload.find((p) => p.name === "Conf. Lower")?.value ?? null;
  const upper = payload.find((p) => p.name === "Conf. Upper")?.value ?? null;

  // Legacy baseline/ambitious for old data shape
  const baseline = payload.find((p) => p.name === "Baseline")?.value ?? forecast;
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
        {actual != null && (
          <div className="flex justify-between gap-4">
            <span style={{ color: isDark ? "#94a3b8" : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Actual:</span>
            <span className="font-medium tabular-nums">{formatNumber(actual)}</span>
          </div>
        )}
        {forecast != null && (
          <div className="flex justify-between gap-4">
            <span style={{ color: isDark ? "#94a3b8" : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Forecast:</span>
            <span className="font-medium tabular-nums">{formatNumber(forecast)}</span>
          </div>
        )}
        {ambitious != null && (
          <div className="flex justify-between gap-4">
            <span style={{ color: isDark ? "#94a3b8" : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Ambitious:</span>
            <span className="font-medium tabular-nums">{formatNumber(ambitious)}</span>
          </div>
        )}
        {lower != null && upper != null && (
          <div className="flex justify-between gap-4">
            <span style={{ color: isDark ? "#94a3b8" : undefined }} className={isDark ? undefined : "text-muted-foreground"}>95% CI:</span>
            <span className="font-medium tabular-nums text-xs">
              {formatNumber(lower)} – {formatNumber(upper)}
            </span>
          </div>
        )}
        {accuracy && (
          <div className="flex justify-between gap-4 pt-1 border-t mt-1" style={{ borderColor: colors.tooltipBorder }}>
            <span style={{ color: isDark ? "#94a3b8" : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Accuracy:</span>
            <span className={`font-medium ${Number(accuracy) >= 95 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {accuracy}%
            </span>
          </div>
        )}
        {gap !== null && (
          <div className="flex justify-between gap-4">
            <span style={{ color: isDark ? "#94a3b8" : undefined }} className={isDark ? undefined : "text-muted-foreground"}>Gap:</span>
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
  const { shopifyConnected, supabaseConnected, runAnalysisResult } = useDashboardStore();
  const isDark = useDarkMode();
  const colors = getChartColors(isDark);
  const anyLiveSource = shopifyConnected || supabaseConnected || runAnalysisResult?.dataSource === "shopify";

  const data: ChartPoint[] = [];

  if (runAnalysisResult) {
    // Actuals (past months)
    for (const pt of runAnalysisResult.actuals) {
      data.push({
        month: pt.period,
        actual: pt.units,
        forecast: null,
        confidenceLower: null,
        confidenceUpper: null,
        ambitious: null,
      });
    }
    // Forecast (future months)
    for (const pt of runAnalysisResult.forecast) {
      data.push({
        month: pt.period,
        actual: null,
        forecast: pt.baseline,
        confidenceLower: pt.confidenceLower,
        confidenceUpper: pt.confidenceUpper,
        ambitious: pt.ambitious,
      });
    }
  }

  // Sort by period
  data.sort((a, b) => a.month.localeCompare(b.month));

  const confidenceFillColor = isDark
    ? "rgba(96, 165, 250, 0.12)"
    : "rgba(26, 43, 74, 0.08)";

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          Forecast vs Actual — Units by Month{" "}
          <SourceBadge source={anyLiveSource ? "shopify" : "mock"} size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState integration="Shopify" metric="forecast charts" />
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
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

                {/* Confidence band — upper fill */}
                <Area
                  type="monotone"
                  dataKey="confidenceUpper"
                  name="Conf. Upper"
                  stroke="none"
                  fill={confidenceFillColor}
                  fillOpacity={1}
                  activeDot={false}
                  legendType="none"
                  connectNulls={false}
                />
                {/* Confidence band — lower fill (cuts out bottom portion) */}
                <Area
                  type="monotone"
                  dataKey="confidenceLower"
                  name="Conf. Lower"
                  stroke="none"
                  fill={isDark ? "#1e293b" : "#ffffff"}
                  fillOpacity={1}
                  activeDot={false}
                  legendType="none"
                  connectNulls={false}
                />

                {/* Actuals line */}
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

                {/* Forecast line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke={colors.brand}
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={{ r: 3, fill: colors.brand, strokeDasharray: "0" }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />

                {/* Ambitious line */}
                <Line
                  type="monotone"
                  dataKey="ambitious"
                  name="Ambitious"
                  stroke={colors.ambitious}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={false}
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

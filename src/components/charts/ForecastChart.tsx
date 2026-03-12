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
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_CHART_DATA } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

interface ForecastTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: ForecastTooltipProps) {
  if (!active || !payload) return null;

  const baseline = payload.find((p) => p.name === "Baseline")?.value;
  const ambitious = payload.find((p) => p.name === "Ambitious")?.value;
  const actual = payload.find((p) => p.name === "Actual")?.value;
  const accuracy = baseline && actual ? ((actual / baseline) * 100).toFixed(1) : null;
  const gap = baseline && actual ? actual - baseline : null;

  return (
    <div className="rounded-lg border bg-white p-3 shadow-lg text-sm">
      <p className="font-semibold font-heading mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Baseline:</span>
          <span className="font-medium tabular-nums">{baseline ? formatNumber(baseline) : "—"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Ambitious:</span>
          <span className="font-medium tabular-nums">{ambitious ? formatNumber(ambitious) : "—"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Actual:</span>
          <span className="font-medium tabular-nums">{actual ? formatNumber(actual) : "—"}</span>
        </div>
        {accuracy && (
          <div className="flex justify-between gap-4 pt-1 border-t mt-1">
            <span className="text-muted-foreground">Accuracy:</span>
            <span className={`font-medium ${Number(accuracy) >= 95 ? "text-green-600" : "text-red-600"}`}>
              {accuracy}%
            </span>
          </div>
        )}
        {gap !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Gap:</span>
            <span className={`font-medium ${gap >= 0 ? "text-green-600" : "text-red-600"}`}>
              {gap >= 0 ? "+" : ""}{formatNumber(gap)} units
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ForecastChart() {
  const data = MOCK_CHART_DATA.forecastVsActual;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Forecast vs Actual — Units by Month</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] sm:h-[350px]" role="img" aria-label="Forecast vs Actual line chart showing units by month">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fontFamily: "Inter" }}
                stroke="#94a3b8"
              />
              <YAxis
                tick={{ fontSize: 12, fontFamily: "Inter" }}
                stroke="#94a3b8"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, fontFamily: "Inter", paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="baseline"
                name="Baseline"
                stroke="#1a2b4a"
                strokeWidth={2}
                dot={{ r: 4, fill: "#1a2b4a" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="ambitious"
                name="Ambitious"
                stroke="#1a2b4a"
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={{ r: 3, fill: "#1a2b4a", strokeDasharray: "0" }}
                opacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#22c55e" }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

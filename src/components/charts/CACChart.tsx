"use client";

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

interface CACTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; fill?: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CACTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-lg border bg-white p-3 shadow-lg text-sm">
      <p className="font-semibold font-heading mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.fill || p.color }} />
              {p.name}:
            </span>
            <span className="font-medium tabular-nums">
              {p.name.includes("CAC") ? `£${p.value.toFixed(2)}` : formatNumber(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CACChart() {
  const data = MOCK_CHART_DATA.cacTrend;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">CAC Trend vs New Customers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]" role="img" aria-label="Dual-axis chart showing CAC trend and new customer count">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fontFamily: "Inter" }}
                stroke="#94a3b8"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12, fontFamily: "Inter" }}
                stroke="#94a3b8"
                label={{ value: "New Customers", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#94a3b8" } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fontFamily: "Inter" }}
                stroke="#94a3b8"
                tickFormatter={(v) => `£${v}`}
                label={{ value: "CAC (£)", angle: 90, position: "insideRight", style: { fontSize: 11, fill: "#94a3b8" } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Inter", paddingTop: 8 }} />
              <Bar
                yAxisId="left"
                dataKey="new_customers"
                name="New Customers"
                fill="#1a2b4a"
                opacity={0.7}
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cac"
                name="CAC (£)"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#ef4444" }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

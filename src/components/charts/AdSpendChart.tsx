"use client";

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

interface AdSpendTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; fill: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: AdSpendTooltipProps) {
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
            <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdSpendChart() {
  const data = MOCK_CHART_DATA.adSpend;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Ad Spend — Actual vs Budget</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]" role="img" aria-label="Ad spend grouped bar chart showing actual vs budget">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fontFamily: "Inter" }}
                stroke="#94a3b8"
              />
              <YAxis
                tick={{ fontSize: 12, fontFamily: "Inter" }}
                stroke="#94a3b8"
                tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Inter", paddingTop: 8 }} />
              <Bar dataKey="meta_actual" name="Meta Actual" fill="#1a2b4a" radius={[2, 2, 0, 0]} />
              <Bar dataKey="meta_budget" name="Meta Budget" fill="#1a2b4a" opacity={0.3} radius={[2, 2, 0, 0]} />
              <Bar dataKey="amazon_actual" name="Amazon Actual" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              <Bar dataKey="amazon_budget" name="Amazon Budget" fill="#f59e0b" opacity={0.3} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

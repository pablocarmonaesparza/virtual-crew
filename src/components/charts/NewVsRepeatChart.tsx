"use client";

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
    <div className="rounded-lg border bg-white p-3 shadow-lg text-sm">
      <p className="font-semibold font-heading mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-exl-blue" />
            New:
          </span>
          <span className="font-medium tabular-nums">{formatNumber(newC)} ({((newC/total)*100).toFixed(0)}%)</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#ef4444]" />
            Returning:
          </span>
          <span className="font-medium tabular-nums">{formatNumber(retC)} ({((retC/total)*100).toFixed(0)}%)</span>
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
  const data = MOCK_CHART_DATA.newVsRepeat;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">New vs Returning Customers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] sm:h-[350px]" role="img" aria-label="Area chart showing new vs returning customers over time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fontFamily: "Inter" }}
                stroke="#94a3b8"
              />
              <YAxis
                tick={{ fontSize: 12, fontFamily: "Inter" }}
                stroke="#94a3b8"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Inter", paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="returning_customers"
                name="Returning Customers"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="new_customers"
                name="New Customers"
                stackId="1"
                stroke="#1a2b4a"
                fill="#1a2b4a"
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

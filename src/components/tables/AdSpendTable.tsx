"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_AD_SPEND_TABLE } from "@/lib/mock-data";
import { formatCurrency, formatPercent, formatMonth, exportToCSV } from "@/lib/utils";
import { Download } from "lucide-react";

export function AdSpendTable() {
  const data = MOCK_AD_SPEND_TABLE;

  const handleExport = () => {
    exportToCSV(
      data.map((r) => ({
        Month: formatMonth(r.month),
        Platform: r.platform,
        "Spend Actual": r.spend_actual,
        "Spend Budgeted": r.spend_budgeted,
        Variance: r.variance,
        "Variance %": `${r.variance_pct}%`,
        "MoM Trend %": `${r.mom_trend}%`,
      })),
      "ad-spend-vs-budget"
    );
  };

  const uniqueMonths = [...new Set(data.map((d) => d.month))];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Ad Spend vs Budget</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-3 w-3" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm" role="table">
            <thead>
              <tr className="border-b">
                <th className="pb-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</span>
                </th>
                <th className="pb-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actual</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variance</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Var %</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MoM</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const isFirstOfMonth = i === 0 || data[i - 1].month !== row.month;
                return (
                  <tr
                    key={`${row.month}-${row.platform}`}
                    className={`border-b last:border-0 hover:bg-slate-50/30 transition-colors ${
                      isFirstOfMonth && i > 0 ? "border-t-2 border-t-slate-200" : ""
                    }`}
                  >
                    <td className="py-2.5 font-medium">
                      {isFirstOfMonth ? formatMonth(row.month) : ""}
                    </td>
                    <td className="py-2.5">
                      <Badge variant="outline" className="text-xs font-normal">
                        {row.platform}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-medium">
                      {formatCurrency(row.spend_actual)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(row.spend_budgeted)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      <span className={row.variance >= 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(Math.abs(row.variance))}
                        {row.variance >= 0 ? " over" : " under"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={row.variance_pct > 5 ? "text-red-600" : row.variance_pct < -5 ? "text-amber-600" : "text-green-600"}>
                        {formatPercent(row.variance_pct)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {row.mom_trend !== 0 ? (
                        <Badge variant={row.mom_trend > 0 ? "positive" : "negative"}>
                          {row.mom_trend > 0 ? "↑" : "↓"} {Math.abs(row.mom_trend).toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

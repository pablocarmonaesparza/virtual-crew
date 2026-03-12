"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_CAC_TABLE } from "@/lib/mock-data";
import { formatCurrency, formatCurrencyPrecise, formatNumber, formatPercent, formatMonth, exportToCSV } from "@/lib/utils";
import { Download } from "lucide-react";

export function CACTable() {
  const data = MOCK_CAC_TABLE;

  const handleExport = () => {
    exportToCSV(
      data.map((r) => ({
        Month: formatMonth(r.month),
        Channel: r.channel,
        "New Customers": r.new_customers,
        "New CAC": r.new_cac,
        "Returning Customers": r.returning_customers,
        "Returning CAC": r.returning_cac,
        Subscriptions: r.subscription_count,
        "Sub. Revenue": r.subscription_revenue,
        "One-time": r.one_time_count,
        "Total CAC": r.total_cac,
        "CAC MoM %": `${r.cac_mom_change}%`,
      })),
      "cac-analysis"
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Customer Acquisition Cost</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-3 w-3" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b">
                <th className="pb-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</span>
                </th>
                <th className="pb-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channel</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Cust.</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New CAC</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Repeat</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rep CAC</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subs</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sub Rev.</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total CAC</span>
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
                    key={`${row.month}-${row.channel}`}
                    className={`border-b last:border-0 hover:bg-slate-50/30 transition-colors ${
                      isFirstOfMonth && i > 0 ? "border-t-2 border-t-slate-200" : ""
                    }`}
                  >
                    <td className="py-2.5 font-medium">
                      {isFirstOfMonth ? formatMonth(row.month) : ""}
                    </td>
                    <td className="py-2.5">
                      <Badge variant="outline" className="text-xs font-normal">
                        {row.channel}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{formatNumber(row.new_customers)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatCurrencyPrecise(row.new_cac)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatNumber(row.returning_customers)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatCurrencyPrecise(row.returning_cac)}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.subscription_count > 0 ? formatNumber(row.subscription_count) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.subscription_revenue > 0 ? formatCurrency(row.subscription_revenue) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-medium">
                      {formatCurrencyPrecise(row.total_cac)}
                    </td>
                    <td className="py-2.5 text-right">
                      {row.cac_mom_change !== 0 ? (
                        <Badge variant={row.cac_mom_change <= 0 ? "positive" : "negative"}>
                          {row.cac_mom_change <= 0 ? "↓" : "↑"} {Math.abs(row.cac_mom_change).toFixed(1)}%
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

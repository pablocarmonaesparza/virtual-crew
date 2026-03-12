"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_FORECAST_TABLE } from "@/lib/mock-data";
import { formatNumber, formatPercent, formatMonth, exportToCSV } from "@/lib/utils";
import { Download, ArrowUpDown } from "lucide-react";

type SortKey = "month" | "forecast_baseline" | "actual" | "accuracy_pct";

export function ForecastTable() {
  const [sortKey, setSortKey] = useState<SortKey>("month");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const data = [...MOCK_FORECAST_TABLE].sort((a, b) => {
    const aVal = a[sortKey] ?? -Infinity;
    const bVal = b[sortKey] ?? -Infinity;
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleExport = () => {
    exportToCSV(
      data.map((r) => ({
        Month: formatMonth(r.month),
        "Forecast Baseline": r.forecast_baseline,
        "Forecast Ambitious": r.forecast_ambitious,
        Actual: r.actual ?? "—",
        "Accuracy %": r.accuracy_pct ? `${r.accuracy_pct}%` : "—",
        "MTD Performance": r.mtd_performance ? `${r.mtd_performance}%` : "—",
        "Gap Baseline": r.gap_baseline ?? "—",
        "Gap Baseline %": r.gap_baseline_pct ? `${r.gap_baseline_pct}%` : "—",
        "Gap Ambitious": r.gap_ambitious ?? "—",
        "Gap Ambitious %": r.gap_ambitious_pct ? `${r.gap_ambitious_pct}%` : "—",
        "MoM %": r.mom_change ? `${r.mom_change}%` : "—",
      })),
      "forecast-vs-actual"
    );
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Forecast vs Actual</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-3 w-3" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-xs sm:text-sm" role="table">
            <thead>
              <tr className="border-b">
                <th className="pb-3 text-left"><SortHeader label="Month" field="month" /></th>
                <th className="pb-3 text-right"><SortHeader label="Baseline" field="forecast_baseline" /></th>
                <th className="pb-3 text-right px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ambitious</span>
                </th>
                <th className="pb-3 text-right"><SortHeader label="Actual" field="actual" /></th>
                <th className="pb-3 text-right"><SortHeader label="Accuracy" field="accuracy_pct" /></th>
                <th className="pb-3 text-right px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MTD</span>
                </th>
                <th className="pb-3 text-right px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gap Base</span>
                </th>
                <th className="pb-3 text-right px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gap Amb.</span>
                </th>
                <th className="pb-3 text-right px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MoM</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const isCurrent = row.month === "2026-03";
                const isFuture = row.actual === null && !isCurrent;

                return (
                  <tr
                    key={row.month}
                    className={`border-b last:border-0 transition-colors ${
                      isCurrent ? "bg-blue-50/50" : isFuture ? "bg-slate-50/50" : "hover:bg-slate-50/30"
                    }`}
                  >
                    <td className="py-3 font-medium">
                      {formatMonth(row.month)}
                      {isCurrent && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Current
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatNumber(row.forecast_baseline)}
                    </td>
                    <td className="py-3 text-right tabular-nums px-3 text-muted-foreground">
                      {formatNumber(row.forecast_ambitious)}
                    </td>
                    <td className="py-3 text-right tabular-nums font-medium">
                      {row.actual !== null ? formatNumber(row.actual) : "—"}
                    </td>
                    <td className="py-3 text-right">
                      {row.accuracy_pct !== null ? (
                        <Badge
                          variant={
                            row.accuracy_pct >= 95
                              ? "positive"
                              : row.accuracy_pct >= 90
                              ? "warning"
                              : "negative"
                          }
                        >
                          {row.accuracy_pct.toFixed(1)}%
                        </Badge>
                      ) : isCurrent && row.mtd_performance ? (
                        <span className="text-muted-foreground text-xs">in progress</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 text-right px-3 tabular-nums">
                      {row.mtd_performance !== null
                        ? `${row.mtd_performance}%`
                        : "—"}
                    </td>
                    <td className="py-3 text-right px-3">
                      {row.gap_baseline_pct !== null ? (
                        <span
                          className={
                            row.gap_baseline_pct >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {row.gap_baseline_pct >= 0 ? "+" : ""}
                          {row.gap_baseline_pct.toFixed(1)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 text-right px-3">
                      {row.gap_ambitious_pct !== null ? (
                        <span
                          className={
                            row.gap_ambitious_pct >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {row.gap_ambitious_pct >= 0 ? "+" : ""}
                          {row.gap_ambitious_pct.toFixed(1)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 text-right px-3">
                      {row.mom_change !== null ? (
                        <Badge
                          variant={row.mom_change >= 0 ? "positive" : "negative"}
                        >
                          {row.mom_change >= 0 ? "↑" : "↓"}{" "}
                          {Math.abs(row.mom_change).toFixed(1)}%
                        </Badge>
                      ) : (
                        "—"
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

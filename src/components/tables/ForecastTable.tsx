"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_FORECAST_TABLE } from "@/lib/mock-data";
import { formatNumber, formatMonth, exportToCSV } from "@/lib/utils";
import { Download, ArrowUpDown, FileDown, Search } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { SourceBadge } from "@/components/layout/SourceBadge";
import { getMonthsForTimeRange, filterForecastByTimeRange } from "@/lib/utils/filters";
import { exportToPDF } from "@/lib/utils/pdf";
import { useToast } from "@/components/ui/toast";

type SortKey = "month" | "forecast_baseline" | "actual" | "accuracy_pct";

export function ForecastTable() {
  const { filters, shopifyConnected, supabaseConnected } = useDashboardStore();
  const forecastSource = supabaseConnected ? "supabase" : shopifyConnected ? "shopify" : "mock" as const;
  const [sortKey, setSortKey] = useState<SortKey>("month");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();
  const tableRef = useRef<HTMLDivElement>(null);

  // Fetch live forecast data when Shopify is connected
  const { data: liveForecast, isLoading: isLiveLoading } = useQuery({
    queryKey: ["forecast", filters.selectedMonth, filters.timeRange, filters.channel, shopifyConnected, supabaseConnected],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: filters.selectedMonth,
        timeRange: filters.timeRange,
        channel: filters.channel,
      });
      const res = await fetch(`/api/forecast?${params}`);
      if (!res.ok) throw new Error("Failed to fetch forecast data");
      return res.json();
    },
    enabled: shopifyConnected || supabaseConnected,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const mockFilteredData = useMemo(() => {
    const months = getMonthsForTimeRange(filters.selectedMonth, filters.timeRange);
    return filterForecastByTimeRange(MOCK_FORECAST_TABLE, months);
  }, [filters.selectedMonth, filters.timeRange]);

  // Use live data if available, otherwise fall back to mock
  const filteredData = liveForecast?.data ?? mockFilteredData;
  const isLoading = (shopifyConnected || supabaseConnected) && isLiveLoading;

  const data = [...filteredData].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const aVal = (a[sortKey] as number | string | null) ?? -Infinity;
    const bVal = (b[sortKey] as number | string | null) ?? -Infinity;
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
      data.map((r: Record<string, unknown>) => ({
        Month: formatMonth(r.month as string),
        "Forecast Baseline": r.forecast_baseline as number,
        "Forecast Ambitious": r.forecast_ambitious as number,
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
    toast("CSV exported successfully");
  };

  const handlePDFExport = async () => {
    if (!tableRef.current) return;
    try {
      await exportToPDF(tableRef.current, "forecast-vs-actual");
      toast("PDF exported successfully");
    } catch {
      toast("Failed to export PDF", "error");
    }
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
        <CardTitle className="text-lg flex items-center gap-2">Forecast vs Actual <SourceBadge source={forecastSource} size="sm" /></CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePDFExport}>
            <FileDown className="mr-2 h-3 w-3" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-3 w-3" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No data matches your current filters</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters or selecting a different time range</p>
          </div>
        ) : (
          <div ref={tableRef} className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-border/40">
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
                {data.map((row: Record<string, unknown>) => {
                  const month = row.month as string;
                  const forecastBaseline = row.forecast_baseline as number;
                  const forecastAmbitious = row.forecast_ambitious as number;
                  const actual = row.actual as number | null;
                  const accuracyPct = row.accuracy_pct as number | null;
                  const mtdPerformance = row.mtd_performance as number | null;
                  const gapBaselinePct = row.gap_baseline_pct as number | null;
                  const gapAmbitiousPct = row.gap_ambitious_pct as number | null;
                  const momChange = row.mom_change as number | null;

                  const isCurrent = month === "2026-03";
                  const isFuture = actual === null && !isCurrent;

                  return (
                    <tr
                      key={month}
                      className={`border-b border-border/30 last:border-0 transition-colors ${
                        isCurrent ? "bg-primary/5" : isFuture ? "bg-muted/50" : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="py-3 font-medium">
                        {formatMonth(month)}
                        {isCurrent && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            Current
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {formatNumber(forecastBaseline)}
                      </td>
                      <td className="py-3 text-right tabular-nums px-3 text-muted-foreground">
                        {formatNumber(forecastAmbitious)}
                      </td>
                      <td className="py-3 text-right tabular-nums font-medium">
                        {actual !== null ? formatNumber(actual) : "—"}
                      </td>
                      <td className="py-3 text-right">
                        {accuracyPct !== null ? (
                          <Badge
                            variant={
                              accuracyPct >= 95
                                ? "positive"
                                : accuracyPct >= 90
                                ? "warning"
                                : "negative"
                            }
                          >
                            {accuracyPct.toFixed(1)}%
                          </Badge>
                        ) : isCurrent && mtdPerformance ? (
                          <span className="text-muted-foreground text-xs">in progress</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 text-right px-3 tabular-nums">
                        {mtdPerformance !== null
                          ? `${mtdPerformance}%`
                          : "—"}
                      </td>
                      <td className="py-3 text-right px-3">
                        {gapBaselinePct !== null ? (
                          <span
                            className={
                              gapBaselinePct >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {gapBaselinePct >= 0 ? "+" : ""}
                            {gapBaselinePct.toFixed(1)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 text-right px-3">
                        {gapAmbitiousPct !== null ? (
                          <span
                            className={
                              gapAmbitiousPct >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {gapAmbitiousPct >= 0 ? "+" : ""}
                            {gapAmbitiousPct.toFixed(1)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 text-right px-3">
                        {momChange !== null ? (
                          <Badge
                            variant={momChange >= 0 ? "positive" : "negative"}
                          >
                            {momChange >= 0 ? "↑" : "↓"}{" "}
                            {Math.abs(momChange).toFixed(1)}%
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
        )}
      </CardContent>
    </Card>
  );
}

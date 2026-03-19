"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_SKU_TABLE, MOCK_SKUS } from "@/lib/mock-data";
import { formatNumber, formatMonth, exportToCSV } from "@/lib/utils";
import { Download } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { filterSKUByCategory, getMonthsForTimeRange } from "@/lib/utils/filters";
import type { ProductCategory } from "@/types";

export function SKUTable() {
  const { filters, shopifyConnected } = useDashboardStore();
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Fetch live SKU data when Shopify is connected
  const { data: liveSKU, isLoading: isLiveLoading } = useQuery({
    queryKey: [
      "sku",
      filters.selectedMonth,
      filters.timeRange,
      filters.category,
      filters.channel,
      shopifyConnected,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: filters.selectedMonth,
        timeRange: filters.timeRange,
        category: filters.category,
        channel: filters.channel,
      });
      const res = await fetch(`/api/shopify/inventory?${params}`);
      if (!res.ok) throw new Error("Failed to fetch SKU data");
      return res.json();
    },
    enabled: shopifyConnected,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { filteredData: mockData, visibleMonths: mockVisibleMonths } = useMemo(() => {
    // Filter by category
    let filtered = filterSKUByCategory(MOCK_SKU_TABLE, filters.category as ProductCategory);

    // Filter by channel
    if (filters.channel !== "all") {
      const channelMap: Record<string, string[]> = {
        shopify: ["Shopify", "Both"],
        amazon: ["Amazon", "Both"],
      };
      const allowedChannels = channelMap[filters.channel] || [];
      // Cross-reference with MOCK_SKUS via sku_id to get channel_primary
      const skuChannelMap = new Map<string, string>(
        MOCK_SKUS.map((s) => [s.sku_id, s.channel_primary])
      );
      filtered = filtered.filter((row) => {
        const channel = skuChannelMap.get(row.sku_id);
        return channel ? allowedChannels.includes(channel) : true;
      });
    }

    // Compute visible months from the time range filter
    const months = getMonthsForTimeRange(filters.selectedMonth, filters.timeRange);

    return { filteredData: filtered, visibleMonths: months };
  }, [filters.category, filters.channel, filters.selectedMonth, filters.timeRange]);

  // Use live data if available, otherwise mock
  const data = liveSKU?.rows ?? mockData;
  const VISIBLE_MONTHS: string[] = liveSKU?.months ?? mockVisibleMonths;
  const isLoading = shopifyConnected && isLiveLoading;

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters.category, filters.channel, filters.selectedMonth, filters.timeRange]);

  const totalPages = Math.ceil(data.length / pageSize);
  const pagedData = data.slice(page * pageSize, (page + 1) * pageSize);

  const handleExport = () => {
    const rows = data.flatMap((sku: Record<string, unknown>) =>
      VISIBLE_MONTHS.map((m: string) => {
        const months = sku.months as Record<string, Record<string, unknown>> | undefined;
        const monthData = months?.[m];
        return {
          SKU: sku.sku_title as string,
          "Product Type": sku.product_type as string,
          Category: sku.category as string,
          Month: formatMonth(m),
          "Forecast Baseline": monthData?.forecast_baseline ?? "",
          "Forecast Ambitious": monthData?.forecast_ambitious ?? "",
          Actual: monthData?.actual ?? "",
          "Accuracy %": monthData?.accuracy_pct ?? "",
          "MoM %": monthData?.mom_change ?? "",
        };
      })
    );
    exportToCSV(rows, "sku-level-detail");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">SKU Level Detail</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-3 w-3" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="pb-3 text-left sticky left-0 bg-card z-10 min-w-[140px]">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        SKU
                      </span>
                    </th>
                    <th className="pb-3 text-left min-w-[100px]">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Type
                      </span>
                    </th>
                    {VISIBLE_MONTHS.map((m: string) => (
                      <th key={m} colSpan={3} className="pb-3 text-center border-l border-border/30 px-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {formatMonth(m)}
                        </span>
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-border/40">
                    <th className="pb-2 sticky left-0 bg-card z-10" />
                    <th className="pb-2" />
                    {VISIBLE_MONTHS.map((m: string) => (
                      <th key={m} colSpan={3} className="pb-2 border-l border-border/30">
                        <div className="flex text-[10px] text-muted-foreground font-normal">
                          <span className="flex-1 text-center">Base</span>
                          <span className="flex-1 text-center">Act</span>
                          <span className="flex-1 text-center">Acc%</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedData.map((sku: Record<string, unknown>) => {
                    const skuId = sku.sku_id as string;
                    const skuTitle = sku.sku_title as string;
                    const category = sku.category as string;
                    const productType = sku.product_type as string;
                    const months = sku.months as Record<string, Record<string, unknown>> | undefined;

                    return (
                      <tr key={skuId} className="border-b border-border/30 last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 font-medium sticky left-0 bg-card z-10">
                          <div className="text-sm">{skuTitle}</div>
                          <div className="text-[10px] text-muted-foreground">{category}</div>
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground">{productType}</td>
                        {VISIBLE_MONTHS.map((m: string) => {
                          const d = months?.[m];
                          if (!d) return <td key={m} colSpan={3} className="border-l border-border/30" />;

                          const forecastBaseline = d.forecast_baseline as number;
                          const actual = d.actual as number | null;
                          const accuracyPct = d.accuracy_pct as number | null;

                          const isPositive = actual !== null && actual >= forecastBaseline;
                          const bgClass =
                            actual !== null
                              ? isPositive
                                ? "bg-green-50/60"
                                : "bg-red-50/60"
                              : "";
                          return (
                            <td key={m} colSpan={3} className={`border-l border-border/30 ${bgClass}`}>
                              <div className="flex text-xs tabular-nums px-1">
                                <span className="flex-1 text-center">{formatNumber(forecastBaseline)}</span>
                                <span className="flex-1 text-center font-medium">
                                  {actual !== null ? formatNumber(actual) : "—"}
                                </span>
                                <span className="flex-1 text-center">
                                  {accuracyPct !== null ? (
                                    <span
                                      className={
                                        accuracyPct >= 95
                                          ? "text-green-600"
                                          : accuracyPct >= 90
                                          ? "text-yellow-600"
                                          : "text-red-600"
                                      }
                                    >
                                      {accuracyPct.toFixed(0)}%
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} of {data.length} SKUs
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

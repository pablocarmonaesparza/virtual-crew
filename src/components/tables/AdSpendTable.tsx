"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_AD_SPEND_TABLE } from "@/lib/mock-data";
import { formatCurrency, formatPercent, formatMonth, formatNumber, exportToCSV } from "@/lib/utils";
import { Download, Search } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { SourceBadge } from "@/components/layout/SourceBadge";
import { useToast } from "@/components/ui/toast";
import {
  getMonthsForTimeRange,
  filterAdSpendByPlatform,
  filterAdSpendByTimeRange,
} from "@/lib/utils/filters";
import type { AdSpendTableRow } from "@/types";

export function AdSpendTable() {
  const { filters, metaConnected, shopifyConnected, supabaseConnected } = useDashboardStore();
  const { toast } = useToast();

  // Fetch live ad spend data when Meta is connected
  const { data: liveAdSpend } = useQuery<AdSpendTableRow[]>({
    queryKey: ["adspend", filters.selectedMonth, filters.timeRange, filters.adsPlatform, metaConnected, supabaseConnected],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: filters.selectedMonth,
        timeRange: filters.timeRange,
        platform: filters.adsPlatform,
      });
      const res = await fetch(`/api/meta/insights?${params}`);
      if (!res.ok) throw new Error("Failed to fetch Meta ad spend");
      const data = await res.json();
      return data.ad_spend_rows || [];
    },
    enabled: metaConnected,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const data = useMemo(() => {
    // Use live Meta data if available
    if (liveAdSpend && liveAdSpend.length > 0) {
      const months = getMonthsForTimeRange(filters.selectedMonth, filters.timeRange);
      let filtered = filterAdSpendByTimeRange(liveAdSpend, months);
      filtered = filterAdSpendByPlatform(filtered, filters.adsPlatform);
      return filtered;
    }

    // Fallback to mock
    const months = getMonthsForTimeRange(filters.selectedMonth, filters.timeRange);
    let filtered = filterAdSpendByTimeRange(MOCK_AD_SPEND_TABLE, months);
    filtered = filterAdSpendByPlatform(filtered, filters.adsPlatform);
    return filtered;
  }, [filters.selectedMonth, filters.timeRange, filters.adsPlatform, liveAdSpend]);

  const handleExport = () => {
    exportToCSV(
      data.map((r) => ({
        Month: formatMonth(r.month),
        Platform: r.platform,
        Spend: r.spend,
        Impressions: r.impressions,
        Clicks: r.clicks,
        "CTR %": `${r.ctr}%`,
        CPC: r.cpc,
        Purchases: r.purchases,
        ROAS: r.roas,
        "MoM Trend %": `${r.mom_trend}%`,
      })),
      "ad-spend-performance"
    );
    toast("CSV exported successfully");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg flex items-center gap-2">Ad Spend Performance <SourceBadge source={metaConnected ? "meta" : "mock"} size="sm" /></CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-3 w-3" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No data matches your current filters</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Try adjusting your filters or selecting a different time range</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]" role="table">
            <thead>
              <tr className="border-b border-border/40">
                <th className="pb-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</span>
                </th>
                <th className="pb-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spend</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Impressions</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clicks</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CTR</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPC</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purchases</span>
                </th>
                <th className="pb-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ROAS</span>
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
                    className={`border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors ${
                      isFirstOfMonth && i > 0 ? "border-t-2 border-t-border/40" : ""
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
                      {formatCurrency(row.spend)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatNumber(row.impressions)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatNumber(row.clicks)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      <span className={row.ctr >= 1.5 ? "text-green-600" : row.ctr < 1.0 ? "text-red-600" : "text-foreground"}>
                        {row.ctr.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      £{row.cpc.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-medium">
                      {formatNumber(row.purchases)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.roas > 0 ? (
                        <span className={row.roas >= 3.0 ? "text-green-600 font-medium" : row.roas < 2.0 ? "text-red-600" : "text-foreground"}>
                          {row.roas.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
        )}
      </CardContent>
    </Card>
  );
}

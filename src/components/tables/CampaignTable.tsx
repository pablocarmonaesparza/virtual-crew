"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, exportToCSV } from "@/lib/utils";
import { Download, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { SourceBadge } from "@/components/layout/SourceBadge";
import { useToast } from "@/components/ui/toast";
import { useState } from "react";
import type { CampaignPerformanceRow } from "@/types";

export function CampaignTable() {
  const { metaConnected, filters } = useDashboardStore();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: campaigns, isLoading } = useQuery<CampaignPerformanceRow[]>({
    queryKey: ["campaigns", metaConnected, filters.selectedMonth, filters.timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({ level: "campaign" });
      const res = await fetch(`/api/meta/insights?${params}`);
      if (!res.ok) throw new Error("Failed to fetch campaign data");
      const json = await res.json();

      // Transform campaign insights to table rows
      const rows: CampaignPerformanceRow[] = [];
      const totalSpend = (json.data || []).reduce((sum: number, c: { spend: number }) => sum + c.spend, 0);

      for (const c of json.data || []) {
        rows.push({
          campaign_id: c.campaign_id,
          campaign_name: c.campaign_name,
          month: c.month,
          spend: c.spend,
          impressions: c.impressions,
          clicks: c.clicks,
          purchases: c.purchases,
          ctr: c.ctr,
          cpc: c.cpc,
          roas: c.roas,
          spend_share_pct: totalSpend > 0 ? Math.round((c.spend / totalSpend) * 1000) / 10 : 0,
        });
      }

      // Sort by spend descending
      return rows.sort((a, b) => b.spend - a.spend);
    },
    enabled: metaConnected,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  if (!metaConnected) return null;

  const displayData = isExpanded ? (campaigns || []) : (campaigns || []).slice(0, 10);

  const handleExport = () => {
    if (!campaigns || campaigns.length === 0) return;
    exportToCSV(
      campaigns.map((r) => ({
        Campaign: r.campaign_name,
        Month: r.month,
        Spend: r.spend,
        Impressions: r.impressions,
        Clicks: r.clicks,
        CTR: `${r.ctr}%`,
        CPC: r.cpc,
        Purchases: r.purchases,
        ROAS: r.roas,
        "Spend Share": `${r.spend_share_pct}%`,
      })),
      "campaign-performance"
    );
    toast("CSV exported successfully");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          Campaign Performance
          <SourceBadge source="meta" size="sm" />
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!campaigns?.length}>
          <Download className="mr-2 h-3 w-3" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : !campaigns || campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No campaign data available</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]" role="table">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="pb-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign</span>
                    </th>
                    <th className="pb-3 text-right">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spend</span>
                    </th>
                    <th className="pb-3 text-right">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Impr.</span>
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purch.</span>
                    </th>
                    <th className="pb-3 text-right">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Share</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((row) => (
                    <tr
                      key={`${row.campaign_id}-${row.month}`}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5 max-w-[250px]">
                        <p className="text-sm font-medium truncate">{row.campaign_name}</p>
                        <p className="text-[10px] text-muted-foreground/60 font-mono">{row.campaign_id.slice(-8)}</p>
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
                        <span className={row.ctr >= 1.5 ? "text-green-600" : row.ctr < 1.0 ? "text-red-600" : ""}>
                          {row.ctr.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        £{row.cpc.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums font-medium">
                        {formatNumber(row.purchases)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge variant="secondary" className="text-xs">
                          {row.spend_share_pct.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {campaigns.length > 10 && (
              <div className="flex justify-center pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>Show less <ChevronUp className="ml-1 h-3 w-3" /></>
                  ) : (
                    <>Show all {campaigns.length} campaigns <ChevronDown className="ml-1 h-3 w-3" /></>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

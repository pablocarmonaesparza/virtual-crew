"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/EmptyState";
import { useDashboardStore } from "@/stores/dashboard-store";
import { FileDown, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/utils/csv";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils/format";
import type { AdBudgetPlan } from "@/types";
import { useEffect, useState } from "react";

export function BudgetPlanningTable() {
  const { metaConnected, amazonAdsConnected, filters } = useDashboardStore();
  const { toast } = useToast();
  const [budgetRows, setBudgetRows] = useState<AdBudgetPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!metaConnected && !amazonAdsConnected) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/meta/insights?month=${filters.selectedMonth}&timeRange=${filters.timeRange}`
        );
        if (res.ok) {
          const data = await res.json();
          const rows: AdBudgetPlan[] = (data.campaigns || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => ({
              month: filters.selectedMonth,
              platform: "Meta Ads",
              campaign_category: c.campaign_name?.includes("Brand")
                ? "Brand"
                : c.campaign_name?.includes("Retarget")
                  ? "Retargeting"
                  : "Acquisition",
              tier: c.campaign_name?.includes("Premium")
                ? "Premium"
                : c.campaign_name?.includes("Core")
                  ? "Core"
                  : "General",
              planned_budget: 0,
              actual_spend: c.spend || 0,
              variance: null,
              variance_pct: null,
            })
          );
          setBudgetRows(rows);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [metaConnected, amazonAdsConnected, filters.selectedMonth, filters.timeRange]);

  if (!metaConnected && !amazonAdsConnected && !loading) {
    return <EmptyState integration="Meta Ads" metric="ad budget data" />;
  }

  const filtered = budgetRows.filter((r) => {
    if (filters.adsPlatform !== "all") {
      if (filters.adsPlatform === "meta" && r.platform !== "Meta Ads") return false;
      if (filters.adsPlatform === "amazon_ads" && r.platform !== "Amazon Ads") return false;
    }
    if (filters.tier !== "all" && r.tier.toLowerCase() !== filters.tier) return false;
    return true;
  });

  const totalPlanned = filtered.reduce((s, r) => s + r.planned_budget, 0);
  const totalActual = filtered.reduce((s, r) => s + (r.actual_spend || 0), 0);

  const handleExport = () => {
    exportToCSV(
      filtered.map((r) => ({
        Month: r.month,
        Platform: r.platform,
        Category: r.campaign_category,
        Tier: r.tier,
        "Planned Budget": r.planned_budget,
        "Actual Spend": r.actual_spend || 0,
        Variance: r.variance || 0,
        "Variance %": r.variance_pct ? `${r.variance_pct.toFixed(1)}%` : "—",
      })),
      "budget-planning"
    );
    toast("Budget plan exported to CSV", "success");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Budget Planning</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {filtered.length} campaigns
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              Planned: <span className="font-medium text-foreground">{formatCurrency(totalPlanned)}</span>
            </span>
            <span className="text-muted-foreground">
              Actual: <span className="font-medium text-foreground">{formatCurrency(totalActual)}</span>
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport}>
            <FileDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Month</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Platform</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tier</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Planned Budget</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actual Spend</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Variance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No budget data for current filters. Connect Meta Ads or Amazon Ads to see spend data,
                      then enter planned budgets.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const variance = r.actual_spend !== null ? r.actual_spend - r.planned_budget : null;
                    return (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">{r.month}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="text-[10px]">{r.platform}</Badge>
                        </td>
                        <td className="px-4 py-2.5">{r.campaign_category}</td>
                        <td className="px-4 py-2.5">{r.tier}</td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {r.planned_budget > 0 ? formatCurrency(r.planned_budget) : (
                            <span className="text-muted-foreground/50 italic">Set budget</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {r.actual_spend !== null ? formatCurrency(r.actual_spend) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {variance !== null && r.planned_budget > 0 ? (
                            <span className={`flex items-center justify-end gap-1 font-mono ${variance > 0 ? "text-red-500" : "text-emerald-500"}`}>
                              {variance > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {formatCurrency(Math.abs(variance))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

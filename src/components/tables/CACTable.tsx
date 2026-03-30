"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatCurrencyPrecise, formatNumber, formatPercent, formatMonth, exportToCSV } from "@/lib/utils";
import { EmptyState } from "@/components/layout/EmptyState";
import { Download } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { SourceBadge } from "@/components/layout/SourceBadge";
import { useToast } from "@/components/ui/toast";

export function CACTable() {
  const { filters, metaConnected, shopifyConnected } = useDashboardStore();
  const { toast } = useToast();

  // No live fetch for CAC table yet — render empty state
  const handleExport = () => {
    toast("No data to export", "error");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg flex items-center gap-2">Customer Acquisition Cost <SourceBadge source={metaConnected ? "meta" : shopifyConnected ? "shopify" : "mock"} size="sm" /></CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-3 w-3" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        <EmptyState integration="Meta Ads" metric="customer acquisition cost data" />
      </CardContent>
    </Card>
  );
}

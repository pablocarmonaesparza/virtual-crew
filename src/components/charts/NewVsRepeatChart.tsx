"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/EmptyState";
import { useDashboardStore } from "@/stores/dashboard-store";
import { SourceBadge } from "@/components/layout/SourceBadge";

export function NewVsRepeatChart() {
  const { shopifyConnected } = useDashboardStore();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">New vs Returning Customers <SourceBadge source={shopifyConnected ? "shopify" : "mock"} size="sm" /></CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState integration="Shopify" metric="customer retention data" />
      </CardContent>
    </Card>
  );
}

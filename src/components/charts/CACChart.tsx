"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/EmptyState";
import { useDashboardStore } from "@/stores/dashboard-store";
import { SourceBadge } from "@/components/layout/SourceBadge";

export function CACChart() {
  const { metaConnected } = useDashboardStore();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">CAC Trend vs New Customers <SourceBadge source={metaConnected ? "meta" : "mock"} size="sm" /></CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState integration="Meta Ads" metric="CAC trend data" />
      </CardContent>
    </Card>
  );
}

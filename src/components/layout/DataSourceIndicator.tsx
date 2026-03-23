"use client";

import { useDashboardStore } from "@/stores/dashboard-store";
import { Circle } from "lucide-react";

export function DataSourceIndicator() {
  const { dataSource, shopifyConnected, supabaseConnected, metaConnected } = useDashboardStore();

  // Build list of active sources
  const sources: string[] = [];
  if (supabaseConnected) sources.push("Supabase");
  if (shopifyConnected) sources.push("Shopify");
  if (metaConnected) sources.push("Meta Ads");

  // Any live connection
  if (sources.length > 0) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 px-2.5 py-1 text-[11px] font-medium text-green-700 dark:text-green-400 shrink-0">
        <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
        Live &middot; {sources.join(" + ")}
      </div>
    );
  }

  // Fallback: demo mode
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground shrink-0">
      <Circle className="h-1.5 w-1.5 fill-muted-foreground/50 text-muted-foreground/50" />
      Demo Mode
    </div>
  );
}

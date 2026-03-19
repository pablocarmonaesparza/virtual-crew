"use client";

import { useDashboardStore } from "@/stores/dashboard-store";
import { Circle } from "lucide-react";

export function DataSourceIndicator() {
  const { dataSource, shopifyConnected, supabaseConnected } = useDashboardStore();

  // Supabase with real sales data
  if (dataSource === "supabase" && supabaseConnected) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 shrink-0">
        <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
        Live &middot; Supabase
      </div>
    );
  }

  // Shopify direct connection
  if (shopifyConnected && dataSource === "live") {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 shrink-0">
        <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
        Live &middot; Shopify
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

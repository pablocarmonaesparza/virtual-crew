"use client";

import { useDashboardStore } from "@/stores/dashboard-store";
import { usePathname } from "next/navigation";

const TAB_TITLES: Record<string, string> = {
  forecast: "Demand Forecast",
  sku: "SKU Detail",
  "product-bible": "Product Bible",
  ads: "Ad Spend Analysis",
  budget: "Budget Planning",
  cac: "Customer Acquisition Cost",
  recommendations: "AI Recommendations",
};

export function PageTitle() {
  const { activeTab } = useDashboardStore();
  const pathname = usePathname();

  let title = "Dashboard";
  let subtitle = "";

  if (pathname === "/dashboard") {
    title = TAB_TITLES[activeTab] || "Dashboard";
    subtitle = "Dashboard";
  } else if (pathname.startsWith("/dashboard/settings")) {
    title = "Settings";
    subtitle = "Dashboard";
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {subtitle && (
        <>
          <span className="text-muted-foreground">{subtitle}</span>
          <span className="text-muted-foreground/40">/</span>
        </>
      )}
      <span className="font-medium text-foreground">{title}</span>
    </div>
  );
}

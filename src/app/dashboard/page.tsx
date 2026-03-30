"use client";

import { useEffect } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { KPIBar } from "@/components/kpi/KPIBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForecastTable } from "@/components/tables/ForecastTable";
import { SKUTable } from "@/components/tables/SKUTable";
import { AdSpendTable } from "@/components/tables/AdSpendTable";
import { CampaignTable } from "@/components/tables/CampaignTable";
import { CACTable } from "@/components/tables/CACTable";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { AdSpendChart } from "@/components/charts/AdSpendChart";
import { CACChart } from "@/components/charts/CACChart";
import { NewVsRepeatChart } from "@/components/charts/NewVsRepeatChart";
import { RecommendationsPanel } from "@/components/recommendations/RecommendationsPanel";
import { DataSourceIndicator } from "@/components/layout/DataSourceIndicator";
import { SetupBanner } from "@/components/onboarding/SetupBanner";
import { useDashboardStore } from "@/stores/dashboard-store";
import {
  BarChart3,
  Target,
  Users,
  Lightbulb,
  Package,
} from "lucide-react";

export default function DashboardPage() {
  const {
    activeTab, setActiveTab,
    setShopifyConnected, setShopifyStoreName,
    setMetaConnected, setSupabaseConnected,
    setAmazonSpConnected, setAmazonAdsConnected,
  } = useDashboardStore();

  // Check all API connections on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const statusRes = await fetch("/api/status");
        if (statusRes.ok) {
          const status = await statusRes.json();
          if (status.meta_ads?.connected) setMetaConnected(true);
          if (status.supabase?.connected) setSupabaseConnected(true);
          if (status.amazon_sp?.configured) setAmazonSpConnected(true);
          if (status.amazon_ads?.configured) setAmazonAdsConnected(true);
        }
      } catch {
        // API not available — stay in mock mode
      }

      try {
        const res = await fetch("/api/shopify/status");
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setShopifyConnected(true);
            if (data.shop) setShopifyStoreName(data.shop);
          }
        }
      } catch {
        // Shopify not available
      }
    }
    checkStatus();
  }, [setShopifyConnected, setShopifyStoreName, setMetaConnected, setSupabaseConnected, setAmazonSpConnected, setAmazonAdsConnected]);

  return (
    <div className="space-y-5">
      <SetupBanner />
      <KPIBar />
      <div className="flex items-end justify-between gap-3">
        <FilterBar />
        <div className="shrink-0">
          <DataSourceIndicator />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="inline-flex w-full sm:w-auto">
          <TabsTrigger value="forecast" className="gap-1.5">
            <Target className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Forecast</span>
          </TabsTrigger>
          <TabsTrigger value="sku" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">SKU Detail</span>
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ad Spend</span>
          </TabsTrigger>
          <TabsTrigger value="cac" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CAC</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">EXL&apos;s Recommendations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ForecastChart />
            <ForecastTable />
          </div>
        </TabsContent>

        <TabsContent value="sku" className="space-y-6">
          <SKUTable />
        </TabsContent>

        <TabsContent value="ads" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <AdSpendChart />
            <AdSpendTable />
          </div>
          <CampaignTable />
        </TabsContent>

        <TabsContent value="cac" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <NewVsRepeatChart />
            <CACChart />
          </div>
          <CACTable />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <RecommendationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

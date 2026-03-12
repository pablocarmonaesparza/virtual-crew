"use client";

import { FilterBar } from "@/components/filters/FilterBar";
import { KPIBar } from "@/components/kpi/KPIBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForecastTable } from "@/components/tables/ForecastTable";
import { SKUTable } from "@/components/tables/SKUTable";
import { AdSpendTable } from "@/components/tables/AdSpendTable";
import { CACTable } from "@/components/tables/CACTable";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { AdSpendChart } from "@/components/charts/AdSpendChart";
import { CACChart } from "@/components/charts/CACChart";
import { NewVsRepeatChart } from "@/components/charts/NewVsRepeatChart";
import { RecommendationsPanel } from "@/components/recommendations/RecommendationsPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useDashboardStore } from "@/stores/dashboard-store";
import {
  BarChart3,
  Target,
  Users,
  Lightbulb,
  Package,
} from "lucide-react";

export default function DashboardPage() {
  const { activeTab, setActiveTab } = useDashboardStore();

  return (
    <div className="space-y-6">
      <FilterBar />
      <KPIBar />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 gap-1 sm:grid-cols-5 lg:w-auto lg:inline-grid">
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
            <span className="hidden sm:inline">AI Insights</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ForecastChart />
            <ForecastTable />
          </div>
        </TabsContent>

        <TabsContent value="sku" className="space-y-6">
          <SKUTable />
        </TabsContent>

        <TabsContent value="ads" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdSpendChart />
            <AdSpendTable />
          </div>
        </TabsContent>

        <TabsContent value="cac" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NewVsRepeatChart />
            <CACChart />
          </div>
          <CACTable />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <RecommendationsPanel />
        </TabsContent>
      </Tabs>

      <ChatPanel />
    </div>
  );
}

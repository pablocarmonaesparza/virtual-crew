"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MOCK_FORECAST_TABLE,
  MOCK_AD_SPEND_TABLE,
  MOCK_CAC_TABLE,
} from "@/lib/mock-data";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Users,
  BarChart3,
} from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard-store";
import {
  filterForecastByTimeRange,
  filterAdSpendByPlatform,
  filterAdSpendByTimeRange,
  filterCACByChannel,
  filterCACByTimeRange,
} from "@/lib/utils/filters";

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  subtitle?: string;
  isLoading?: boolean;
}

function KPICard({ title, value, change, icon, subtitle, isLoading }: KPICardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <Card className="relative overflow-hidden border-border/30 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl sm:text-2xl font-bold font-heading text-foreground tabular-nums">
                {value}
              </p>
            )}
            {subtitle && !isLoading && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
            {isLoading && <Skeleton className="h-3 w-16 mt-1" />}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ml-2">
            {icon}
          </div>
        </div>
        <div className="mt-2">
          {isLoading ? (
            <Skeleton className="h-5 w-20 rounded-full" />
          ) : (
            <Badge
              variant={isNeutral ? "secondary" : isPositive ? "positive" : "negative"}
              className="text-xs"
            >
              {isPositive ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {formatPercent(change)} MoM
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function KPIBar() {
  const { filters, shopifyConnected, supabaseConnected, metaConnected } = useDashboardStore();

  const anyLiveSource = shopifyConnected || supabaseConnected || metaConnected;

  // Fetch live KPI data when any API is connected
  const { data: liveKPI, isLoading: isLiveLoading } = useQuery({
    queryKey: ["kpi", filters.selectedMonth, filters.adsPlatform, filters.channel, filters.timeRange, shopifyConnected, supabaseConnected, metaConnected],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: filters.selectedMonth,
        platform: filters.adsPlatform,
        channel: filters.channel,
        timeRange: filters.timeRange,
      });
      const res = await fetch(`/api/kpi?${params}`);
      if (!res.ok) throw new Error("Failed to fetch KPI data");
      return res.json();
    },
    enabled: anyLiveSource,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const isLoading = anyLiveSource && isLiveLoading;

  const mockKpiData = useMemo(() => {
    const selectedMonth = filters.selectedMonth;

    // Get the previous month string
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    // --- Revenue from forecast data (using actual values) ---
    const currentForecast = MOCK_FORECAST_TABLE.find((r) => r.month === selectedMonth);
    const prevForecast = MOCK_FORECAST_TABLE.find((r) => r.month === prevMonth);
    const totalRevenue = currentForecast?.actual ?? currentForecast?.forecast_baseline ?? 0;
    const prevRevenue = prevForecast?.actual ?? prevForecast?.forecast_baseline ?? 0;
    const revenueMom = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10 : 0;

    // --- Forecast accuracy (selected month or latest with actual) ---
    const forecastAccuracy = currentForecast?.accuracy_pct ?? currentForecast?.mtd_performance ?? 0;
    const prevAccuracy = prevForecast?.accuracy_pct ?? 0;
    const accuracyMom = prevAccuracy > 0 ? Math.round((forecastAccuracy - prevAccuracy) * 10) / 10 : 0;

    // --- Ad spend (filtered by platform) ---
    const currentAdSpend = filterAdSpendByPlatform(
      MOCK_AD_SPEND_TABLE.filter((r) => r.month === selectedMonth),
      filters.adsPlatform
    );
    const prevAdSpend = filterAdSpendByPlatform(
      MOCK_AD_SPEND_TABLE.filter((r) => r.month === prevMonth),
      filters.adsPlatform
    );
    const totalAdSpend = currentAdSpend.reduce((sum, r) => sum + r.spend_actual, 0);
    const prevTotalAdSpend = prevAdSpend.reduce((sum, r) => sum + r.spend_actual, 0);
    const adSpendMom = prevTotalAdSpend > 0 ? Math.round(((totalAdSpend - prevTotalAdSpend) / prevTotalAdSpend) * 1000) / 10 : 0;

    // --- CAC (filtered by channel) ---
    const currentCAC = filterCACByChannel(
      MOCK_CAC_TABLE.filter((r) => r.month === selectedMonth),
      filters.channel
    );
    const prevCAC = filterCACByChannel(
      MOCK_CAC_TABLE.filter((r) => r.month === prevMonth),
      filters.channel
    );
    const totalCustomers = currentCAC.reduce((sum, r) => sum + r.new_customers + r.returning_customers, 0);
    const weightedCAC = totalCustomers > 0
      ? currentCAC.reduce((sum, r) => sum + r.total_cac * (r.new_customers + r.returning_customers), 0) / totalCustomers
      : 0;
    const prevTotalCustomers = prevCAC.reduce((sum, r) => sum + r.new_customers + r.returning_customers, 0);
    const prevWeightedCAC = prevTotalCustomers > 0
      ? prevCAC.reduce((sum, r) => sum + r.total_cac * (r.new_customers + r.returning_customers), 0) / prevTotalCustomers
      : 0;
    const cacMom = prevWeightedCAC > 0 ? Math.round(((weightedCAC - prevWeightedCAC) / prevWeightedCAC) * 1000) / 10 : 0;

    // --- Gap to baseline / ambitious ---
    const gapBaseline = currentForecast && currentForecast.actual !== null && currentForecast.forecast_baseline > 0
      ? Math.round(((currentForecast.actual - currentForecast.forecast_baseline) / currentForecast.forecast_baseline) * 1000) / 10
      : currentForecast?.gap_baseline_pct ?? 0;
    const gapAmbitious = currentForecast && currentForecast.actual !== null && currentForecast.forecast_ambitious > 0
      ? Math.round(((currentForecast.actual - currentForecast.forecast_ambitious) / currentForecast.forecast_ambitious) * 1000) / 10
      : currentForecast?.gap_ambitious_pct ?? 0;

    // Platform subtitle
    const platformLabel = filters.adsPlatform === "all" ? "Meta + Amazon" : filters.adsPlatform === "meta" ? "Meta Ads" : "Amazon Ads";
    const channelLabel = filters.channel === "all" ? "All channels" : filters.channel === "shopify" ? "Shopify" : "Amazon";

    return {
      totalRevenue,
      revenueMom,
      forecastAccuracy,
      accuracyMom,
      totalAdSpend,
      adSpendMom,
      averageCAC: weightedCAC,
      cacMom,
      gapBaseline,
      gapAmbitious,
      platformLabel,
      channelLabel,
    };
  }, [filters.selectedMonth, filters.adsPlatform, filters.channel]);

  // Use live data if available, otherwise fall back to mock
  const kpiData = liveKPI
    ? {
        totalRevenue: liveKPI.totalRevenue ?? mockKpiData.totalRevenue,
        revenueMom: liveKPI.revenueMom ?? mockKpiData.revenueMom,
        forecastAccuracy: liveKPI.forecastAccuracy ?? mockKpiData.forecastAccuracy,
        accuracyMom: liveKPI.accuracyMom ?? mockKpiData.accuracyMom,
        totalAdSpend: liveKPI.totalAdSpend ?? mockKpiData.totalAdSpend,
        adSpendMom: liveKPI.adSpendMom ?? mockKpiData.adSpendMom,
        averageCAC: liveKPI.averageCAC ?? mockKpiData.averageCAC,
        cacMom: liveKPI.cacMom ?? mockKpiData.cacMom,
        gapBaseline: liveKPI.gapBaseline ?? mockKpiData.gapBaseline,
        gapAmbitious: liveKPI.gapAmbitious ?? mockKpiData.gapAmbitious,
        platformLabel: mockKpiData.platformLabel,
        channelLabel: mockKpiData.channelLabel,
      }
    : mockKpiData;

  return (
    <div
      className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 [&>:last-child]:col-span-2 md:[&>:last-child]:col-span-1 sm:[&>:last-child]:col-span-2 md:[&>:nth-child(4)]:col-span-1 md:[&>:nth-child(5)]:col-span-1"
      role="region"
      aria-label="Key Performance Indicators"
    >
      <KPICard
        title="Total Revenue"
        value={formatCurrency(kpiData.totalRevenue)}
        change={kpiData.revenueMom}
        icon={<DollarSign className="h-4 w-4" />}
        subtitle="Month to date"
        isLoading={isLoading}
      />
      <KPICard
        title="Forecast Accuracy"
        value={`${kpiData.forecastAccuracy.toFixed(1)}%`}
        change={kpiData.accuracyMom}
        icon={<Target className="h-4 w-4" />}
        subtitle="vs. baseline"
        isLoading={isLoading}
      />
      <KPICard
        title="Ad Spend"
        value={formatCurrency(kpiData.totalAdSpend)}
        change={kpiData.adSpendMom}
        icon={<BarChart3 className="h-4 w-4" />}
        subtitle={kpiData.platformLabel}
        isLoading={isLoading}
      />
      <KPICard
        title="Avg. CAC"
        value={`\u00A3${kpiData.averageCAC.toFixed(2)}`}
        change={kpiData.cacMom}
        icon={<Users className="h-4 w-4" />}
        subtitle={kpiData.channelLabel}
        isLoading={isLoading}
      />
      <KPICard
        title="Gap to Baseline"
        value={formatPercent(kpiData.gapBaseline)}
        change={kpiData.gapBaseline}
        icon={
          kpiData.gapBaseline >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )
        }
        subtitle={`Ambitious: ${formatPercent(kpiData.gapAmbitious)}`}
        isLoading={isLoading}
      />
    </div>
  );
}

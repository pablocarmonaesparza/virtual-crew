"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { SourceBadge } from "@/components/layout/SourceBadge";

interface KPICardProps {
  title: string;
  value: string;
  change: number | null; // null = hide MoM badge
  icon: React.ReactNode;
  subtitle?: string;
  isLoading?: boolean;
  sourceTag?: React.ReactNode;
}

function KPICard({ title, value, change, icon, subtitle, isLoading, sourceTag }: KPICardProps) {
  const hasChange = change !== null;
  const isPositive = hasChange && change > 0;
  const isNeutral = hasChange && change === 0;

  return (
    <Card className="relative overflow-hidden border-border/30 shadow-sm h-full">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between flex-1">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl sm:text-2xl font-bold font-heading text-foreground tabular-nums leading-tight">
                {value}
              </p>
            )}
            {subtitle && !isLoading && (
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            )}
            {isLoading && <Skeleton className="h-3 w-16 mt-1" />}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ml-2">
            {icon}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {isLoading ? (
            <Skeleton className="h-5 w-20 rounded-full" />
          ) : hasChange ? (
            <Badge
              variant={isNeutral ? "secondary" : isPositive ? "positive" : "negative"}
              className="text-[10px] shrink-0"
            >
              {isPositive ? (
                <TrendingUp className="mr-0.5 h-2.5 w-2.5" />
              ) : (
                <TrendingDown className="mr-0.5 h-2.5 w-2.5" />
              )}
              {formatPercent(change)} MoM
            </Badge>
          ) : null}
          {sourceTag && !isLoading && <span className="shrink-0">{sourceTag}</span>}
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

  // Platform / channel labels for subtitles
  const platformLabel = filters.adsPlatform === "all" ? "Meta + Amazon" : filters.adsPlatform === "meta" ? "Meta Ads" : "Amazon Ads";
  const channelLabel = filters.channel === "all" ? "All channels" : filters.channel === "shopify" ? "Shopify" : "Amazon";

  // Check actual values — a connected source with 0 data is still "no data"
  const hasRevenue = liveKPI && (liveKPI.totalRevenue ?? 0) > 0;
  const hasAdSpend = liveKPI && (liveKPI.totalAdSpend ?? 0) > 0;
  const hasForecast = liveKPI && (liveKPI.forecastAccuracy ?? 0) > 0;
  const hasGap = liveKPI && liveKPI.gapBaseline != null && (liveKPI.totalRevenue ?? 0) > 0;

  return (
    <div
      className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 [&>:last-child]:col-span-2 sm:[&>:last-child]:col-span-1"
      role="region"
      aria-label="Key Performance Indicators"
    >
      <KPICard
        title="Total Revenue"
        value={hasRevenue ? formatCurrency(liveKPI!.totalRevenue) : "—"}
        change={hasRevenue ? liveKPI!.revenueMom ?? 0 : null}
        icon={<DollarSign className="h-4 w-4" />}
        subtitle={hasRevenue ? "Month to date" : "Connect Shopify"}
        isLoading={isLoading}
        sourceTag={hasRevenue ? <SourceBadge source={shopifyConnected ? "shopify" : "supabase"} /> : undefined}
      />
      <KPICard
        title="Forecast Accuracy"
        value={hasForecast ? `${liveKPI!.forecastAccuracy.toFixed(1)}%` : "—"}
        change={hasForecast ? liveKPI!.accuracyMom ?? 0 : null}
        icon={<Target className="h-4 w-4" />}
        subtitle={hasForecast ? "vs. baseline" : "Connect Shopify"}
        isLoading={isLoading}
        sourceTag={hasForecast ? <SourceBadge source="supabase" /> : undefined}
      />
      <KPICard
        title="Ad Spend"
        value={hasAdSpend ? formatCurrency(liveKPI!.totalAdSpend) : "—"}
        change={hasAdSpend ? liveKPI!.adSpendMom ?? 0 : null}
        icon={<BarChart3 className="h-4 w-4" />}
        subtitle={hasAdSpend ? platformLabel : "Connect Meta Ads"}
        isLoading={isLoading}
        sourceTag={hasAdSpend ? <SourceBadge source="meta" /> : undefined}
      />
      <KPICard
        title="Avg. CAC"
        value={hasAdSpend ? `£${(liveKPI!.averageCAC ?? 0).toFixed(2)}` : "—"}
        change={hasAdSpend ? liveKPI!.cacMom ?? 0 : null}
        icon={<Users className="h-4 w-4" />}
        subtitle={hasAdSpend ? channelLabel : "Connect Meta Ads"}
        isLoading={isLoading}
        sourceTag={hasAdSpend ? <SourceBadge source="meta" /> : undefined}
      />
      <KPICard
        title="Gap to Baseline"
        value={hasGap ? formatPercent(liveKPI!.gapBaseline) : "—"}
        change={hasGap ? liveKPI!.gapBaseline : null}
        icon={
          (liveKPI?.gapBaseline ?? 0) >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )
        }
        subtitle={hasGap ? `Ambitious: ${formatPercent(liveKPI!.gapAmbitious ?? 0)}` : "Connect Shopify"}
        isLoading={isLoading}
        sourceTag={hasGap ? <SourceBadge source="supabase" /> : undefined}
      />
    </div>
  );
}

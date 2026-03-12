"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_KPI_DATA } from "@/lib/mock-data";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Users,
  BarChart3,
} from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  subtitle?: string;
}

function KPICard({ title, value, change, icon, subtitle }: KPICardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold font-heading text-foreground">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-exl-blue/10 text-exl-blue">
            {icon}
          </div>
        </div>
        <div className="mt-2">
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
        </div>
      </CardContent>
    </Card>
  );
}

export function KPIBar() {
  const data = MOCK_KPI_DATA;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5" role="region" aria-label="Key Performance Indicators">
      <KPICard
        title="Total Revenue"
        value={formatCurrency(data.total_revenue)}
        change={data.revenue_mom_change}
        icon={<DollarSign className="h-4 w-4" />}
        subtitle="Month to date"
      />
      <KPICard
        title="Forecast Accuracy"
        value={`${data.forecast_accuracy}%`}
        change={data.accuracy_mom_change}
        icon={<Target className="h-4 w-4" />}
        subtitle="vs. baseline"
      />
      <KPICard
        title="Ad Spend"
        value={formatCurrency(data.total_ad_spend)}
        change={data.ad_spend_mom_change}
        icon={<BarChart3 className="h-4 w-4" />}
        subtitle="Meta + Amazon"
      />
      <KPICard
        title="Avg. CAC"
        value={`£${data.average_cac.toFixed(2)}`}
        change={data.cac_mom_change}
        icon={<Users className="h-4 w-4" />}
        subtitle="All channels"
      />
      <KPICard
        title="Gap to Baseline"
        value={formatPercent(data.gap_to_baseline)}
        change={data.gap_to_baseline}
        icon={
          data.gap_to_baseline >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )
        }
        subtitle={`Ambitious: ${formatPercent(data.gap_to_ambitious)}`}
      />
    </div>
  );
}

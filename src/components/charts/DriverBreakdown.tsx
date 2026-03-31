"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardStore } from "@/stores/dashboard-store";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import type { ForecastDriver } from "@/types";

function DriverRow({ driver }: { driver: ForecastDriver }) {
  // Seasonality always uses Activity icon; Trend/Marketing use direction-aware icons
  const IconComponent =
    driver.label === "Seasonality"
      ? Activity
      : driver.direction === "up"
      ? TrendingUp
      : driver.direction === "down"
      ? TrendingDown
      : Minus;

  const color =
    driver.direction === "up"
      ? "text-green-600 dark:text-green-400"
      : driver.direction === "down"
      ? "text-red-600 dark:text-red-400"
      : "text-muted-foreground";

  const badgeVariant =
    driver.direction === "up"
      ? ("positive" as const)
      : driver.direction === "down"
      ? ("negative" as const)
      : ("secondary" as const);

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2">
        <IconComponent className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-sm text-foreground">{driver.label}</span>
      </div>
      <Badge variant={badgeVariant} className="text-[10px] tabular-nums">
        {driver.pctChange >= 0 ? "+" : ""}{driver.pctChange.toFixed(1)}%
      </Badge>
    </div>
  );
}

// Default drivers shown before analysis runs
const DEFAULT_DRIVERS: ForecastDriver[] = [
  { label: "Trend",       value: 1.0, pctChange: 0, direction: "neutral" },
  { label: "Seasonality", value: 1.0, pctChange: 0, direction: "neutral" },
  { label: "Marketing",   value: 1.0, pctChange: 0, direction: "neutral" },
];

export function DriverBreakdown() {
  const { runAnalysisResult } = useDashboardStore();
  const drivers = runAnalysisResult?.drivers ?? DEFAULT_DRIVERS;
  const isLive = !!runAnalysisResult;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Forecast Drivers</CardTitle>
      </CardHeader>
      <CardContent>
        {!isLive && (
          <p className="text-xs text-muted-foreground mb-3">
            Run Analysis to see what&apos;s driving your forecast
          </p>
        )}
        {drivers.map((driver) => (
          <DriverRow key={driver.label} driver={driver} />
        ))}
        {isLive && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Source:{" "}
            {runAnalysisResult.dataSource === "shopify"
              ? "Shopify actuals (last 13 months)"
              : "UK market benchmarks"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

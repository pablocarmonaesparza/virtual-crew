"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDashboardStore } from "@/stores/dashboard-store";
import { MOCK_AD_SPEND_TABLE, MOCK_FORECAST_TABLE } from "@/lib/mock-data";
import { calculateMarketingUplift } from "@/lib/forecast/engine";
import {
  DollarSign,
  TrendingUp,
  Play,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

function getAdSpendForMonth(month: string) {
  const rows = MOCK_AD_SPEND_TABLE.filter((r) => r.month === month);
  const meta = rows.find((r) => r.platform === "Meta Ads");
  const amazon = rows.find((r) => r.platform === "Amazon Ads");
  return {
    metaBudget: meta?.spend_budgeted ?? 0,
    metaActual: meta?.spend_actual ?? 0,
    amazonBudget: amazon?.spend_budgeted ?? 0,
    amazonActual: amazon?.spend_actual ?? 0,
  };
}

function getBaselineForecastForMonth(month: string) {
  const row = MOCK_FORECAST_TABLE.find((r) => r.month === month);
  return row?.forecast_baseline ?? 0;
}

function getHistoricalAvgAdSpend(): number {
  const historicalMonths = MOCK_AD_SPEND_TABLE.filter((r) => r.month < "2026-03");
  if (historicalMonths.length === 0) return 0;
  const totalSpend = historicalMonths.reduce((sum, r) => sum + r.spend_actual, 0);
  const uniqueMonths = new Set(historicalMonths.map((r) => r.month)).size;
  return uniqueMonths > 0 ? totalSpend / uniqueMonths : 0;
}

export function AdBudgetSimulator() {
  const { filters, setIsRunning, setLatestRecommendation, setActiveTab } = useDashboardStore();
  const selectedMonth = filters.selectedMonth;

  const currentSpend = useMemo(() => getAdSpendForMonth(selectedMonth), [selectedMonth]);
  const baselineForecast = useMemo(() => getBaselineForecastForMonth(selectedMonth), [selectedMonth]);
  const historicalAvg = useMemo(() => getHistoricalAvgAdSpend(), []);

  const [metaBudget, setMetaBudget] = useState(currentSpend.metaBudget);
  const [amazonBudget, setAmazonBudget] = useState(currentSpend.amazonBudget);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasSimulated, setHasSimulated] = useState(false);

  // Reset budgets when month changes
  const [prevMonth, setPrevMonth] = useState(selectedMonth);
  if (selectedMonth !== prevMonth) {
    setPrevMonth(selectedMonth);
    const newSpend = getAdSpendForMonth(selectedMonth);
    setMetaBudget(newSpend.metaBudget);
    setAmazonBudget(newSpend.amazonBudget);
    setHasSimulated(false);
  }

  const totalPlanned = metaBudget + amazonBudget;
  const totalCurrent = currentSpend.metaBudget + currentSpend.amazonBudget;

  const uplift = useMemo(
    () => calculateMarketingUplift(totalPlanned, historicalAvg),
    [totalPlanned, historicalAvg]
  );

  const currentUplift = useMemo(
    () => calculateMarketingUplift(totalCurrent, historicalAvg),
    [totalCurrent, historicalAvg]
  );

  const projectedUnits = Math.round(baselineForecast * (uplift / currentUplift));
  const unitDelta = projectedUnits - baselineForecast;
  const pctChange = baselineForecast > 0 ? ((unitDelta / baselineForecast) * 100).toFixed(1) : "0.0";

  const handleRunSimulation = useCallback(async () => {
    setIsSimulating(true);
    setIsRunning(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            month: selectedMonth,
            trigger: "budget_simulation",
            simulated_budgets: {
              meta: metaBudget,
              amazon: amazonBudget,
              total: totalPlanned,
              projected_units: projectedUnits,
              uplift_factor: uplift,
            },
          },
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setLatestRecommendation(result);
        setActiveTab("recommendations");
        setHasSimulated(true);
      }
    } catch {
      // Fallback handled by API
    } finally {
      setIsSimulating(false);
      setIsRunning(false);
    }
  }, [selectedMonth, metaBudget, amazonBudget, totalPlanned, projectedUnits, uplift, setIsRunning, setLatestRecommendation, setActiveTab]);

  const handleReset = () => {
    setMetaBudget(currentSpend.metaBudget);
    setAmazonBudget(currentSpend.amazonBudget);
    setHasSimulated(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);

  const monthLabel = new Date(selectedMonth + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Ad Budget Simulator
            </CardTitle>
            <CardDescription>
              Adjust ad budgets for {monthLabel} to see projected impact on sales forecast
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {selectedMonth}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Budget Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Meta Ads */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center justify-between">
              <span>Meta Ads Budget</span>
              <span className="text-xs text-muted-foreground">
                Current: {formatCurrency(currentSpend.metaBudget)}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                £
              </span>
              <input
                type="number"
                value={metaBudget}
                onChange={(e) => setMetaBudget(Math.max(0, Number(e.target.value)))}
                className="w-full h-9 rounded-md border border-border bg-background px-3 pl-7 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                min={0}
                step={500}
              />
            </div>
            <input
              type="range"
              value={metaBudget}
              onChange={(e) => setMetaBudget(Number(e.target.value))}
              min={0}
              max={Math.max(currentSpend.metaBudget * 3, 30000)}
              step={250}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted"
            />
          </div>

          {/* Amazon Ads */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center justify-between">
              <span>Amazon Ads Budget</span>
              <span className="text-xs text-muted-foreground">
                Current: {formatCurrency(currentSpend.amazonBudget)}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                £
              </span>
              <input
                type="number"
                value={amazonBudget}
                onChange={(e) => setAmazonBudget(Math.max(0, Number(e.target.value)))}
                className="w-full h-9 rounded-md border border-border bg-background px-3 pl-7 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                min={0}
                step={500}
              />
            </div>
            <input
              type="range"
              value={amazonBudget}
              onChange={(e) => setAmazonBudget(Number(e.target.value))}
              min={0}
              max={Math.max(currentSpend.amazonBudget * 3, 20000)}
              step={250}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted"
            />
          </div>
        </div>

        <Separator />

        {/* Before / After comparison */}
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Projected Impact</h4>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Current Forecast</p>
              <p className="text-lg font-semibold text-foreground">
                {baselineForecast.toLocaleString()} units
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Projected</p>
              <p className="text-lg font-semibold text-foreground">
                {projectedUnits.toLocaleString()} units
              </p>
            </div>
            <Badge
              variant={unitDelta > 0 ? "default" : unitDelta < 0 ? "negative" : "secondary"}
              className="text-xs"
            >
              {unitDelta > 0 ? "+" : ""}
              {unitDelta.toLocaleString()} ({unitDelta > 0 ? "+" : ""}
              {pctChange}%)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Total ad spend: {formatCurrency(totalCurrent)} → {formatCurrency(totalPlanned)}
            {" "}(marketing uplift factor: {uplift.toFixed(3)})
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Simulating…
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Run Simulation
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
          >
            Reset
          </Button>
          {hasSimulated && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">
              Simulation applied to latest recommendation
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

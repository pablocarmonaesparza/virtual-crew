"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Rocket } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";
import { useState } from "react";

const CATEGORIES = [
  { key: "drinks", label: "Drinks" },
  { key: "tea", label: "Tea" },
  { key: "health_products", label: "Health Products" },
] as const;

interface AmbitiousTarget {
  category: string;
  target: number;
}

export function AmbitiousForecastInput() {
  const { filters } = useDashboardStore();
  const [targets, setTargets] = useState<AmbitiousTarget[]>(
    CATEGORIES.map((c) => ({ category: c.key, target: 0 }))
  );

  const updateTarget = (category: string, value: number) => {
    setTargets((prev) =>
      prev.map((t) => (t.category === category ? { ...t, target: value } : t))
    );
  };

  const totalAmbitious = targets.reduce((s, t) => s + t.target, 0);

  const visibleCategories =
    filters.category === "all"
      ? CATEGORIES
      : CATEGORIES.filter((c) => c.key === filters.category);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-medium">Ambitious Forecast</CardTitle>
            <Badge variant="secondary" className="text-[10px]">Category Level</Badge>
          </div>
          {totalAmbitious > 0 && (
            <span className="text-xs text-muted-foreground">
              Total: <span className="font-medium text-foreground">{formatNumber(totalAmbitious)} units</span>
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Enter your optimistic projections per category. These will be compared against the system forecast and actuals.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {visibleCategories.map((cat) => {
            const t = targets.find((t) => t.category === cat.key);
            return (
              <div
                key={cat.key}
                className="flex flex-col gap-1.5 rounded-lg border border-border/30 p-3"
              >
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {cat.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={t?.target || ""}
                    placeholder="Target units"
                    onChange={(e) => updateTarget(cat.key, parseFloat(e.target.value) || 0)}
                    className="flex-1 text-sm font-mono rounded border border-border/40 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/30"
                  />
                  <span className="text-[10px] text-muted-foreground shrink-0">units</span>
                </div>
                {t && t.target > 0 && (
                  <p className="text-[10px] text-amber-500/80">
                    Your target: {formatNumber(t.target)} units for {filters.selectedMonth}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

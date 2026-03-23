"use client";

import { Circle } from "lucide-react";

type DataSource = "meta" | "shopify" | "supabase" | "mock" | "amazon";

interface SourceBadgeProps {
  source: DataSource;
  size?: "sm" | "xs";
}

const SOURCE_CONFIG: Record<DataSource, { label: string; live: boolean }> = {
  meta: { label: "Meta Ads", live: true },
  shopify: { label: "Shopify", live: true },
  supabase: { label: "Supabase", live: true },
  amazon: { label: "Amazon", live: true },
  mock: { label: "Demo", live: false },
};

export function SourceBadge({ source, size = "xs" }: SourceBadgeProps) {
  const config = SOURCE_CONFIG[source];
  const isLive = config.live;

  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-[10px] gap-1"
    : "px-1.5 py-0.5 text-[9px] gap-1";

  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-1 w-1";

  if (isLive) {
    return (
      <span className={`inline-flex items-center rounded-full border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 font-medium text-green-700 dark:text-green-400 ${sizeClasses}`}>
        <Circle className={`${dotSize} fill-green-500 text-green-500`} />
        {config.label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full border border-border bg-muted font-medium text-muted-foreground ${sizeClasses}`}>
      <Circle className={`${dotSize} fill-muted-foreground/40 text-muted-foreground/40`} />
      {config.label}
    </span>
  );
}

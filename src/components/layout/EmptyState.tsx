"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  integration: string; // "Shopify" | "Meta Ads" | "Amazon"
  metric: string; // "revenue data" | "forecast data" | etc.
  compact?: boolean; // for use inside KPI cards
}

export function EmptyState({ integration, metric, compact }: EmptyStateProps) {
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground">
        Connect {integration} to see {metric}
      </p>
    );
  }
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Link2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground mb-1">No data available</p>
        <p className="text-xs text-muted-foreground/70 mb-4">
          Connect {integration} to see {metric}
        </p>
        <Link href="/dashboard/settings">
          <Button variant="outline" size="sm" className="text-xs">
            Connect {integration}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

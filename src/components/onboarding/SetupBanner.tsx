"use client";

import { useState, useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";

const DISMISSED_KEY = "onboarding-dismissed";

export function SetupBanner() {
  const { metaConnected, shopifyConnected } = useDashboardStore();
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored === "true") {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, []);

  // Don't show if all main sources are connected or if dismissed
  if (dismissed || (metaConnected && shopifyConnected)) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const steps = [
    { label: "Meta Ads", connected: metaConnected, description: "Ad spend & campaign data" },
    { label: "Shopify", connected: shopifyConnected, description: "Orders, revenue & SKUs" },
    { label: "Amazon", connected: false, description: "Marketplace sales & ads" },
  ];

  const connectedCount = steps.filter((s) => s.connected).length;

  return (
    <Card className="relative border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.05] overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 text-xs font-semibold text-primary uppercase tracking-wider">
              Setup
            </div>
            <div className="h-4 w-px bg-border shrink-0" />
            <div className="flex items-center gap-4 overflow-x-auto">
              {steps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-1.5 shrink-0">
                  {step.connected ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-xs font-medium ${step.connected ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                  {i < steps.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0 ml-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {connectedCount}/{steps.length} connected
            </span>
            <Link href="/dashboard/settings">
              <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                Settings
              </Button>
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Dismiss setup banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

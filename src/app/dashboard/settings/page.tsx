"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBag,
  Package,
  BarChart3,
  Image,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Circle,
  Database,
  Workflow,
  Globe,
  MapPin,
  Sun,
  Moon,
  Monitor,
  Download,
  FileSpreadsheet,
  Archive,
  ArrowRight,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardStore } from "@/stores/dashboard-store";

interface IntegrationConfig {
  name: string;
  description: string;
  workflow: string;
  schedule: string;
  icon: typeof ShoppingBag;
  tables: string[];
}

const integrations: IntegrationConfig[] = [
  {
    name: "Shopify",
    description: "DTC orders, inventory levels, product catalog, and subscription data",
    workflow: "ADM: Shopify Sync",
    schedule: "Daily at 03:00 UTC",
    icon: ShoppingBag,
    tables: ["shopify_orders", "shopify_inventory"],
  },
  {
    name: "Amazon SP-API",
    description: "Amazon UK marketplace orders, FBA inventory, and fulfilment data",
    workflow: "ADM: Amazon SP-API Sync",
    schedule: "Daily at 03:30 UTC",
    icon: Package,
    tables: ["amazon_orders", "amazon_inventory"],
  },
  {
    name: "Amazon Ads",
    description: "Sponsored Products, Brands & Display campaign performance",
    workflow: "ADM: Amazon Ads Sync",
    schedule: "Daily at 04:00 UTC",
    icon: BarChart3,
    tables: ["amazon_ads"],
  },
  {
    name: "Meta Ads",
    description: "Facebook & Instagram campaign impressions, spend, and conversions",
    workflow: "ADM: Meta Ads Sync",
    schedule: "Daily at 04:00 UTC",
    icon: Image,
    tables: ["meta_ads"],
  },
];

const envItems = [
  { label: "Database", value: "Supabase (PostgreSQL)", status: "connected" as const, icon: Database },
  { label: "Automation", value: "N8N — 4 workflows created", status: "warning" as const, icon: Workflow },
  { label: "LLM", value: "Claude Sonnet 4.6", status: "connected" as const, icon: Globe },
  { label: "Region", value: "EU West 2 (London)", status: "neutral" as const, icon: MapPin },
];

function StatusBadge({ status }: { status: "connected" | "not_connected" | "warning" | "neutral" }) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="positive" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Connected
        </Badge>
      );
    case "not_connected":
      return (
        <Badge variant="secondary" className="gap-1 text-muted-foreground">
          <Circle className="h-3 w-3" />
          Not Connected
        </Badge>
      );
    case "warning":
      return (
        <Badge variant="warning" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Inactive
        </Badge>
      );
    default:
      return null;
  }
}

function ShopifyIntegrationCard({ integration }: { integration: IntegrationConfig }) {
  const { shopifyConnected, shopifyStoreName } = useDashboardStore();

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
              <integration.icon className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">{integration.name}</h4>
              <p className="text-[11px] text-muted-foreground/70">{integration.schedule}</p>
            </div>
          </div>
          {shopifyConnected ? (
            <Badge variant="positive" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <a href="/api/auth/shopify">
              <Button variant="default" size="sm" className="h-7 text-xs gap-1">
                Connect
                <ArrowRight className="h-3 w-3" />
              </Button>
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-1">{integration.description}</p>
        {shopifyConnected && shopifyStoreName && (
          <p className="text-xs text-green-700 font-medium mb-2">{shopifyStoreName}</p>
        )}
        {!shopifyConnected && <div className="mb-2" />}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {integration.tables.map((t) => (
              <span key={t} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2 shrink-0"
            disabled={!shopifyConnected}
          >
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OtherIntegrationCard({ integration }: { integration: IntegrationConfig }) {
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
              <integration.icon className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">{integration.name}</h4>
              <p className="text-[11px] text-muted-foreground/70">{integration.schedule}</p>
            </div>
          </div>
          <StatusBadge status="not_connected" />
        </div>
        <p className="text-xs text-muted-foreground mb-3">{integration.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {integration.tables.map((t) => (
              <span key={t} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 shrink-0" disabled>
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const {
    theme,
    toggleTheme,
    shopifyConnected,
    setShopifyConnected,
    setShopifyStoreName,
  } = useDashboardStore();

  const searchParams = useSearchParams();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Check Shopify connection status on mount
  useEffect(() => {
    async function checkShopifyStatus() {
      try {
        const res = await fetch("/api/shopify/status");
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setShopifyConnected(true);
            if (data.shop) {
              setShopifyStoreName(data.shop);
            }
          }
        }
      } catch {
        // API not available yet — leave as mock
      }
    }
    checkShopifyStatus();
  }, [setShopifyConnected, setShopifyStoreName]);

  // Show success banner when redirected back from Shopify OAuth
  useEffect(() => {
    if (searchParams.get("shopify") === "connected") {
      setShowSuccessBanner(true);
      setShopifyConnected(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => setShowSuccessBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setShopifyConnected]);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage data integrations, appearance, and configure your environment
        </p>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {showSuccessBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between rounded-lg border border-green-200/50 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="font-medium">Shopify connected successfully.</span>
              <span className="text-green-700">Your store data will begin syncing shortly.</span>
            </div>
            <button
              onClick={() => setShowSuccessBanner(false)}
              className="shrink-0 rounded-md p-1 hover:bg-green-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Appearance */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Appearance
        </h3>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Monitor className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground">
                    Switch between light and dark mode
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border/30 p-1">
                <button
                  onClick={() => { if (theme === "dark") toggleTheme(); }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    theme === "light"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Light
                </button>
                <button
                  onClick={() => { if (theme === "light") toggleTheme(); }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    theme === "dark"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Dark
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Data Integrations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Data Integrations
          </h3>
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
            <ExternalLink className="mr-1.5 h-3 w-3" />
            Open N8N
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration, i) => (
            <motion.div
              key={integration.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: 0.05 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {integration.name === "Shopify" ? (
                <ShopifyIntegrationCard integration={integration} />
              ) : (
                <OtherIntegrationCard integration={integration} />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Data & Export */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Data & Export
        </h3>
        <Card>
          <CardContent className="p-0 divide-y divide-border/30">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground/60" />
                <div>
                  <p className="text-sm font-medium text-foreground">Export Dashboard Data</p>
                  <p className="text-xs text-muted-foreground">Download forecast, ad spend, and CAC data as CSV</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Download className="mr-1.5 h-3 w-3" />
                Export CSV
              </Button>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Archive className="h-4 w-4 text-muted-foreground/60" />
                <div>
                  <p className="text-sm font-medium text-foreground">Data Retention</p>
                  <p className="text-xs text-muted-foreground">Historical data is retained for 24 months</p>
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground">24 months</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Environment */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          Environment
        </h3>
        <Card>
          <CardContent className="p-0 divide-y divide-border/30">
            {envItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-muted-foreground/60" />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{item.value}</span>
                  {item.status !== "neutral" && <StatusBadge status={item.status === "warning" ? "warning" : "connected"} />}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

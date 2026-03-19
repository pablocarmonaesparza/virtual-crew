"use client";

import { cn } from "@/lib/utils/cn";
import { useEffect, useState, useCallback } from "react";
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
  RefreshCw,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboardStore } from "@/stores/dashboard-store";
import { exportToCSV } from "@/lib/utils/csv";
import { useToast } from "@/components/ui/toast";

// ── Types ──

interface IntegrationConfig {
  name: string;
  description: string;
  workflow: string;
  schedule: string;
  icon: typeof ShoppingBag;
  tables: string[];
}

interface StatusResponse {
  supabase?: {
    connected: boolean;
    region?: string | null;
    tables?: Record<string, number>;
  };
  shopify?: { connected: boolean };
  n8n?: { configured: boolean; url: string };
  anthropic?: { configured: boolean };
  amazon_sp?: { configured: boolean };
  amazon_ads?: { configured: boolean };
  meta_ads?: { configured: boolean };
}

interface SyncLog {
  id: string;
  workflow_name: string;
  source: string;
  status: string;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

// ── Config ──

const integrations: IntegrationConfig[] = [
  {
    name: "Shopify",
    description: "DTC orders, inventory levels, product catalog, and subscription data",
    workflow: "ADM: Shopify Sync",
    schedule: "Daily at 03:00 UTC",
    icon: ShoppingBag,
    tables: ["sales_daily", "inventory_levels"],
  },
  {
    name: "Amazon SP-API",
    description: "Amazon UK marketplace orders, FBA inventory, and fulfilment data",
    workflow: "ADM: Amazon SP-API Sync",
    schedule: "Daily at 03:30 UTC",
    icon: Package,
    tables: ["sales_daily", "inventory_levels"],
  },
  {
    name: "Amazon Ads",
    description: "Sponsored Products, Brands & Display campaign performance",
    workflow: "ADM: Amazon Ads Sync",
    schedule: "Daily at 04:00 UTC",
    icon: BarChart3,
    tables: ["ad_daily_spend"],
  },
  {
    name: "Meta Ads",
    description: "Facebook & Instagram campaign impressions, spend, and conversions",
    workflow: "ADM: Meta Ads Sync",
    schedule: "Daily at 04:00 UTC",
    icon: Image,
    tables: ["ad_daily_spend"],
  },
];

// ── Components ──

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
          <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-2">{shopifyStoreName}</p>
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

function OtherIntegrationCard({
  integration,
  isConfigured,
  onConfigure,
}: {
  integration: IntegrationConfig;
  isConfigured?: boolean;
  onConfigure?: () => void;
}) {
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
          <StatusBadge status={isConfigured ? "connected" : "not_connected"} />
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
          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 shrink-0" onClick={onConfigure}>
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const CONFIGURE_INSTRUCTIONS: Record<string, { title: string; steps: string[] }> = {
  "Amazon SP-API": {
    title: "Configure Amazon SP-API",
    steps: [
      "1. Register as a developer in Amazon Seller Central",
      "2. Create an SP-API application under Apps & Services",
      "3. Generate a Refresh Token via the OAuth flow",
      "4. Add the following environment variables: AMAZON_SP_CLIENT_ID, AMAZON_SP_CLIENT_SECRET, AMAZON_SP_REFRESH_TOKEN",
      "5. Restart the N8N workflow 'ADM: Amazon SP-API Sync'",
    ],
  },
  "Amazon Ads": {
    title: "Configure Amazon Ads API",
    steps: [
      "1. Log in to the Amazon Advertising Console",
      "2. Navigate to Campaign Manager and create an API profile",
      "3. Generate OAuth credentials via the Amazon Ads developer portal",
      "4. Add the following environment variables: AMAZON_ADS_CLIENT_ID, AMAZON_ADS_CLIENT_SECRET, AMAZON_ADS_REFRESH_TOKEN, AMAZON_ADS_PROFILE_ID",
      "5. Restart the N8N workflow 'ADM: Amazon Ads Sync'",
    ],
  },
  "Meta Ads": {
    title: "Configure Meta Ads API",
    steps: [
      "1. Go to Facebook Business Manager and create a System User",
      "2. Generate a long-lived access token with ads_read permissions",
      "3. Note your Ad Account ID from Business Settings",
      "4. Add the following environment variables: META_ADS_ACCESS_TOKEN, META_ADS_ACCOUNT_ID",
      "5. Restart the N8N workflow 'ADM: Meta Ads Sync'",
    ],
  },
};

function ConfigureModal({ name, onClose }: { name: string; onClose: () => void }) {
  const instructions = CONFIGURE_INSTRUCTIONS[name];
  if (!instructions) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl border border-border/40 bg-card shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">{instructions.title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground mb-4">Follow these steps to connect {name}:</p>
          {instructions.steps.map((step, i) => (
            <p key={i} className="text-sm text-foreground">{step}</p>
          ))}
        </div>
        <div className="border-t border-border/30 px-6 py-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function SyncLogRow({ log }: { log: SyncLog }) {
  const statusColor =
    log.status === "success"
      ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800"
      : log.status === "error"
        ? "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800"
        : log.status === "running"
          ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800"
          : "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800";

  const formattedDate = log.started_at
    ? new Date(log.started_at).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        <span className="font-medium text-foreground truncate">{log.workflow_name}</span>
        <span className="text-muted-foreground">{log.source}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formattedDate}
        </span>
        <span className="text-muted-foreground">
          {log.records_fetched}f / {log.records_inserted}i / {log.records_updated}u
        </span>
        <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-medium", statusColor)}>
          {log.status}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function SettingsPage() {
  const {
    theme,
    toggleTheme,
    shopifyConnected,
    setShopifyConnected,
    setShopifyStoreName,
    setDataSource,
    setSupabaseConnected,
  } = useDashboardStore();

  const searchParams = useSearchParams();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [configureModal, setConfigureModal] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch overall status on mount
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data: StatusResponse = await res.json();
        setStatus(data);

        // Update store based on status
        if (data.shopify?.connected) {
          setShopifyConnected(true);
        }
        if (data.supabase?.connected) {
          setSupabaseConnected(true);
          // If Supabase has sales data, set data source
          const salesCount = data.supabase.tables?.sales_daily ?? 0;
          if (salesCount > 0) {
            setDataSource("supabase");
          } else if (data.shopify?.connected) {
            setDataSource("live");
          }
        }
      }
    } catch {
      // Status API not available — leave defaults
    }
  }, [setShopifyConnected, setDataSource, setSupabaseConnected]);

  // Fetch Shopify shop name from the existing endpoint
  const fetchShopifyDetails = useCallback(async () => {
    try {
      const res = await fetch("/api/shopify/status");
      if (res.ok) {
        const data = await res.json();
        if (data.connected && data.shop) {
          setShopifyStoreName(data.shop);
        }
      }
    } catch {
      // ignore
    }
  }, [setShopifyStoreName]);

  // Fetch sync logs from Supabase
  const fetchSyncLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/sync-logs");
      if (res.ok) {
        const data = await res.json();
        if (data.logs && data.logs.length > 0) {
          setSyncLogs(data.logs);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchShopifyDetails();
    fetchSyncLogs();
  }, [fetchStatus, fetchShopifyDetails, fetchSyncLogs]);

  // Show success banner when redirected back from Shopify OAuth
  useEffect(() => {
    if (searchParams.get("shopify") === "connected") {
      setShowSuccessBanner(true);
      setShopifyConnected(true);
      const timer = setTimeout(() => setShowSuccessBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setShopifyConnected]);

  // Build dynamic env items based on status
  const supabaseTables = status?.supabase?.tables ?? {};
  const productCount = supabaseTables.products ?? 0;

  const envItems = [
    {
      label: "Database",
      value: `Supabase (PostgreSQL)${productCount > 0 ? ` — ${productCount} products` : ""}`,
      status: (status?.supabase?.connected ? "connected" : "not_connected") as "connected" | "not_connected" | "warning" | "neutral",
      icon: Database,
    },
    {
      label: "Automation",
      value: "N8N — 4 workflows created",
      status: (status?.n8n?.configured ? "connected" : "warning") as "connected" | "not_connected" | "warning" | "neutral",
      icon: Workflow,
    },
    {
      label: "LLM",
      value: "Claude Sonnet 4.6",
      status: (status?.anthropic?.configured ? "connected" : "not_connected") as "connected" | "not_connected" | "warning" | "neutral",
      icon: Globe,
    },
    {
      label: "Region",
      value: status?.supabase?.region || "EU West 2 (London)",
      status: "neutral" as const,
      icon: MapPin,
    },
  ];

  // Determine per-integration configured status
  const integrationConfigured: Record<string, boolean> = {
    "Amazon SP-API": status?.amazon_sp?.configured ?? false,
    "Amazon Ads": status?.amazon_ads?.configured ?? false,
    "Meta Ads": status?.meta_ads?.configured ?? false,
  };

  const n8nUrl = status?.n8n?.url || "https://pblcrmn.app.n8n.cloud";

  const handleExportSyncLogs = () => {
    if (syncLogs.length === 0) {
      toast("No sync logs to export", "info");
      return;
    }
    exportToCSV(
      syncLogs.map((log) => ({
        "Workflow": log.workflow_name,
        "Source": log.source,
        "Status": log.status,
        "Records Fetched": log.records_fetched,
        "Records Inserted": log.records_inserted,
        "Records Updated": log.records_updated,
        "Error": log.error_message ?? "",
        "Started At": log.started_at,
        "Completed At": log.completed_at ?? "",
      })),
      "sync-logs"
    );
    toast("Sync logs exported successfully");
  };

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
            className="flex items-center justify-between rounded-lg border border-green-200/50 dark:border-green-800/50 bg-green-50 dark:bg-green-950/50 px-4 py-3 text-sm text-green-800 dark:text-green-300"
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
          <a href={n8nUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <ExternalLink className="mr-1.5 h-3 w-3" />
              Open N8N
            </Button>
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <div key={integration.name}>
              {integration.name === "Shopify" ? (
                <ShopifyIntegrationCard integration={integration} />
              ) : (
                <OtherIntegrationCard
                  integration={integration}
                  isConfigured={integrationConfigured[integration.name]}
                  onConfigure={() => setConfigureModal(integration.name)}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Sync Logs */}
      {syncLogs.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Recent Sync Activity
          </h3>
          <Card>
            <CardContent className="p-0 divide-y divide-border/30">
              {syncLogs.map((log) => (
                <SyncLogRow key={log.id} log={log} />
              ))}
            </CardContent>
          </Card>
        </section>
      )}

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
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExportSyncLogs}>
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
                  {item.status !== "neutral" && (
                    <StatusBadge
                      status={
                        item.status === "warning"
                          ? "warning"
                          : item.status === "connected"
                            ? "connected"
                            : "not_connected"
                      }
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Configure Modal */}
      {configureModal && (
        <ConfigureModal name={configureModal} onClose={() => setConfigureModal(null)} />
      )}
    </div>
  );
}

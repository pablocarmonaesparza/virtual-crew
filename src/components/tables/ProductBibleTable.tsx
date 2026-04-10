"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/EmptyState";
import { useDashboardStore } from "@/stores/dashboard-store";
import { FileDown, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/utils/csv";
import { exportToPDF } from "@/lib/utils/pdf";
import { useToast } from "@/components/ui/toast";
import type { ProductBibleEntry, Channel } from "@/types";
import { useEffect, useState, useCallback, useRef } from "react";

const CHANNEL_LABELS: Record<string, string> = {
  shopify: "B2C",
  amazon: "Amazon",
  wholesale: "Wholesale",
  export: "Export",
};

const TIER_OPTIONS = ["premium", "core", "value"] as const;
const CHANNEL_OPTIONS: Channel[] = ["shopify", "amazon", "wholesale", "export"];

export function ProductBibleTable() {
  const { shopifyConnected, filters } = useDashboardStore();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductBibleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!shopifyConnected) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/shopify/products");
        if (res.ok) {
          const data = await res.json();
          const mapped: ProductBibleEntry[] = (data.products || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => ({
              sku_id: p.variants?.[0]?.sku || p.id?.toString() || "",
              sku_title: p.title || "",
              tier: "core" as const,
              pack_size: 1,
              flavour: p.product_type || "original",
              product_title: p.title || "",
              category: "drinks" as const,
              channels: ["shopify"] as Channel[],
              amazon_parent_asin: "",
              amazon_child_asin: "",
              is_active: p.status === "active",
            })
          );
          setProducts(mapped);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [shopifyConnected]);

  const updateProduct = useCallback((idx: number, field: keyof ProductBibleEntry, value: unknown) => {
    setProducts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  const toggleChannel = useCallback((idx: number, ch: Channel) => {
    setProducts((prev) => {
      const next = [...prev];
      const p = { ...next[idx] };
      const channels = [...p.channels];
      const i = channels.indexOf(ch);
      if (i >= 0) channels.splice(i, 1);
      else channels.push(ch);
      p.channels = channels as Channel[];
      next[idx] = p;
      return next;
    });
  }, []);

  if (!shopifyConnected && !loading) {
    return <EmptyState integration="Shopify" metric="product bible data" />;
  }

  const filtered = products.filter((p) => {
    if (filters.tier !== "all" && p.tier !== filters.tier) return false;
    if (filters.flavour !== "all" && (p.flavour || "").toLowerCase() !== filters.flavour.toLowerCase()) return false;
    if (filters.category !== "all" && p.category !== filters.category) return false;
    if (filters.channel !== "all" && !p.channels.includes(filters.channel)) return false;
    return true;
  });

  const handleExportCSV = () => {
    exportToCSV(
      filtered.map((p) => ({
        SKU: p.sku_id,
        Title: p.sku_title,
        Tier: p.tier,
        "Pack Size": p.pack_size,
        Flavour: p.flavour,
        Category: p.category,
        Channels: p.channels.map((c) => CHANNEL_LABELS[c] || c).join(", "),
        "Amazon Parent ASIN": p.amazon_parent_asin || "",
        "Amazon Child ASIN": p.amazon_child_asin || "",
        Active: p.is_active ? "Yes" : "No",
      })),
      "product-bible"
    );
    toast("Product Bible exported to CSV", "success");
  };

  const handleExportPDF = async () => {
    if (tableRef.current) {
      await exportToPDF(tableRef.current, "product-bible");
      toast("Product Bible exported to PDF", "success");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Product Bible</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {filtered.length} SKUs
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExportCSV} title="Export CSV">
            <FileDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExportPDF} title="Export PDF">
            <FileText className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">SKU</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Tier</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Pack</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Flavour</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Channels</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Parent ASIN</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Child ASIN</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No products match the current filters
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const idx = products.indexOf(p);
                    return (
                      <tr key={p.sku_id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5 font-mono text-muted-foreground">{p.sku_id}</td>
                        <td className="px-3 py-1.5 font-medium max-w-[160px] truncate">{p.sku_title}</td>
                        <td className="px-3 py-1.5">
                          <select
                            value={p.tier}
                            onChange={(e) => updateProduct(idx, "tier", e.target.value)}
                            className="bg-background border border-border/40 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            {TIER_OPTIONS.map((t) => (
                              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <input
                            type="number"
                            min={1}
                            value={p.pack_size}
                            onChange={(e) => updateProduct(idx, "pack_size", parseInt(e.target.value) || 1)}
                            className="w-14 text-center font-mono text-xs rounded border border-border/40 bg-background px-1 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={p.flavour}
                            onChange={(e) => updateProduct(idx, "flavour", e.target.value)}
                            className="w-24 text-xs rounded border border-border/40 bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex gap-1 flex-wrap">
                            {CHANNEL_OPTIONS.map((ch) => (
                              <button
                                key={ch}
                                onClick={() => toggleChannel(idx, ch)}
                                className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                                  p.channels.includes(ch)
                                    ? "bg-primary/15 border-primary/30 text-primary"
                                    : "bg-transparent border-border/30 text-muted-foreground/50 hover:border-border/60"
                                }`}
                              >
                                {CHANNEL_LABELS[ch]}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={p.amazon_parent_asin || ""}
                            placeholder="B0..."
                            onChange={(e) => updateProduct(idx, "amazon_parent_asin", e.target.value)}
                            className="w-24 font-mono text-xs rounded border border-border/40 bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/30"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={p.amazon_child_asin || ""}
                            placeholder="B0..."
                            onChange={(e) => updateProduct(idx, "amazon_child_asin", e.target.value)}
                            className="w-24 font-mono text-xs rounded border border-border/40 bg-background px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/30"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

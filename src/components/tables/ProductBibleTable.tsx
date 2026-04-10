"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/EmptyState";
import { useDashboardStore } from "@/stores/dashboard-store";
import { FileDown, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/utils/csv";
import { useToast } from "@/components/ui/toast";
import type { ProductBibleEntry } from "@/types";
import { useEffect, useState } from "react";

const CHANNEL_LABELS: Record<string, string> = {
  shopify: "B2C",
  amazon: "Amazon",
  wholesale: "Wholesale",
  export: "Export",
};

export function ProductBibleTable() {
  const { shopifyConnected, filters } = useDashboardStore();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductBibleEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
              channels: ["shopify"] as ProductBibleEntry["channels"],
              amazon_parent_asin: undefined,
              amazon_child_asin: undefined,
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

  const handleExport = () => {
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
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport}>
          <FileDown className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">SKU</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tier</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Pack</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Flavour</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Channels</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Parent ASIN</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Child ASIN</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground">
                      No products match the current filters
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.sku_id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-mono">{p.sku_id}</td>
                      <td className="px-4 py-2.5 font-medium">{p.sku_title}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={p.tier === "premium" ? "default" : "secondary"} className="text-[10px]">
                          {p.tier}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">{p.pack_size}</td>
                      <td className="px-4 py-2.5 capitalize">{p.flavour}</td>
                      <td className="px-4 py-2.5 capitalize">{p.category.replace("_", " ")}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1 flex-wrap">
                          {p.channels.map((c) => (
                            <Badge key={c} variant="outline" className="text-[9px] px-1.5">
                              {CHANNEL_LABELS[c] || c}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {p.amazon_parent_asin || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {p.amazon_child_asin || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={p.is_active ? "positive" : "secondary"} className="text-[10px]">
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

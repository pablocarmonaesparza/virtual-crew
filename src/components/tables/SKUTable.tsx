"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_SKU_TABLE } from "@/lib/mock-data";
import { formatNumber, formatMonth, exportToCSV } from "@/lib/utils";
import { Download } from "lucide-react";

const VISIBLE_MONTHS = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];

export function SKUTable() {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const data = MOCK_SKU_TABLE;
  const totalPages = Math.ceil(data.length / pageSize);
  const pagedData = data.slice(page * pageSize, (page + 1) * pageSize);

  const handleExport = () => {
    const rows = data.flatMap((sku) =>
      VISIBLE_MONTHS.map((m) => ({
        SKU: sku.sku_title,
        "Product Type": sku.product_type,
        Category: sku.category,
        Month: formatMonth(m),
        "Forecast Baseline": sku.months[m]?.forecast_baseline ?? "",
        "Forecast Ambitious": sku.months[m]?.forecast_ambitious ?? "",
        Actual: sku.months[m]?.actual ?? "",
        "Accuracy %": sku.months[m]?.accuracy_pct ?? "",
        "MoM %": sku.months[m]?.mom_change ?? "",
      }))
    );
    exportToCSV(rows, "sku-level-detail");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">SKU Level Detail</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-3 w-3" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm" role="table">
            <thead>
              <tr className="border-b">
                <th className="pb-3 text-left sticky left-0 bg-white z-10 min-w-[140px]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    SKU
                  </span>
                </th>
                <th className="pb-3 text-left min-w-[100px]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Type
                  </span>
                </th>
                {VISIBLE_MONTHS.map((m) => (
                  <th key={m} colSpan={3} className="pb-3 text-center border-l px-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {formatMonth(m)}
                    </span>
                  </th>
                ))}
              </tr>
              <tr className="border-b">
                <th className="pb-2 sticky left-0 bg-white z-10" />
                <th className="pb-2" />
                {VISIBLE_MONTHS.map((m) => (
                  <th key={m} colSpan={3} className="pb-2 border-l">
                    <div className="flex text-[10px] text-muted-foreground font-normal">
                      <span className="flex-1 text-center">Base</span>
                      <span className="flex-1 text-center">Act</span>
                      <span className="flex-1 text-center">Acc%</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedData.map((sku) => (
                <tr key={sku.sku_id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 font-medium sticky left-0 bg-white z-10">
                    <div className="text-sm">{sku.sku_title}</div>
                    <div className="text-[10px] text-muted-foreground">{sku.category}</div>
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">{sku.product_type}</td>
                  {VISIBLE_MONTHS.map((m) => {
                    const d = sku.months[m];
                    if (!d) return <td key={m} colSpan={3} className="border-l" />;
                    const isPositive = d.actual !== null && d.actual >= d.forecast_baseline;
                    const bgClass =
                      d.actual !== null
                        ? isPositive
                          ? "bg-green-50/60"
                          : "bg-red-50/60"
                        : "";
                    return (
                      <td key={m} colSpan={3} className={`border-l ${bgClass}`}>
                        <div className="flex text-xs tabular-nums px-1">
                          <span className="flex-1 text-center">{formatNumber(d.forecast_baseline)}</span>
                          <span className="flex-1 text-center font-medium">
                            {d.actual !== null ? formatNumber(d.actual) : "—"}
                          </span>
                          <span className="flex-1 text-center">
                            {d.accuracy_pct !== null ? (
                              <span
                                className={
                                  d.accuracy_pct >= 95
                                    ? "text-green-600"
                                    : d.accuracy_pct >= 90
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }
                              >
                                {d.accuracy_pct.toFixed(0)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} of {data.length} SKUs
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

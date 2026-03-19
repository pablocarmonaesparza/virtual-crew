"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { Channel, ProductCategory, CustomerType, AdsPlatform } from "@/types";

export function FilterBar() {
  const { filters, setFilter, resetFilters } = useDashboardStore();

  const hasActiveFilters =
    filters.channel !== "all" ||
    filters.category !== "all" ||
    filters.customerType !== "all" ||
    filters.adsPlatform !== "all" ||
    filters.selectedMonth !== "2026-03";

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border/30 bg-card p-3">
      <FilterGroup label="Month">
        <Select
          value={filters.selectedMonth}
          onValueChange={(v) => setFilter("selectedMonth", v)}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-10">Oct 2025</SelectItem>
            <SelectItem value="2025-11">Nov 2025</SelectItem>
            <SelectItem value="2025-12">Dec 2025</SelectItem>
            <SelectItem value="2026-01">Jan 2026</SelectItem>
            <SelectItem value="2026-02">Feb 2026</SelectItem>
            <SelectItem value="2026-03">Mar 2026</SelectItem>
            <SelectItem value="2026-04">Apr 2026</SelectItem>
            <SelectItem value="2026-05">May 2026</SelectItem>
            <SelectItem value="2026-06">Jun 2026</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Channel">
        <Select
          value={filters.channel}
          onValueChange={(v) => setFilter("channel", v as Channel)}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="shopify">D2C / Shopify</SelectItem>
            <SelectItem value="amazon">Amazon</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Category">
        <Select
          value={filters.category}
          onValueChange={(v) => setFilter("category", v as ProductCategory)}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="drinks">Drinks</SelectItem>
            <SelectItem value="tea">Tea</SelectItem>
            <SelectItem value="health_products">Health Products</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Customer">
        <Select
          value={filters.customerType}
          onValueChange={(v) => setFilter("customerType", v as CustomerType)}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="returning">Returning</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup label="Ads Platform">
        <Select
          value={filters.adsPlatform}
          onValueChange={(v) => setFilter("adsPlatform", v as AdsPlatform)}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="meta">Meta Ads</SelectItem>
            <SelectItem value="amazon_ads">Amazon Ads</SelectItem>
          </SelectContent>
        </Select>
      </FilterGroup>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Reset
        </Button>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      {children}
    </div>
  );
}

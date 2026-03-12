"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardStore } from "@/stores/dashboard-store";
import type { Channel, ProductCategory, CustomerType, AdsPlatform } from "@/types";

export function FilterBar() {
  const { filters, setFilter } = useDashboardStore();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Client
        </label>
        <Select value="adm" disabled>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="adm">Agua de Madre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Month
        </label>
        <Select
          value={filters.selectedMonth}
          onValueChange={(v) => setFilter("selectedMonth", v)}
        >
          <SelectTrigger className="w-[140px]">
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
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Channel
        </label>
        <Select
          value={filters.channel}
          onValueChange={(v) => setFilter("channel", v as Channel)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="shopify">D2C / Shopify</SelectItem>
            <SelectItem value="amazon">Amazon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Category
        </label>
        <Select
          value={filters.category}
          onValueChange={(v) => setFilter("category", v as ProductCategory)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="drinks">Drinks</SelectItem>
            <SelectItem value="tea">Tea</SelectItem>
            <SelectItem value="health_products">Health Products</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Customer
        </label>
        <Select
          value={filters.customerType}
          onValueChange={(v) => setFilter("customerType", v as CustomerType)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="returning">Returning</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Ads
        </label>
        <Select
          value={filters.adsPlatform}
          onValueChange={(v) => setFilter("adsPlatform", v as AdsPlatform)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="meta">Meta Ads</SelectItem>
            <SelectItem value="amazon_ads">Amazon Ads</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

import type {
  ForecastTableRow,
  AdSpendTableRow,
  CACTableRow,
  SKUTableRow,
  TimeRange,
  ProductCategory,
  AdsPlatform,
  Channel,
} from "@/types";

/**
 * Given a selected month (e.g. "2026-03") and a time range,
 * returns an array of month strings (e.g. ["2025-10", "2025-11", ...])
 * that should be included.
 */
export function getMonthsForTimeRange(
  selectedMonth: string,
  timeRange: TimeRange
): string[] {
  const [year, month] = selectedMonth.split("-").map(Number);
  const endDate = new Date(year, month - 1, 1); // the selected month

  let startDate: Date;

  switch (timeRange) {
    case "mtd":
      // Only the selected month
      return [selectedMonth];
    case "ytd": {
      // From January of the selected month's year
      startDate = new Date(year, 0, 1);
      break;
    }
    case "3m": {
      startDate = new Date(year, month - 3, 1);
      break;
    }
    case "6m": {
      startDate = new Date(year, month - 6, 1);
      break;
    }
    case "12m": {
      startDate = new Date(year, month - 12, 1);
      break;
    }
    default:
      return [selectedMonth];
  }

  const months: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

/**
 * Filter ForecastTableRow[] by an array of month strings.
 */
export function filterForecastByTimeRange(
  data: ForecastTableRow[],
  months: string[]
): ForecastTableRow[] {
  return data.filter((row) => months.includes(row.month));
}

/**
 * Filter AdSpendTableRow[] by platform.
 * "all" returns everything; "meta" matches "Meta Ads"; "amazon_ads" matches "Amazon Ads".
 */
export function filterAdSpendByPlatform(
  data: AdSpendTableRow[],
  platform: AdsPlatform
): AdSpendTableRow[] {
  if (platform === "all") return data;
  const platformMap: Record<string, string> = {
    meta: "Meta Ads",
    amazon_ads: "Amazon Ads",
  };
  const target = platformMap[platform];
  return data.filter((row) => row.platform === target);
}

/**
 * Filter AdSpendTableRow[] by month.
 */
export function filterAdSpendByTimeRange(
  data: AdSpendTableRow[],
  months: string[]
): AdSpendTableRow[] {
  return data.filter((row) => months.includes(row.month));
}

/**
 * Filter CACTableRow[] by channel.
 * "all" returns everything; "shopify" matches "Shopify"; "amazon" matches "Amazon".
 */
export function filterCACByChannel(
  data: CACTableRow[],
  channel: Channel
): CACTableRow[] {
  if (channel === "all") return data;
  const channelMap: Record<string, string> = {
    shopify: "Shopify",
    amazon: "Amazon",
  };
  const target = channelMap[channel];
  return data.filter((row) => row.channel === target);
}

/**
 * Filter CACTableRow[] by month.
 */
export function filterCACByTimeRange(
  data: CACTableRow[],
  months: string[]
): CACTableRow[] {
  return data.filter((row) => months.includes(row.month));
}

/**
 * Filter SKUTableRow[] by category.
 */
export function filterSKUByCategory(
  data: SKUTableRow[],
  category: ProductCategory
): SKUTableRow[] {
  if (category === "all") return data;
  return data.filter((row) => row.category === category);
}

/**
 * Generic chart data filter by time range.
 * Filters an array of objects that have a `month` key (display format like "Oct 25")
 * based on an array of raw month strings (like "2025-10").
 * The monthKey parameter is the key on each data object that holds the display month.
 */
export function filterChartDataByTimeRange<
  T extends Record<string, unknown>
>(
  data: T[],
  months: string[],
  monthKey: keyof T = "month" as keyof T
): T[] {
  // Build a set of display-format months from the raw months for comparison
  const displayMonths = new Set(
    months.map((m) => {
      const [y, mo] = m.split("-");
      const date = new Date(parseInt(y), parseInt(mo) - 1);
      const monthName = date.toLocaleDateString("en-GB", { month: "short" });
      const shortYear = y.slice(2);
      return `${monthName} ${shortYear}`;
    })
  );

  return data.filter((item) => displayMonths.has(String(item[monthKey])));
}

/**
 * Deterministic Forecasting Engine for ADM S&OP
 *
 * Formula: Forecast = Baseline × Seasonality × Marketing Uplift × Price Impact × Channel Effects
 *
 * This is the core IP — no AI/ML, pure rule-based logic.
 */

export interface HistoricalDataPoint {
  month: string;
  sku_id: string;
  channel: string;
  units_sold: number;
  ad_spend: number;
  price: number;
}

export interface ForecastResult {
  sku_id: string;
  channel: string;
  month: string;
  forecast_baseline: number;
  forecast_ambitious: number;
  components: {
    raw_baseline: number;
    seasonality_index: number;
    marketing_uplift: number;
    price_impact: number;
    channel_effect: number;
  };
}

export interface SeasonalityConfig {
  tea: Record<number, number>;
  drinks: Record<number, number>;
  health_products: Record<number, number>;
}

const SEASONALITY: SeasonalityConfig = {
  tea: {
    1: 1.15, 2: 1.10, 3: 1.05,
    4: 0.85, 5: 0.80, 6: 0.75,
    7: 0.75, 8: 0.78, 9: 0.90,
    10: 1.10, 11: 1.20, 12: 1.25,
  },
  drinks: {
    1: 0.80, 2: 0.85, 3: 0.95,
    4: 1.10, 5: 1.20, 6: 1.25,
    7: 1.25, 8: 1.20, 9: 1.05,
    10: 0.90, 11: 0.80, 12: 0.85,
  },
  health_products: {
    1: 1.10, 2: 1.05, 3: 1.00,
    4: 0.95, 5: 0.95, 6: 0.90,
    7: 0.90, 8: 0.90, 9: 0.95,
    10: 1.05, 11: 1.10, 12: 1.15,
  },
};

const AMBITIOUS_MULTIPLIER = 1.25;

/**
 * Calculate baseline using 8-week moving average
 */
export function calculateBaseline(
  history: HistoricalDataPoint[],
  windowWeeks: number = 8
): number {
  if (history.length === 0) return 0;

  const windowMonths = Math.ceil(windowWeeks / 4.33);
  const recent = history
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, windowMonths);

  if (recent.length === 0) return 0;

  const sum = recent.reduce((acc, d) => acc + d.units_sold, 0);
  return Math.round(sum / recent.length);
}

/**
 * Calculate baseline using exponential smoothing
 * alpha = smoothing factor (0-1), higher = more weight on recent
 */
export function calculateBaselineExponential(
  history: HistoricalDataPoint[],
  alpha: number = 0.3
): number {
  if (history.length === 0) return 0;

  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  let forecast = sorted[0].units_sold;

  for (let i = 1; i < sorted.length; i++) {
    forecast = alpha * sorted[i].units_sold + (1 - alpha) * forecast;
  }

  return Math.round(forecast);
}

/**
 * Get seasonality index for a given category and month
 */
export function getSeasonalityIndex(
  category: keyof SeasonalityConfig,
  month: number
): number {
  return SEASONALITY[category]?.[month] ?? 1.0;
}

/**
 * Calculate marketing uplift based on ad spend relative to historical average
 */
export function calculateMarketingUplift(
  plannedAdSpend: number,
  historicalAvgAdSpend: number,
  elasticity: number = 0.15
): number {
  if (historicalAvgAdSpend === 0) return 1.0;
  const spendRatio = plannedAdSpend / historicalAvgAdSpend;
  return 1.0 + (spendRatio - 1.0) * elasticity;
}

/**
 * Calculate price impact factor
 * Negative elasticity: price goes up, demand goes down
 */
export function calculatePriceImpact(
  currentPrice: number,
  baselinePrice: number,
  priceElasticity: number = -0.5
): number {
  if (baselinePrice === 0) return 1.0;
  const priceChange = (currentPrice - baselinePrice) / baselinePrice;
  return 1.0 + priceChange * priceElasticity;
}

/**
 * Channel effect factor based on channel mix
 */
export function calculateChannelEffect(
  channelShare: number,
  conversionRate: number,
  baselineConversionRate: number = 0.03
): number {
  if (baselineConversionRate === 0) return 1.0;
  return channelShare * (conversionRate / baselineConversionRate);
}

/**
 * Generate complete forecast for a SKU + channel + month
 */
export function generateForecast(params: {
  history: HistoricalDataPoint[];
  category: keyof SeasonalityConfig;
  targetMonth: number;
  plannedAdSpend: number;
  historicalAvgAdSpend: number;
  currentPrice: number;
  baselinePrice: number;
  channelShare: number;
  conversionRate: number;
  method?: "moving_average" | "exponential_smoothing";
  ambitiousMultiplier?: number;
}): {
  baseline: number;
  ambitious: number;
  components: ForecastResult["components"];
} {
  const {
    history,
    category,
    targetMonth,
    plannedAdSpend,
    historicalAvgAdSpend,
    currentPrice,
    baselinePrice,
    channelShare = 1.0,
    conversionRate = 0.03,
    method = "moving_average",
    ambitiousMultiplier = AMBITIOUS_MULTIPLIER,
  } = params;

  const rawBaseline =
    method === "exponential_smoothing"
      ? calculateBaselineExponential(history)
      : calculateBaseline(history);

  const seasonalityIndex = getSeasonalityIndex(category, targetMonth);
  const marketingUplift = calculateMarketingUplift(plannedAdSpend, historicalAvgAdSpend);
  const priceImpact = calculatePriceImpact(currentPrice, baselinePrice);
  const channelEffect = channelShare > 0
    ? calculateChannelEffect(channelShare, conversionRate)
    : 1.0;

  const baseline = Math.round(
    rawBaseline * seasonalityIndex * marketingUplift * priceImpact * channelEffect
  );

  const ambitious = Math.round(baseline * ambitiousMultiplier);

  return {
    baseline: Math.max(0, baseline),
    ambitious: Math.max(0, ambitious),
    components: {
      raw_baseline: rawBaseline,
      seasonality_index: seasonalityIndex,
      marketing_uplift: marketingUplift,
      price_impact: priceImpact,
      channel_effect: channelEffect,
    },
  };
}

/**
 * Calculate forecast accuracy
 */
export function calculateAccuracy(forecast: number, actual: number): number {
  if (forecast === 0) return 0;
  return Math.round((actual / forecast) * 1000) / 10;
}

/**
 * Calculate gap metrics
 */
export function calculateGap(
  forecast: number,
  actual: number
): { gap: number; gapPct: number } {
  const gap = actual - forecast;
  const gapPct = forecast > 0 ? Math.round((gap / forecast) * 1000) / 10 : 0;
  return { gap, gapPct };
}

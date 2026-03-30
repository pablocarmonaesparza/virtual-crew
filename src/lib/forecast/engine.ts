/**
 * Deterministic Forecasting Engine for Virtual Crew S&OP Dashboard
 *
 * Formula: Forecast = Baseline x Seasonality Index x Marketing Uplift x Price Impact x Channel Effects
 *
 * Each multiplier defaults to 1.0 when data is insufficient, ensuring
 * graceful degradation. The engine supports both weekly ("2025-W42") and
 * monthly ("2025-10") period formats.
 *
 * @module forecast/engine
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** A single historical sales observation (weekly or monthly). */
export interface SalesDataPoint {
  /** Period identifier: "2025-10" for monthly or "2025-W42" for weekly. */
  period: string;
  /** Units sold in the period. */
  units: number;
  /** Revenue in the period. */
  revenue: number;
  /** Advertising spend in the period (optional). */
  adSpend?: number;
  /** Average selling price in the period (optional). */
  price?: number;
  /** Sales channel identifier (optional). */
  channel?: string;
}

/** Configuration options for the forecast generator. */
export interface ForecastConfig {
  /** Exponential smoothing factor (0-1). Higher values weight recent data more. Default 0.2. */
  alpha?: number;
  /** Marketing spend elasticity. Default 0.3. */
  marketingElasticity?: number;
  /** Price elasticity of demand (typically negative). Default -2.0. */
  priceElasticity?: number;
  /** Planned advertising spend for forecast periods. */
  plannedAdSpend?: number;
  /** Planned selling price for forecast periods. */
  plannedPrice?: number;
  /** Planned channel share (0-1) for forecast periods. */
  channelShare?: number;
  /** Number of periods to forecast ahead. Default 3. */
  forecastPeriods?: number;
}

/** A single forecast output row with full component breakdown. */
export interface ForecastResult {
  /** The forecasted period identifier. */
  period: string;
  /** Exponential-smoothed baseline demand. */
  baseline: number;
  /** Seasonality multiplier applied for this period. */
  seasonalityIndex: number;
  /** Marketing spend uplift multiplier. */
  marketingUplift: number;
  /** Price impact multiplier. */
  priceImpact: number;
  /** Channel mix effect multiplier. */
  channelEffect: number;
  /** Final forecast: baseline x seasonalityIndex x marketingUplift x priceImpact x channelEffect. */
  forecast: number;
  /** Lower bound of the 95% confidence interval. */
  confidenceLower: number;
  /** Upper bound of the 95% confidence interval. */
  confidenceUpper: number;
}

// ---------------------------------------------------------------------------
// Legacy interfaces (backward compatibility)
// ---------------------------------------------------------------------------

/** @deprecated Use SalesDataPoint instead. */
export interface HistoricalDataPoint {
  month: string;
  sku_id: string;
  channel: string;
  units_sold: number;
  ad_spend: number;
  price: number;
}

/** @deprecated Use ForecastConfig / ForecastResult instead. */
export interface SeasonalityConfig {
  tea: Record<number, number>;
  drinks: Record<number, number>;
  health_products: Record<number, number>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ALPHA = 0.2;
const DEFAULT_MARKETING_ELASTICITY = 0.3;
const DEFAULT_PRICE_ELASTICITY = -2.0;
const DEFAULT_FORECAST_PERIODS = 3;
const CONFIDENCE_Z = 1.96; // 95% CI

/** Minimum data points required to seed the exponential smoothing baseline. */
const MIN_SEED_POINTS = 4;
const MAX_SEED_POINTS = 6;

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

/**
 * Detect whether a period string is weekly ("2025-W42") or monthly ("2025-10").
 *
 * @param period - The period string to classify.
 * @returns `"weekly"` or `"monthly"`.
 */
export function detectPeriodType(period: string): "weekly" | "monthly" {
  return /W\d+/i.test(period) ? "weekly" : "monthly";
}

/**
 * Extract the seasonal bucket from a period string.
 *
 * For monthly periods, returns the month number (1-12).
 * For weekly periods, returns the ISO week number (1-53).
 *
 * @param period - Period string such as "2025-10" or "2025-W42".
 * @returns The numeric seasonal bucket.
 */
export function extractSeasonalBucket(period: string): number {
  if (detectPeriodType(period) === "weekly") {
    const match = period.match(/W(\d+)/i);
    return match ? parseInt(match[1], 10) : 1;
  }
  const parts = period.split("-");
  return parseInt(parts[1], 10) || 1;
}

/**
 * Advance a period string by a given number of steps.
 *
 * @param period - Starting period ("2025-10" or "2025-W42").
 * @param steps  - Number of periods to advance (can be negative).
 * @returns The new period string.
 */
export function advancePeriod(period: string, steps: number): string {
  if (detectPeriodType(period) === "weekly") {
    const match = period.match(/^(\d{4})-W(\d+)$/i);
    if (!match) return period;
    let year = parseInt(match[1], 10);
    let week = parseInt(match[2], 10) + steps;
    while (week > 52) {
      week -= 52;
      year += 1;
    }
    while (week < 1) {
      week += 52;
      year -= 1;
    }
    return `${year}-W${String(week).padStart(2, "0")}`;
  }

  const parts = period.split("-");
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) + steps;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component calculators
// ---------------------------------------------------------------------------

/**
 * Calculate the exponential-smoothed baseline demand.
 *
 * Initialization uses the average of the first 4-6 data points. The series
 * is then smoothed forward with the given alpha. When history is empty the
 * function returns 0.
 *
 * @param history - Historical sales data sorted chronologically.
 * @param alpha   - Smoothing factor (0-1). Default 0.2.
 * @returns The smoothed baseline value.
 */
export function calculateBaseline(
  history: SalesDataPoint[],
  alpha: number = DEFAULT_ALPHA
): number {
  if (history.length === 0) return 0;

  const sorted = [...history].sort((a, b) => a.period.localeCompare(b.period));

  // Seed: average of first 4-6 data points
  const seedCount = Math.min(
    Math.max(MIN_SEED_POINTS, Math.min(sorted.length, MAX_SEED_POINTS)),
    sorted.length
  );
  const seedSlice = sorted.slice(0, seedCount);
  let level =
    seedSlice.reduce((sum, dp) => sum + dp.units, 0) / seedSlice.length;

  // Apply exponential smoothing from the point after the seed window
  const startIdx = seedCount;
  for (let i = startIdx; i < sorted.length; i++) {
    level = alpha * sorted[i].units + (1 - alpha) * level;
  }

  return level;
}

/**
 * Compute seasonality indices from historical data.
 *
 * Groups data points by their seasonal bucket (month 1-12 or week 1-53),
 * computes the average units per bucket, and divides by the global average.
 * Buckets without data default to 1.0.
 *
 * @param history - Historical sales data.
 * @returns A map of seasonal bucket number to seasonality index.
 */
export function computeSeasonalityIndices(
  history: SalesDataPoint[]
): Map<number, number> {
  const indices = new Map<number, number>();
  if (history.length === 0) return indices;

  const globalAvg =
    history.reduce((sum, dp) => sum + dp.units, 0) / history.length;
  if (globalAvg === 0) return indices;

  // Group by seasonal bucket
  const buckets = new Map<number, number[]>();
  for (const dp of history) {
    const bucket = extractSeasonalBucket(dp.period);
    const arr = buckets.get(bucket) ?? [];
    arr.push(dp.units);
    buckets.set(bucket, arr);
  }

  for (const [bucket, values] of buckets) {
    const bucketAvg = values.reduce((s, v) => s + v, 0) / values.length;
    indices.set(bucket, bucketAvg / globalAvg);
  }

  return indices;
}

/**
 * Get the seasonality index for a specific period.
 *
 * @param period  - The target period string.
 * @param indices - Pre-computed seasonality indices from {@link computeSeasonalityIndices}.
 * @returns The seasonality multiplier (defaults to 1.0).
 */
export function getSeasonalityIndex(
  period: string,
  indices: Map<number, number>
): number {
  const bucket = extractSeasonalBucket(period);
  return indices.get(bucket) ?? 1.0;
}

/**
 * Calculate marketing uplift multiplier.
 *
 * Formula: 1 + (elasticity x ln(planned_spend / avg_spend))
 *
 * Returns 1.0 when planned spend or average spend is zero/undefined,
 * ensuring no distortion when marketing data is absent.
 *
 * @param plannedSpend - Planned advertising spend for the forecast period.
 * @param avgSpend     - Historical average advertising spend per period.
 * @param elasticity   - Marketing elasticity coefficient. Default 0.3.
 * @returns The marketing uplift multiplier (>= 0).
 */
export function calculateMarketingUplift(
  plannedSpend: number | undefined,
  avgSpend: number,
  elasticity: number = DEFAULT_MARKETING_ELASTICITY
): number {
  if (
    plannedSpend == null ||
    plannedSpend <= 0 ||
    avgSpend <= 0
  ) {
    return 1.0;
  }

  const ratio = plannedSpend / avgSpend;
  const uplift = 1 + elasticity * Math.log(ratio);

  // Clamp to non-negative; a massively reduced spend could theoretically push below 0
  return Math.max(0, uplift);
}

/**
 * Calculate price impact multiplier.
 *
 * Formula: (planned_price / avg_price) ^ elasticity
 *
 * With a negative elasticity (default -2.0), raising price reduces demand.
 * Returns 1.0 when price data is missing or zero.
 *
 * @param plannedPrice  - Planned selling price for the forecast period.
 * @param avgPrice      - Historical average selling price.
 * @param elasticity    - Price elasticity of demand. Default -2.0.
 * @returns The price impact multiplier (>= 0).
 */
export function calculatePriceImpact(
  plannedPrice: number | undefined,
  avgPrice: number,
  elasticity: number = DEFAULT_PRICE_ELASTICITY
): number {
  if (
    plannedPrice == null ||
    plannedPrice <= 0 ||
    avgPrice <= 0
  ) {
    return 1.0;
  }

  const ratio = plannedPrice / avgPrice;
  const impact = Math.pow(ratio, elasticity);

  return Math.max(0, impact);
}

/**
 * Calculate channel effect multiplier.
 *
 * Formula: planned_share / historical_share
 *
 * Returns 1.0 when either share value is missing, zero, or when there is
 * no channel differentiation in the data.
 *
 * @param plannedShare    - Planned channel share (0-1) for the forecast period.
 * @param historicalShare - Historical channel share (0-1) computed from data.
 * @returns The channel effect multiplier (>= 0).
 */
export function calculateChannelEffect(
  plannedShare: number | undefined,
  historicalShare: number
): number {
  if (
    plannedShare == null ||
    plannedShare <= 0 ||
    historicalShare <= 0
  ) {
    return 1.0;
  }

  return plannedShare / historicalShare;
}

/**
 * Compute the standard deviation of historical forecast residuals.
 *
 * Replays the forecast formula over each historical point and measures the
 * absolute error between the predicted and actual units. Used to build
 * confidence intervals.
 *
 * @param history           - Historical sales data (chronologically sorted).
 * @param alpha             - Smoothing factor used for baseline calculation.
 * @param seasonalIndices   - Pre-computed seasonality indices.
 * @returns The standard deviation of residuals, or 0 when there is
 *          insufficient history.
 */
export function computeResidualStdDev(
  history: SalesDataPoint[],
  alpha: number,
  seasonalIndices: Map<number, number>
): number {
  if (history.length < 2) return 0;

  const sorted = [...history].sort((a, b) => a.period.localeCompare(b.period));

  // Seed baseline
  const seedCount = Math.min(
    Math.max(MIN_SEED_POINTS, Math.min(sorted.length, MAX_SEED_POINTS)),
    sorted.length
  );
  const seedSlice = sorted.slice(0, seedCount);
  let level =
    seedSlice.reduce((sum, dp) => sum + dp.units, 0) / seedSlice.length;

  const residuals: number[] = [];

  for (let i = seedCount; i < sorted.length; i++) {
    const dp = sorted[i];
    const seasonality = getSeasonalityIndex(dp.period, seasonalIndices);
    const predicted = level * seasonality;
    residuals.push(dp.units - predicted);

    // Update level
    level = alpha * dp.units + (1 - alpha) * level;
  }

  if (residuals.length === 0) return 0;

  const mean = residuals.reduce((s, r) => s + r, 0) / residuals.length;
  const variance =
    residuals.reduce((s, r) => s + (r - mean) ** 2, 0) / residuals.length;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Helpers for historical averages
// ---------------------------------------------------------------------------

/**
 * Compute the average ad spend across historical data points that have
 * ad spend recorded.
 *
 * @param history - Historical sales data.
 * @returns Average ad spend, or 0 if no data.
 */
function computeAvgAdSpend(history: SalesDataPoint[]): number {
  const withSpend = history.filter(
    (dp) => dp.adSpend != null && dp.adSpend > 0
  );
  if (withSpend.length === 0) return 0;
  return withSpend.reduce((s, dp) => s + dp.adSpend!, 0) / withSpend.length;
}

/**
 * Compute the average price across historical data points that have price
 * recorded. Falls back to revenue / units when price is not explicitly set.
 *
 * @param history - Historical sales data.
 * @returns Average price, or 0 if no data.
 */
function computeAvgPrice(history: SalesDataPoint[]): number {
  const prices: number[] = [];
  for (const dp of history) {
    if (dp.price != null && dp.price > 0) {
      prices.push(dp.price);
    } else if (dp.units > 0 && dp.revenue > 0) {
      prices.push(dp.revenue / dp.units);
    }
  }
  if (prices.length === 0) return 0;
  return prices.reduce((s, p) => s + p, 0) / prices.length;
}

/**
 * Compute the historical channel share for the dominant channel in the data.
 *
 * When `config.channelShare` is provided, this is used for the planned share
 * and the historical share is derived from the data. When the data has no
 * channel information, returns 0 (which will cause the channel effect to
 * default to 1.0).
 *
 * @param history - Historical sales data.
 * @returns The share (0-1) of the most common channel, or 0 if no channels.
 */
function computeHistoricalChannelShare(history: SalesDataPoint[]): number {
  const withChannel = history.filter(
    (dp) => dp.channel != null && dp.channel !== ""
  );
  if (withChannel.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const dp of withChannel) {
    counts.set(dp.channel!, (counts.get(dp.channel!) ?? 0) + dp.units);
  }

  const totalUnits = withChannel.reduce((s, dp) => s + dp.units, 0);
  if (totalUnits === 0) return 0;

  let maxUnits = 0;
  for (const units of counts.values()) {
    if (units > maxUnits) maxUnits = units;
  }

  return maxUnits / totalUnits;
}

// ---------------------------------------------------------------------------
// Main forecast generator
// ---------------------------------------------------------------------------

/**
 * Generate a multi-period demand forecast from historical sales data.
 *
 * Applies the multiplicative formula:
 *
 *   Forecast = Baseline x Seasonality Index x Marketing Uplift x Price Impact x Channel Effects
 *
 * Each component defaults to 1.0 when its input data is missing, so the
 * engine degrades gracefully with sparse data. Confidence intervals are
 * computed at 95% using +/- 1.96 standard deviations of historical residuals.
 *
 * @param history - Array of historical sales data points (weekly or monthly).
 * @param config  - Optional forecast configuration overrides.
 * @returns An array of {@link ForecastResult} objects, one per forecast period.
 *
 * @example
 * ```ts
 * const results = generateForecast(salesHistory, {
 *   alpha: 0.2,
 *   plannedAdSpend: 15000,
 *   plannedPrice: 29.99,
 *   forecastPeriods: 6,
 * });
 * ```
 */
export function generateForecast(
  history: SalesDataPoint[],
  config?: ForecastConfig
): ForecastResult[] {
  const {
    alpha = DEFAULT_ALPHA,
    marketingElasticity = DEFAULT_MARKETING_ELASTICITY,
    priceElasticity = DEFAULT_PRICE_ELASTICITY,
    plannedAdSpend,
    plannedPrice,
    channelShare,
    forecastPeriods = DEFAULT_FORECAST_PERIODS,
  } = config ?? {};

  // Edge case: no history
  if (history.length === 0) {
    return [];
  }

  // Sort chronologically
  const sorted = [...history].sort((a, b) => a.period.localeCompare(b.period));
  const lastPeriod = sorted[sorted.length - 1].period;

  // Pre-compute components
  const baseline = calculateBaseline(sorted, alpha);
  const seasonalIndices = computeSeasonalityIndices(sorted);
  const avgAdSpend = computeAvgAdSpend(sorted);
  const avgPrice = computeAvgPrice(sorted);
  const historicalChannelShare = computeHistoricalChannelShare(sorted);
  const residualStdDev = computeResidualStdDev(sorted, alpha, seasonalIndices);

  // Marketing uplift (constant across forecast periods since plannedAdSpend is singular)
  const mktUplift = calculateMarketingUplift(
    plannedAdSpend,
    avgAdSpend,
    marketingElasticity
  );

  // Price impact (constant across forecast periods)
  const priceImpactMultiplier = calculatePriceImpact(
    plannedPrice,
    avgPrice,
    priceElasticity
  );

  // Channel effect (constant across forecast periods)
  const chanEffect = calculateChannelEffect(channelShare, historicalChannelShare);

  // Generate forecast for each future period
  const results: ForecastResult[] = [];

  for (let step = 1; step <= forecastPeriods; step++) {
    const period = advancePeriod(lastPeriod, step);
    const seasonality = getSeasonalityIndex(period, seasonalIndices);

    const forecast =
      baseline * seasonality * mktUplift * priceImpactMultiplier * chanEffect;

    const roundedForecast = Math.max(0, Math.round(forecast * 100) / 100);
    const margin = CONFIDENCE_Z * residualStdDev;

    results.push({
      period,
      baseline: Math.round(baseline * 100) / 100,
      seasonalityIndex: Math.round(seasonality * 10000) / 10000,
      marketingUplift: Math.round(mktUplift * 10000) / 10000,
      priceImpact: Math.round(priceImpactMultiplier * 10000) / 10000,
      channelEffect: Math.round(chanEffect * 10000) / 10000,
      forecast: roundedForecast,
      confidenceLower: Math.max(0, Math.round((forecast - margin) * 100) / 100),
      confidenceUpper: Math.round((forecast + margin) * 100) / 100,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Legacy aliases (backward compatibility)
// ---------------------------------------------------------------------------

/**
 * Alias for {@link calculateBaseline} to maintain backward compatibility.
 * The new baseline calculation uses exponential smoothing by default.
 *
 * @deprecated Use calculateBaseline instead.
 */
export const calculateBaselineExponential = calculateBaseline;

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Calculate forecast accuracy as a percentage.
 *
 * @param forecast - The forecasted value.
 * @param actual   - The actual observed value.
 * @returns Accuracy percentage (e.g., 95.5 means 95.5% accurate).
 */
export function calculateAccuracy(forecast: number, actual: number): number {
  if (forecast === 0 && actual === 0) return 100;
  if (forecast === 0) return 0;
  const error = Math.abs(actual - forecast) / forecast;
  return Math.round((1 - error) * 1000) / 10;
}

/**
 * Calculate the gap between forecast and actual values.
 *
 * @param forecast - The forecasted value.
 * @param actual   - The actual observed value.
 * @returns An object with the absolute gap and percentage gap.
 */
export function calculateGap(
  forecast: number,
  actual: number
): { gap: number; gapPct: number } {
  const gap = actual - forecast;
  const gapPct = forecast > 0 ? Math.round((gap / forecast) * 1000) / 10 : 0;
  return { gap, gapPct };
}

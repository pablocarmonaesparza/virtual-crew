import { describe, it, expect } from 'vitest'
import {
  calculateBaseline,
  calculateBaselineExponential,
  getSeasonalityIndex,
  calculateMarketingUplift,
  calculatePriceImpact,
  calculateChannelEffect,
  generateForecast,
  calculateAccuracy,
  calculateGap,
} from '@/lib/forecast/engine'
import type { HistoricalDataPoint } from '@/lib/forecast/engine'

const SAMPLE_HISTORY: HistoricalDataPoint[] = [
  { month: '2025-10', sku_id: 'SKU1', channel: 'Shopify', units_sold: 800, ad_spend: 5000, price: 12.99 },
  { month: '2025-11', sku_id: 'SKU1', channel: 'Shopify', units_sold: 900, ad_spend: 5500, price: 12.99 },
  { month: '2025-12', sku_id: 'SKU1', channel: 'Shopify', units_sold: 1100, ad_spend: 7000, price: 12.99 },
  { month: '2026-01', sku_id: 'SKU1', channel: 'Shopify', units_sold: 850, ad_spend: 5200, price: 12.99 },
  { month: '2026-02', sku_id: 'SKU1', channel: 'Shopify', units_sold: 820, ad_spend: 5000, price: 12.99 },
]

// ── calculateBaseline ──

describe('calculateBaseline', () => {
  it('returns 0 for empty history', () => {
    expect(calculateBaseline([])).toBe(0)
  })

  it('calculates moving average from recent months', () => {
    const result = calculateBaseline(SAMPLE_HISTORY)
    expect(result).toBeGreaterThan(0)
    // With default 8-week window (~2 months), should use the 2 most recent
    // sorted desc: 2026-02 (820), 2026-01 (850) → avg 835
    expect(result).toBe(835)
  })

  it('uses custom window size', () => {
    // 4 weeks = ~1 month
    const result = calculateBaseline(SAMPLE_HISTORY, 4)
    // Only the most recent month: 820
    expect(result).toBe(820)
  })

  it('is deterministic (same inputs = same output)', () => {
    const r1 = calculateBaseline(SAMPLE_HISTORY)
    const r2 = calculateBaseline(SAMPLE_HISTORY)
    expect(r1).toBe(r2)
  })
})

// ── calculateBaselineExponential ──

describe('calculateBaselineExponential', () => {
  it('returns 0 for empty history', () => {
    expect(calculateBaselineExponential([])).toBe(0)
  })

  it('returns a reasonable value for sample history', () => {
    const result = calculateBaselineExponential(SAMPLE_HISTORY)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(2000)
  })

  it('is deterministic', () => {
    const r1 = calculateBaselineExponential(SAMPLE_HISTORY)
    const r2 = calculateBaselineExponential(SAMPLE_HISTORY)
    expect(r1).toBe(r2)
  })

  it('with alpha=1 returns the last value', () => {
    const result = calculateBaselineExponential(SAMPLE_HISTORY, 1.0)
    // alpha=1 means forecast = last actual value (sorted ascending: 2026-02 = 820)
    expect(result).toBe(820)
  })
})

// ── getSeasonalityIndex ──

describe('getSeasonalityIndex', () => {
  it('returns tea seasonality for December (peak)', () => {
    const index = getSeasonalityIndex('tea', 12)
    expect(index).toBe(1.25)
  })

  it('returns drinks seasonality for June (peak summer)', () => {
    const index = getSeasonalityIndex('drinks', 6)
    expect(index).toBe(1.25)
  })

  it('returns health_products seasonality for January', () => {
    const index = getSeasonalityIndex('health_products', 1)
    expect(index).toBe(1.10)
  })

  it('returns 1.0 for unknown category/month', () => {
    const index = getSeasonalityIndex('unknown' as never, 1)
    expect(index).toBe(1.0)
  })
})

// ── calculateMarketingUplift ──

describe('calculateMarketingUplift', () => {
  it('returns 1.0 when spend equals historical average', () => {
    const result = calculateMarketingUplift(5000, 5000)
    expect(result).toBe(1.0)
  })

  it('returns > 1.0 when spend increases', () => {
    const result = calculateMarketingUplift(10000, 5000)
    expect(result).toBeGreaterThan(1.0)
  })

  it('returns < 1.0 when spend decreases', () => {
    const result = calculateMarketingUplift(2500, 5000)
    expect(result).toBeLessThan(1.0)
  })

  it('returns 1.0 when historical average is 0', () => {
    expect(calculateMarketingUplift(5000, 0)).toBe(1.0)
  })

  it('respects custom elasticity', () => {
    const lowElasticity = calculateMarketingUplift(10000, 5000, 0.05)
    const highElasticity = calculateMarketingUplift(10000, 5000, 0.30)
    expect(highElasticity).toBeGreaterThan(lowElasticity)
  })
})

// ── calculatePriceImpact ──

describe('calculatePriceImpact', () => {
  it('returns 1.0 when price unchanged', () => {
    expect(calculatePriceImpact(12.99, 12.99)).toBe(1.0)
  })

  it('returns < 1.0 when price increases (negative elasticity)', () => {
    const result = calculatePriceImpact(14.99, 12.99)
    expect(result).toBeLessThan(1.0)
  })

  it('returns > 1.0 when price decreases', () => {
    const result = calculatePriceImpact(10.99, 12.99)
    expect(result).toBeGreaterThan(1.0)
  })

  it('returns 1.0 when baseline price is 0', () => {
    expect(calculatePriceImpact(12.99, 0)).toBe(1.0)
  })
})

// ── calculateChannelEffect ──

describe('calculateChannelEffect', () => {
  it('returns 1.0 with baseline conversion rate', () => {
    const result = calculateChannelEffect(1.0, 0.03, 0.03)
    expect(result).toBe(1.0)
  })

  it('returns > 1.0 with higher conversion rate', () => {
    const result = calculateChannelEffect(1.0, 0.06, 0.03)
    expect(result).toBeGreaterThan(1.0)
  })

  it('returns 1.0 when baseline conversion is 0', () => {
    expect(calculateChannelEffect(0.5, 0.03, 0)).toBe(1.0)
  })

  it('scales with channel share', () => {
    const full = calculateChannelEffect(1.0, 0.03, 0.03)
    const half = calculateChannelEffect(0.5, 0.03, 0.03)
    expect(half).toBeCloseTo(full * 0.5)
  })
})

// ── generateForecast ──

describe('generateForecast', () => {
  it('returns baseline, ambitious, and components', () => {
    const result = generateForecast({
      history: SAMPLE_HISTORY,
      category: 'tea',
      targetMonth: 12,
      plannedAdSpend: 5000,
      historicalAvgAdSpend: 5000,
      currentPrice: 12.99,
      baselinePrice: 12.99,
      channelShare: 1.0,
      conversionRate: 0.03,
    })

    expect(result).toHaveProperty('baseline')
    expect(result).toHaveProperty('ambitious')
    expect(result).toHaveProperty('components')
    expect(result.baseline).toBeGreaterThanOrEqual(0)
    expect(result.ambitious).toBeGreaterThanOrEqual(result.baseline)
  })

  it('ambitious is 25% above baseline by default', () => {
    const result = generateForecast({
      history: SAMPLE_HISTORY,
      category: 'tea',
      targetMonth: 6,
      plannedAdSpend: 5000,
      historicalAvgAdSpend: 5000,
      currentPrice: 12.99,
      baselinePrice: 12.99,
      channelShare: 1.0,
      conversionRate: 0.03,
    })

    // ambitious = Math.round(baseline * 1.25)
    expect(result.ambitious).toBe(Math.round(result.baseline * 1.25))
  })

  it('is deterministic', () => {
    const params = {
      history: SAMPLE_HISTORY,
      category: 'tea' as const,
      targetMonth: 3,
      plannedAdSpend: 5000,
      historicalAvgAdSpend: 5000,
      currentPrice: 12.99,
      baselinePrice: 12.99,
      channelShare: 1.0,
      conversionRate: 0.03,
    }
    const r1 = generateForecast(params)
    const r2 = generateForecast(params)
    expect(r1.baseline).toBe(r2.baseline)
    expect(r1.ambitious).toBe(r2.ambitious)
    expect(r1.components).toEqual(r2.components)
  })

  it('supports exponential smoothing method', () => {
    const result = generateForecast({
      history: SAMPLE_HISTORY,
      category: 'tea',
      targetMonth: 3,
      plannedAdSpend: 5000,
      historicalAvgAdSpend: 5000,
      currentPrice: 12.99,
      baselinePrice: 12.99,
      channelShare: 1.0,
      conversionRate: 0.03,
      method: 'exponential_smoothing',
    })
    expect(result.baseline).toBeGreaterThanOrEqual(0)
  })

  it('never returns negative values', () => {
    const result = generateForecast({
      history: [{ month: '2026-01', sku_id: 'X', channel: 'X', units_sold: 1, ad_spend: 0, price: 100 }],
      category: 'tea',
      targetMonth: 7,
      plannedAdSpend: 0,
      historicalAvgAdSpend: 10000,
      currentPrice: 200,
      baselinePrice: 10,
      channelShare: 0,
      conversionRate: 0,
    })
    expect(result.baseline).toBeGreaterThanOrEqual(0)
    expect(result.ambitious).toBeGreaterThanOrEqual(0)
  })
})

// ── calculateAccuracy ──

describe('calculateAccuracy', () => {
  it('returns 100% when forecast equals actual', () => {
    expect(calculateAccuracy(1000, 1000)).toBe(100)
  })

  it('returns > 100% when actual exceeds forecast', () => {
    expect(calculateAccuracy(1000, 1100)).toBeGreaterThan(100)
  })

  it('returns < 100% when actual is below forecast', () => {
    expect(calculateAccuracy(1000, 900)).toBeLessThan(100)
  })

  it('returns 0 when forecast is 0', () => {
    expect(calculateAccuracy(0, 500)).toBe(0)
  })
})

// ── calculateGap ──

describe('calculateGap', () => {
  it('returns 0 gap when forecast equals actual', () => {
    const result = calculateGap(1000, 1000)
    expect(result.gap).toBe(0)
    expect(result.gapPct).toBe(0)
  })

  it('returns positive gap when actual exceeds forecast', () => {
    const result = calculateGap(1000, 1100)
    expect(result.gap).toBe(100)
    expect(result.gapPct).toBe(10)
  })

  it('returns negative gap when actual is below forecast', () => {
    const result = calculateGap(1000, 900)
    expect(result.gap).toBe(-100)
    expect(result.gapPct).toBe(-10)
  })

  it('returns 0 gap pct when forecast is 0', () => {
    const result = calculateGap(0, 500)
    expect(result.gap).toBe(500)
    expect(result.gapPct).toBe(0)
  })
})

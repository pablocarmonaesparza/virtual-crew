import { describe, it, expect } from 'vitest'
import {
  calculateBaseline,
  computeSeasonalityIndices,
  getSeasonalityIndex,
  calculateMarketingUplift,
  calculatePriceImpact,
  calculateChannelEffect,
  generateForecast,
  calculateAccuracy,
  calculateGap,
  detectPeriodType,
} from '@/lib/forecast/engine'
import type { SalesDataPoint } from '@/lib/forecast/engine'

const SAMPLE_HISTORY: SalesDataPoint[] = [
  { period: '2025-10', units: 800, revenue: 10400, adSpend: 5000, price: 12.99 },
  { period: '2025-11', units: 900, revenue: 11700, adSpend: 5500, price: 12.99 },
  { period: '2025-12', units: 1100, revenue: 14300, adSpend: 7000, price: 12.99 },
  { period: '2026-01', units: 850, revenue: 11050, adSpend: 5200, price: 12.99 },
  { period: '2026-02', units: 820, revenue: 10660, adSpend: 5000, price: 12.99 },
]

// ── detectPeriodType ──

describe('detectPeriodType', () => {
  it('detects monthly periods', () => {
    expect(detectPeriodType('2025-10')).toBe('monthly')
  })

  it('detects weekly periods', () => {
    expect(detectPeriodType('2025-W42')).toBe('weekly')
  })
})

// ── calculateBaseline ──

describe('calculateBaseline', () => {
  it('returns a positive number for valid history', () => {
    const result = calculateBaseline(SAMPLE_HISTORY)
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThan(0)
  })

  it('returns 0 for empty input', () => {
    expect(calculateBaseline([])).toBe(0)
  })

  it('is deterministic', () => {
    const r1 = calculateBaseline(SAMPLE_HISTORY)
    const r2 = calculateBaseline(SAMPLE_HISTORY)
    expect(r1).toBe(r2)
  })

  it('with alpha=1 returns a reasonable smoothed value', () => {
    const result = calculateBaseline(SAMPLE_HISTORY, 1.0)
    // With alpha=1, strongly weights recent data
    expect(result).toBeGreaterThan(700)
    expect(result).toBeLessThan(1200)
  })
})

// ── computeSeasonalityIndices ──

describe('computeSeasonalityIndices', () => {
  it('returns a Map of indices', () => {
    const indices = computeSeasonalityIndices(SAMPLE_HISTORY)
    expect(indices).toBeInstanceOf(Map)
    expect(indices.size).toBeGreaterThan(0)
  })

  it('indices are centered around 1.0', () => {
    const indices = computeSeasonalityIndices(SAMPLE_HISTORY)
    const values = Array.from(indices.values())
    const avg = values.reduce((s, v) => s + v, 0) / values.length
    // Average should be near 1.0 (with small sample it may deviate slightly)
    expect(avg).toBeGreaterThan(0.5)
    expect(avg).toBeLessThan(2.0)
  })
})

// ── getSeasonalityIndex ──

describe('getSeasonalityIndex', () => {
  it('returns the index for a known period', () => {
    const indices = computeSeasonalityIndices(SAMPLE_HISTORY)
    const index = getSeasonalityIndex('2025-10', indices)
    expect(index).toBeGreaterThan(0)
  })

  it('returns 1.0 for an empty indices map', () => {
    const index = getSeasonalityIndex('2025-10', new Map())
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
  it('returns 1.0 when shares are equal', () => {
    expect(calculateChannelEffect(0.5, 0.5)).toBe(1.0)
  })

  it('returns > 1.0 when planned share increases', () => {
    expect(calculateChannelEffect(0.8, 0.5)).toBeGreaterThan(1.0)
  })

  it('returns < 1.0 when planned share decreases', () => {
    expect(calculateChannelEffect(0.3, 0.5)).toBeLessThan(1.0)
  })

  it('returns 1.0 when historical share is 0', () => {
    expect(calculateChannelEffect(0.5, 0)).toBe(1.0)
  })
})

// ── generateForecast ──

describe('generateForecast', () => {
  it('returns forecast results with all components', () => {
    const results = generateForecast(SAMPLE_HISTORY)
    expect(results.length).toBeGreaterThan(0)
    const first = results[0]
    expect(first).toHaveProperty('period')
    expect(first).toHaveProperty('baseline')
    expect(first).toHaveProperty('seasonalityIndex')
    expect(first).toHaveProperty('marketingUplift')
    expect(first).toHaveProperty('priceImpact')
    expect(first).toHaveProperty('channelEffect')
    expect(first).toHaveProperty('forecast')
    expect(first).toHaveProperty('confidenceLower')
    expect(first).toHaveProperty('confidenceUpper')
  })

  it('generates 3 periods by default', () => {
    const results = generateForecast(SAMPLE_HISTORY)
    expect(results.length).toBe(3)
  })

  it('respects forecastPeriods config', () => {
    const results = generateForecast(SAMPLE_HISTORY, { forecastPeriods: 6 })
    expect(results.length).toBe(6)
  })

  it('is deterministic', () => {
    const r1 = generateForecast(SAMPLE_HISTORY)
    const r2 = generateForecast(SAMPLE_HISTORY)
    expect(r1).toEqual(r2)
  })

  it('never returns negative forecast values', () => {
    const results = generateForecast([
      { period: '2026-01', units: 1, revenue: 10, adSpend: 0, price: 100 },
    ], {
      plannedAdSpend: 0,
      plannedPrice: 200,
    })
    results.forEach(r => {
      expect(r.forecast).toBeGreaterThanOrEqual(0)
      expect(r.confidenceLower).toBeGreaterThanOrEqual(0)
    })
  })

  it('confidence interval contains the forecast', () => {
    const results = generateForecast(SAMPLE_HISTORY)
    results.forEach(r => {
      expect(r.confidenceLower).toBeLessThanOrEqual(r.forecast)
      expect(r.confidenceUpper).toBeGreaterThanOrEqual(r.forecast)
    })
  })

  it('returns empty array for empty history', () => {
    expect(generateForecast([])).toEqual([])
  })
})

// ── calculateAccuracy ──

describe('calculateAccuracy', () => {
  it('returns 100% when forecast equals actual', () => {
    expect(calculateAccuracy(1000, 1000)).toBe(100)
  })

  it('returns < 100% when actual differs from forecast (over)', () => {
    // Accuracy = 1 - |error|, so any deviation reduces accuracy
    expect(calculateAccuracy(1000, 1100)).toBeLessThan(100)
  })

  it('returns < 100% when actual differs from forecast (under)', () => {
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

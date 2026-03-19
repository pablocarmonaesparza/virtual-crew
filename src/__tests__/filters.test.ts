import { describe, it, expect } from 'vitest'
import {
  getMonthsForTimeRange,
  filterForecastByTimeRange,
  filterSKUByCategory,
  filterAdSpendByPlatform,
  filterAdSpendByTimeRange,
  filterCACByChannel,
  filterCACByTimeRange,
} from '@/lib/utils/filters'
import {
  MOCK_FORECAST_TABLE,
  MOCK_SKU_TABLE,
  MOCK_AD_SPEND_TABLE,
  MOCK_CAC_TABLE,
} from '@/lib/mock-data'

// ── getMonthsForTimeRange ──

describe('getMonthsForTimeRange', () => {
  it('returns only the selected month for "mtd"', () => {
    const result = getMonthsForTimeRange('2026-03', 'mtd')
    expect(result).toEqual(['2026-03'])
  })

  it('returns 3 months for "3m"', () => {
    const result = getMonthsForTimeRange('2026-03', '3m')
    // 3 months back from March → Jan, Feb, Mar
    expect(result).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('returns 6 months for "6m"', () => {
    const result = getMonthsForTimeRange('2026-03', '6m')
    expect(result).toHaveLength(6)
    expect(result[0]).toBe('2025-10')
    expect(result[result.length - 1]).toBe('2026-03')
  })

  it('returns 12 months for "12m"', () => {
    const result = getMonthsForTimeRange('2026-03', '12m')
    expect(result).toHaveLength(12)
    expect(result[0]).toBe('2025-04')
    expect(result[result.length - 1]).toBe('2026-03')
  })

  it('returns from January for "ytd"', () => {
    const result = getMonthsForTimeRange('2026-03', 'ytd')
    expect(result).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('returns ytd for January (just January)', () => {
    const result = getMonthsForTimeRange('2026-01', 'ytd')
    expect(result).toEqual(['2026-01'])
  })
})

// ── filterForecastByTimeRange ──

describe('filterForecastByTimeRange', () => {
  it('filters forecast rows by months array', () => {
    const months = ['2025-10', '2025-11']
    const result = filterForecastByTimeRange(MOCK_FORECAST_TABLE, months)
    expect(result).toHaveLength(2)
    expect(result.every((r) => months.includes(r.month))).toBe(true)
  })

  it('returns empty array if no months match', () => {
    const result = filterForecastByTimeRange(MOCK_FORECAST_TABLE, ['2020-01'])
    expect(result).toHaveLength(0)
  })

  it('returns all rows when all months are included', () => {
    const allMonths = MOCK_FORECAST_TABLE.map((r) => r.month)
    const result = filterForecastByTimeRange(MOCK_FORECAST_TABLE, allMonths)
    expect(result).toHaveLength(MOCK_FORECAST_TABLE.length)
  })
})

// ── filterSKUByCategory ──

describe('filterSKUByCategory', () => {
  it('returns all SKUs when category is "all"', () => {
    const result = filterSKUByCategory(MOCK_SKU_TABLE, 'all')
    expect(result).toHaveLength(MOCK_SKU_TABLE.length)
  })

  it('filters by "tea" category', () => {
    const result = filterSKUByCategory(MOCK_SKU_TABLE, 'tea')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.category === 'tea')).toBe(true)
  })

  it('filters by "drinks" category', () => {
    const result = filterSKUByCategory(MOCK_SKU_TABLE, 'drinks')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.category === 'drinks')).toBe(true)
  })

  it('filters by "health_products" category', () => {
    const result = filterSKUByCategory(MOCK_SKU_TABLE, 'health_products')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.category === 'health_products')).toBe(true)
  })
})

// ── filterAdSpendByPlatform ──

describe('filterAdSpendByPlatform', () => {
  it('returns all rows when platform is "all"', () => {
    const result = filterAdSpendByPlatform(MOCK_AD_SPEND_TABLE, 'all')
    expect(result).toHaveLength(MOCK_AD_SPEND_TABLE.length)
  })

  it('filters to Meta Ads only', () => {
    const result = filterAdSpendByPlatform(MOCK_AD_SPEND_TABLE, 'meta')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.platform === 'Meta Ads')).toBe(true)
  })

  it('filters to Amazon Ads only', () => {
    const result = filterAdSpendByPlatform(MOCK_AD_SPEND_TABLE, 'amazon_ads')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.platform === 'Amazon Ads')).toBe(true)
  })
})

// ── filterAdSpendByTimeRange ──

describe('filterAdSpendByTimeRange', () => {
  it('filters ad spend rows by months', () => {
    const months = ['2025-10', '2025-11']
    const result = filterAdSpendByTimeRange(MOCK_AD_SPEND_TABLE, months)
    expect(result.every((r) => months.includes(r.month))).toBe(true)
    // Two platforms per month
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('returns empty array for non-matching months', () => {
    const result = filterAdSpendByTimeRange(MOCK_AD_SPEND_TABLE, ['2020-01'])
    expect(result).toHaveLength(0)
  })
})

// ── filterCACByChannel ──

describe('filterCACByChannel', () => {
  it('returns all rows when channel is "all"', () => {
    const result = filterCACByChannel(MOCK_CAC_TABLE, 'all')
    expect(result).toHaveLength(MOCK_CAC_TABLE.length)
  })

  it('filters to Shopify only', () => {
    const result = filterCACByChannel(MOCK_CAC_TABLE, 'shopify')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.channel === 'Shopify')).toBe(true)
  })

  it('filters to Amazon only', () => {
    const result = filterCACByChannel(MOCK_CAC_TABLE, 'amazon')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.channel === 'Amazon')).toBe(true)
  })
})

// ── filterCACByTimeRange ──

describe('filterCACByTimeRange', () => {
  it('filters CAC rows by months', () => {
    const months = ['2026-01', '2026-02']
    const result = filterCACByTimeRange(MOCK_CAC_TABLE, months)
    expect(result.every((r) => months.includes(r.month))).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('returns empty array for non-matching months', () => {
    const result = filterCACByTimeRange(MOCK_CAC_TABLE, ['2020-01'])
    expect(result).toHaveLength(0)
  })
})

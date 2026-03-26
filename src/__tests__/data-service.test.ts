import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all external dependencies before importing the service
vi.mock('@/lib/shopify/client', () => ({
  isShopifyConnected: vi.fn().mockResolvedValue(false),
  getOrders: vi.fn().mockResolvedValue([]),
  getCustomers: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/supabase/queries', () => ({
  getSalesDailyFromDB: vi.fn().mockRejectedValue(new Error('No Supabase')),
  getSKUDataFromDB: vi.fn().mockRejectedValue(new Error('No Supabase')),
  getKPIDataFromDB: vi.fn().mockRejectedValue(new Error('No Supabase')),
  getAdSpendFromDB: vi.fn().mockRejectedValue(new Error('No Supabase')),
  hasSupabaseData: vi.fn().mockRejectedValue(new Error('No Supabase')),
}))

vi.mock('@/lib/shopify/transform', () => ({
  transformRawOrders: vi.fn().mockReturnValue([]),
  transformOrdersToForecast: vi.fn().mockReturnValue([]),
  transformOrdersToSKUTable: vi.fn().mockReturnValue([]),
  transformOrdersToKPI: vi.fn().mockReturnValue({}),
  transformCustomersToCAC: vi.fn().mockReturnValue([]),
}))

import {
  getForecastData,
  getSKUData,
  getKPIData,
  getAdSpendData,
  getCACData,
  getActiveDataSource,
} from '@/lib/data/service'
import {
  MOCK_FORECAST_TABLE,
  MOCK_SKU_TABLE,
  MOCK_KPI_DATA,
  MOCK_AD_SPEND_TABLE,
  MOCK_CAC_TABLE,
} from '@/lib/mock-data'

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getActiveDataSource ──

describe('getActiveDataSource', () => {
  it('returns "mock" when Supabase and Shopify are not connected', async () => {
    const source = await getActiveDataSource()
    expect(source).toBe('mock')
  })
})

// ── getForecastData ──

describe('getForecastData', () => {
  it('returns mock forecast data when no live data sources', async () => {
    const result = await getForecastData()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('each row has required ForecastTableRow fields', async () => {
    const result = await getForecastData()
    for (const row of result) {
      expect(row).toHaveProperty('month')
      expect(row).toHaveProperty('forecast_baseline')
      expect(row).toHaveProperty('forecast_ambitious')
      expect(typeof row.month).toBe('string')
      expect(typeof row.forecast_baseline).toBe('number')
      expect(typeof row.forecast_ambitious).toBe('number')
    }
  })

  it('returns the same data as MOCK_FORECAST_TABLE', async () => {
    const result = await getForecastData()
    expect(result).toEqual(MOCK_FORECAST_TABLE)
  })
})

// ── getSKUData ──

describe('getSKUData', () => {
  it('returns mock SKU data', async () => {
    const result = await getSKUData()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('each row has required SKUTableRow fields', async () => {
    const result = await getSKUData()
    for (const row of result) {
      expect(row).toHaveProperty('sku_id')
      expect(row).toHaveProperty('sku_title')
      expect(row).toHaveProperty('product_type')
      expect(row).toHaveProperty('category')
      expect(row).toHaveProperty('months')
      expect(typeof row.months).toBe('object')
    }
  })

  it('filters by category when provided', async () => {
    const result = await getSKUData({ category: 'tea' } as never)
    expect(result.every((r) => r.category === 'tea')).toBe(true)
  })
})

// ── getKPIData ──

describe('getKPIData', () => {
  it('returns mock KPI data', async () => {
    const result = await getKPIData()
    expect(result).toBeDefined()
    expect(typeof result.total_revenue).toBe('number')
  })

  it('has all required KPIData fields', async () => {
    const result = await getKPIData()
    expect(result).toHaveProperty('total_revenue')
    expect(result).toHaveProperty('revenue_mom_change')
    expect(result).toHaveProperty('forecast_accuracy')
    expect(result).toHaveProperty('accuracy_mom_change')
    expect(result).toHaveProperty('total_ad_spend')
    expect(result).toHaveProperty('ad_spend_mom_change')
    expect(result).toHaveProperty('average_cac')
    expect(result).toHaveProperty('cac_mom_change')
    expect(result).toHaveProperty('gap_to_baseline')
    expect(result).toHaveProperty('gap_to_ambitious')
  })

  it('returns the same data as MOCK_KPI_DATA', async () => {
    const result = await getKPIData()
    expect(result).toEqual(MOCK_KPI_DATA)
  })
})

// ── getAdSpendData ──

describe('getAdSpendData', () => {
  it('returns mock ad spend data', async () => {
    const result = await getAdSpendData()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('each row has required AdSpendTableRow fields', async () => {
    const result = await getAdSpendData()
    for (const row of result) {
      expect(row).toHaveProperty('month')
      expect(row).toHaveProperty('platform')
      expect(row).toHaveProperty('spend')
      expect(row).toHaveProperty('impressions')
      expect(row).toHaveProperty('clicks')
    }
  })

  it('filters by platform when provided', async () => {
    const result = await getAdSpendData({ adsPlatform: 'meta' } as never)
    expect(result.every((r) => r.platform === 'Meta Ads')).toBe(true)
  })

  it('returns all when platform is "all"', async () => {
    const result = await getAdSpendData({ adsPlatform: 'all' } as never)
    expect(result).toEqual(MOCK_AD_SPEND_TABLE)
  })
})

// ── getCACData ──

describe('getCACData', () => {
  it('returns mock CAC data', async () => {
    const result = await getCACData()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('each row has required CACTableRow fields', async () => {
    const result = await getCACData()
    for (const row of result) {
      expect(row).toHaveProperty('month')
      expect(row).toHaveProperty('channel')
      expect(row).toHaveProperty('new_customers')
      expect(row).toHaveProperty('new_cac')
      expect(row).toHaveProperty('returning_customers')
      expect(row).toHaveProperty('total_cac')
    }
  })

  it('returns the same data as MOCK_CAC_TABLE', async () => {
    const result = await getCACData()
    expect(result).toEqual(MOCK_CAC_TABLE)
  })
})

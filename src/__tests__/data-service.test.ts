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
  it('returns empty array when no live data sources (no mock fallback)', async () => {
    const result = await getForecastData()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })
})

// ── getSKUData ──

describe('getSKUData', () => {
  it('returns empty array when no live data sources (no mock fallback)', async () => {
    const result = await getSKUData()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
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

  it('returns zero KPIs when no sources connected (no mock fallback)', async () => {
    const result = await getKPIData()
    expect(result.total_revenue).toBe(0)
    expect(typeof result.total_ad_spend).toBe('number')
  })
})

// ── getAdSpendData ──

describe('getAdSpendData', () => {
  it('returns empty array when no live data sources (no mock fallback)', async () => {
    const result = await getAdSpendData()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })
})

// ── getCACData ──

describe('getCACData', () => {
  it('returns empty array when no live data sources (no mock fallback)', async () => {
    const result = await getCACData()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })
})

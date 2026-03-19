import { describe, it, expect } from 'vitest'
import {
  transformRawOrders,
  transformOrdersToForecast,
  transformOrdersToSKUTable,
  transformOrdersToKPI,
  transformCustomersToCAC,
} from '@/lib/shopify/transform'
import type { ShopifyRawOrder, ShopifyRawCustomer } from '@/lib/shopify/client'
import type { ShopifyOrder } from '@/types'

// ── Mock data ──

const MOCK_RAW_ORDERS: ShopifyRawOrder[] = [
  {
    id: 1001,
    name: '#1001',
    created_at: '2026-01-15T10:00:00Z',
    total_price: '25.98',
    subtotal_price: '25.98',
    total_discounts: '0.00',
    financial_status: 'paid',
    customer: { id: 100, orders_count: 1, email: 'new@test.com' },
    line_items: [
      { id: 1, product_id: 10, variant_id: 100, title: 'Water Kefir', sku: 'ADMWKBLK6', quantity: 2, price: '12.99', total_discount: '0' },
    ],
    tags: '',
  },
  {
    id: 1002,
    name: '#1002',
    created_at: '2026-01-20T14:00:00Z',
    total_price: '38.97',
    subtotal_price: '38.97',
    total_discounts: '3.00',
    financial_status: 'paid',
    customer: { id: 101, orders_count: 5, email: 'returning@test.com' },
    line_items: [
      { id: 2, product_id: 11, variant_id: 101, title: 'Romedio Infusion', sku: 'ADMREMXC3', quantity: 3, price: '12.99', total_discount: '3' },
    ],
    tags: 'subscription',
  },
  {
    id: 1003,
    name: '#1003',
    created_at: '2026-02-10T09:00:00Z',
    total_price: '12.99',
    subtotal_price: '12.99',
    total_discounts: '0.00',
    financial_status: 'paid',
    customer: null,
    line_items: [
      { id: 3, product_id: 12, variant_id: 102, title: 'Culture Shots', sku: 'ADMCSTUR3', quantity: 1, price: '12.99', total_discount: '0' },
    ],
    tags: '',
  },
]

const MOCK_RAW_CUSTOMERS: ShopifyRawCustomer[] = [
  { id: 100, email: 'new@test.com', first_name: 'Alice', last_name: 'Smith', orders_count: 1, total_spent: '25.98', created_at: '2026-01-15T10:00:00Z', tags: '' },
  { id: 101, email: 'returning@test.com', first_name: 'Bob', last_name: 'Jones', orders_count: 5, total_spent: '200.00', created_at: '2025-06-01T00:00:00Z', tags: 'vip' },
]

// ── transformRawOrders ──

describe('transformRawOrders', () => {
  it('converts raw orders to ShopifyOrder[]', () => {
    const result = transformRawOrders(MOCK_RAW_ORDERS)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3) // 3 line items across 3 orders
  })

  it('sets customer_type correctly based on orders_count', () => {
    const result = transformRawOrders(MOCK_RAW_ORDERS)
    // Order 1001: customer orders_count=1 → new
    const order1 = result.find((o) => o.order_id === '#1001')
    expect(order1?.customer_type).toBe('new')

    // Order 1002: customer orders_count=5 → returning
    const order2 = result.find((o) => o.order_id === '#1002')
    expect(order2?.customer_type).toBe('returning')
  })

  it('handles null customer as new', () => {
    const result = transformRawOrders(MOCK_RAW_ORDERS)
    // Order 1003: customer is null → new
    const order3 = result.find((o) => o.order_id === '#1003')
    expect(order3?.customer_type).toBe('new')
  })

  it('detects subscription orders from tags', () => {
    const result = transformRawOrders(MOCK_RAW_ORDERS)
    const subOrder = result.find((o) => o.order_id === '#1002')
    expect(subOrder?.subscription_type).toBe('subscription')

    const nonSubOrder = result.find((o) => o.order_id === '#1001')
    expect(nonSubOrder?.subscription_type).toBe('one-time')
  })

  it('calculates gross_revenue and net_revenue', () => {
    const result = transformRawOrders(MOCK_RAW_ORDERS)
    const order2 = result.find((o) => o.order_id === '#1002')
    // price=12.99, quantity=3, discount=3
    expect(order2?.gross_revenue).toBeCloseTo(12.99 * 3)
    expect(order2?.net_revenue).toBeCloseTo(12.99 * 3 - 3)
  })

  it('sets channel to Shopify', () => {
    const result = transformRawOrders(MOCK_RAW_ORDERS)
    expect(result.every((o) => o.channel === 'Shopify')).toBe(true)
  })

  it('returns empty array for empty input', () => {
    expect(transformRawOrders([])).toEqual([])
  })
})

// ── transformOrdersToForecast ──

describe('transformOrdersToForecast', () => {
  it('returns ForecastTableRow[] grouped by month', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformOrdersToForecast(orders)
    expect(Array.isArray(result)).toBe(true)
    // We have orders in 2026-01 and 2026-02, so 2 months
    expect(result.length).toBe(2)
  })

  it('each row has required fields', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformOrdersToForecast(orders)
    for (const row of result) {
      expect(row).toHaveProperty('month')
      expect(row).toHaveProperty('forecast_baseline')
      expect(row).toHaveProperty('forecast_ambitious')
      expect(row).toHaveProperty('actual')
      expect(typeof row.forecast_baseline).toBe('number')
      expect(typeof row.forecast_ambitious).toBe('number')
    }
  })

  it('months are sorted ascending', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformOrdersToForecast(orders)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].month > result[i - 1].month).toBe(true)
    }
  })

  it('returns empty array for empty input', () => {
    expect(transformOrdersToForecast([])).toEqual([])
  })
})

// ── transformOrdersToSKUTable ──

describe('transformOrdersToSKUTable', () => {
  it('returns SKUTableRow[] grouped by SKU', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformOrdersToSKUTable(orders)
    expect(Array.isArray(result)).toBe(true)
    // 3 unique SKUs in our test data
    expect(result.length).toBe(3)
  })

  it('each row has sku_id, sku_title, product_type, category, months', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformOrdersToSKUTable(orders)
    for (const row of result) {
      expect(row).toHaveProperty('sku_id')
      expect(row).toHaveProperty('sku_title')
      expect(row).toHaveProperty('product_type')
      expect(row).toHaveProperty('category')
      expect(row).toHaveProperty('months')
      expect(typeof row.months).toBe('object')
    }
  })

  it('maps known SKUs from the catalog', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformOrdersToSKUTable(orders)
    const wkRow = result.find((r) => r.sku_id === 'ADMWKBLK6')
    expect(wkRow?.category).toBe('drinks')
    expect(wkRow?.product_type).toBe('Water Kefir')
  })

  it('returns empty array for empty input', () => {
    expect(transformOrdersToSKUTable([])).toEqual([])
  })
})

// ── transformOrdersToKPI ──

describe('transformOrdersToKPI', () => {
  it('returns a KPIData object', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformOrdersToKPI(orders)
    expect(result).toHaveProperty('total_revenue')
    expect(result).toHaveProperty('revenue_mom_change')
    expect(result).toHaveProperty('forecast_accuracy')
    expect(result).toHaveProperty('gap_to_baseline')
    expect(result).toHaveProperty('gap_to_ambitious')
  })

  it('total_revenue is a number >= 0', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformOrdersToKPI(orders)
    expect(typeof result.total_revenue).toBe('number')
    expect(result.total_revenue).toBeGreaterThanOrEqual(0)
  })

  it('returns zero-value KPI for empty orders', () => {
    const result = transformOrdersToKPI([])
    expect(result.total_revenue).toBe(0)
    expect(result.forecast_accuracy).toBe(0)
  })
})

// ── transformCustomersToCAC ──

describe('transformCustomersToCAC', () => {
  it('returns CACTableRow[]', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformCustomersToCAC(orders, MOCK_RAW_CUSTOMERS)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('each row has required CAC fields', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformCustomersToCAC(orders, MOCK_RAW_CUSTOMERS)
    for (const row of result) {
      expect(row).toHaveProperty('month')
      expect(row).toHaveProperty('channel')
      expect(row).toHaveProperty('new_customers')
      expect(row).toHaveProperty('new_cac')
      expect(row).toHaveProperty('returning_customers')
      expect(row).toHaveProperty('returning_cac')
      expect(row).toHaveProperty('total_cac')
      expect(row).toHaveProperty('subscription_count')
      expect(row).toHaveProperty('subscription_revenue')
    }
  })

  it('channel is always "Shopify"', () => {
    const orders = transformRawOrders(MOCK_RAW_ORDERS)
    const result = transformCustomersToCAC(orders, MOCK_RAW_CUSTOMERS)
    expect(result.every((r) => r.channel === 'Shopify')).toBe(true)
  })

  it('returns empty array for empty orders', () => {
    const result = transformCustomersToCAC([], MOCK_RAW_CUSTOMERS)
    expect(result).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatNumber,
  formatPercent,
  formatDate,
  formatMonth,
  getMonthRange,
} from '@/lib/utils/format'

// ── formatCurrency ──

describe('formatCurrency', () => {
  it('formats a positive number with GBP symbol', () => {
    const result = formatCurrency(1234)
    expect(result).toContain('1,234')
    expect(result).toContain('£')
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toContain('£')
    expect(result).toContain('0')
  })

  it('formats large numbers with comma separators', () => {
    const result = formatCurrency(187450)
    expect(result).toContain('187,450')
  })

  it('rounds to no decimal places', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1,235')
  })

  it('formats negative numbers', () => {
    const result = formatCurrency(-500)
    expect(result).toContain('500')
  })
})

// ── formatCurrencyPrecise ──

describe('formatCurrencyPrecise', () => {
  it('includes 2 decimal places', () => {
    const result = formatCurrencyPrecise(18.50)
    expect(result).toContain('£')
    expect(result).toContain('18.50')
  })

  it('pads to 2 decimals', () => {
    const result = formatCurrencyPrecise(100)
    expect(result).toContain('100.00')
  })
})

// ── formatNumber ──

describe('formatNumber', () => {
  it('formats integers with comma separators', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('formats decimal numbers', () => {
    const result = formatNumber(1234.56)
    expect(result).toContain('1,234')
  })
})

// ── formatPercent ──

describe('formatPercent', () => {
  it('formats positive percent with + sign by default', () => {
    expect(formatPercent(8.3)).toBe('+8.3%')
  })

  it('formats negative percent without extra sign', () => {
    expect(formatPercent(-5.2)).toBe('-5.2%')
  })

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('omits + sign when showSign is false', () => {
    expect(formatPercent(8.3, false)).toBe('8.3%')
  })

  it('handles decimal precision', () => {
    expect(formatPercent(3.14159)).toBe('+3.1%')
  })
})

// ── formatDate ──

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2026-03-15')
    // en-GB: "15 Mar 2026"
    expect(result).toContain('Mar')
    expect(result).toContain('2026')
  })

  it('formats a Date object', () => {
    const result = formatDate(new Date(2026, 0, 1))
    expect(result).toContain('Jan')
    expect(result).toContain('2026')
  })
})

// ── formatMonth ──

describe('formatMonth', () => {
  it('formats "2026-03" as "Mar 2026"', () => {
    const result = formatMonth('2026-03')
    expect(result).toContain('Mar')
    expect(result).toContain('2026')
  })

  it('formats "2025-12" as "Dec 2025"', () => {
    const result = formatMonth('2025-12')
    expect(result).toContain('Dec')
    expect(result).toContain('2025')
  })

  it('formats "2026-01" as "Jan 2026"', () => {
    const result = formatMonth('2026-01')
    expect(result).toContain('Jan')
    expect(result).toContain('2026')
  })
})

// ── getMonthRange ──

describe('getMonthRange', () => {
  it('returns the correct number of months', () => {
    const result = getMonthRange(0, 3)
    expect(result).toHaveLength(3)
  })

  it('each month is in YYYY-MM format', () => {
    const result = getMonthRange(-2, 4)
    for (const m of result) {
      expect(m).toMatch(/^\d{4}-\d{2}$/)
    }
  })

  it('months are sequential', () => {
    const result = getMonthRange(0, 6)
    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1] + '-01')
      const curr = new Date(result[i] + '-01')
      // Each month should be 1 month after the previous
      const diffMonths =
        (curr.getFullYear() - prev.getFullYear()) * 12 +
        (curr.getMonth() - prev.getMonth())
      expect(diffMonths).toBe(1)
    }
  })
})

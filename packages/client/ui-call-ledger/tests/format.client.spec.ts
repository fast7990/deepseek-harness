/** Call-ledger value formatting. */

import { describe, expect, it } from 'vitest'
import { formatClock, formatCount, formatDuration } from '../src/client/format.ts'
import { t } from './locale.client.ts'

describe('formatCount', () => {
  it('groups thousands with separators', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(1234)).toBe('1,234')
    expect(formatCount(1234567)).toBe('1,234,567')
  })
})

describe('formatClock', () => {
  it('renders a fixed 24-hour clock with padded parts', () => {
    expect(formatClock(new Date(2024, 0, 2, 3, 4, 5).getTime())).toBe('03:04:05')
    expect(formatClock(new Date(2024, 0, 2, 20, 3, 34).getTime())).toBe('20:03:34')
  })
})

describe('formatDuration', () => {
  it('renders whole milliseconds below one second', () => {
    expect(formatDuration(299, t)).toBe('299 ms')
  })

  it('renders seconds with one decimal below one minute', () => {
    expect(formatDuration(4_700, t)).toBe('4.7 s')
  })

  it('renders minutes with padded seconds above one minute', () => {
    expect(formatDuration(327_000, t)).toBe('5m27s')
  })

  it('renders the unknown marker without a finite duration', () => {
    expect(formatDuration(null, t)).toBe('—')
    expect(formatDuration(Number.POSITIVE_INFINITY, t)).toBe('—')
  })
})

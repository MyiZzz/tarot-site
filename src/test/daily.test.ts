import { describe, expect, it } from 'vitest'
import { buildDailySeed, createDailyReading, formatDailyLabel } from '../lib/daily'

describe('daily tarot helpers', () => {
  it('creates a stable daily seed for the same date', () => {
    const date = new Date(2026, 2, 8, 0, 30)

    expect(buildDailySeed(date)).toBe('daily-2026-03-08')
    expect(buildDailySeed(new Date(2026, 2, 8, 23, 59))).toBe(buildDailySeed(date))
    expect(buildDailySeed(new Date(2026, 2, 9, 0, 0))).toBe('daily-2026-03-09')
  })

  it('returns the same reading for the same date', () => {
    const date = new Date(2026, 2, 8, 0, 30)

    expect(createDailyReading(date)).toEqual(createDailyReading(date))
  })

  it('formats the daily label in Chinese', () => {
    const date = new Date(2026, 2, 8, 0, 30)

    expect(formatDailyLabel(date)).toContain('3月')
  })
})

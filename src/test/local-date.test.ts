import { describe, expect, it } from 'vitest'
import {
  buildLocalDateKey,
  formatLocalFileDate,
  getMillisecondsUntilNextLocalDay,
} from '../lib/localDate'

describe('local date helpers', () => {
  it('builds a stable local date key from local calendar values', () => {
    const date = new Date(2026, 2, 8, 0, 30, 0)

    expect(buildLocalDateKey(date)).toBe('2026-03-08')
    expect(formatLocalFileDate(date)).toBe('2026-03-08')
  })

  it.each([[2026, 0, 1], [2026, 3, 5], [2026, 9, 4], [2026, 11, 31]])(
    'uses the next local midnight across year and DST boundaries (%i/%i/%i)',
    (year, month, day) => {
      const date = new Date(year, month, day, 0, 30)
      const nextMidnight = new Date(year, month, day + 1)

      expect(getMillisecondsUntilNextLocalDay(date)).toBe(
        nextMidnight.getTime() - date.getTime(),
      )
    },
  )

  it('computes the remaining time until the next local day boundary', () => {
    const date = new Date(2026, 2, 8, 23, 59, 30, 0)

    expect(getMillisecondsUntilNextLocalDay(date)).toBe(30_000)
  })
})

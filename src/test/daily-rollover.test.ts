import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDailyReadingState } from '../hooks/useDailyReadingState'
import { createDailyReading } from '../lib/daily'
import { buildLocalDateKey, getMillisecondsUntilNextLocalDay } from '../lib/localDate'

describe('daily guidance at local midnight', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  // The timezone CI matrix exercises both hemispheres' DST transitions.
  it.each([
    [2026, 2, 7], [2026, 2, 8], [2026, 3, 4], [2026, 3, 5],
    [2026, 9, 3], [2026, 9, 4], [2026, 9, 31], [2026, 10, 1],
    [2026, 11, 31],
  ])('resets the revealed card after %i/%i/%i local midnight', (year, month, day) => {
    const beforeMidnight = new Date(year, month, day, 23, 59, 59, 900)
    const nextDay = new Date(year, month, day + 1)
    vi.setSystemTime(beforeMidnight)
    const { result, unmount } = renderHook(() => useDailyReadingState())

    act(() => {
      result.current.setDailyRevealed(true)
      result.current.setDailyMessage('Shared')
    })
    expect(result.current.dailyDateKey).toBe(buildLocalDateKey(beforeMidnight))
    expect(result.current.dailyReading).toEqual(createDailyReading())

    act(() => vi.advanceTimersByTime(99))
    expect(result.current.dailyRevealed).toBe(true)
    // The hook allows 50 ms beyond midnight before updating the calendar.
    act(() => vi.advanceTimersByTime(51))
    expect(result.current.dailyDateKey).toBe(buildLocalDateKey(nextDay))
    expect(result.current.dailyReading).toEqual(createDailyReading(nextDay))
    expect(result.current.dailyRevealed).toBe(false)
    expect(result.current.dailyMessage).toBeNull()

    // Re-scheduling must honor the actual next midnight, even on 23/25-hour days.
    act(() => vi.advanceTimersByTime(getMillisecondsUntilNextLocalDay() + 50))
    expect(result.current.dailyDateKey).toBe(
      buildLocalDateKey(new Date(year, month, day + 2)),
    )
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

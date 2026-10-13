import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as daily from '../lib/daily'
import { useDailyReadingState } from '../hooks/useDailyReadingState'

const clock = vi.hoisted(() => ({ date: new Date(2026, 9, 13, 12) }))
vi.mock('../hooks/useCurrentLocalDate', () => ({ useCurrentLocalDate: () => clock.date }))
afterEach(() => vi.restoreAllMocks())

describe('deferred daily readings', () => {
  it('loads after rendering and hides the previous reading when the date changes', async () => {
    const { result, rerender } = renderHook(() => useDailyReadingState())
    expect(result.current.dailyReading).toBeNull()
    await waitFor(() => expect(result.current.dailyReading).not.toBeNull())
    expect(result.current.dailyReading).toEqual(daily.createDailyReading(clock.date))
    act(() => result.current.setDailyRevealed(true))

    clock.date = new Date(2026, 9, 14, 12)
    rerender()
    expect(result.current.dailyReading).toBeNull()
    expect(result.current.dailyRevealed).toBe(false)
    await waitFor(() => expect(result.current.dailyReading).not.toBeNull())
    expect(result.current.dailyReading).toEqual(daily.createDailyReading(clock.date))
  })

  it('reports a failed load and lets the user retry', async () => {
    vi.spyOn(daily, 'createDailyReading').mockImplementationOnce(() => {
      throw new Error('Failed to load reading')
    })
    const { result } = renderHook(() => useDailyReadingState())
    await waitFor(() => expect(result.current.loadError).toContain('重试'))
    expect(result.current.dailyReading).toBeNull()
    act(() => result.current.retryLoad())
    await waitFor(() => expect(result.current.dailyReading).not.toBeNull())
    expect(result.current.loadError).toBeNull()
  })
})

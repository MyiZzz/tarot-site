import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useReadingSession } from '../hooks/useReadingSession'

it('tracks the drawn inputs without discarding the previous reading when editing', async () => {
  const { result } = renderHook(() => useReadingSession({
    preferences: { shuffleSpeed: 'fast', orientationMode: 'random' },
    records: [], shuffleDelayMs: 0, upsertRecord: vi.fn(() => []),
  }))
  act(() => {
    result.current.updateQuestion('接下来如何推进？')
    result.current.updateTopic('career')
    result.current.handleSelectSpread('holy-triangle')
  })
  await act(() => result.current.handleDraw())
  const reading = result.current.reading
  expect(reading).not.toBeNull()
  expect(result.current.readingReady).toBe(true)
  const changes = [
    () => result.current.updateQuestion('另一个问题'),
    () => result.current.updateTopic('love'),
    () => result.current.updateVariant('obstacle'),
    () => result.current.handleSelectSpread('daily-energy'),
  ]
  for (const change of changes) {
    act(change)
    expect(result.current.readingReady).toBe(false)
    expect(result.current.reading).toBe(reading)
    act(() => {
      result.current.updateQuestion(reading!.input.question)
      result.current.updateTopic(reading!.input.topic)
      result.current.handleSelectSpread(reading!.input.spreadId)
      result.current.updateVariant(reading!.input.variantId!)
    })
    expect(result.current.readingReady).toBe(true)
  }
})

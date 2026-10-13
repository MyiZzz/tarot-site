import type { ReadingResult } from '../domain/tarot'
import { createReading } from '../engine/reading'
import { buildLocalDateKey } from './localDate'

export const buildDailySeed = (date: Date = new Date()) => {
  return `daily-${buildLocalDateKey(date)}`
}

export { formatDailyLabel } from './localDate'

export const createDailyReading = (date: Date = new Date()): ReadingResult =>
  createReading(
    {
      question: '今天最值得留意的能量是什么？',
      topic: 'general',
      spreadId: 'daily-energy',
    },
    { seed: buildDailySeed(date) },
  )

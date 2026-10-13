import { useEffect, useMemo, useState } from 'react'
import type { ReadingResult } from '../domain/tarot'
import { buildLocalDateKey, formatDailyLabel } from '../lib/localDate'
import { useCurrentLocalDate } from './useCurrentLocalDate'

interface DailyClientState {
  message: string | null
  revealed: boolean
}

const createDefaultDailyState = (): DailyClientState => ({
  message: null,
  revealed: false,
})

export const useDailyReadingState = () => {
  const currentDate = useCurrentLocalDate()
  const [stateByDate, setStateByDate] = useState<Record<string, DailyClientState>>({})
  const dailyDateKey = buildLocalDateKey(currentDate)
  const currentState = stateByDate[dailyDateKey] ?? createDefaultDailyState()

  const [loaded, setLoaded] = useState<{ dateKey: string; reading: ReadingResult } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const dailyReading = loaded?.dateKey === dailyDateKey ? loaded.reading : null
  const dailyLabel = useMemo(() => formatDailyLabel(currentDate), [currentDate])

  useEffect(() => {
    let active = true
    import('../lib/daily')
      .then(({ createDailyReading }) => {
        if (active) {
          setLoaded({ dateKey: dailyDateKey, reading: createDailyReading(currentDate) })
          setLoadError(null)
        }
      })
      .catch(() => {
        if (active) setLoadError('今日指引加载失败，请重试。')
      })
    return () => {
      active = false
    }
  }, [currentDate, dailyDateKey, loadAttempt])

  const updateCurrentState = (
    updater: (current: DailyClientState) => DailyClientState,
  ) => {
    setStateByDate((current) => ({
      ...current,
      [dailyDateKey]: updater(current[dailyDateKey] ?? createDefaultDailyState()),
    }))
  }

  return {
    loadError,
    retryLoad: () => {
      setLoadError(null)
      setLoadAttempt((attempt) => attempt + 1)
    },
    dailyDate: currentDate,
    dailyDateKey,
    dailyLabel,
    dailyMessage: currentState.message,
    dailyReading,
    dailyRevealed: currentState.revealed,
    setDailyMessage: (message: string | null) =>
      updateCurrentState((current) => ({
        ...current,
        message,
      })),
    setDailyRevealed: (revealed: boolean) =>
      updateCurrentState((current) => ({
        ...current,
        revealed,
      })),
  }
}

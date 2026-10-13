import { useEffect, useRef, useState } from 'react'
import { SPREADS } from '../data/spreads'
import { TOPIC_BY_ID } from '../data/topics'
import type {
  FollowUpRecord,
  ReadingPreferences,
  ReadingRecord,
  ReadingResult,
  TopicId,
} from '../domain/tarot'
import {
  buildReadingRecordFromReading,
  buildReadingRecordId,
} from '../engine/storage'
import { buildReadingShareText, shareText } from '../lib/share'

const SHUFFLE_DELAY_BY_SPEED: Record<ReadingPreferences['shuffleSpeed'], number> = {
  fast: 480,
  normal: 980,
  slow: 1450,
}

const RE_DRAW_CONFIRM_WINDOW_MS = 30_000

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const createDefaultTitle = (question: string) =>
  question.trim().length <= 18 ? question.trim() : `${question.trim().slice(0, 18)}…`

const parseTags = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[，、\s]+/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  )

const createFollowUpRecord = (
  question: string,
  reading: ReadingResult,
): FollowUpRecord => ({
  id: createId(),
  question,
  createdAt: new Date().toISOString(),
  summary: reading.summary,
  tone: reading.tone,
  dominantSignals: reading.dominantSignals,
  leadAdvice: reading.advice[0] ?? '先记下你此刻最强烈的直觉。',
  cards: reading.cards.map((entry) => ({
    positionLabel: entry.positionLabel,
    cardName: entry.card.nameZh,
    orientation: entry.drawn.orientation,
  })),
})

export const FOLLOW_UP_SUGGESTIONS = [
  '如果我主动推进一次，会发生什么？',
  '这件事最值得优先处理的动作是什么？',
  '我需要先停下来校准什么？',
]

interface UseReadingSessionOptions {
  onOpenResult?: () => void
  preferences: ReadingPreferences
  records: ReadingRecord[]
  shuffleDelayMs?: number
  upsertRecord: (record: ReadingRecord) => ReadingRecord[]
}

export const useReadingSession = ({
  onOpenResult,
  preferences,
  records,
  shuffleDelayMs,
  upsertRecord,
}: UseReadingSessionOptions) => {
  const [question, setQuestion] = useState('')
  const [topic, setTopic] = useState<TopicId | null>(null)
  const [spreadId, setSpreadId] = useState<string | null>(null)
  const [variantId, setVariantId] = useState<string | undefined>(undefined)
  const [reading, setReading] = useState<ReadingResult | null>(null)
  const [revealedPositions, setRevealedPositions] = useState<string[]>([])
  const [isShuffling, setIsShuffling] = useState(false)
  const [actionPlanDoneIds, setActionPlanDoneIds] = useState<string[]>([])
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([])
  const [recordTitle, setRecordTitle] = useState('')
  const [recordTagsInput, setRecordTagsInput] = useState('')
  const [drawNotice, setDrawNotice] = useState<string | null>(null)
  const [recordNotice, setRecordNotice] = useState<string | null>(null)
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null)
  const [needsReDrawConfirm, setNeedsReDrawConfirm] = useState(false)
  const mountedRef = useRef(true)
  const drawingRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const lastDrawRef = useRef<{ signature: string; timestamp: number } | null>(null)

  const selectedTopic = topic ? TOPIC_BY_ID[topic] : null
  const selectedSpread = spreadId
    ? SPREADS.find((entry) => entry.id === spreadId) ?? null
    : null
  const selectedVariant =
    selectedSpread?.variants?.find((entry) => entry.id === variantId) ?? null
  const currentRecord =
    currentRecordId !== null
      ? records.find((entry) => entry.id === currentRecordId) ?? null
      : reading
        ? records.find((entry) => entry.id === buildReadingRecordId(reading)) ?? null
        : null
  const canDraw =
    question.trim().length > 0 &&
    topic !== null &&
    spreadId !== null &&
    !isShuffling
  const effectiveShuffleDelayMs =
    shuffleDelayMs ?? SHUFFLE_DELAY_BY_SPEED[preferences.shuffleSpeed]
  const allRevealed =
    reading !== null && revealedPositions.length === reading.cards.length

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const resetReDrawGuard = () => {
    setNeedsReDrawConfirm(false)
    setDrawNotice(null)
  }

  const persistReadingRecord = (
    saved: boolean,
    message: string | null = null,
    nextActionPlanDoneIds = actionPlanDoneIds,
    nextFollowUps = followUps,
  ) => {
    if (!reading) {
      return
    }

    const nextRecord = buildReadingRecordFromReading(reading, {
      recordId: currentRecord?.id ?? buildReadingRecordId(reading),
      createdAt: currentRecord?.createdAt,
      saved: saved || currentRecord?.saved || false,
      title: recordTitle.trim() || currentRecord?.title || reading.input.question,
      tags: parseTags(recordTagsInput),
      actionPlanDoneIds: nextActionPlanDoneIds,
      followUps: nextFollowUps,
    })

    upsertRecord(nextRecord)
    setCurrentRecordId(nextRecord.id)

    if (message) {
      setRecordNotice(message)
    }
  }

  const applyReading = (nextReading: ReadingResult) => {
    setReading(nextReading)
    setIsShuffling(false)
    setRevealedPositions([])
    setActionPlanDoneIds([])
    setFollowUps([])
    setFollowUpQuestion('')
    setCurrentRecordId(null)
    setRecordTitle(createDefaultTitle(nextReading.input.question))
    setRecordTagsInput(
      `${TOPIC_BY_ID[nextReading.input.topic].label} ${nextReading.spread.title}`,
    )
    setRecordNotice(null)
    setShareMessage(null)
    onOpenResult?.()
  }

  const handleSelectSpread = (nextSpreadId: string) => {
    const nextSpread = SPREADS.find((entry) => entry.id === nextSpreadId)
    resetReDrawGuard()
    setSpreadId(nextSpreadId)
    setVariantId(nextSpread?.variants?.[0]?.id)
  }

  const updateQuestion = (value: string) => {
    resetReDrawGuard()
    setQuestion(value)
  }

  const updateTopic = (nextTopic: TopicId) => {
    resetReDrawGuard()
    setTopic(nextTopic)
  }

  const updateVariant = (nextVariantId: string) => {
    resetReDrawGuard()
    setVariantId(nextVariantId)
  }

  const handleDraw = async () => {
    if (drawingRef.current || !canDraw || topic === null || spreadId === null) {
      return
    }

    const signature = `${question.trim()}|${topic}|${spreadId}|${variantId ?? 'base'}`
    const now = Date.now()
    const previous = lastDrawRef.current

    if (
      !needsReDrawConfirm &&
      previous !== null &&
      previous.signature === signature &&
      now - previous.timestamp <= RE_DRAW_CONFIRM_WINDOW_MS
    ) {
      setNeedsReDrawConfirm(true)
      setDrawNotice('30 秒内重复抽牌，请再次点击“洗牌并抽牌”确认重抽。')
      return
    }

    setNeedsReDrawConfirm(false)
    setDrawNotice(null)
    lastDrawRef.current = { signature, timestamp: now }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    drawingRef.current = true
    setIsShuffling(true)
    try {
      const { createReading } = await import('../engine/reading')
      if (!mountedRef.current) return
      const nextReading = createReading(
        {
          question: question.trim(),
          topic,
          spreadId,
          variantId,
        },
        {
          seed: `${now}-${question.trim()}-${topic}-${spreadId}-${variantId ?? 'base'}`,
          orientationMode: preferences.orientationMode,
        },
      )

      setReading(null)
      setRevealedPositions([])
      setRecordNotice(null)
      setShareMessage(null)

      if (effectiveShuffleDelayMs <= 0) {
        applyReading(nextReading)
        return
      }

      timerRef.current = window.setTimeout(
        () => applyReading(nextReading),
        Math.max(0, effectiveShuffleDelayMs - (Date.now() - now)),
      )
    } catch {
      if (!mountedRef.current) return
      setIsShuffling(false)
      lastDrawRef.current = null
      setDrawNotice('解读加载失败，请重试。')
    } finally {
      drawingRef.current = false
    }
  }

  const handleReveal = (positionKey: string) => {
    if (!reading || revealedPositions.includes(positionKey)) {
      return
    }

    const nextRevealedPositions = [...revealedPositions, positionKey]
    setRevealedPositions(nextRevealedPositions)

    if (nextRevealedPositions.length === reading.cards.length) {
      persistReadingRecord(false, '本次解读已自动归档。')
    }
  }

  const handleRevealAll = () => {
    if (!reading) {
      return
    }

    setRevealedPositions(reading.cards.map((entry) => entry.drawn.positionKey))
    persistReadingRecord(false, '本次解读已自动归档。')
  }

  const handleToggleActionPlan = (stepId: string) => {
    const nextActionPlanDoneIds = actionPlanDoneIds.includes(stepId)
      ? actionPlanDoneIds.filter((id) => id !== stepId)
      : [...actionPlanDoneIds, stepId]

    setActionPlanDoneIds(nextActionPlanDoneIds)

    if (reading && allRevealed) {
      persistReadingRecord(false, null, nextActionPlanDoneIds)
    }
  }

  const handleFollowUp = () => {
    if (!reading || followUpQuestion.trim().length === 0) {
      return
    }

    const nextFollowUps = [
      createFollowUpRecord(followUpQuestion.trim(), reading),
      ...followUps,
    ].slice(0, 6)

    setFollowUps(nextFollowUps)
    setFollowUpQuestion('')
    setRecordNotice('已记录新的追问线索。')

    if (allRevealed) {
      persistReadingRecord(false, null, actionPlanDoneIds, nextFollowUps)
    }
  }

  const handleSaveReading = () => {
    if (!reading) {
      return
    }

    persistReadingRecord(true, '已加入收藏。')
  }

  const handleShareReading = async () => {
    if (!reading) {
      return
    }

    try {
      const message = await shareText(
        '浮世塔罗',
        buildReadingShareText(reading, TOPIC_BY_ID[reading.input.topic].label),
      )
      setShareMessage(message)
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : '分享失败。')
    }
  }

  const handleDownloadReadingPoster = async () => {
    if (!reading) {
      return
    }

    try {
      const title = recordTitle.trim() || reading.input.question
      const message = await (await import('../lib/poster')).downloadPosterPng(
        {
          title,
          question: reading.input.question,
          spreadTitle: `${reading.spread.title}${
            reading.spread.activeVariantTitle
              ? ` 路 ${reading.spread.activeVariantTitle}`
              : ''
          }`,
          summary: reading.summary,
          cards: reading.cards.map((entry) => ({
            label: entry.positionLabel,
            cardName: entry.card.nameZh,
            orientation: entry.drawn.orientation,
          })),
        },
        `${title.replaceAll(/\s+/g, '-')}.png`,
      )
      setShareMessage(message)
    } catch (error) {
      setShareMessage(error instanceof Error ? error.message : '海报导出失败。')
    }
  }

  return {
    actionPlanDoneIds,
    allRevealed,
    canDraw,
    currentRecord,
    drawNotice,
    followUpQuestion,
    followUps,
    handleDraw,
    handleDownloadReadingPoster,
    handleFollowUp,
    handleReveal,
    handleRevealAll,
    handleSaveReading,
    handleSelectSpread,
    handleShareReading,
    handleToggleActionPlan,
    isShuffling,
    needsReDrawConfirm,
    question,
    reading,
    recordNotice,
    recordTagsInput,
    recordTitle,
    revealedPositions,
    selectedSpread,
    selectedTopic,
    selectedVariant,
    setFollowUpQuestion,
    setRecordTagsInput,
    setRecordTitle,
    shareMessage,
    spreadId,
    topic,
    updateQuestion,
    updateTopic,
    updateVariant,
    variantId,
  }
}

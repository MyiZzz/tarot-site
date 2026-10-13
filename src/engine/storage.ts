import type { LegacySavedReadingRecord, SavedReadingEntry } from '../domain/history'
import type {
  DailyReflection,
  FollowUpRecord,
  NarrativeMeta,
  ReportSections,
  ReadingRecord,
  ReadingRecordV2,
  ReadingRecordV3,
  ReadingResult,
  SavedActionPlanStep,
} from '../domain/tarot'
import { TOPIC_BY_ID } from '../data/topics'
import { buildLocalDateKey } from '../lib/localDate'

const RECORDS_KEY = 'ukiyo-tarot.records-v4'
const V3_RECORDS_KEY = 'ukiyo-tarot.records-v3'
const V2_RECORDS_KEY = 'ukiyo-tarot.records-v2'
const GUIDE_DISMISSED_KEY = 'ukiyo-tarot.guide-dismissed'
const LEGACY_SAVED_KEY = 'ukiyo-tarot.saved-readings'
const LEGACY_HISTORY_KEY = 'ukiyo-tarot:reading-history'
const MAX_RECORDS = 120

const canUseStorage = () =>
  typeof window !== 'undefined' && window.localStorage !== undefined

const readJson = <T>(key: string, fallback: T) => {
  if (!canUseStorage()) {
    return fallback
  }

  try {
    const rawValue = window.localStorage.getItem(key)

    if (!rawValue) {
      return fallback
    }

    return JSON.parse(rawValue) as T
  } catch {
    return fallback
  }
}

const writeJson = (key: string, value: unknown) => {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write failures.
  }
}

const hashContent = (value: string) => {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash.toString(36)
}

const normalizeReadingRecords = (records: ReadingRecord[]) =>
  records
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, MAX_RECORDS)

const getLegacySpreadMeta = (
  spreadId: string | undefined,
  spreadTitle: string,
  cards: Array<{ positionLabel: string }>,
) => {
  if (
    spreadId === 'past-present-future' ||
    spreadTitle.includes('过去') ||
    cards.every((card) => ['过去', '现在', '未来'].includes(card.positionLabel))
  ) {
    return {
      spreadId: 'holy-triangle',
      spreadTitle: '圣三角',
      variantId: 'timeline',
      variantTitle: '过去 / 现在 / 未来',
    }
  }

  if (
    spreadId === 'situation-obstacle-advice' ||
    spreadTitle.includes('阻碍') ||
    cards.every((card) => ['现状', '阻碍', '建议'].includes(card.positionLabel))
  ) {
    return {
      spreadId: 'holy-triangle',
      spreadTitle: '圣三角',
      variantId: 'diagnostic',
      variantTitle: '现状 / 阻碍 / 建议',
    }
  }

  return {
    spreadId: spreadId ?? (cards.length === 1 ? 'single-guidance' : 'weekly-flow'),
    spreadTitle,
    variantId: undefined,
    variantTitle: undefined,
  }
}

const toSavedSteps = (
  actionPlan: SavedActionPlanStep[] | undefined,
): SavedActionPlanStep[] => actionPlan ?? []

const createFallbackNarrativeMeta = (text: string): NarrativeMeta => ({
  targetLength: Math.max(420, text.length),
  actualLength: text.length,
  coverageScore: 0.45,
  validationPassed: false,
})

const normalizeNarrativeMeta = (
  value: unknown,
  fallbackText: string,
): NarrativeMeta => {
  if (!value || typeof value !== 'object') {
    return createFallbackNarrativeMeta(fallbackText)
  }

  const meta = value as Partial<NarrativeMeta>
  const targetLength =
    typeof meta.targetLength === 'number' && Number.isFinite(meta.targetLength)
      ? Math.max(0, Math.round(meta.targetLength))
      : Math.max(420, fallbackText.length)
  const actualLength =
    typeof meta.actualLength === 'number' && Number.isFinite(meta.actualLength)
      ? Math.max(0, Math.round(meta.actualLength))
      : fallbackText.length
  const coverageScore =
    typeof meta.coverageScore === 'number' && Number.isFinite(meta.coverageScore)
      ? Math.min(1, Math.max(0, meta.coverageScore))
      : 0.45

  return {
    targetLength,
    actualLength,
    coverageScore,
    validationPassed: meta.validationPassed === true,
  }
}

const getLeadingSentences = (text: string, count: number) => {
  const sentences = text
    .split('。')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, count)

  if (sentences.length === 0) {
    return text.trim()
  }

  return `${sentences.join('。')}。`
}

const createFallbackReportSections = ({
  question,
  spreadTitle,
  tone,
  summary,
  deepNarrative,
  depthSignals,
  actionPlan,
}: {
  question: string
  spreadTitle: string
  tone: string
  summary: string
  deepNarrative: string
  depthSignals: string[]
  actionPlan: SavedActionPlanStep[]
}): ReportSections => {
  const leadStep = actionPlan[0]
  const narrativeLead = getLeadingSentences(
    deepNarrative || summary,
    deepNarrative ? 2 : 1,
  )

  return {
    coreConclusion: getLeadingSentences(summary, 2),
    currentState:
      depthSignals[0] ??
      `当前这条线更接近「${tone}」，重点是看清${spreadTitle}里最主要的真实动向。`,
    riskAlert:
      depthSignals[1] ??
      '真正要防的不是没有答案，而是太快把抽象判断当成已经完成的行动。',
    actionFocus: leadStep
      ? `先把「${leadStep.title}」落地：${leadStep.detail}`
      : '先把眼下最小、最确定的一步落实，再根据反馈调整方向。',
    reviewPrompt: `回看「${question}」时，先问自己：${narrativeLead || '这次判断有没有因为真实行动而变得更清楚？'}`,
  }
}

const normalizeReportSections = (
  value: unknown,
  fallback: ReportSections,
): ReportSections => {
  if (!value || typeof value !== 'object') {
    return fallback
  }

  const sections = value as Partial<ReportSections>
  const textOrFallback = (text: unknown, fallbackText: string) =>
    typeof text === 'string' && text.trim() ? text.trim() : fallbackText

  return {
    coreConclusion: textOrFallback(sections.coreConclusion, fallback.coreConclusion),
    currentState: textOrFallback(sections.currentState, fallback.currentState),
    riskAlert: textOrFallback(sections.riskAlert, fallback.riskAlert),
    actionFocus: textOrFallback(sections.actionFocus, fallback.actionFocus),
    reviewPrompt: textOrFallback(sections.reviewPrompt, fallback.reviewPrompt),
  }
}

const createDefaultDepthFields = ({
  question,
  spreadTitle,
  tone,
  summary,
  dominantSignals = [],
  actionPlan = [],
}: {
  question: string
  spreadTitle: string
  tone: string
  summary: string
  dominantSignals?: string[]
  actionPlan?: SavedActionPlanStep[]
}) => {
  const depthSignals = dominantSignals.slice(0, 4)

  return {
    depthLevel: 'standard' as const,
    depthSignals,
    ruleHits: [] as string[],
    queryFlags: [] as string[],
    interpretationSummary: summary,
    deepNarrative: summary,
    narrativeMeta: createFallbackNarrativeMeta(summary),
    reportSections: createFallbackReportSections({
      question,
      spreadTitle,
      tone,
      summary,
      deepNarrative: summary,
      depthSignals,
      actionPlan,
    }),
  }
}

const withNarrativeDefaults = (record: ReadingRecord): ReadingRecord => {
  const source =
    typeof (record as Partial<ReadingRecord>).deepNarrative === 'string' &&
    record.deepNarrative.trim().length > 0
      ? record.deepNarrative
      : record.interpretationSummary || record.summary
  const fallbackReportSections = createFallbackReportSections({
    question: record.question,
    spreadTitle: record.spreadTitle,
    tone: record.tone,
    summary: record.interpretationSummary || record.summary,
    deepNarrative: source,
    depthSignals: record.depthSignals,
    actionPlan: record.actionPlan,
  })

  return {
    ...record,
    interpretationSummary: record.interpretationSummary || record.summary,
    deepNarrative: source,
    narrativeMeta: normalizeNarrativeMeta(
      (record as Partial<ReadingRecord>).narrativeMeta,
      source,
    ),
    reportSections: normalizeReportSections(
      (record as Partial<ReadingRecord>).reportSections,
      fallbackReportSections,
    ),
  }
}

const migrateLegacySavedRecord = (record: LegacySavedReadingRecord): ReadingRecord => {
  const spreadMeta = getLegacySpreadMeta(undefined, record.spreadTitle, record.cards)

  return {
    version: 4,
    id: record.id,
    kind: 'reading',
    saved: true,
    createdAt: record.createdAt,
    updatedAt: record.createdAt,
    title: record.title,
    question: record.question,
    topicId: record.category,
    topicLabel: record.topicLabel || TOPIC_BY_ID[record.category].label,
    spreadId: spreadMeta.spreadId,
    spreadTitle: spreadMeta.spreadTitle,
    variantId: spreadMeta.variantId,
    variantTitle: spreadMeta.variantTitle,
    tone: record.tone,
    summary: record.summary,
    dominantSignals: record.dominantSignals,
    tags: record.tags,
    cards: record.cards.map((card, index) => ({
      positionLabel: card.positionLabel,
      cardId: `legacy-${record.id}-${index}`,
      cardName: card.cardName,
      orientation: card.orientation,
    })),
    actionPlan: toSavedSteps(record.actionPlan),
    followUps: (record.followUps as FollowUpRecord[]) ?? [],
    dailyReflection: {
      morningIntent: '',
      eveningReview: '',
      resonance: null,
    },
    ...createDefaultDepthFields({
      question: record.question,
      spreadTitle: spreadMeta.spreadTitle,
      tone: record.tone,
      summary: record.summary,
      dominantSignals: record.dominantSignals,
      actionPlan: toSavedSteps(record.actionPlan),
    }),
  }
}

const migrateLegacyHistoryEntry = (entry: SavedReadingEntry): ReadingRecord => {
  const spreadMeta = getLegacySpreadMeta(entry.spreadId, entry.spreadTitle, entry.cards)

  return {
    version: 4,
    id: entry.id,
    kind: 'reading',
    saved: false,
    createdAt: entry.createdAt,
    updatedAt: entry.createdAt,
    title: entry.question,
    question: entry.question,
    topicId: entry.topicId,
    topicLabel: entry.topicLabel,
    spreadId: spreadMeta.spreadId,
    spreadTitle: spreadMeta.spreadTitle,
    variantId: spreadMeta.variantId,
    variantTitle: spreadMeta.variantTitle,
    tone: entry.tone,
    summary: entry.summary,
    dominantSignals: entry.dominantSignals,
    tags: [],
    cards: entry.cards.map((card, index) => ({
      positionLabel: card.positionLabel,
      cardId: `legacy-${entry.id}-${index}`,
      cardName: card.cardName,
      orientation: card.orientation,
    })),
    actionPlan: [],
    followUps: [],
    dailyReflection: {
      morningIntent: '',
      eveningReview: '',
      resonance: null,
    },
    ...createDefaultDepthFields({
      question: entry.question,
      spreadTitle: spreadMeta.spreadTitle,
      tone: entry.tone,
      summary: entry.summary,
      dominantSignals: entry.dominantSignals,
    }),
  }
}

const migrateReadingRecordV2 = (record: ReadingRecordV2): ReadingRecord => ({
  ...record,
  version: 4,
  ...createDefaultDepthFields({
    question: record.question,
    spreadTitle: record.spreadTitle,
    tone: record.tone,
    summary: record.summary,
    dominantSignals: record.dominantSignals,
    actionPlan: record.actionPlan,
  }),
})

const migrateReadingRecordV3 = (record: ReadingRecordV3): ReadingRecord => ({
  ...record,
  version: 4,
  reportSections: createFallbackReportSections({
    question: record.question,
    spreadTitle: record.spreadTitle,
    tone: record.tone,
    summary: record.interpretationSummary || record.summary,
    deepNarrative: record.deepNarrative,
    depthSignals: record.depthSignals,
    actionPlan: record.actionPlan,
  }),
})

const migrateLegacyRecords = () => {
  const legacySaved = readJson<LegacySavedReadingRecord[]>(LEGACY_SAVED_KEY, [])
  const legacyHistory = readJson<SavedReadingEntry[]>(LEGACY_HISTORY_KEY, [])

  return mergeReadingRecords([
    ...legacySaved.map(migrateLegacySavedRecord),
    ...legacyHistory.map(migrateLegacyHistoryEntry),
  ])
}

export const toReadingRecord = (value: unknown): ReadingRecord | null => {
  if (isReadingRecordV4(value)) {
    return withNarrativeDefaults(value as ReadingRecord)
  }

  if (isReadingRecordV3(value)) {
    return withNarrativeDefaults(migrateReadingRecordV3(value as ReadingRecordV3))
  }

  if (isReadingRecordV2(value)) {
    return migrateReadingRecordV2(value)
  }

  return null
}

export const mergeReadingRecords = (records: ReadingRecord[]) => {
  const map = new Map<string, ReadingRecord>()

  for (const rawRecord of records) {
    const record = withNarrativeDefaults(rawRecord)
    const existing = map.get(record.id)

    if (!existing || Date.parse(record.updatedAt) > Date.parse(existing.updatedAt)) {
      map.set(record.id, record)
    }
  }

  return normalizeReadingRecords(Array.from(map.values()))
}

export const loadReadingRecords = (): ReadingRecord[] => {
  const storedV4Records = readJson<ReadingRecord[]>(RECORDS_KEY, [])
  const normalizedV4 = storedV4Records
    .map((record) => toReadingRecord(record))
    .filter((record): record is ReadingRecord => record !== null)

  if (normalizedV4.length > 0) {
    return normalizeReadingRecords(normalizedV4)
  }

  const storedV3Records = readJson<ReadingRecordV3[]>(V3_RECORDS_KEY, [])
  const storedV2Records = readJson<ReadingRecordV2[]>(V2_RECORDS_KEY, [])
  const migratedV3 = storedV3Records.map(migrateReadingRecordV3)
  const migratedV2 = storedV2Records.map(migrateReadingRecordV2)
  const migratedLegacy = migrateLegacyRecords()
  const migrated = mergeReadingRecords([...migratedV3, ...migratedV2, ...migratedLegacy])

  if (migrated.length > 0) {
    writeJson(RECORDS_KEY, migrated)
  }

  return migrated
}

export const storeReadingRecords = (records: ReadingRecord[]) => {
  const normalizedRecords = normalizeReadingRecords(records)
  writeJson(RECORDS_KEY, normalizedRecords)
  return normalizedRecords
}

export const saveReadingRecord = (record: ReadingRecord) => {
  const records = mergeReadingRecords([record, ...loadReadingRecords()])
  storeReadingRecords(records)
  return records
}

export const buildReadingRecordId = (reading: ReadingResult) =>
  `reading-${hashContent(
    [
      reading.input.question.trim(),
      reading.input.topic,
      reading.spread.id,
      reading.spread.activeVariantId ?? '',
      ...reading.cards.map(
        (entry) =>
          `${entry.drawn.positionKey}:${entry.card.id}:${entry.drawn.orientation}`,
      ),
    ].join('|'),
  )}`

const buildDailyRecordId = (date: Date) => {
  return `daily-${buildLocalDateKey(date)}`
}

interface RecordOptions {
  recordId?: string
  createdAt?: string
  saved: boolean
  title: string
  tags: string[]
  actionPlanDoneIds: string[]
  followUps: FollowUpRecord[]
}

const createBaseReflection = (): DailyReflection => ({
  morningIntent: '',
  eveningReview: '',
  resonance: null,
})

export const buildReadingRecordFromReading = (
  reading: ReadingResult,
  options: RecordOptions,
): ReadingRecord => {
  const now = new Date().toISOString()
  const createdAt = options.createdAt ?? now

  return {
    version: 4,
    id: options.recordId ?? buildReadingRecordId(reading),
    kind: 'reading',
    saved: options.saved,
    createdAt,
    updatedAt: now,
    title: options.title || reading.input.question,
    question: reading.input.question,
    topicId: reading.input.topic,
    topicLabel: TOPIC_BY_ID[reading.input.topic].label,
    spreadId: reading.spread.id,
    spreadTitle: reading.spread.title,
    variantId: reading.spread.activeVariantId,
    variantTitle: reading.spread.activeVariantTitle,
    tone: reading.tone,
    summary: reading.summary,
    dominantSignals: reading.dominantSignals,
    tags: options.tags,
    cards: reading.cards.map((entry) => ({
      positionLabel: entry.positionLabel,
      cardId: entry.card.id,
      cardName: entry.card.nameZh,
      orientation: entry.drawn.orientation,
    })),
    actionPlan: reading.actionPlan.map((step) => ({
      ...step,
      done: options.actionPlanDoneIds.includes(step.id),
    })),
    followUps: options.followUps,
    dailyReflection: createBaseReflection(),
    depthLevel: reading.depthLevel,
    depthSignals: reading.interpretation.depthSignals,
    ruleHits: reading.interpretation.ruleHits,
    queryFlags: reading.interpretation.queryFlags,
    interpretationSummary: reading.summary,
    deepNarrative: reading.deepNarrative,
    narrativeMeta: reading.narrativeMeta,
    reportSections: reading.reportSections,
  }
}

export const buildDailyRecord = (
  reading: ReadingResult,
  date: Date,
  reflection: DailyReflection = createBaseReflection(),
): ReadingRecord => {
  const iso = date.toISOString()

  return {
    version: 4,
    id: buildDailyRecordId(date),
    kind: 'daily',
    saved: false,
    createdAt: iso,
    updatedAt: iso,
    title: `每日一张 · ${new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    }).format(date)}`,
    question: reading.input.question,
    topicId: 'general',
    topicLabel: TOPIC_BY_ID.general.label,
    spreadId: reading.spread.id,
    spreadTitle: reading.spread.title,
    variantId: reading.spread.activeVariantId,
    variantTitle: reading.spread.activeVariantTitle,
    tone: reading.tone,
    summary: reading.summary,
    dominantSignals: reading.dominantSignals,
    tags: ['每日一张'],
    cards: reading.cards.map((entry) => ({
      positionLabel: entry.positionLabel,
      cardId: entry.card.id,
      cardName: entry.card.nameZh,
      orientation: entry.drawn.orientation,
    })),
    actionPlan: reading.actionPlan.map((step) => ({
      ...step,
      done: false,
    })),
    followUps: [],
    dailyReflection: reflection,
    depthLevel: reading.depthLevel,
    depthSignals: reading.interpretation.depthSignals,
    ruleHits: reading.interpretation.ruleHits,
    queryFlags: reading.interpretation.queryFlags,
    interpretationSummary: reading.summary,
    deepNarrative: reading.deepNarrative,
    narrativeMeta: reading.narrativeMeta,
    reportSections: reading.reportSections,
  }
}

export const loadGuideDismissed = () => readJson<boolean>(GUIDE_DISMISSED_KEY, false)

export const storeGuideDismissed = (value: boolean) => {
  writeJson(GUIDE_DISMISSED_KEY, value)
}

const isValidTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const hasRecordBase = (record: Partial<Omit<ReadingRecordV2, 'version'>>) =>
  typeof record.id === 'string' &&
  (record.kind === 'reading' || record.kind === 'daily') &&
  typeof record.saved === 'boolean' &&
  isValidTimestamp(record.createdAt) &&
  isValidTimestamp(record.updatedAt) &&
  typeof record.title === 'string' &&
  typeof record.question === 'string' &&
  typeof record.topicLabel === 'string' &&
  typeof record.spreadId === 'string' &&
  typeof record.spreadTitle === 'string' &&
  typeof record.tone === 'string' &&
  typeof record.summary === 'string' &&
  isStringArray(record.dominantSignals) &&
  Array.isArray(record.cards) &&
  Array.isArray(record.tags) &&
  Array.isArray(record.followUps) &&
  Array.isArray(record.actionPlan)

const isReadingRecordV2 = (value: unknown): value is ReadingRecordV2 => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Partial<ReadingRecordV2>

  return (
    record.version === 2 &&
    hasRecordBase(record)
  )
}

const isReadingRecordV3 = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Partial<ReadingRecordV3>

  return (
    record.version === 3 &&
    hasRecordBase(record) &&
    (record.depthLevel === 'shallow' ||
      record.depthLevel === 'standard' ||
      record.depthLevel === 'deep') &&
    Array.isArray(record.depthSignals) &&
    Array.isArray(record.ruleHits) &&
    Array.isArray(record.queryFlags)
  )
}

const isReadingRecordV4 = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Partial<ReadingRecord>

  return (
    record.version === 4 &&
    hasRecordBase(record) &&
    (record.depthLevel === 'shallow' ||
      record.depthLevel === 'standard' ||
      record.depthLevel === 'deep') &&
    Array.isArray(record.depthSignals) &&
    Array.isArray(record.ruleHits) &&
    Array.isArray(record.queryFlags)
  )
}

export const exportReadingRecordsJson = (records: ReadingRecord[]) =>
  JSON.stringify(
    {
      version: 4,
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      records: normalizeReadingRecords([...records]),
    },
    null,
    2,
  )

export const parseReadingRecordsJson = (raw: string) => {
  const parsed = JSON.parse(raw) as
    | { records?: unknown }
    | Array<ReadingRecord | ReadingRecordV3 | ReadingRecordV2>
    | undefined

  const rawRecords = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.records)
      ? parsed.records
      : []

  return normalizeReadingRecords(
    rawRecords
      .map((record) => toReadingRecord(record))
      .filter((record): record is ReadingRecord => record !== null),
  )
}

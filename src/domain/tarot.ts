export type TopicId =
  | 'general'
  | 'love'
  | 'career'
  | 'relationships'
  | 'growth'

export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles' | null
export type Orientation = 'up' | 'down'
export type OrientationMode = 'random' | 'up-only'
export type ReadingDepthLevel = 'shallow' | 'standard' | 'deep'
export type DrawPool = 'any' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'
type LayoutId =
  | 'single'
  | 'line-3'
  | 'cross-5'
  | 'decision-compass'
  | 'relationship-mirror'
  | 'weekly-flow'
  | 'celtic-cross'
  | 'zodiac-wheel'
  | 'tree-of-life'

interface TarotCardBase {
  id: string
  nameZh: string
  nameEn: string
  number: number
  encyclopedia: {
    adviceZh: string
    descriptionZh: string
  }
  keywords: {
    up: string[]
    down: string[]
  }
  meaning: {
    up: string
    down: string
  }
  adviceTags: string[]
  elementTags: string[]
}

interface MajorArcanaCard extends TarotCardBase {
  arcana: 'major'
  suit: null
}

interface MinorArcanaCard extends TarotCardBase {
  arcana: 'minor'
  suit: Exclude<Suit, null>
}

export type TarotCard = MajorArcanaCard | MinorArcanaCard

export interface SpreadGuide {
  bestFor: string
  chooseWhen: string
  timeCost: string
  avoidWhen?: string
}

export interface SpreadPosition {
  key: string
  label: string
  prompt: string
  meaningHint: string
  drawPool?: DrawPool
}

interface SpreadVariantDefinition {
  id: string
  title: string
  description: string
  guide: SpreadGuide
  positions: SpreadPosition[]
}

export interface SpreadDefinition {
  id: string
  title: string
  description: string
  guide: SpreadGuide
  cardCount: number
  layoutId: LayoutId
  positions: SpreadPosition[]
  variants?: SpreadVariantDefinition[]
  summaryFrame?: string
}

export interface ResolvedSpreadDefinition
  extends Omit<SpreadDefinition, 'positions' | 'variants'> {
  positions: SpreadPosition[]
  activeVariantId?: string
  activeVariantTitle?: string
}

export interface ReadingInput {
  question: string
  topic: TopicId
  spreadId: string
  variantId?: string
}

export interface DrawnCard {
  cardId: string
  orientation: Orientation
  positionKey: string
}

export interface CardArtManifest {
  frame: 'sun' | 'moon' | 'gate' | 'ribbon'
  glyphs: string[]
}

export interface ReadingPreferences {
  shuffleSpeed: 'fast' | 'normal' | 'slow'
  orientationMode: OrientationMode
}

export interface ReadingCardView {
  drawn: DrawnCard
  card: TarotCard
  art: CardArtManifest
  positionLabel: string
  meaningHint: string
  prompt: string
}

export interface PositionReading {
  positionKey: string
  label: string
  prompt: string
  cardId: string
  cardName: string
  orientation: Orientation
  message: string
  keywords: string[]
  ruleTags?: InterpretationRuleTag[]
}

export interface ActionPlanStep {
  id: string
  title: string
  detail: string
}

export type InterpretationRuleTag =
  | 'Internalized'
  | 'Delayed'
  | 'Conflict'
  | 'Harmony'
  | 'Element_Weak'
  | 'Element_Strength'
  | 'Major_Archetype'
  | 'Sensitive_Query'

export interface ElementalDynamics {
  dominant: Exclude<Suit, null> | null
  missing: Array<Exclude<Suit, null>>
  conflicts: string[]
  harmonies: string[]
}

export interface InterpretationMeta {
  depthSignals: string[]
  ruleHits: string[]
  queryFlags: string[]
  softenedForSafety: boolean
  elementalDynamics: ElementalDynamics
}

export interface NarrativeMeta {
  targetLength: number
  actualLength: number
  coverageScore: number
  validationPassed: boolean
}

export interface ReportSections {
  coreConclusion: string
  currentState: string
  riskAlert: string
  actionFocus: string
  reviewPrompt: string
}

export interface ReadingResult {
  input: ReadingInput
  spread: ResolvedSpreadDefinition
  cards: ReadingCardView[]
  positionReadings: PositionReading[]
  reportSections: ReportSections
  summary: string
  deepNarrative: string
  narrativeMeta: NarrativeMeta
  advice: string[]
  actionPlan: ActionPlanStep[]
  tone: string
  dominantSignals: string[]
  depthLevel: ReadingDepthLevel
  interpretation: InterpretationMeta
}

export interface FollowUpRecord {
  id: string
  question: string
  createdAt: string
  summary: string
  tone: string
  dominantSignals: string[]
  leadAdvice: string
  cards: Array<{
    positionLabel: string
    cardName: string
    orientation: Orientation
  }>
}

export interface SavedActionPlanStep extends ActionPlanStep {
  done: boolean
}

export interface DailyReflection {
  morningIntent: string
  eveningReview: string
  resonance: 'strong' | 'mixed' | 'low' | null
}

export interface ReadingRecordV2Card {
  positionLabel: string
  cardId: string
  cardName: string
  orientation: Orientation
}

export interface ReadingRecordV2 {
  version: 2
  id: string
  kind: 'reading' | 'daily'
  saved: boolean
  createdAt: string
  updatedAt: string
  title: string
  question: string
  topicId: TopicId
  topicLabel: string
  spreadId: string
  spreadTitle: string
  variantId?: string
  variantTitle?: string
  tone: string
  summary: string
  dominantSignals: string[]
  tags: string[]
  cards: ReadingRecordV2Card[]
  actionPlan: SavedActionPlanStep[]
  followUps: FollowUpRecord[]
  dailyReflection: DailyReflection
}

export interface ReadingRecordV3 {
  version: 3
  id: string
  kind: 'reading' | 'daily'
  saved: boolean
  createdAt: string
  updatedAt: string
  title: string
  question: string
  topicId: TopicId
  topicLabel: string
  spreadId: string
  spreadTitle: string
  variantId?: string
  variantTitle?: string
  tone: string
  summary: string
  dominantSignals: string[]
  tags: string[]
  cards: ReadingRecordV2Card[]
  actionPlan: SavedActionPlanStep[]
  followUps: FollowUpRecord[]
  dailyReflection: DailyReflection
  depthLevel: ReadingDepthLevel
  depthSignals: string[]
  ruleHits: string[]
  queryFlags: string[]
  interpretationSummary: string
  deepNarrative: string
  narrativeMeta: NarrativeMeta
}

export interface ReadingRecordV4 {
  version: 4
  id: string
  kind: 'reading' | 'daily'
  saved: boolean
  createdAt: string
  updatedAt: string
  title: string
  question: string
  topicId: TopicId
  topicLabel: string
  spreadId: string
  spreadTitle: string
  variantId?: string
  variantTitle?: string
  tone: string
  summary: string
  dominantSignals: string[]
  tags: string[]
  cards: ReadingRecordV2Card[]
  actionPlan: SavedActionPlanStep[]
  followUps: FollowUpRecord[]
  dailyReflection: DailyReflection
  depthLevel: ReadingDepthLevel
  depthSignals: string[]
  ruleHits: string[]
  queryFlags: string[]
  interpretationSummary: string
  deepNarrative: string
  narrativeMeta: NarrativeMeta
  reportSections: ReportSections
}

export type ReadingRecord = ReadingRecordV4

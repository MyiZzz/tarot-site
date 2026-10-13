import { CARD_ART_MANIFEST } from '../data/artManifest'
import { CARD_BY_ID, TAROT_DECK } from '../data/cards'
import { SPREADS } from '../data/spreads'
import { TOPIC_BY_ID } from '../data/topics'
import type {
  ActionPlanStep,
  DrawPool,
  DrawnCard,
  ElementalDynamics,
  InterpretationMeta,
  InterpretationRuleTag,
  NarrativeMeta,
  OrientationMode,
  ReportSections,
  ReadingCardView,
  ReadingDepthLevel,
  ReadingInput,
  ReadingResult,
  ResolvedSpreadDefinition,
  Suit,
  TopicId,
} from '../domain/tarot'
import { createSeededRandom } from './random'

interface ReadingOptions {
  seed?: string | number
  random?: () => number
  orientationMode?: OrientationMode
}

type MinorSuit = Exclude<Suit, null>

interface QueryGuardResult {
  flags: string[]
  softenedForSafety: boolean
}

interface InterpretationBuildResult {
  meta: InterpretationMeta
  positionRuleTags: Record<string, InterpretationRuleTag[]>
}

interface NarrativeBuildResult {
  text: string
  meta: NarrativeMeta
}

interface ReasoningGraphNode {
  positionKey: string
  positionLabel: string
  prompt: string
  cardId: string
  cardName: string
  orientation: 'up' | 'down'
  element: MinorSuit | 'major'
  role: string
  archetype: string
  orientationModifier: 'Direct' | 'Internalized'
  reversedLens?: string
}

interface ReasoningGraphRelation {
  type: 'conflict' | 'harmony'
  from: string
  to: string
  reason: string
}

interface ReasoningGraph {
  queryContext: {
    original: string
    reframed: string
    actionFocus: string
    safetyNote?: string
  }
  nodes: ReasoningGraphNode[]
  relations: ReasoningGraphRelation[]
  dominantElement: MinorSuit | null
  missingElements: MinorSuit[]
  majorWeight: number
  majorAnchors: string[]
  probableTrajectory: string
  interventionPoints: string[]
  coverageLabels: string[]
}

type ReversedLensKey =
  | 'internalized'
  | 'delayed'
  | 'misaligned'
  | 'excess'
  | 'imbalanced'

const REVERSED_LENS_COPY: Record<
  ReversedLensKey,
  { label: string; line: string; narrativeLine: string }
> = {
  internalized: {
    label: '内化',
    line: '逆位在这里更像感受被压回内层，问题没有消失，只是暂时没有被直接表达。',
    narrativeLine: '这张逆位更像“内化”，说明真正的拉扯先发生在内部感受层。',
  },
  delayed: {
    label: '延迟',
    line: '逆位在这里更像节奏被拖慢，结果不会立刻显形，需要先处理阻滞再推进。',
    narrativeLine: '这张逆位更像“延迟”，提示你不要用急推进去对抗未处理的阻滞。',
  },
  misaligned: {
    label: '错配',
    line: '逆位在这里更像判断与行动没有对齐，越急着推进越容易偏离重点。',
    narrativeLine: '这张逆位更像“错配”，表示目标、判断或表达方式还没有对上。',
  },
  excess: {
    label: '过度',
    line: '逆位在这里更像用力过度，表面在推进，底层却在持续消耗。',
    narrativeLine: '这张逆位更像“过度”，说明问题不只是没动，而是已经开始透支。',
  },
  imbalanced: {
    label: '失衡',
    line: '逆位在这里更像结构失衡，某个关键维度被放大或被忽略了。',
    narrativeLine: '这张逆位更像“失衡”，说明当前结构里有一块被过度强调或长期忽略。',
  },
}

const SUIT_LENSES: Record<MinorSuit, Record<TopicId, string>> = {
  wands: {
    general: '权杖让答案回到行动、热度与主动推进。',
    love: '权杖说明关系中的回应速度、主动性与表达力度很关键。',
    career: '权杖强调事业推进靠执行力、发起性和节奏感破局。',
    relationships: '权杖指出互动中的火气、主导权与界线需要整理。',
    growth: '权杖提醒你，成长的关键在于重新点燃生命力。',
  },
  cups: {
    general: '圣杯把议题带回感受、连接与情绪安顿。',
    love: '圣杯把亲密需求、关系流动与真实感受放到台前。',
    career: '圣杯表示工作判断不能只看结果，也要看认同感。',
    relationships: '圣杯强调共情、误解与情感边界是当前核心。',
    growth: '圣杯提示成长从感受自己开始。',
  },
  swords: {
    general: '宝剑让问题回到判断、真相与边界。',
    love: '宝剑指出关系里需要优先处理沟通方式与认知落差。',
    career: '宝剑说明职场课题集中在决策、信息辨别与压力管理。',
    relationships: '宝剑让你看见误会、防御与话语方式如何塑造互动。',
    growth: '宝剑提醒成长也需要清醒切开旧模式。',
  },
  pentacles: {
    general: '星币把议题落回现实基础、资源与可持续性。',
    love: '星币说明关系的稳定发展离不开时间、承诺与现实安排。',
    career: '星币强调事业上的资源积累、结果兑现与长期布局。',
    relationships: '星币指出人际关系的关键在于可靠度与现实支持。',
    growth: '星币让你把成长写进日常习惯与身体节奏里。',
  },
}

const SUIT_SUMMARIES: Record<MinorSuit, Record<TopicId, string>> = {
  wands: {
    general: '权杖能量突出，局势需要更果断的行动推进。',
    love: '权杖能量突出，爱情议题里最重要的是热度与主动。',
    career: '权杖能量突出，事业推进的关键是拿回主动权。',
    relationships: '权杖能量突出，说明关系里有明显张力与火气。',
    growth: '权杖能量突出，成长入口在于唤回动力。',
  },
  cups: {
    general: '圣杯能量最浓，这次提问真正牵动的是情绪与关系感受。',
    love: '圣杯能量最浓，情绪流动与亲密需求是核心答案。',
    career: '圣杯能量最浓，说明工作抉择与认同感密切相关。',
    relationships: '圣杯能量最浓，人际层面的共鸣与失落都被放大了。',
    growth: '圣杯能量最浓，成长关键在于允许感受浮现。',
  },
  swords: {
    general: '宝剑能量最强，代表你需要靠清晰判断前进。',
    love: '宝剑能量最强，真正的卡点在于认知与沟通。',
    career: '宝剑能量最强，事业判断要建立在事实与策略上。',
    relationships: '宝剑能量最强，互动中的界线与误解必须被处理。',
    growth: '宝剑能量最强，这次成长更像一次认知校准。',
  },
  pentacles: {
    general: '星币能量最强，实际条件与资源结构会决定答案落点。',
    love: '星币能量最强，关系能否走远取决于现实承接度。',
    career: '星币能量最强，事业上要以稳定积累与落地为先。',
    relationships: '星币能量最强，人际问题需要回到可靠度与支持层面。',
    growth: '星币能量最强，成长需要被写进日常结构里。',
  },
}

const TOPIC_ACTION_FOCUS: Record<TopicId, string> = {
  general: '把最重要的一条主线行动写下来，并在 72 小时内执行一次小实验。',
  love: '优先处理沟通质量与边界表达，再决定关系下一步。',
  career: '先明确目标与标准，再按节奏推进关键执行动作。',
  relationships: '先厘清互动边界与误解来源，再决定投入强度。',
  growth: '把内在洞察转化成可重复的日常动作，避免只停留在感受层。',
}

const ADVICE_LIBRARY: Record<string, string> = {
  act: '把想法拆成一个今天就能开始的动作。',
  adapt: '顺着新变化调整姿态，比执着旧剧本更容易迎来转机。',
  balance: '先让投入、情绪与现实安排回到平衡。',
  boundaries: '看清哪些责任属于你，哪些不属于你。',
  clarity: '把问题写得更具体、把标准说得更清楚。',
  collaborate: '主动寻求一个可信的外部反馈。',
  communicate: '用更直接、更温柔的方式说出真实需求。',
  complete: '把拖着未收尾的部分认真结案。',
  courage: '保留谨慎，但不要让犹豫接管方向感。',
  decide: '把取舍写清楚，帮助自己真正做出选择。',
  discipline: '规律与节奏比一时冲劲更有力量。',
  focus: '只保留最重要的一条推进线。',
  ground: '让身体、时间与资源先站稳。',
  heal: '先照顾受伤与疲惫的部分。',
  learn: '借用成熟经验，不必凡事独自摸索。',
  observe: '先看、先听、先辨认信号。',
  patience: '把节奏放慢半拍，适合你的不会因耐心而错过。',
  lead: '先定方向、边界与节奏，再去推进事情。',
  receive: '允许帮助、爱意与支持进入。',
  release: '主动放下已经过期的执念或安排。',
  rest: '短暂停顿不是后退，而是在避免耗尽自己。',
  'self-honesty': '把你真正害怕的和真正想要的说给自己听。',
  'start-small': '先从最小可行动作开始。',
  strategy: '先定策略，再定速度。',
  trust: '相信直觉给出的第一反应，再用现实去验证。',
}

const ACTION_PLAN_LIBRARY: Record<
  string,
  Pick<ActionPlanStep, 'title' | 'detail'>
> = {
  act: {
    title: '先迈出一个最小动作',
    detail: '把抽象判断落成一个当天就能执行的小动作。',
  },
  adapt: {
    title: '为变化预留调整空间',
    detail: '记录正在变化的条件，允许自己依据新信息修正计划。',
  },
  balance: {
    title: '先校准投入与节奏',
    detail: '检查情绪、时间和资源分配，避免在失衡状态下继续加码。',
  },
  boundaries: {
    title: '明确你的边界',
    detail: '分清哪些责任属于你，再决定下一步回应方式。',
  },
  clarity: {
    title: '把问题说得更具体',
    detail: '把目标、标准和顾虑写清楚，让行动更稳。',
  },
  communicate: {
    title: '说出真实需求',
    detail: '试着用直接而温和的方式表达你的期待与顾虑。',
  },
  focus: {
    title: '只保留一条主推进线',
    detail: '收拢分散的注意力，把最值得推进的一件事放到最前面。',
  },
  ground: {
    title: '先稳住现实基础',
    detail: '优先处理身体、睡眠、时间和资源。',
  },
  heal: {
    title: '照顾受伤与疲惫',
    detail: '给修复留出窗口，再处理更复杂的关系或选择。',
  },
  observe: {
    title: '先观察再下判断',
    detail: '暂停立刻给结论的冲动，先收集更多信号与事实。',
  },
  strategy: {
    title: '先布好策略再加速',
    detail: '先想清楚路线和优先级，再决定速度。',
  },
  trust: {
    title: '让直觉和现实对齐',
    detail: '记录第一反应，再用一个现实动作去验证它。',
  },
}

const SENSITIVE_QUERY_PATTERNS: Array<{ flag: string; pattern: RegExp }> = [
  { flag: 'medical', pattern: /(确诊|病|癌|手术|药|治疗|怀孕|流产|抑郁|自杀)/i },
  { flag: 'legal', pattern: /(起诉|离婚判决|合同纠纷|刑事|法律责任|坐牢)/i },
  { flag: 'death', pattern: /(死亡|会不会死|寿命|什么时候死)/i },
  { flag: 'forced-decision', pattern: /(该不该|必须选|A还是B|帮我决定|替我决定)/i },
]

const NARRATIVE_LENGTH_POINTS: Array<{ cards: number; length: number }> = [
  { cards: 1, length: 450 },
  { cards: 3, length: 900 },
  { cards: 5, length: 1400 },
  { cards: 10, length: 2200 },
]

const FATALISTIC_TERMS = ['一定', '必须', '注定', '绝对', '毫无疑问']

const METHODOLOGY_CORE_MODELS = [
  '以共时性与原型共振解释牌面为何能映照当下心理状态。',
  '把图像视作可流动的视觉语言，而非僵硬关键词。',
  '用元素生克与牌间关系判断能量强化或冲突。',
  '以境遇五要素拆解问题：不可抗力、业力循环、性格倾向、经验结构、行动杠杆。',
  '把“会不会”重构为“在当前轨迹下最可能如何、我能如何改变”。',
]

const getSpread = (spreadId: string) => {
  const spread = SPREADS.find((item) => item.id === spreadId)

  if (!spread) {
    throw new Error(`Unknown spread: ${spreadId}`)
  }

  return spread
}

const resolveSpread = (
  spreadId: string,
  variantId?: string,
): ResolvedSpreadDefinition => {
  const spread = getSpread(spreadId)
  const variant =
    variantId !== undefined
      ? spread.variants?.find((entry) => entry.id === variantId)
      : spread.variants?.[0]

  if (variantId !== undefined && !variant) {
    throw new Error(`Unknown spread variant: ${spreadId}/${variantId}`)
  }

  return {
    id: spread.id,
    title: spread.title,
    description: spread.description,
    guide: variant?.guide ?? spread.guide,
    cardCount: spread.cardCount,
    layoutId: spread.layoutId,
    summaryFrame: spread.summaryFrame,
    positions: variant?.positions ?? spread.positions,
    activeVariantId: variant?.id,
    activeVariantTitle: variant?.title,
  }
}

const filterPool = (pool: DrawPool | undefined, cards = TAROT_DECK) => {
  if (!pool || pool === 'any') {
    return cards
  }

  if (pool === 'major') {
    return cards.filter((card) => card.arcana === 'major')
  }

  return cards.filter((card) => card.suit === pool)
}

const drawCards = (
  spread: ResolvedSpreadDefinition,
  random: () => number = Math.random,
  orientationMode: OrientationMode = 'random',
): DrawnCard[] => {
  const availableCards = [...TAROT_DECK]

  return spread.positions.map((position) => {
    const pool = filterPool(position.drawPool, availableCards)
    const source = pool.length > 0 ? pool : availableCards
    const cardIndex = Math.floor(random() * source.length)
    const card = source[cardIndex]
    const availableIndex = availableCards.findIndex((entry) => entry.id === card.id)

    availableCards.splice(availableIndex, 1)

    return {
      cardId: card.id,
      orientation: orientationMode === 'up-only' ? 'up' : random() >= 0.5 ? 'up' : 'down',
      positionKey: position.key,
    }
  })
}

export const createReading = (
  input: ReadingInput,
  options: ReadingOptions = {},
): ReadingResult => {
  const spread = resolveSpread(input.spreadId, input.variantId)
  const random =
    options.random ??
    (options.seed !== undefined ? createSeededRandom(options.seed) : Math.random)
  const cards = drawCards(spread, random, options.orientationMode).map((drawn) =>
    createCardView(spread, drawn),
  )
  const interpretationBuild = buildInterpretation(cards, input)
  const tone = buildTone(cards)
  const dominantSignals = buildDominantSignals(cards, input.topic, interpretationBuild.meta)
  const positionReadings = cards.map((entry) =>
    buildPositionReading(
      entry,
      input.topic,
      interpretationBuild.positionRuleTags[entry.drawn.positionKey] ?? [],
    ),
  )
  const summary = buildSummary(cards, input, spread, tone, interpretationBuild.meta)
  const advice = buildAdvice(cards, input.topic, interpretationBuild.meta)
  const actionPlan = buildActionPlan(cards, interpretationBuild.meta)
  const reportSections = buildReportSections({
    cards,
    input,
    spread,
    summary,
    tone,
    interpretation: interpretationBuild.meta,
    actionPlan,
  })
  const reasoningGraph = buildReasoningGraph({
    cards,
    input,
    interpretation: interpretationBuild.meta,
    positionRuleTags: interpretationBuild.positionRuleTags,
  })
  const narrativeBuild = buildDeepNarrative({
    input,
    cards,
    spread,
    interpretation: interpretationBuild.meta,
    reasoningGraph,
    actionPlan,
    summary,
  })

  return {
    input,
    spread,
    cards,
    positionReadings,
    reportSections,
    summary,
    deepNarrative: narrativeBuild.text,
    narrativeMeta: narrativeBuild.meta,
    advice,
    actionPlan,
    tone,
    dominantSignals,
    depthLevel: resolveDepthLevel(cards, interpretationBuild.meta),
    interpretation: interpretationBuild.meta,
  }
}

const createCardView = (
  spread: ResolvedSpreadDefinition,
  drawn: DrawnCard,
): ReadingCardView => {
  const position = spread.positions.find((entry) => entry.key === drawn.positionKey)

  if (!position) {
    throw new Error(`Unknown spread position: ${drawn.positionKey}`)
  }

  return {
    drawn,
    card: CARD_BY_ID[drawn.cardId],
    art: CARD_ART_MANIFEST[drawn.cardId],
    positionLabel: position.label,
    meaningHint: position.meaningHint,
    prompt: position.prompt,
  }
}

const analyzeQuery = (question: string): QueryGuardResult => {
  const flags = SENSITIVE_QUERY_PATTERNS.filter((entry) => entry.pattern.test(question)).map(
    (entry) => entry.flag,
  )

  return {
    flags,
    softenedForSafety: flags.length > 0,
  }
}

const buildInterpretation = (
  cards: ReadingCardView[],
  input: ReadingInput,
): InterpretationBuildResult => {
  const queryGuard = analyzeQuery(input.question)
  const positionTagSets: Record<string, Set<InterpretationRuleTag>> = Object.fromEntries(
    cards.map((card) => [card.drawn.positionKey, new Set<InterpretationRuleTag>()]),
  )
  const conflicts: string[] = []
  const harmonies: string[] = []
  const ruleHits = new Set<string>()

  cards.forEach((entry) => {
    const tags = positionTagSets[entry.drawn.positionKey]

    if (entry.drawn.orientation === 'down') {
      tags.add('Internalized')
      ruleHits.add('R_REV_01')
    }

    if (entry.card.arcana === 'major') {
      tags.add('Major_Archetype')
      ruleHits.add('R_ARC_01')
    }
  })

  for (let index = 0; index < cards.length - 1; index += 1) {
    const left = cards[index]
    const right = cards[index + 1]
    const interaction = getElementInteraction(left.card.suit, right.card.suit)

    if (interaction === 'conflict') {
      positionTagSets[left.drawn.positionKey].add('Conflict')
      positionTagSets[right.drawn.positionKey].add('Conflict')
      conflicts.push(`${left.positionLabel}与${right.positionLabel}存在元素冲突`)
      ruleHits.add('R_ELM_01')
    }

    if (interaction === 'harmony') {
      positionTagSets[left.drawn.positionKey].add('Harmony')
      positionTagSets[right.drawn.positionKey].add('Harmony')
      harmonies.push(`${left.positionLabel}与${right.positionLabel}形成协同`)
      ruleHits.add('R_ELM_03')
    }
  }

  const elementalDynamics = getElementalDynamics(cards)

  if (elementalDynamics.missing.length > 0) {
    ruleHits.add('R_ELM_02')
    cards.forEach((entry) => {
      positionTagSets[entry.drawn.positionKey].add('Element_Weak')
    })
  }

  if (elementalDynamics.dominant !== null) {
    ruleHits.add('R_ELM_04')
    cards.forEach((entry) => {
      if (entry.card.suit === elementalDynamics.dominant) {
        positionTagSets[entry.drawn.positionKey].add('Element_Strength')
      }
    })
  }

  if (queryGuard.softenedForSafety) {
    ruleHits.add('R_VAL_SOFTEN')
    cards.forEach((entry) => {
      positionTagSets[entry.drawn.positionKey].add('Sensitive_Query')
    })
  }

  const depthSignals = buildDepthSignals(
    cards,
    elementalDynamics,
    conflicts,
    harmonies,
    queryGuard,
  )

  return {
    meta: {
      depthSignals,
      ruleHits: Array.from(ruleHits),
      queryFlags: queryGuard.flags,
      softenedForSafety: queryGuard.softenedForSafety,
      elementalDynamics: {
        ...elementalDynamics,
        conflicts,
        harmonies,
      },
    },
    positionRuleTags: Object.fromEntries(
      Object.entries(positionTagSets).map(([key, value]) => [key, Array.from(value)]),
    ),
  }
}

const buildDepthSignals = (
  cards: ReadingCardView[],
  elementalDynamics: ElementalDynamics,
  conflicts: string[],
  harmonies: string[],
  queryGuard: QueryGuardResult,
) => {
  const signals: string[] = []
  const majorCount = cards.filter((entry) => entry.card.arcana === 'major').length

  if (majorCount > 0) {
    signals.push(
      majorCount >= Math.ceil(cards.length / 2) ? '原型力量主导' : '出现关键原型牌',
    )
  }

  if (elementalDynamics.dominant) {
    signals.push(`主导元素：${formatSuitLabel(elementalDynamics.dominant)}`)
  }

  if (elementalDynamics.missing.length > 0) {
    signals.push(
      `缺失元素：${elementalDynamics.missing.map((item) => formatSuitLabel(item)).join('、')}`,
    )
  }

  if (conflicts.length > 0) {
    signals.push('牌阵存在元素冲突')
  } else if (harmonies.length > 0) {
    signals.push('牌阵存在元素协同')
  }

  if (queryGuard.softenedForSafety) {
    signals.push('高风险问题已触发安全降权')
  }

  return signals
}

const getElementInteraction = (left: Suit, right: Suit): 'conflict' | 'harmony' | 'neutral' => {
  if (!left || !right) {
    return 'neutral'
  }

  if (left === right) {
    return 'harmony'
  }

  const pair = [left, right].sort().join('-')

  if (pair === 'cups-wands' || pair === 'pentacles-swords') {
    return 'conflict'
  }

  if (pair === 'swords-wands' || pair === 'cups-pentacles') {
    return 'harmony'
  }

  return 'neutral'
}

const getElementalDynamics = (cards: ReadingCardView[]): ElementalDynamics => {
  const suitCounts = cards.reduce<Record<MinorSuit, number>>(
    (accumulator, entry) => {
      if (entry.card.suit !== null) {
        accumulator[entry.card.suit] += 1
      }

      return accumulator
    },
    { wands: 0, cups: 0, swords: 0, pentacles: 0 },
  )

  const dominantEntry = Object.entries(suitCounts).sort((left, right) => right[1] - left[1])[0]
  const dominant = dominantEntry[1] > 0 ? (dominantEntry[0] as MinorSuit) : null
  const missing = (Object.entries(suitCounts) as Array<[MinorSuit, number]>)
    .filter(([, count]) => count === 0)
    .map(([suit]) => suit)

  return {
    dominant,
    missing,
    conflicts: [],
    harmonies: [],
  }
}

const resolveReversedLensKey = (
  entry: ReadingCardView,
  ruleTags: InterpretationRuleTag[],
): ReversedLensKey => {
  if (ruleTags.includes('Conflict')) {
    return 'misaligned'
  }

  if (entry.card.arcana === 'major') {
    return 'imbalanced'
  }

  if (entry.card.suit === 'cups') {
    return 'internalized'
  }

  if (entry.card.suit === 'pentacles') {
    return 'delayed'
  }

  if (entry.card.suit === 'wands') {
    return 'excess'
  }

  return 'misaligned'
}

const buildReversedLens = (
  entry: ReadingCardView,
  ruleTags: InterpretationRuleTag[],
) => {
  const key = resolveReversedLensKey(entry, ruleTags)

  return REVERSED_LENS_COPY[key]
}

const joinSectionText = (parts: Array<string | null | undefined>) =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('')

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

const buildCurrentStateSection = (
  cards: ReadingCardView[],
  tone: string,
  interpretation: InterpretationMeta,
) => {
  const dominantSuit = getDominantSuit(cards)
  const reversedCount = cards.filter((entry) => entry.drawn.orientation === 'down').length
  const base =
    dominantSuit !== null
      ? `当前主调落在${formatSuitLabel(dominantSuit)}，整体气质偏向${tone}。`
      : `当前没有单一元素压倒性主导，整体更像${tone}中的多线并行。`

  if (reversedCount === 0) {
    return `${base} 眼前更适合顺着已经显形的线索继续推进。`
  }

  if (reversedCount >= Math.ceil(cards.length / 2)) {
    return `${base} 逆位偏多，说明外部动作之前，内部校准和节奏整理更重要。`
  }

  if (interpretation.elementalDynamics.conflicts.length > 0) {
    return `${base} 目前最大张力来自内外节奏没有对齐。`
  }

  return `${base} 局面可以往前推，但需要边推进边校准。`
}

const buildRiskAlertSection = (
  cards: ReadingCardView[],
  interpretation: InterpretationMeta,
) => {
  if (interpretation.softenedForSafety) {
    return '这个问题带有高风险判断色彩，不适合把塔罗当成结论机器，更适合把它当成校准视角。'
  }

  if (interpretation.elementalDynamics.conflicts.length > 0) {
    return '最大的风险不是没机会，而是你一边想推进，一边又被内部拉扯和现实条件抵消。'
  }

  if (interpretation.elementalDynamics.missing.length > 0) {
    return `当前最容易失衡的是${interpretation.elementalDynamics.missing
      .map((entry) => formatSuitLabel(entry))
      .join('、')}，忽略这部分会让后续动作看起来忙却不够准。`
  }

  const reversedEntries = cards.filter((entry) => entry.drawn.orientation === 'down')
  if (reversedEntries.length > 0) {
    const reversedLabels = Array.from(
      new Set(reversedEntries.map((entry) => buildReversedLens(entry, []).label)),
    )
    return `风险点更多在${reversedLabels.join('、')}层面，问题不是单纯受阻，而是推进方式需要重新校准。`
  }

  return '真正要防的不是外部变化，而是你因为熟悉感而忽略了已经出现的新信号。'
}

const buildActionFocusSection = (
  input: ReadingInput,
  actionPlan: ActionPlanStep[],
) => {
  const leadStep = actionPlan[0]
  if (!leadStep) {
    return TOPIC_ACTION_FOCUS[input.topic]
  }

  return `先把「${leadStep.title}」落地：${leadStep.detail}`
}

const buildReviewPromptSection = (
  spread: ResolvedSpreadDefinition,
  actionPlan: ActionPlanStep[],
) => {
  const leadStep = actionPlan[0]?.title ?? '第一个关键动作'

  return `回看这个问题时，先问自己：我是否真的完成了「${leadStep}」，以及它是否让${spread.title}里最在意的那条主线变得更清楚？`
}

const buildReportSections = ({
  cards,
  input,
  spread,
  summary,
  tone,
  interpretation,
  actionPlan,
}: {
  cards: ReadingCardView[]
  input: ReadingInput
  spread: ResolvedSpreadDefinition
  summary: string
  tone: string
  interpretation: InterpretationMeta
  actionPlan: ActionPlanStep[]
}): ReportSections => ({
  coreConclusion: getLeadingSentences(summary, 2),
  currentState: buildCurrentStateSection(cards, tone, interpretation),
  riskAlert: buildRiskAlertSection(cards, interpretation),
  actionFocus: buildActionFocusSection(input, actionPlan),
  reviewPrompt: buildReviewPromptSection(spread, actionPlan),
})

const buildPositionReading = (
  entry: ReadingCardView,
  topic: TopicId,
  ruleTags: InterpretationRuleTag[],
) => {
  const suitLine =
    entry.card.arcana === 'major'
      ? '这张大阿尔卡那说明此处牵动的是阶段性课题，而不是短暂波动。'
      : SUIT_LENSES[entry.card.suit][topic]
  const reversedLens =
    entry.drawn.orientation === 'down' ? buildReversedLens(entry, ruleTags) : null
  const orientationLine =
    entry.drawn.orientation === 'up'
      ? '正位让这股力量更直接地显形。'
      : reversedLens?.line ?? '逆位在这里更像能量内化或暂时受阻，需要先整理再推进。'
  const dynamicLine = getDynamicLine(ruleTags)

  return {
    positionKey: entry.drawn.positionKey,
    label: entry.positionLabel,
    prompt: entry.prompt,
    cardId: entry.card.id,
    cardName: `${entry.card.nameZh} · ${entry.drawn.orientation === 'up' ? '正位' : '逆位'}`,
    orientation: entry.drawn.orientation,
    message: joinSectionText([
      `${entry.positionLabel}位主要看${entry.meaningHint}。`,
      entry.card.meaning[entry.drawn.orientation],
      suitLine,
      entry.drawn.orientation === 'down' && reversedLens
        ? `这张逆位更接近${reversedLens.label}：`
        : null,
      orientationLine,
      dynamicLine,
      TOPIC_BY_ID[topic].framing,
    ]),
    keywords:
      entry.drawn.orientation === 'up'
        ? entry.card.keywords.up.slice(0, 3)
        : entry.card.keywords.down.slice(0, 3),
    ruleTags,
  }
}

const getDynamicLine = (ruleTags: InterpretationRuleTag[]) => {
  if (ruleTags.includes('Conflict')) {
    return '这张牌与相邻牌之间存在元素冲突，提示你需要先处理内部拉扯。'
  }

  if (ruleTags.includes('Harmony')) {
    return '这张牌与相邻牌之间形成协同，说明当前有可借力的顺势窗口。'
  }

  if (ruleTags.includes('Element_Weak')) {
    return '牌阵里有关键元素缺位，提示你需要主动补齐某个被忽略的维度。'
  }

  return ''
}

const buildTone = (cards: ReadingCardView[]) => {
  const reversedCount = cards.filter((entry) => entry.drawn.orientation === 'down').length
  const majorCount = cards.filter((entry) => entry.card.arcana === 'major').length
  const dominantSuit = getDominantSuit(cards)

  if (reversedCount >= Math.ceil(cards.length / 2)) {
    return '内省整顿'
  }

  if (majorCount >= Math.ceil(cards.length / 2)) {
    return '命运转折'
  }

  if (dominantSuit === 'cups') {
    return '情绪流动'
  }

  if (dominantSuit === 'wands') {
    return '主动推进'
  }

  if (dominantSuit === 'swords') {
    return '锋利辨析'
  }

  if (dominantSuit === 'pentacles') {
    return '稳步成形'
  }

  return '静中有进'
}

const buildDominantSignals = (
  cards: ReadingCardView[],
  topic: TopicId,
  interpretation: InterpretationMeta,
) => {
  const signals = [`主题：${TOPIC_BY_ID[topic].label}`, `气质：${buildTone(cards)}`]
  const majorCount = cards.filter((entry) => entry.card.arcana === 'major').length
  const reversedCount = cards.filter((entry) => entry.drawn.orientation === 'down').length
  const dominantSuit = getDominantSuit(cards)

  if (majorCount > 0) {
    signals.push(
      majorCount >= Math.ceil(cards.length / 2) ? '大阿尔卡那主导' : '出现关键转折牌',
    )
  }

  if (dominantSuit) {
    signals.push(
      dominantSuit === 'cups'
        ? '圣杯能量偏强'
        : dominantSuit === 'wands'
          ? '权杖能量偏强'
          : dominantSuit === 'swords'
            ? '宝剑能量偏强'
            : '星币能量偏强',
    )
  }

  if (reversedCount >= Math.ceil(cards.length / 2)) {
    signals.push('逆位较多')
  }

  return Array.from(new Set([...signals, ...interpretation.depthSignals])).slice(0, 8)
}

const buildSummary = (
  cards: ReadingCardView[],
  input: ReadingInput,
  spread: ResolvedSpreadDefinition,
  tone: string,
  interpretation: InterpretationMeta,
) => {
  const reversedCount = cards.filter((entry) => entry.drawn.orientation === 'down').length
  const majorCount = cards.filter((entry) => entry.card.arcana === 'major').length
  const dominantSuit = getDominantSuit(cards)
  const parts = [
    `围绕「${input.question}」，在${TOPIC_BY_ID[input.topic].label}议题下，这组${spread.title}${spread.activeVariantTitle ? ` · ${spread.activeVariantTitle}` : ''}呈现出${tone}的基调。`,
  ]

  if (majorCount >= Math.ceil(cards.length / 2)) {
    parts.push('大阿尔卡那占比较高，说明这次不只是表层事件，而是阶段性的原型课题在推动你。')
  } else if (majorCount > 0) {
    parts.push('牌阵中的大阿尔卡那提示你已经站在关键节点，选择会影响后续轨迹。')
  }

  if (dominantSuit) {
    parts.push(SUIT_SUMMARIES[dominantSuit][input.topic])
  }

  if (interpretation.elementalDynamics.conflicts.length > 0) {
    parts.push('牌阵显示出元素冲突，当前真正的难点不是“没有路”，而是内在动力与现实节奏还未对齐。')
  } else if (interpretation.elementalDynamics.harmonies.length > 0) {
    parts.push('牌阵存在元素协同，说明你手上已经有可被调动的顺势资源。')
  }

  if (interpretation.elementalDynamics.missing.length > 0) {
    parts.push(
      `你目前最容易忽略的维度是${interpretation.elementalDynamics.missing
        .map((entry) => formatSuitLabel(entry))
        .join('、')}，补齐这部分通常比强行加速更有效。`,
    )
  }

  if (reversedCount === 0) {
    parts.push('顺位流动较完整，重点是保持方向一致，不要被短期噪音带偏。')
  } else if (reversedCount >= Math.ceil(cards.length / 2)) {
    const reversedLabels = Array.from(
      new Set(
        cards
          .filter((entry) => entry.drawn.orientation === 'down')
          .map((entry) => buildReversedLens(entry, []).label),
      ),
    )
    parts.push(
      `逆位偏多，当前更适合先处理${reversedLabels.join('、')}层面的校准，再推进外部动作。`,
    )
  } else {
    parts.push('顺逆位交错，外部机会可以推进，但内部仍需要更细致地校准节奏与方式。')
  }

  parts.push(TOPIC_ACTION_FOCUS[input.topic])

  if (interpretation.softenedForSafety) {
    parts.push('这个问题触及高风险决策语境，塔罗更适合帮助你看清状态与行动选项，而不是替你做结论性决定。')
  }

  return parts.join('')
}

const buildAdvice = (
  cards: ReadingCardView[],
  topic: TopicId,
  interpretation: InterpretationMeta,
) => {
  const uniqueTags = Array.from(new Set(cards.flatMap((entry) => entry.card.adviceTags)))
  const advice = uniqueTags
    .map((tag) => ADVICE_LIBRARY[tag])
    .filter(Boolean)
    .slice(0, 2)

  if (interpretation.elementalDynamics.conflicts.length > 0) {
    advice.push('先处理拉扯最大的冲突点，再做下一步决定，能显著减少反复。')
  } else if (interpretation.elementalDynamics.missing.length > 0) {
    advice.push(
      `有意识补齐${interpretation.elementalDynamics.missing
        .map((entry) => formatSuitLabel(entry))
        .join('、')}相关行动，会提升整体推进质量。`,
    )
  }

  if (advice.length < 3) {
    advice.push(TOPIC_ACTION_FOCUS[topic])
  }

  if (interpretation.softenedForSafety) {
    advice[2] = '涉及高风险议题时，请把塔罗作为自我校准工具，并结合现实中的专业支持与事实判断。'
  }

  return advice.slice(0, 3)
}

const buildActionPlan = (cards: ReadingCardView[], interpretation: InterpretationMeta) => {
  const uniqueTags = Array.from(new Set(cards.flatMap((entry) => entry.card.adviceTags)))
  const plan = uniqueTags
    .map((tag) => {
      const template = ACTION_PLAN_LIBRARY[tag]

      if (!template) {
        return null
      }

      return {
        id: `step-${tag}`,
        title: template.title,
        detail: template.detail,
      }
    })
    .filter((entry): entry is ActionPlanStep => entry !== null)
    .slice(0, 2)

  if (interpretation.elementalDynamics.conflicts.length > 0) {
    plan.push({
      id: 'step-conflict-reconcile',
      title: '先解冲突再推进',
      detail: '先处理最明显的内外部冲突，再启动下一步行动，避免重复消耗。',
    })
  } else if (interpretation.elementalDynamics.missing.length > 0) {
    plan.push({
      id: 'step-element-balance',
      title: '补齐缺失维度',
      detail: `针对${interpretation.elementalDynamics.missing
        .map((entry) => formatSuitLabel(entry))
        .join('、')}设计一个可执行动作，平衡整体节奏。`,
    })
  }

  const fallbackPlan: ActionPlanStep[] = [
    {
      id: 'step-observe',
      title: '先观察当前局势',
      detail: '记录最重要的感受、阻力和外部条件，避免被情绪直接带走。',
    },
    {
      id: 'step-act',
      title: '做一个最小行动实验',
      detail: '选择一个低风险动作，快速验证现在最在意的判断。',
    },
    {
      id: 'step-review',
      title: '在一周内复盘一次',
      detail: '回看新的反馈与变化，再决定继续推进、调整或暂停。',
    },
  ]

  return [...plan, ...fallbackPlan].slice(0, 3)
}

interface BuildReasoningGraphInput {
  cards: ReadingCardView[]
  input: ReadingInput
  interpretation: InterpretationMeta
  positionRuleTags: Record<string, InterpretationRuleTag[]>
}

const inferPositionRole = (positionLabel: string, prompt: string) => {
  const source = `${positionLabel} ${prompt}`

  if (/(阻碍|挑战|压力|恐惧)/.test(source)) {
    return '阻力源'
  }

  if (/(建议|行动|下一步|指引)/.test(source)) {
    return '干预入口'
  }

  if (/(未来|结果|展望|趋势)/.test(source)) {
    return '轨迹投影'
  }

  if (/(过去|内因|基础)/.test(source)) {
    return '根因线索'
  }

  if (/(现状|当前|核心|主题)/.test(source)) {
    return '现状锚点'
  }

  return '语境线索'
}

const getInteractionReason = (
  left: ReadingCardView,
  right: ReadingCardView,
  relation: 'conflict' | 'harmony',
) => {
  const leftLabel =
    left.card.suit === null ? `${left.card.nameZh}原型` : formatSuitLabel(left.card.suit)
  const rightLabel =
    right.card.suit === null ? `${right.card.nameZh}原型` : formatSuitLabel(right.card.suit)

  return relation === 'conflict'
    ? `${leftLabel}与${rightLabel}在推进节奏上互相牵扯`
    : `${leftLabel}与${rightLabel}形成同向增幅`
}

const buildReasoningGraph = ({
  cards,
  input,
  interpretation,
  positionRuleTags,
}: BuildReasoningGraphInput): ReasoningGraph => {
  const nodes: ReasoningGraphNode[] = cards.map((entry) => {
    const tags = positionRuleTags[entry.drawn.positionKey] ?? []
    const reversedLens =
      entry.drawn.orientation === 'down' ? buildReversedLens(entry, tags).label : undefined

    return {
      positionKey: entry.drawn.positionKey,
      positionLabel: entry.positionLabel,
      prompt: entry.prompt,
      cardId: entry.card.id,
      cardName: entry.card.nameZh,
      orientation: entry.drawn.orientation,
      element: entry.card.suit ?? 'major',
      role:
        tags.includes('Conflict') || tags.includes('Sensitive_Query')
          ? '关键摩擦点'
          : inferPositionRole(entry.positionLabel, entry.prompt),
      archetype:
        entry.card.arcana === 'major'
          ? `${entry.card.nameZh}原型课题`
          : `${entry.card.keywords[entry.drawn.orientation][0]} / ${entry.card.keywords[entry.drawn.orientation][1] ?? entry.card.keywords[entry.drawn.orientation][0]}`,
      orientationModifier:
        tags.includes('Internalized') || entry.drawn.orientation === 'down'
          ? 'Internalized'
          : 'Direct',
      reversedLens,
    }
  })

  const relations: ReasoningGraphRelation[] = []
  for (let index = 0; index < cards.length - 1; index += 1) {
    const left = cards[index]
    const right = cards[index + 1]
    const relation = getElementInteraction(left.card.suit, right.card.suit)

    if (relation === 'neutral') {
      continue
    }

    relations.push({
      type: relation,
      from: left.positionLabel,
      to: right.positionLabel,
      reason: getInteractionReason(left, right, relation),
    })
  }

  const majorCards = cards
    .filter((entry) => entry.card.arcana === 'major')
    .map((entry) => `${entry.positionLabel}位${entry.card.nameZh}`)
  const queryContext = {
    original: input.question.trim(),
    reframed: `围绕${TOPIC_BY_ID[input.topic].label}议题，先识别当前轨迹，再找可改变结果的行动杠杆。`,
    actionFocus: TOPIC_ACTION_FOCUS[input.topic],
    safetyNote: interpretation.softenedForSafety
      ? '问题触及高风险语境，系统会避免绝对预测并强调可控行动。'
      : undefined,
  }
  const probableOutcomeNode = nodes[nodes.length - 1]
  const probableTrajectory =
    relations.some((entry) => entry.type === 'conflict')
      ? `若维持当前节奏，${probableOutcomeNode.positionLabel}位呈现的${probableOutcomeNode.cardName}更可能表现为反复拉扯后的迟缓推进。`
      : `若保持当前节奏，${probableOutcomeNode.positionLabel}位呈现的${probableOutcomeNode.cardName}将沿着既有路径稳步显形。`
  const interventionPoints = [
    ...nodes
      .filter((entry) => entry.role === '干预入口' || entry.role === '阻力源')
      .map((entry) => `先处理${entry.positionLabel}位对应的${entry.cardName}议题`),
    interpretation.elementalDynamics.missing.length > 0
      ? `主动补齐${interpretation.elementalDynamics.missing
          .map((entry) => formatSuitLabel(entry))
          .join('、')}维度`
      : null,
  ]
    .filter((entry): entry is string => entry !== null)
    .slice(0, 4)

  return {
    queryContext,
    nodes,
    relations,
    dominantElement: interpretation.elementalDynamics.dominant,
    missingElements: interpretation.elementalDynamics.missing,
    majorWeight: cards.length === 0 ? 0 : majorCards.length / cards.length,
    majorAnchors: majorCards,
    probableTrajectory,
    interventionPoints,
    coverageLabels: nodes.map((entry) => entry.positionLabel),
  }
}

interface BuildDeepNarrativeInput {
  input: ReadingInput
  cards: ReadingCardView[]
  spread: ResolvedSpreadDefinition
  interpretation: InterpretationMeta
  reasoningGraph: ReasoningGraph
  actionPlan: ActionPlanStep[]
  summary: string
}

interface NarrativeValidationResult {
  passed: boolean
  coverageScore: number
}

const ensureSentence = (text: string) => {
  const value = text.trim()
  if (!value) {
    return ''
  }

  return /[。！？]$/.test(value) ? value : `${value}。`
}

const resolveNarrativeTargetLength = (cardCount: number) => {
  if (cardCount <= NARRATIVE_LENGTH_POINTS[0].cards) {
    return NARRATIVE_LENGTH_POINTS[0].length
  }

  for (let index = 0; index < NARRATIVE_LENGTH_POINTS.length - 1; index += 1) {
    const left = NARRATIVE_LENGTH_POINTS[index]
    const right = NARRATIVE_LENGTH_POINTS[index + 1]

    if (cardCount <= right.cards) {
      const ratio = (cardCount - left.cards) / (right.cards - left.cards)
      return Math.round(left.length + (right.length - left.length) * ratio)
    }
  }

  const tailLeft = NARRATIVE_LENGTH_POINTS[NARRATIVE_LENGTH_POINTS.length - 2]
  const tailRight = NARRATIVE_LENGTH_POINTS[NARRATIVE_LENGTH_POINTS.length - 1]
  const ratio = (cardCount - tailRight.cards) / (tailRight.cards - tailLeft.cards)

  return Math.round(tailRight.length + (tailRight.length - tailLeft.length) * ratio)
}

const trimNarrativeBySentence = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text
  }

  const cutIndex = text.lastIndexOf('。', maxLength)
  if (cutIndex > Math.floor(maxLength * 0.65)) {
    return text.slice(0, cutIndex + 1)
  }

  return `${text.slice(0, maxLength - 1)}…`
}

const chunkSegments = (segments: string[], chunkSize: number) => {
  if (segments.length === 0) {
    return []
  }

  const chunks: string[][] = []
  for (let index = 0; index < segments.length; index += chunkSize) {
    chunks.push(segments.slice(index, index + chunkSize))
  }

  return chunks
}

const buildNarrativeBaseSegments = ({
  input,
  spread,
  reasoningGraph,
}: Pick<BuildDeepNarrativeInput, 'input' | 'spread' | 'reasoningGraph'>) => {
  const majorLine =
    reasoningGraph.majorWeight >= 0.5
      ? '大阿尔卡那占比较高，这次更像阶段性的原型迁移，而非短期情绪波动。'
      : reasoningGraph.majorAnchors.length > 0
        ? `关键原型位于${reasoningGraph.majorAnchors.join('、')}，它们会放大你在这个阶段的主课题。`
        : '本次以小阿尔卡那为主，重点在可执行层面的节奏校准。'
  const elementLine =
    reasoningGraph.dominantElement === null
      ? '当前元素分布较分散，说明问题并非单点失衡，而是多维牵动。'
      : `主导元素落在${formatSuitLabel(reasoningGraph.dominantElement)}，这是本轮解读的主动力学。`
  const missingLine =
    reasoningGraph.missingElements.length > 0
      ? `缺失元素是${reasoningGraph.missingElements
          .map((entry) => formatSuitLabel(entry))
          .join('、')}，这部分若不补齐，推进会持续出现“做了很多却不见得有效”的耗散。`
      : '四元素没有出现明显缺口，重点是让现有资源按优先级排布。'

  return [
    `你提出的问题是「${input.question.trim()}」。这组${spread.title}${spread.activeVariantTitle ? `·${spread.activeVariantTitle}` : ''}先指向一个核心事实：${reasoningGraph.queryContext.reframed}`,
    `在方法层面，这次解读遵循“结构化原型 + 关系动力学”的路径：${METHODOLOGY_CORE_MODELS[0]}${METHODOLOGY_CORE_MODELS[1]}${METHODOLOGY_CORE_MODELS[2]}`,
    majorLine,
    elementLine,
    missingLine,
    reasoningGraph.relations.length > 0
      ? `牌间关系显示，${reasoningGraph.relations
          .map((relation) => `${relation.from}到${relation.to}${relation.type === 'conflict' ? '形成冲突' : '形成协同'}（${relation.reason}）`)
          .join('；')}。`
      : '牌间关系没有显著冲突，更多表现为层层递进的同向推动。',
    `综合境遇五要素（不可抗力、业力循环、性格倾向、经验结构、行动杠杆）来看，你当下最可控且最值得放大的，是行动杠杆与经验结构的重新编排。`,
    reasoningGraph.probableTrajectory,
    reasoningGraph.queryContext.safetyNote
      ? `同时需要强调：${reasoningGraph.queryContext.safetyNote}`
      : null,
  ].filter((entry): entry is string => entry !== null)
}

const buildNarrativeExpansionSegments = ({
  reasoningGraph,
  actionPlan,
  interpretation,
}: Pick<BuildDeepNarrativeInput, 'reasoningGraph' | 'actionPlan' | 'interpretation'>) => {
  const cardSegments = reasoningGraph.nodes.map((node) => {
    const orientationLine =
      node.orientationModifier === 'Direct'
        ? '以直接能量显形'
        : '以内化或延迟方式显形'
    const elementLine =
      node.element === 'major' ? '原型层触发' : `${formatSuitLabel(node.element)}维度触发`
    const reversedLensLine =
      node.orientation === 'down' && node.reversedLens
        ? ` 此处逆位更接近“${node.reversedLens}”，说明重点不在简单否定，而在重新校准这股力量如何落地。`
        : ''

    return `在${node.positionLabel}位，${node.cardName}（${node.orientation === 'up' ? '正位' : '逆位'}）以${orientationLine}，它作为${node.role}连接了“${node.prompt}”这一问题入口，并通过${elementLine}把议题落在${node.archetype}。${reversedLensLine}`
  })

  const actionSegments = actionPlan.map(
    (step, index) =>
      `行动建议${index + 1}是「${step.title}」：${step.detail}，这一步的意义不在“立刻见效”，而在把抽象启示转成可验证动作。`,
  )

  const interpretationSegments = [
    interpretation.elementalDynamics.conflicts.length > 0
      ? `冲突信号提示：${interpretation.elementalDynamics.conflicts.join('；')}。若忽略这层冲突，任何单点发力都容易出现反复。`
      : '当前关系动力学更偏协同，关键不是“要不要做”，而是“先做哪一步最省力”。',
    interpretation.softenedForSafety
      ? '因为问题触及敏感边界，建议把这次解读当作结构化反思，不把任何一句话当作替代现实判断的最终命令。'
      : '这次解读强调成长导向：未来并非固定结局，而是会被你的后续行动持续改写。',
    `回扣到你的原问题，最有效的推进方式不是扩大焦虑半径，而是缩小行动半径：先在72小时内完成一个可测量动作，再用反馈更新下一轮判断。`,
  ]

  return [...cardSegments, ...actionSegments, ...interpretationSegments]
}

const composeNarrativeText = (
  baseSegments: string[],
  expansionSegments: string[],
  targetLength: number,
) => {
  const normalizedBase = baseSegments.map(ensureSentence).filter(Boolean)
  const normalizedExpansion = expansionSegments.map(ensureSentence).filter(Boolean)
  const minimumLength = Math.round(targetLength * 0.92)
  const maximumLength = Math.round(targetLength * 1.28)
  const selectedExpansion: string[] = []
  const baseText = normalizedBase.join('')
  let narrativeLength = baseText.length
  let index = 0

  while (narrativeLength < minimumLength && normalizedExpansion.length > 0) {
    const segment = normalizedExpansion[index % normalizedExpansion.length]
    selectedExpansion.push(segment)
    narrativeLength += segment.length
    index += 1

    if (index > normalizedExpansion.length * 3) {
      break
    }
  }

  const headParagraphs = [
    normalizedBase.slice(0, 2).join(''),
    normalizedBase.slice(2).join(''),
  ].filter((entry) => entry.trim().length > 0)
  const expansionParagraphs = chunkSegments(selectedExpansion, 2)
    .map((chunk) => chunk.join(''))
    .filter((entry) => entry.trim().length > 0)
  const narrative = [...headParagraphs, ...expansionParagraphs].join('\n\n')

  return trimNarrativeBySentence(narrative, maximumLength).replace(/\n{3,}/g, '\n\n')
}

const validateNarrative = ({
  text,
  input,
  reasoningGraph,
}: {
  text: string
  input: ReadingInput
  reasoningGraph: ReasoningGraph
}): NarrativeValidationResult => {
  const questionStem = input.question.trim().slice(0, 8)
  const hasQuestion = questionStem.length > 0 && text.includes(questionStem)
  const labelHits = reasoningGraph.coverageLabels.filter((label) => text.includes(label)).length
  const coverageRatio =
    reasoningGraph.coverageLabels.length === 0
      ? 1
      : labelHits / reasoningGraph.coverageLabels.length
  const relationNeeded =
    reasoningGraph.relations.length > 0 || reasoningGraph.missingElements.length > 0
  const hasRelation = /(冲突|协同|元素|缺失)/.test(text)
  const hasAction = /(行动|建议|尝试|步骤|推进)/.test(text)
  const noFatalism = FATALISTIC_TERMS.every((term) => !text.includes(term))
  const coverageScore = Number(
    ((hasQuestion ? 0.25 : 0) +
      Math.min(0.45, coverageRatio * 0.45) +
      (hasAction ? 0.15 : 0) +
      ((!relationNeeded || hasRelation) ? 0.15 : 0)).toFixed(2),
  )

  return {
    passed:
      hasQuestion &&
      coverageRatio >= 0.6 &&
      hasAction &&
      (!relationNeeded || hasRelation) &&
      noFatalism,
    coverageScore,
  }
}

const buildFallbackNarrative = ({
  input,
  reasoningGraph,
  actionPlan,
}: Pick<BuildDeepNarrativeInput, 'input' | 'reasoningGraph' | 'actionPlan'>) =>
  [
    [
      `围绕「${input.question.trim()}」，牌阵先给出的不是宿命答案，而是当前轨迹的结构图：${reasoningGraph.queryContext.reframed}`,
      reasoningGraph.relations.length > 0
        ? `关系层面最关键的是${reasoningGraph.relations
            .map((item) => `${item.from}与${item.to}${item.type === 'conflict' ? '的冲突' : '的协同'}`)
            .join('、')}，这解释了你为什么会在推进中感到卡顿或失衡。`
        : '关系层面暂未出现明显冲突，说明你已经具备连续推进的条件，重点在顺序而不是用力。',
    ]
      .filter((entry): entry is string => entry !== null)
      .map(ensureSentence)
      .join(''),
    [
      `从元素分布看，主导维度是${reasoningGraph.dominantElement ? formatSuitLabel(reasoningGraph.dominantElement) : '多元素并行'}，${reasoningGraph.missingElements.length > 0 ? `缺失维度是${reasoningGraph.missingElements.map((item) => formatSuitLabel(item)).join('、')}，需要主动补齐。` : '整体结构没有明显缺口。'}`,
      reasoningGraph.probableTrajectory,
      reasoningGraph.queryContext.safetyNote
        ? `安全提醒：${reasoningGraph.queryContext.safetyNote}`
        : null,
    ]
      .filter((entry): entry is string => entry !== null)
      .map(ensureSentence)
      .join(''),
    ensureSentence(
      `你现在可以从三个动作开始：${actionPlan
        .slice(0, 3)
        .map((step, index) => `${index + 1}.${step.title}`)
        .join('，')}。每一步都以小范围验证为原则，再根据现实反馈迭代。`,
    ),
  ]
    .filter((entry) => entry.trim().length > 0)
    .join('\n\n')

const buildDeepNarrative = ({
  input,
  cards,
  spread,
  interpretation,
  reasoningGraph,
  actionPlan,
  summary,
}: BuildDeepNarrativeInput): NarrativeBuildResult => {
  const targetLength = resolveNarrativeTargetLength(cards.length)
  const baseSegments = buildNarrativeBaseSegments({
    input,
    spread,
    reasoningGraph,
  })
  const expansionSegments = buildNarrativeExpansionSegments({
    reasoningGraph,
    actionPlan,
    interpretation,
  })
  let text = composeNarrativeText(baseSegments, expansionSegments, targetLength)
  let validation = validateNarrative({ text, input, reasoningGraph })

  if (!validation.passed) {
    const retryBase = [
      `你问的是「${input.question.trim()}」，解读会围绕问题本身，而不是抽象套话展开。`,
      ...baseSegments,
      `回到原问题本身：${summary}`,
    ]
    text = composeNarrativeText(retryBase, expansionSegments, targetLength)
    validation = validateNarrative({ text, input, reasoningGraph })
  }

  if (!validation.passed) {
    text = trimNarrativeBySentence(
      buildFallbackNarrative({ input, reasoningGraph, actionPlan }),
      Math.round(targetLength * 1.1),
    )
    validation = validateNarrative({ text, input, reasoningGraph })
  }

  return {
    text,
    meta: {
      targetLength,
      actualLength: text.length,
      coverageScore: validation.coverageScore,
      validationPassed: validation.passed,
    },
  }
}

const resolveDepthLevel = (
  cards: ReadingCardView[],
  interpretation: InterpretationMeta,
): ReadingDepthLevel => {
  if (cards.length >= 3 && interpretation.ruleHits.length >= 3) {
    return 'deep'
  }

  if (interpretation.ruleHits.length >= 1) {
    return 'standard'
  }

  return 'shallow'
}

const getDominantSuit = (cards: ReadingCardView[]): MinorSuit | null => {
  const suitCounts = cards.reduce<Record<MinorSuit, number>>(
    (accumulator, entry) => {
      if (entry.card.suit !== null) {
        accumulator[entry.card.suit] += 1
      }

      return accumulator
    },
    { wands: 0, cups: 0, swords: 0, pentacles: 0 },
  )

  const [dominantSuit, count] = Object.entries(suitCounts).sort(
    (left, right) => right[1] - left[1],
  )[0]

  return count > 0 ? (dominantSuit as MinorSuit) : null
}

const formatSuitLabel = (suit: MinorSuit) => {
  if (suit === 'wands') {
    return '火（权杖）'
  }

  if (suit === 'cups') {
    return '水（圣杯）'
  }

  if (suit === 'swords') {
    return '风（宝剑）'
  }

  return '土（星币）'
}

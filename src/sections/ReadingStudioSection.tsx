import type { CSSProperties } from 'react'
import { StatusMessage } from '../components/StatusMessage'
import { RevealText } from '../components/RevealText'
import { SPREADS } from '../data/spreads'
import { TOPICS } from '../data/topics'
import type { ResolvedSpreadDefinition, SpreadGuide, TopicId } from '../domain/tarot'
import { getSpreadPreviewPositions } from '../lib/spreadPreview'

type StudioTopicSelection = {
  framing: string
  label: string
  meaningHint?: string
}

type StudioVariantSelection = {
  description: string
  guide: SpreadGuide
  id: string
  title: string
}

interface ReadingStudioSectionProps {
  readingReady?: boolean
  canDraw: boolean
  drawNotice: string | null
  isShuffling: boolean
  needsReDrawConfirm: boolean
  onDraw: () => void
  onQuestionChange: (value: string) => void
  onSelectSpread: (spreadId: string) => void
  onSelectTopic: (topicId: TopicId) => void
  onSelectVariant: (variantId: string) => void
  question: string
  selectedSpread: ResolvedSpreadDefinition | null
  selectedTopic: StudioTopicSelection | null
  selectedVariant: StudioVariantSelection | null
  spreadId: string | null
  topic: TopicId | null
  variantId?: string
}

const QUESTION_SUGGESTIONS: Record<TopicId, string[]> = {
  general: [
    '我接下来最该先处理的主线是什么？',
    '当前局面里真正影响结果的因素是什么？',
    '接下来一周我该优先推进哪一步？',
  ],
  love: [
    '这段关系当前最值得看清的核心是什么？',
    '我该先调整自己的哪一种互动方式？',
    '如果我要推进这段关系，第一步该怎么做？',
  ],
  career: [
    '我在当前工作里最该先解决的卡点是什么？',
    '如果我想推进这个项目，第一步该落在哪里？',
    '现在更适合稳住节奏，还是主动争取变化？',
  ],
  relationships: [
    '我和这个人之间最需要先说清的边界是什么？',
    '这段关系里真正卡住我们的那一层是什么？',
    '我现在最该先修复哪一种互动方式？',
  ],
  growth: [
    '我最近反复卡住的内在课题是什么？',
    '我该先停掉哪一种持续消耗自己的方式？',
    '现阶段最值得我先培养的稳定力量是什么？',
  ],
}

export function ReadingStudioSection({
  readingReady = false,
  canDraw,
  drawNotice,
  isShuffling,
  needsReDrawConfirm,
  onDraw,
  onQuestionChange,
  onSelectSpread,
  onSelectTopic,
  onSelectVariant,
  question,
  selectedSpread,
  selectedTopic,
  selectedVariant,
  spreadId,
  topic,
  variantId,
}: ReadingStudioSectionProps) {
  const selectedSpreadDefinition = selectedSpread
    ? SPREADS.find((entry) => entry.id === selectedSpread.id)
    : null
  const selectedVariants = selectedSpreadDefinition?.variants ?? []
  const questionSuggestions = QUESTION_SUGGESTIONS[topic ?? 'general']
  const meaningHint = selectedTopic?.meaningHint?.trim() || null
  const selectedGuide = selectedVariant?.guide ?? selectedSpread?.guide ?? null

  const currentStep = !question.trim() || !topic ? 0 : !selectedSpread ? 1 : readingReady && !isShuffling ? 3 : 2

  return (
    <section
      aria-busy={isShuffling}
      className="panel section stitch-panel stitch-panel--studio"
      id="reading"
    >
      <div className="section__heading">
        <div>
          <p className="eyebrow">Reading Studio</p>
          <RevealText as="h2" text="问题、主题与牌阵" />
        </div>
        <span className="section__count">
          {selectedSpread
            ? `${selectedSpread.cardCount} 张牌${selectedGuide ? ` · ${selectedGuide.timeCost}` : ''}`
            : '先选好问题'}
        </span>
      </div>

      <ol className="reading-progress" aria-label="占卜步骤">
        {['提出问题', '选择牌阵', '洗牌抽牌', '阅读指引'].map((label, index) => (
          <li key={label} aria-current={currentStep === index ? 'step' : undefined} className={index < currentStep ? 'is-complete' : ''}>
            <span aria-hidden="true">{index < currentStep ? '✓' : `0${index + 1}`}</span>
            {label}
          </li>
        ))}
      </ol>
      <label className="question-field">
        <span>占卜问题</span>
        <textarea
          aria-label="占卜问题"
          placeholder="把问题写得更具体，例如：我接下来该怎样处理这段关系？"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
        />
      </label>

      <div className="question-suggestions" data-testid="question-suggestions">
        <span className="question-suggestions__label">试试这样问</span>
        <div className="question-suggestions__list">
          {questionSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="pill question-suggestions__pill"
              type="button"
              onClick={() => onQuestionChange(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="topic-selector utility-row">
        <div className="pill-grid">
          {TOPICS.map((entry) => (
            <button
              key={entry.id}
              aria-pressed={topic === entry.id}
              aria-label={entry.label}
              className={`pill ${topic === entry.id ? 'is-active' : ''}`}
              type="button"
              onClick={() => onSelectTopic(entry.id)}
            >
              <span>{entry.label}</span>
              <small>{entry.motto}</small>
            </button>
          ))}
        </div>
        {selectedTopic ? <p className="selection-note">{selectedTopic.framing}</p> : null}
      </div>

      {meaningHint || selectedGuide ? (
        <article className="result-panel" data-testid="studio-guide-panel">
          <p className="eyebrow">Selection Guide</p>
          {meaningHint ? (
            <div className="result-panel__stack">
              <h3>提问提醒</h3>
              <p>{meaningHint}</p>
            </div>
          ) : null}
          {selectedGuide ? (
            <div className="result-panel__stack">
              <p className="eyebrow">Spread Guide</p>
              <h3>{selectedVariant?.title ?? selectedSpread?.title ?? '牌阵说明'}</h3>
              <div className="record-card__details">
                <div>
                  <h4>适合回答什么</h4>
                  <p>{selectedGuide.bestFor}</p>
                </div>
                <div>
                  <h4>什么时候选它</h4>
                  <p>{selectedGuide.chooseWhen}</p>
                </div>
                {selectedGuide.avoidWhen ? (
                  <div>
                    <h4>什么时候不要用它</h4>
                    <p>{selectedGuide.avoidWhen}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </article>
      ) : null}

      <h3 className="studio-step-title">选择适合你的牌阵</h3>
      <div className="spread-grid">
        {SPREADS.map((spread) => {
          const previewPositions = getSpreadPreviewPositions(
            spread.layoutId,
            spread.id === selectedSpread?.id && selectedVariant
              ? spread.variants?.find((entry) => entry.id === selectedVariant.id)?.positions ??
                  spread.positions
              : spread.variants?.[0]?.positions ?? spread.positions,
          )

          return (
            <button
              key={spread.id}
              aria-pressed={spreadId === spread.id}
              aria-label={spread.id === 'daily-energy' ? '每日一张牌阵' : spread.title}
              className={`spread-card ${spreadId === spread.id ? 'is-active' : ''}`}
              type="button"
              onClick={() => onSelectSpread(spread.id)}
            >
              <div className="spread-card__topline">
                <span>{spread.cardCount} 张牌</span>
                <span>{spread.guide.timeCost}</span>
              </div>
              <div className="spread-card__body">
                <div className="spread-card__info">
                  <h3>{spread.title}</h3>
                  <p>{spread.description}</p>
                </div>
                <div className={`spread-preview spread-preview--${spread.layoutId}`}>
                  {previewPositions.map((position) => (
                    <span
                      key={`${spread.id}-${position.key}`}
                      className="spread-preview__dot"
                      style={
                        {
                          '--preview-x': `${position.x}%`,
                          '--preview-y': `${position.y}%`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selectedSpread && selectedVariants.length > 0 ? (
        <div className="utility-row utility-row--stack">
          <div className="section__heading section__heading--compact">
            <div>
              <p className="eyebrow">Spread Mode</p>
              <RevealText as="h2" text={`${selectedSpread.title}模式`} />
            </div>
          </div>
          <div className="utility-toggle utility-toggle--wrap">
            {selectedVariants.map((entry) => (
              <button
                key={entry.id}
                aria-pressed={variantId === entry.id}
                className={`pill ${variantId === entry.id ? 'is-active' : ''}`}
                type="button"
                onClick={() => onSelectVariant(entry.id)}
              >
                {entry.title}
              </button>
            ))}
          </div>
          {selectedVariant ? <p className="selection-note">{selectedVariant.description}</p> : null}
        </div>
      ) : null}

      <div className="draw-summary">
        <div className="draw-summary__row">
          <span>当前组合</span>
          <p>
            {selectedTopic?.label ?? '未选主题'} / {selectedSpread?.title ?? '未选牌阵'}
            {selectedVariant ? ` / ${selectedVariant.title}` : ''}
          </p>
        </div>

        <div className="draw-summary__actions">
          <button className="primary-button" disabled={!canDraw || isShuffling} aria-describedby="draw-guidance" type="button" onClick={onDraw}>
            {needsReDrawConfirm ? '再次点击确认重抽' : '洗牌并抽牌'}
          </button>
        </div>
        <p id="draw-guidance" className="draw-guidance" role="status">
          {isShuffling ? '正在洗牌，请稍候，感受此刻的问题…' : !question.trim() ? '先写下你的问题，或选择一个提问示例。' : !topic ? '选择一个主题，让指引更贴近你的问题。' : !selectedSpread ? '选择一个牌阵，即可开始抽牌。' : '准备好了。深呼吸，让牌面为你打开新的视角。'}
        </p>
        <StatusMessage message={drawNotice} />
        <p className="selection-note">
          重抽规则：同一问题在 30 秒内重复抽牌时，会先提示确认，避免无意识反复重抽。
        </p>
      </div>
    </section>
  )
}

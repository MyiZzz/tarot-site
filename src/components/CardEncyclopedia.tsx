import { useDeferredValue, useState } from 'react'
import { CARD_ART_MANIFEST } from '../data/artManifest'
import { TAROT_DECK } from '../data/cards'
import { TOPIC_BY_ID } from '../data/topics'
import type { TarotCard, TopicId } from '../domain/tarot'
import { RevealText } from './RevealText'
import { TarotCardFigure } from './TarotCardFigure'

interface CardEncyclopediaProps {
  featuredCardIds: string[]
}

type EncyclopediaScope = 'drawn' | 'all'
type EncyclopediaGroupFilter = 'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'

const TOPIC_TAG_MAP: Record<TopicId, string[]> = {
  general: ['clarity', 'balance', 'ground', 'complete', 'adapt'],
  love: ['communicate', 'receive', 'trust', 'heal', 'self-honesty'],
  career: ['discipline', 'focus', 'strategy', 'lead', 'act', 'collaborate'],
  relationships: ['communicate', 'boundaries', 'receive', 'collaborate', 'self-honesty'],
  growth: ['heal', 'observe', 'release', 'rest', 'patience', 'trust'],
}

const GROUP_FILTERS: Array<{ id: EncyclopediaGroupFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'major', label: '大阿尔卡那' },
  { id: 'wands', label: '权杖' },
  { id: 'cups', label: '圣杯' },
  { id: 'swords', label: '宝剑' },
  { id: 'pentacles', label: '星币' },
]

const scoreCardTopics = (card: TarotCard) => {
  const scores: Record<TopicId, number> = {
    general: card.arcana === 'major' ? 1 : 0,
    love: 0,
    career: 0,
    relationships: 0,
    growth: card.arcana === 'major' ? 1 : 0,
  }

  for (const [topicId, tags] of Object.entries(TOPIC_TAG_MAP) as Array<[TopicId, string[]]>) {
    scores[topicId] += card.adviceTags.filter((tag) => tags.includes(tag)).length
  }

  if (card.suit === 'cups') {
    scores.love += 2
    scores.relationships += 2
  }

  if (card.suit === 'wands') {
    scores.career += 2
    scores.growth += 1
  }

  if (card.suit === 'swords') {
    scores.relationships += 1
    scores.career += 1
    scores.growth += 1
  }

  if (card.suit === 'pentacles') {
    scores.general += 1
    scores.career += 2
  }

  return (Object.entries(scores) as Array<[TopicId, number]>)
    .sort((left, right) => right[1] - left[1])
    .filter((entry, index) => entry[1] > 0 || index === 0)
    .slice(0, 3)
    .map(([topicId]) => topicId)
}

const matchesGroupFilter = (card: TarotCard, groupFilter: EncyclopediaGroupFilter) => {
  if (groupFilter === 'all') {
    return true
  }

  if (groupFilter === 'major') {
    return card.arcana === 'major'
  }

  return card.suit === groupFilter
}

const matchesQuery = (card: TarotCard, rawQuery: string) => {
  const query = rawQuery.trim().toLowerCase()

  if (query.length === 0) {
    return true
  }

  return [card.nameZh, card.nameEn, card.id].some((value) =>
    value.toLowerCase().includes(query),
  )
}

export function CardEncyclopedia({ featuredCardIds }: CardEncyclopediaProps) {
  const [scope, setScope] = useState<EncyclopediaScope>('drawn')
  const [groupFilter, setGroupFilter] = useState<EncyclopediaGroupFilter>('all')
  const [query, setQuery] = useState('')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    featuredCardIds[0] ?? TAROT_DECK[0]?.id ?? null,
  )
  const deferredQuery = useDeferredValue(query)

  const featuredCards = TAROT_DECK.filter((card) => featuredCardIds.includes(card.id))
  const scopeCards = scope === 'drawn' ? featuredCards : TAROT_DECK
  const filteredByGroup = scopeCards.filter((card) => matchesGroupFilter(card, groupFilter))
  const visibleCards = filteredByGroup.filter((card) => matchesQuery(card, deferredQuery))
  const resolvedSelectedCardId =
    selectedCardId !== null && visibleCards.some((card) => card.id === selectedCardId)
      ? selectedCardId
      : visibleCards[0]?.id ?? null

  const selectedCard =
    visibleCards.find((card) => card.id === resolvedSelectedCardId) ??
    null

  return (
    <section className="panel section encyclopedia-panel stitch-panel stitch-panel--encyclopedia">
      <div className="section__heading">
        <div>
          <p className="eyebrow">Step 09</p>
          <RevealText as="h2" text="78 张牌卡百科" />
        </div>
        <span className="section__count">
          {scope === 'drawn' ? '本次抽到的牌' : '完整牌库'}
        </span>
      </div>

      <p className="selection-note encyclopedia-note">
        抽完牌后，可以继续点进单张牌，查看正位、逆位、关键词、延伸解读和更适合延伸阅读的主题。
      </p>

      <div className="utility-row">
        <div className="utility-toggle">
          <button
            aria-pressed={scope === 'drawn'}
            className={`pill ${scope === 'drawn' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setScope('drawn')}
          >
            <span>本次抽到的牌</span>
            <small>{featuredCards.length || 0} 张</small>
          </button>
          <button
            aria-pressed={scope === 'all'}
            className={`pill ${scope === 'all' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setScope('all')}
          >
            <span>查看全部 78 张</span>
            <small>完整牌卡百科</small>
          </button>
        </div>

        <label className="inline-input">
          <span>搜索牌名</span>
          <input
            placeholder="例如：恋人 / The Lovers"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="encyclopedia-group-filter">
        {GROUP_FILTERS.map((entry) => (
          <button
            key={entry.id}
            aria-pressed={groupFilter === entry.id}
            className={`pill ${groupFilter === entry.id ? 'is-active' : ''}`}
            type="button"
            onClick={() => setGroupFilter(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="encyclopedia-layout">
        <div
          className="encyclopedia-list encyclopedia-list--scroll"
          role="group"
          aria-label="牌卡列表"
          data-testid="encyclopedia-list"
        >
          {visibleCards.length > 0 ? (
            visibleCards.map((card) => (
              <button
                key={card.id}
                aria-pressed={card.id === resolvedSelectedCardId}
                className={`encyclopedia-chip ${
                  card.id === resolvedSelectedCardId ? 'is-active' : ''
                }`}
                type="button"
                onClick={() => setSelectedCardId(card.id)}
              >
                <strong>{card.nameZh}</strong>
                <small>{card.nameEn}</small>
              </button>
            ))
          ) : (
            <p className="selection-note">
              {scope === 'drawn' && featuredCards.length === 0
                ? '当前还没有可聚焦的抽牌结果，先完成一次抽牌，或切换到完整牌库。'
                : '没有找到匹配的牌，试试换一个关键词。'}
            </p>
          )}
        </div>

        {selectedCard ? (
          <article className="encyclopedia-detail">
            <div className="encyclopedia-detail__header">
              <div>
                <p className="eyebrow">
                  {selectedCard.arcana === 'major'
                    ? 'Major Arcana'
                    : `${selectedCard.nameEn.split(' of ')[1] ?? 'Minor Arcana'}`}
                </p>
                <RevealText as="h3" text={selectedCard.nameZh} />
                <p>{selectedCard.nameEn}</p>
              </div>

              <span className="section__count">
                {selectedCard.arcana === 'major' ? '大阿尔卡那' : '小阿尔卡那'}
              </span>
            </div>

            <div className="encyclopedia-detail__body">
              <div className="encyclopedia-detail__card-shell">
                <TarotCardFigure
                  art={CARD_ART_MANIFEST[selectedCard.id]}
                  card={selectedCard}
                  className="encyclopedia-detail__card"
                  revealed
                />
              </div>

              <div className="encyclopedia-detail__content">
                <div className="signal-strip">
                  {scoreCardTopics(selectedCard).map((topicId) => (
                    <span key={topicId}>{TOPIC_BY_ID[topicId].label}</span>
                  ))}
                </div>

                <div className="encyclopedia-columns">
                  <section className="result-panel">
                    <p className="eyebrow">Upright</p>
                    <h4>正位</h4>
                    <div className="signal-strip">
                      {selectedCard.keywords.up.map((keyword, index) => (
                        <span key={`${selectedCard.id}-up-${keyword}-${index}`}>{keyword}</span>
                      ))}
                    </div>
                    <p>{selectedCard.meaning.up}</p>
                  </section>

                  <section className="result-panel">
                    <p className="eyebrow">Reversed</p>
                    <h4>逆位</h4>
                    <div className="signal-strip">
                      {selectedCard.keywords.down.map((keyword, index) => (
                        <span key={`${selectedCard.id}-down-${keyword}-${index}`}>{keyword}</span>
                      ))}
                    </div>
                    <p>{selectedCard.meaning.down}</p>
                  </section>
                </div>

                <div className="encyclopedia-insights">
                  <section className="result-panel">
                    <p className="eyebrow">Deep Dive</p>
                    <h4>延伸解读</h4>
                    <p>{selectedCard.encyclopedia.descriptionZh}</p>
                  </section>

                  <section className="result-panel">
                    <p className="eyebrow">Practice</p>
                    <h4>实践建议</h4>
                    <p>{selectedCard.encyclopedia.adviceZh}</p>
                  </section>
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div className="encyclopedia-detail encyclopedia-detail--empty" role="status">
            <h3>暂无可显示的牌卡</h3>
            <p>请调整搜索词或筛选条件，或切换到完整牌库。</p>
          </div>
        )}
      </div>
    </section>
  )
}

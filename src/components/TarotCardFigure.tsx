import { CardArtwork } from './CardArtwork'
import type { CardArtManifest, Orientation, TarotCard } from '../domain/tarot'
import { CARD_IMAGE_ASSET_BY_ID } from '../data/cardImages'

interface TarotCardFigureProps {
  card: TarotCard
  art: CardArtManifest
  orientation?: Orientation
  label?: string
  revealLabel?: string
  revealed: boolean
  compact?: boolean
  interactive?: boolean
  onClick?: () => void
  className?: string
  imageProfile?: 'detail' | 'thumb' | 'minimal'
  loading?: 'lazy' | 'eager'
  testId?: string
}

const SUIT_SYMBOLS = {
  wands: 'W',
  cups: 'C',
  swords: 'S',
  pentacles: 'P',
} as const

const getPipCount = (card: TarotCard) =>
  card.arcana === 'minor' && card.number <= 10 ? card.number : 0

const renderPips = (card: TarotCard) => {
  if (card.arcana === 'major') {
    return null
  }

  const count = getPipCount(card)

  if (count > 0) {
    return (
      <div className="tarot-card-figure__pips" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <span key={`${card.id}-${index}`}>{SUIT_SYMBOLS[card.suit]}</span>
        ))}
      </div>
    )
  }

  return (
    <div className="tarot-card-figure__court" aria-hidden="true">
      {card.nameEn.split(' of ')[0]}
    </div>
  )
}

export function TarotCardFigure({
  card,
  art,
  orientation = 'up',
  label,
  revealLabel,
  revealed,
  compact = false,
  interactive = false,
  onClick,
  className = '',
  imageProfile = 'detail',
  loading = 'lazy',
  testId,
}: TarotCardFigureProps) {
  const Tag = interactive ? 'button' : 'div'
  const classNameValue = [
    'tarot-card-figure',
    compact ? 'is-compact' : '',
    revealed ? 'is-revealed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const imageAsset = CARD_IMAGE_ASSET_BY_ID[card.id]
  const shouldShowArtwork =
    imageProfile !== 'minimal' && Boolean(art.imageUrl && imageAsset)
  // Daily eager artwork: 240px outer card - 36px padding - 2px frame border.
  const imageSizes = `${loading === 'lazy' ? 'auto, ' : ''}${imageProfile === 'thumb'
    ? '(max-width: 768px) 120px, 160px'
    : loading === 'eager' ? '202px' : '(max-width: 768px) 200px, 320px'}`

  if (compact) {
    return (
      <Tag
        className={classNameValue}
        data-testid={testId}
        aria-label={interactive ? (revealed ? `${revealLabel ?? label ?? '塔罗牌'}：${card.nameZh} · ${orientation === 'up' ? '正位' : '逆位'} · 已揭晓` : `揭晓牌面：${revealLabel ?? label ?? '塔罗牌'}`) : undefined}
        aria-disabled={interactive && revealed ? true : undefined}
        type={interactive ? 'button' : undefined}
        onClick={interactive ? onClick : undefined}
      >
        <div className="tarot-card-figure__mini">
          <strong className="tarot-card-figure__mini-name">{card.nameZh}</strong>
        </div>
      </Tag>
    )
  }

  return (
    <Tag
      className={classNameValue}
      data-testid={testId}
      aria-label={interactive ? (revealed ? `${revealLabel ?? label ?? '塔罗牌'}：${card.nameZh} · ${orientation === 'up' ? '正位' : '逆位'} · 已揭晓` : `揭晓牌面：${revealLabel ?? label ?? '塔罗牌'}`) : undefined}
      aria-disabled={interactive && revealed ? true : undefined}
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
    >
      <div className="tarot-card-figure__inner">
        <div className="tarot-card-figure__face tarot-card-figure__face--back" aria-hidden="true">
          <span className="tarot-card-figure__back-mark">UKIYO</span>
          <span className="tarot-card-figure__back-sub">TAROT ARCHIVE</span>
        </div>

        <div className="tarot-card-figure__face tarot-card-figure__face--front" aria-hidden={!revealed}>
          <div className="tarot-card-figure__header">
            <span>{card.nameZh}</span>
          </div>

          <div className={`tarot-card-figure__frame tarot-card-figure__frame--${art.frame}`}>
            {shouldShowArtwork ? (
              <div className="tarot-card-figure__image-wrap">
                <CardArtwork
                  asset={imageAsset}
                  className={`tarot-card-figure__image ${
                    orientation === 'down' ? 'is-reversed' : ''
                  }`}
                  sizes={imageSizes}
                  alt={`${card.nameZh}（${card.nameEn}）牌面`}
                  width={imageAsset?.width}
                  height={imageAsset?.height}
                  decoding="async"
                  loading={loading}
                />
              </div>
            ) : (
              <>
                <div className="tarot-card-figure__motif">{art.motif}</div>
                <div className="tarot-card-figure__constellation">{art.constellation}</div>
                {renderPips(card)}
              </>
            )}

            <div className="tarot-card-figure__glyphs" aria-hidden="true">
              {art.glyphs.map((glyph, index) => (
                <span key={`${card.id}-${glyph}-${index}`}>{glyph}</span>
              ))}
            </div>
          </div>

          <div className="tarot-card-figure__footer">
            <div className="tarot-card-figure__title-block">
              <strong>{card.nameZh}</strong>
              <small>
                {card.nameEn}
                {revealed ? ` / ${orientation === 'up' ? 'Upright' : 'Reversed'}` : ''}
              </small>
            </div>
            {label ? <span className="tarot-card-figure__label">{label}</span> : null}
          </div>
        </div>
      </div>
    </Tag>
  )
}

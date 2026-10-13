import type { CardArtManifest, Orientation, TarotCard } from '../domain/tarot'
import { CARD_IMAGE_ASSET_BY_ID } from '../data/cardImages'

interface TarotCardFigureProps {
  card: TarotCard
  art: CardArtManifest
  orientation?: Orientation
  label?: string
  revealed: boolean
  compact?: boolean
  interactive?: boolean
  onClick?: () => void
  className?: string
  imageProfile?: 'detail' | 'thumb' | 'minimal'
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
  revealed,
  compact = false,
  interactive = false,
  onClick,
  className = '',
  imageProfile = 'detail',
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
  // Lazy images can use their rendered width; retain estimates for older browsers.
  const imageSizes = imageProfile === 'thumb'
    ? 'auto, (max-width: 768px) 120px, 160px'
    : 'auto, (max-width: 768px) 200px, 320px'
  const fallbackSrc = imageProfile === 'thumb'
    ? imageAsset?.thumbnailJpgUrl
    : imageAsset?.detailJpgUrl ?? art.imageUrl
  const fallbackSrcSet = imageAsset
    ? `${imageAsset.thumbnailJpgUrl} 240w, ${imageAsset.detailJpgUrl} ${imageAsset.width}w`
    : undefined
  const webpSrcSet = imageAsset
    ? `${imageAsset.thumbnailWebpUrl} 240w, ${imageAsset.detailWebpUrl} 720w`
    : undefined

  if (compact) {
    return (
      <Tag
        className={classNameValue}
        data-testid={testId}
        aria-label={interactive && !revealed ? `揭晓牌面：${label ?? '塔罗牌'}` : undefined}
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
      aria-label={interactive && !revealed ? `揭晓牌面：${label ?? '塔罗牌'}` : undefined}
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
                <picture>
                  {webpSrcSet ? (
                    <source sizes={imageSizes} srcSet={webpSrcSet} type="image/webp" />
                  ) : null}
                  <img
                    className={`tarot-card-figure__image ${
                      orientation === 'down' ? 'is-reversed' : ''
                    }`}
                    src={fallbackSrc}
                    srcSet={fallbackSrcSet}
                    sizes={imageSizes}
                    alt={`${card.nameZh}（${card.nameEn}）牌面`}
                    width={imageAsset?.width}
                    height={imageAsset?.height}
                    decoding="async"
                    loading="lazy"
                  />
                </picture>
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

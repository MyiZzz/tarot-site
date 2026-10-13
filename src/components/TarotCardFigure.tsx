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
  interactive?: boolean
  onClick?: () => void
  className?: string
  loading?: 'lazy' | 'eager'
  imageProfile?: 'detail' | 'compact'
  testId?: string
}

export function TarotCardFigure({
  card,
  art,
  orientation = 'up',
  label,
  revealLabel,
  revealed,
  interactive = false,
  onClick,
  className = '',
  loading = 'lazy',
  imageProfile = 'detail',
  testId,
}: TarotCardFigureProps) {
  const Tag = interactive ? 'button' : 'div'
  const classNameValue = [
    'tarot-card-figure',
    revealed ? 'is-revealed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const imageAsset = CARD_IMAGE_ASSET_BY_ID[card.id]
  // Daily eager artwork: 240px outer card - 36px padding - 2px frame border.
  const imageSizes = `${loading === 'lazy' ? 'auto, ' : ''}${loading === 'eager' ? '202px' : '(max-width: 768px) 200px, 320px'}`

  return (
    <Tag
      className={classNameValue}
      data-testid={testId}
      aria-label={interactive ? (revealed ? `${revealLabel ?? label ?? '塔罗牌'}：${card.nameZh} · ${orientation === 'up' ? '正位' : '逆位'} · 已揭晓` : `揭晓牌面：${revealLabel ?? label ?? '塔罗牌'}`) : undefined}
      aria-disabled={interactive && revealed ? true : undefined}
      type={interactive ? 'button' : undefined}
      onClick={interactive && !revealed ? onClick : undefined}
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
            <div className="tarot-card-figure__image-wrap" style={{ aspectRatio: `${imageAsset.width} / ${imageAsset.height}` }}>
              <CardArtwork
                asset={loading === 'lazy' && imageProfile === 'detail'
                  ? { ...imageAsset, avifSrcSet: imageAsset.detailAvifSrcSet }
                  : imageAsset}
                className={`tarot-card-figure__image ${
                  orientation === 'down' ? 'is-reversed' : ''
                }`}
                sizes={imageSizes}
                alt={`${card.nameZh}（${card.nameEn}）牌面`}
                width={imageAsset.width}
                height={imageAsset.height}
                decoding="async"
                loading={loading}
              />
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

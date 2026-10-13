import type { ReadingCardView } from '../domain/tarot'
import { TarotCardFigure } from './TarotCardFigure'

interface TarotCardButtonProps {
  entry: ReadingCardView
  imageProfile?: 'detail' | 'thumb' | 'minimal'
  revealed: boolean
  onReveal: () => void
  compact?: boolean
  loading?: 'lazy' | 'eager'
  testId?: string
}

export function TarotCardButton({
  entry,
  imageProfile,
  revealed,
  onReveal,
  compact = false,
  loading,
  testId,
}: TarotCardButtonProps) {
  return (
    <TarotCardFigure
      art={entry.art}
      card={entry.card}
      compact={compact}
      imageProfile={imageProfile}
      interactive={!revealed}
      loading={loading}
      label={entry.positionLabel}
      onClick={onReveal}
      orientation={entry.drawn.orientation}
      revealed={revealed}
      testId={testId}
    />
  )
}

import type { ReadingCardView } from '../domain/tarot'
import { TarotCardFigure } from './TarotCardFigure'

interface TarotCardButtonProps {
  entry: ReadingCardView
  revealed: boolean
  onReveal: () => void
  loading?: 'lazy' | 'eager'
  testId?: string
}

export function TarotCardButton({
  entry,
  revealed,
  onReveal,
  loading,
  testId,
}: TarotCardButtonProps) {
  return (
    <TarotCardFigure
      art={entry.art}
      card={entry.card}
      interactive
      loading={loading}
      label={entry.positionLabel}
      onClick={onReveal}
      orientation={entry.drawn.orientation}
      revealed={revealed}
      testId={testId}
    />
  )
}

import type { CardArtManifest } from '../domain/tarot'
import { TAROT_DECK } from './cards'

export const CARD_ART_MANIFEST: Record<string, CardArtManifest> = Object.fromEntries(
  TAROT_DECK.map((card) => {
    if (card.arcana === 'major') {
      return [
        card.id,
        {
          frame:
            card.number % 4 === 0
              ? 'sun'
              : card.number % 4 === 1
                ? 'moon'
                : card.number % 4 === 2
                  ? 'gate'
                  : 'ribbon',
        } satisfies CardArtManifest,
      ]
    }

    return [
      card.id,
      {
        frame: card.number <= 4 ? 'gate' : card.number <= 10 ? 'ribbon' : 'moon',
      } satisfies CardArtManifest,
    ]
  }),
)

import type { CardArtManifest } from '../domain/tarot'
import { TAROT_DECK } from './cards'

const createGlyphs = (seed: string) => {
  const chars = Array.from(seed.replace(/[^a-z0-9]/gi, '').toUpperCase())

  return [chars[0] ?? 'T', chars[1] ?? 'A', chars[2] ?? 'R']
}

export const CARD_ART_MANIFEST: Record<string, CardArtManifest> = Object.fromEntries(
  TAROT_DECK.map((card) => {
    const glyphs = createGlyphs(card.id)

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
          glyphs,
        } satisfies CardArtManifest,
      ]
    }

    return [
      card.id,
      {
        frame: card.number <= 4 ? 'gate' : card.number <= 10 ? 'ribbon' : 'moon',
        glyphs,
      } satisfies CardArtManifest,
    ]
  }),
)

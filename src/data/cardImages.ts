import { TAROT_DECK } from './cards'
import { CARD_IMAGE_DIMENSIONS_BY_ID } from './cardImageDimensions'

const CARD_ASSET_BASE_URL = `${import.meta.env.BASE_URL}cards/rws/`

export const CARD_IMAGE_CREDIT =
  'Rider-Waite-Smith tarot deck (1909), public domain via Wikimedia Commons.'

export interface CardImageAsset {
  width: number
  height: number
  fallbackUrl: string
  avifSrcSet: string
  webpSrcSet: string
}

export const CARD_IMAGE_ASSET_BY_ID: Record<string, CardImageAsset> = Object.fromEntries(
  TAROT_DECK.map((card) => [
    card.id,
    {
      width: CARD_IMAGE_DIMENSIONS_BY_ID[card.id][0],
      height: CARD_IMAGE_DIMENSIONS_BY_ID[card.id][1],
      fallbackUrl: `${CARD_ASSET_BASE_URL}${card.id}.jpg`,
      avifSrcSet: [240, 480].map((width) => `${CARD_ASSET_BASE_URL}${card.id}-${width}.avif ${width}w`).join(', '),
      webpSrcSet: [240, 480].map((width) => `${CARD_ASSET_BASE_URL}${card.id}-${width}.webp ${width}w`).join(', '),
    } satisfies CardImageAsset,
  ]),
)

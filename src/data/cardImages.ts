import { CARD_IMAGE_DIMENSIONS_BY_ID, CARD_IMAGE_VERSION_BY_ID } from './cardImageDimensions'

const CARD_ASSET_BASE_URL = `${import.meta.env.BASE_URL}cards/rws/`

export const CARD_IMAGE_CREDIT =
  'Rider-Waite-Smith tarot deck (1909), public domain via Wikimedia Commons.'

export interface CardImageAsset {
  width: number
  height: number
  fallbackUrl: string
  detailAvifSrcSet: string
  avifSrcSet: string
  webpSrcSet: string
}

// Content versions keep CacheFirst entries valid across artwork deployments.
export const CARD_IMAGE_ASSET_BY_ID: Record<string, CardImageAsset> = Object.fromEntries(
  Object.keys(CARD_IMAGE_DIMENSIONS_BY_ID).map((id) => [
    id,
    {
      width: CARD_IMAGE_DIMENSIONS_BY_ID[id][0],
      height: CARD_IMAGE_DIMENSIONS_BY_ID[id][1],
      fallbackUrl: `${CARD_ASSET_BASE_URL}${id}.jpg?v=${CARD_IMAGE_VERSION_BY_ID[id]}`,
      detailAvifSrcSet: [240, 480, 768].map((width) => `${CARD_ASSET_BASE_URL}${id}-${width}.avif?v=${CARD_IMAGE_VERSION_BY_ID[id]} ${width}w`).join(', '),
      avifSrcSet: [240, 480].map((width) => `${CARD_ASSET_BASE_URL}${id}-${width}.avif?v=${CARD_IMAGE_VERSION_BY_ID[id]} ${width}w`).join(', '),
      webpSrcSet: [240, 480].map((width) => `${CARD_ASSET_BASE_URL}${id}-${width}.webp?v=${CARD_IMAGE_VERSION_BY_ID[id]} ${width}w`).join(', '),
    } satisfies CardImageAsset,
  ]),
)

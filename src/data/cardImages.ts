import { CARD_IMAGE_DIMENSIONS_BY_ID } from './cardImageDimensions'

const CARD_ASSET_BASE_URL = import.meta.env.BASE_URL

export const CARD_IMAGE_CREDIT =
  'Rider-Waite-Smith tarot deck (1909), public domain via Wikimedia Commons.'

export interface CardImageAsset {
  width: number
  height: number
  detailJpgUrl: string
  detailWebpUrl: string
  thumbnailJpgUrl: string
  thumbnailWebpUrl: string
}

export const CARD_IMAGE_ASSET_BY_ID: Record<string, CardImageAsset> = Object.fromEntries(
  Object.keys(CARD_IMAGE_DIMENSIONS_BY_ID).map((id) => [
    id,
    {
      width: CARD_IMAGE_DIMENSIONS_BY_ID[id][0],
      height: CARD_IMAGE_DIMENSIONS_BY_ID[id][1],
      detailJpgUrl: `${CARD_ASSET_BASE_URL}cards/rws/${id}.jpg`,
      detailWebpUrl: `${CARD_ASSET_BASE_URL}cards/rws/detail-webp/${id}.webp`,
      thumbnailJpgUrl: `${CARD_ASSET_BASE_URL}cards/rws/thumb-jpg/${id}.jpg`,
      thumbnailWebpUrl: `${CARD_ASSET_BASE_URL}cards/rws/thumb-webp/${id}.webp`,
    } satisfies CardImageAsset,
  ]),
)

export const CARD_IMAGE_BY_ID: Record<string, string> = Object.fromEntries(
  Object.keys(CARD_IMAGE_DIMENSIONS_BY_ID).map((id) => [id, CARD_IMAGE_ASSET_BY_ID[id].detailJpgUrl]),
)

import sharp from 'sharp'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CARD_IMAGE_ASSET_BY_ID } from '../data/cardImages'
import { TAROT_DECK } from '../data/cards'

const cardsDir = join(process.cwd(), 'public/cards/rws')

describe('rws card image mapping', () => {
  it('resolves fallback and responsive URLs for all 78 cards', () => {
    expect(TAROT_DECK).toHaveLength(78)
    for (const card of TAROT_DECK) {
      const asset = CARD_IMAGE_ASSET_BY_ID[card.id]
      const base = `${import.meta.env.BASE_URL}cards/rws/${card.id}`
      expect(asset.fallbackUrl).toBe(`${base}.jpg`)
      expect(asset.avifSrcSet).toBe(`${base}-240.avif 240w, ${base}-480.avif 480w`)
      expect(asset.webpSrcSet).toBe(`${base}-240.webp 240w, ${base}-480.webp 480w`)
    }
  })

  it('ships decodable files with the declared intrinsic dimensions', async () => {
    await Promise.all(TAROT_DECK.map(async (card) => {
      const fallback = await sharp(join(cardsDir, `${card.id}.jpg`)).metadata()
      const asset = CARD_IMAGE_ASSET_BY_ID[card.id]
      expect(asset.width).toBe(fallback.width)
      expect(asset.height).toBe(fallback.height)
      expect(fallback.width).toBe(240)
      for (const width of [240, 480]) {
        for (const format of ['avif', 'webp']) {
          const candidate = await sharp(join(cardsDir, `${card.id}-${width}.${format}`)).metadata()
          expect(candidate.width).toBe(width)
          expect(candidate.height! / width).toBeCloseTo(asset.height / asset.width, 2)
        }
      }
      expect(existsSync(join(process.cwd(), 'assets-src/cards/rws', `${card.id}.jpg`))).toBe(true)
    }))
  })

  it('keeps originals and legacy variants out of the shipped asset budget', () => {
    const files = readdirSync(cardsDir)
    expect(files).toHaveLength(78 * 5)
    expect(files.every((file) => statSync(join(cardsDir, file)).isFile())).toBe(true)
    expect(files.reduce((bytes, file) => bytes + statSync(join(cardsDir, file)).size, 0)).toBeLessThan(9_000_000)
    expect(statSync(join(process.cwd(), 'public/og-cover.png')).size).toBeLessThan(100_000)
    expect(existsSync(join(process.cwd(), 'assets-src/cards/rws/SOURCE.txt'))).toBe(true)
  })
})

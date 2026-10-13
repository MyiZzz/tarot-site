import { describe, expect, it } from 'vitest'
import { SPREADS } from '../data/spreads'
import {
  buildSpreadStageLayout,
  getBoardMetaForSpread,
  type BoardMeta,
  type LayoutCoordinate,
} from '../lib/spreadBoardLayout'

const intersects = (
  left: { left: number; right: number; top: number; bottom: number },
  right: { left: number; right: number; top: number; bottom: number },
) =>
  !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  )

const getCaptionGap = (
  card: { left: number; right: number; top: number; bottom: number },
  caption: { left: number; right: number; top: number; bottom: number },
  side: 'top' | 'right' | 'bottom' | 'left',
) =>
  side === 'left'
    ? card.left - caption.right
    : side === 'right'
      ? caption.left - card.right
      : side === 'top'
        ? card.top - caption.bottom
        : caption.top - card.bottom

const makeBoardMeta = (
  width: number,
  height: number,
  coordinates: LayoutCoordinate[],
): BoardMeta => ({
  width,
  height,
  coordinates,
})

describe('spread board stage layout', () => {
  it('keeps cross-5 captions outside cards and outside each other', () => {
    const board = makeBoardMeta(900, 720, [
      { key: 'theme', x: 50, y: 50 },
      { key: 'fire', x: 50, y: 18 },
      { key: 'water', x: 18, y: 50 },
      { key: 'air', x: 82, y: 50 },
      { key: 'earth', x: 50, y: 82 },
    ])

    const layout = buildSpreadStageLayout(board, board.coordinates.map((entry) => entry.key))

    expect(layout.captions).toHaveLength(5)

    for (const caption of layout.captions) {
      const card = layout.cards.find((entry) => entry.key === caption.key)!

      expect(
        layout.cards.some((entry) => intersects(entry.rect, caption.rect)),
        `${caption.key} caption overlaps a card`,
      ).toBe(false)
      expect(caption.connectorLength).toBe(
        Math.max(32, Math.round(getCaptionGap(card.rect, caption.rect, caption.side))),
      )
    }

    for (let index = 0; index < layout.captions.length; index += 1) {
      for (let next = index + 1; next < layout.captions.length; next += 1) {
        expect(
          intersects(layout.captions[index]!.rect, layout.captions[next]!.rect),
          `${layout.captions[index]!.key} overlaps ${layout.captions[next]!.key}`,
        ).toBe(false)
      }
    }
  })

  it('keeps dense celtic-cross captions outside cards and outside each other', () => {
    const board = makeBoardMeta(1180, 940, [
      { key: 'present', x: 24, y: 40 },
      { key: 'challenge', x: 24, y: 40, rotation: 90 },
      { key: 'conscious', x: 24, y: 12 },
      { key: 'unconscious', x: 24, y: 68 },
      { key: 'past', x: 8, y: 40 },
      { key: 'future', x: 40, y: 40 },
      { key: 'self', x: 72, y: 14 },
      { key: 'environment', x: 72, y: 36 },
      { key: 'fear-hope', x: 72, y: 58 },
      { key: 'outcome', x: 72, y: 80 },
    ])

    const layout = buildSpreadStageLayout(board, board.coordinates.map((entry) => entry.key))

    expect(layout.captions).toHaveLength(10)
    for (let i = 0; i < layout.cards.length; i++) {
      for (let j = i + 1; j < layout.cards.length; j++) {
        expect(intersects(layout.cards[i]!.rect, layout.cards[j]!.rect), `${i} overlaps ${j}`).toBe(i === 0 && j === 1)
      }
    }

    for (const caption of layout.captions) {
      const card = layout.cards.find((entry) => entry.key === caption.key)!

      expect(
        layout.cards.some((entry) => intersects(entry.rect, caption.rect)),
        `${caption.key} caption overlaps a card`,
      ).toBe(false)
      expect(caption.connectorLength).toBe(
        Math.max(32, Math.round(getCaptionGap(card.rect, caption.rect, caption.side))),
      )
    }

    for (let index = 0; index < layout.captions.length; index += 1) {
      for (let next = index + 1; next < layout.captions.length; next += 1) {
        expect(
          intersects(layout.captions[index]!.rect, layout.captions[next]!.rect),
          `${layout.captions[index]!.key} overlaps ${layout.captions[next]!.key}`,
        ).toBe(false)
      }
    }
  })

  it('allows only the intentional central crossing in the Celtic Cross', () => {
    const spread = SPREADS.find(entry => entry.layoutId === 'celtic-cross')!
    const board = getBoardMetaForSpread(spread)
    const layout = buildSpreadStageLayout(board, board.coordinates.map(entry => entry.key))
    const crossingKeys = spread.positions.slice(0, 2).map(entry => entry.key)
    const overlaps: string[] = []

    for (let index = 0; index < layout.cards.length; index += 1) {
      for (const right of layout.cards.slice(index + 1)) {
        const left = layout.cards[index]!
        if (intersects(left.rect, right.rect)) {
          overlaps.push([left.key, right.key].join(' / '))
        }
      }
    }

    // Returned bounds include rotation (the challenge card is turned 90 degrees).
    // Requiring exactly this pair also guards against removing the central crossing.
    expect(overlaps).toEqual([crossingKeys.join(' / ')])
  })

  it('does not generate captions for unrevealed positions', () => {
    const board = makeBoardMeta(900, 520, [
      { key: 'past', x: 18, y: 50 },
      { key: 'present', x: 50, y: 50 },
      { key: 'future', x: 82, y: 50 },
    ])

    const layout = buildSpreadStageLayout(board, ['present'])

    expect(layout.captions.map((entry) => entry.key)).toEqual(['present'])
  })
})

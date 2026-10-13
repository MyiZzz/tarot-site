import { buildReadingPosterSvg } from '../lib/poster'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createReading } from '../engine/reading'
import {
  buildReadingShareText,
  shareText,
} from '../lib/share'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('share helpers', () => {
  it('builds readable share text', () => {
    const reading = createReading(
      {
        question: '我该怎么推进关系？',
        topic: 'love',
        spreadId: 'holy-triangle',
        variantId: 'timeline',
      },
      { seed: 'share-text' },
    )

    const text = buildReadingShareText(reading, '爱情')

    expect(text).toContain('浮世占')
    expect(text).toContain(reading.spread.title)
    expect(text).toContain('主题: 爱情')
  })

  it('builds an svg poster payload', () => {
    const reading = createReading(
      {
        question: '这个月该重点关注什么？',
        topic: 'general',
        spreadId: 'monthly-five',
      },
      { seed: 'poster' },
    )

    const svg = buildReadingPosterSvg({
      title: '月度海报',
      question: reading.input.question,
      spreadTitle: reading.spread.title,
      summary: reading.summary,
      cards: reading.cards.map((entry) => ({
        label: entry.positionLabel,
        cardName: entry.card.nameZh,
        orientation: entry.drawn.orientation,
      })),
    })

    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('月度海报')
    expect(svg).toContain(reading.cards[0].card.nameZh)
  })

  it('keeps every card in a twelve-card poster', () => {
    const reading = createReading(
      {
        question: '接下来十二个月的重点是什么？',
        topic: 'general',
        spreadId: 'zodiac-wheel',
      },
      { seed: 'zodiac-poster' },
    )
    const svg = buildReadingPosterSvg({
      title: '十二宫海报',
      question: reading.input.question,
      spreadTitle: reading.spread.title,
      summary: reading.summary,
      cards: reading.cards.map((entry) => ({
        label: entry.positionLabel,
        cardName: entry.card.nameZh,
        orientation: entry.drawn.orientation,
      })),
    })

    expect(svg).toContain(reading.cards.at(-1)!.card.nameZh)
    expect(svg).toContain('height="1030"')
  })

  it('prefers local clipboard copy and never calls system share', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    const navigatorShare = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteText,
      },
    })

    Object.defineProperty(globalThis.navigator, 'share', {
      configurable: true,
      value: navigatorShare,
    })

    const result = await shareText('浮世塔罗', '只复制，不外发')

    expect(clipboardWriteText).toHaveBeenCalledWith('只复制，不外发')
    expect(navigatorShare).not.toHaveBeenCalled()
    expect(result).toBe('分享文案已复制到剪贴板。')
  })
})

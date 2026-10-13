import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardArtwork } from '../components/CardArtwork'
import { CARD_IMAGE_ASSET_BY_ID } from '../data/cardImages'

const assets = Object.values(CARD_IMAGE_ASSET_BY_ID)

describe('card artwork recovery', () => {
  it('tries each format once and ends in a named, request-free placeholder', () => {
    const { container, rerender } = render(<CardArtwork asset={assets[0]} alt="测试牌面" />)
    expect(container.querySelectorAll('source')).toHaveLength(2)
    fireEvent.error(screen.getByRole('img'))
    expect(container.querySelectorAll('source')).toHaveLength(1)
    expect(container.querySelector('source')).toHaveAttribute('type', 'image/webp')
    fireEvent.error(screen.getByRole('img'))
    expect(container.querySelectorAll('source')).toHaveLength(0)
    expect(screen.getByRole('img')).toHaveAttribute('src', assets[0].fallbackUrl)
    fireEvent.error(screen.getByRole('img'))
    const placeholder = screen.getByRole('img', { name: '测试牌面（图片暂不可用）' })
    expect(placeholder.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/)
    fireEvent.error(placeholder)
    rerender(<CardArtwork asset={assets[0]} alt="测试牌面" />)
    expect(screen.getByRole('img')).toBe(placeholder)
    rerender(<CardArtwork asset={assets[1]} alt="另一张牌" />)
    expect(container.querySelectorAll('source')).toHaveLength(2)
  })

  it.each(['webp', 'jpg'])('skips already failed %s formats selected by the browser', (format) => {
    const { container } = render(<CardArtwork asset={assets[0]} alt="牌面" />)
    Object.defineProperty(screen.getByRole('img'), 'currentSrc', { value: `https://example.test/card.${format}` })
    fireEvent.error(screen.getByRole('img'))
    expect(container.querySelectorAll('source')).toHaveLength(0)
    expect(screen.getByRole('img').getAttribute('src')).toMatch(format === 'jpg' ? /^data:/ : /\.jpg$/)
  })
})

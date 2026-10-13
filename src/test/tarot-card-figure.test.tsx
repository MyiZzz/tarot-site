import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TarotCardFigure } from '../components/TarotCardFigure'
import { CARD_ART_MANIFEST } from '../data/artManifest'
import { TAROT_DECK } from '../data/cards'

describe('TarotCardFigure', () => {
  it('lets keyboard users reveal a card without exposing its hidden face', async () => {
    const card = TAROT_DECK[0]
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<TarotCardFigure art={CARD_ART_MANIFEST[card.id]} card={card}
      label="现状" interactive revealed={false} onClick={onClick} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    await user.tab()
    expect(screen.getByRole('button', { name: '揭晓牌面：现状' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders the actual card name in the front header', () => {
    const card = TAROT_DECK.find((entry) => entry.id === 'the-magician')!
    const { container } = render(
      <TarotCardFigure
        art={CARD_ART_MANIFEST[card.id]}
        card={card}
        revealed
      />,
    )

    const artwork = screen.getByRole('img')
    expect(artwork.getAttribute('sizes')).toMatch(/^auto, /)
    expect(artwork).toHaveAttribute('loading', 'lazy')
    expect(artwork).toHaveAttribute('decoding', 'async')
    expect(artwork).toHaveAttribute('width', '240')
    expect(artwork).toHaveAttribute('height', '400')
    expect(artwork).toHaveAttribute('alt', `${card.nameZh}（${card.nameEn}）牌面`)
    expect(artwork).not.toHaveAttribute('srcset')
    expect(artwork.closest('picture')?.firstElementChild).toHaveAttribute('type', 'image/avif')

    const headerSpans = container.querySelectorAll('.tarot-card-figure__header span')

    expect(headerSpans).toHaveLength(1)
    expect(headerSpans.item(0)?.textContent).toBe(card.nameZh)
    expect(screen.queryByText('Major Arcana')).not.toBeInTheDocument()
  })
})


describe('TarotCardFigure image loading', () => {
  it('supports eager above-the-fold images with explicit responsive sizes', () => {
    const card = TAROT_DECK[0]
    const { container } = render(<TarotCardFigure art={CARD_ART_MANIFEST[card.id]}
      card={card} revealed loading="eager" />)
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager')
    const sources = container.querySelectorAll('source')
    expect(sources).toHaveLength(2)
    for (const source of sources) {
      expect(source.getAttribute('sizes')).not.toContain('auto')
      expect(source.getAttribute('srcset')).toContain('240w')
      expect(source.getAttribute('srcset')).toContain('480w')
    }
  })

  it.each(TAROT_DECK)('renders artwork for $id in either orientation', (card) => {
    const { rerender } = render(<TarotCardFigure art={CARD_ART_MANIFEST[card.id]}
      card={card} revealed />)
    expect(screen.getByRole('img')).not.toHaveClass('is-reversed')
    rerender(<TarotCardFigure art={CARD_ART_MANIFEST[card.id]}
      card={card} revealed orientation="down" />)
    expect(screen.getByRole('img')).toHaveClass('is-reversed')
    expect(screen.getByRole('img')).toHaveAttribute('alt', `${card.nameZh}（${card.nameEn}）牌面`)
  })
})

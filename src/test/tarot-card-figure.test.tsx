import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TarotCardFigure } from '../components/TarotCardFigure'
import { CARD_ART_MANIFEST } from '../data/artManifest'
import { TAROT_DECK } from '../data/cards'

describe('TarotCardFigure compact mode', () => {
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

  it('shows the Chinese card name instead of a major arcana index', () => {
    const card = TAROT_DECK.find((entry) => entry.id === 'the-magician')!

    render(
      <TarotCardFigure
        art={CARD_ART_MANIFEST[card.id]}
        card={card}
        compact
        revealed
      />,
    )

    expect(screen.getByText(card.nameZh)).toBeInTheDocument()
    expect(screen.queryByText('M1')).not.toBeInTheDocument()
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
    expect(Number(artwork.getAttribute('width'))).toBeGreaterThan(720)
    expect(artwork).toHaveAttribute('height', '1810')
    expect(artwork).toHaveAttribute('alt', `${card.nameZh}（${card.nameEn}）牌面`)
    expect(artwork.getAttribute('srcset')).toContain(`${artwork.getAttribute('width')}w`)
    expect(artwork.closest('picture')?.firstElementChild).toHaveAttribute('type', 'image/webp')

    const headerSpans = container.querySelectorAll('.tarot-card-figure__header span')

    expect(headerSpans).toHaveLength(1)
    expect(headerSpans.item(0)?.textContent).toBe(card.nameZh)
    expect(screen.queryByText('Major Arcana')).not.toBeInTheDocument()
  })
})

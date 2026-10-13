import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CardEncyclopedia } from '../components/CardEncyclopedia'
import { CARD_BY_ID } from '../data/cards'

describe('CardEncyclopedia', () => {
  it('applies group and query filters together', async () => {
    const user = userEvent.setup()

    render(<CardEncyclopedia featuredCardIds={['the-fool', 'ace-of-cups']} />)

    await user.click(screen.getByRole('button', { name: /查看全部 78 张/i }))
    await user.click(screen.getByRole('button', { name: '圣杯' }))
    await user.type(screen.getByRole('textbox', { name: '搜索牌名' }), 'Ace')

    expect(screen.getByRole('button', { name: /圣杯王牌/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /权杖王牌/i })).not.toBeInTheDocument()
  })

  it('renders the extended encyclopedia description and advice panels', async () => {
    const user = userEvent.setup()
    const card = CARD_BY_ID['ace-of-cups']

    render(<CardEncyclopedia featuredCardIds={[card.id]} />)

    await user.click(screen.getByRole('button', { name: /圣杯王牌/i }))

    expect(screen.getByRole('heading', { name: '延伸解读' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '实践建议' })).toBeInTheDocument()
    expect(document.querySelector('.encyclopedia-detail__body')).toBeInTheDocument()
    expect(screen.getByText(card.encyclopedia.descriptionZh)).toBeInTheDocument()
    expect(screen.getByText(card.encyclopedia.adviceZh)).toBeInTheDocument()
  })
  it('keeps detail and pressed selection within search results, including no matches', async () => {
    const user = userEvent.setup()
    render(<CardEncyclopedia featuredCardIds={['the-fool', 'ace-of-cups']} />)
    expect(screen.getByRole('button', { name: /愚者/ })).toHaveAttribute('aria-pressed', 'true')
    const search = screen.getByRole('textbox', { name: '搜索牌名' })
    await user.type(search, '圣杯')
    expect(screen.getByRole('heading', { name: '圣杯王牌' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '愚者' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /圣杯王牌/ })).toHaveAttribute('aria-pressed', 'true')
    await user.type(search, '不存在')
    expect(screen.getByRole('status')).toHaveTextContent('暂无可显示的牌卡')
    expect(screen.queryByRole('heading', { name: '圣杯王牌' })).not.toBeInTheDocument()
    await user.clear(search)
    expect(screen.getByRole('button', { name: /愚者/ })).toHaveAttribute('aria-pressed', 'true')
  })

})

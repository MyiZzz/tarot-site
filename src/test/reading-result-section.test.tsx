import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CARD_ART_MANIFEST } from '../data/artManifest'
import { TAROT_DECK } from '../data/cards'
import { SPREADS } from '../data/spreads'
import type { ReadingResult, ResolvedSpreadDefinition } from '../domain/tarot'
import { ReadingResultSection } from '../sections/ReadingResultSection'

const spreadDefinition = SPREADS.find((entry) => entry.id === 'holy-triangle')!
const spreadVariant = spreadDefinition.variants?.find((entry) => entry.id === 'diagnostic')

if (!spreadVariant) {
  throw new Error('Expected holy-triangle diagnostic variant to exist.')
}

const spread: ResolvedSpreadDefinition = {
  id: spreadDefinition.id,
  title: spreadDefinition.title,
  description: spreadDefinition.description,
  guide: spreadVariant.guide,
  cardCount: spreadDefinition.cardCount,
  layoutId: spreadDefinition.layoutId,
  positions: spreadVariant.positions,
  activeVariantId: spreadVariant.id,
  activeVariantTitle: spreadVariant.title,
}

const reading: ReadingResult = {
  input: {
    question: 'How should I move this relationship forward?',
    topic: 'love',
    spreadId: spread.id,
    variantId: spread.activeVariantId,
  },
  spread,
  cards: spread.positions.map((position, index) => {
    const card = TAROT_DECK[index]!

    return {
      art: CARD_ART_MANIFEST[card.id],
      card,
      drawn: {
        cardId: card.id,
        orientation: index === 1 ? 'down' : 'up',
        positionKey: position.key,
      },
      positionLabel: position.label,
      meaningHint: position.meaningHint,
      prompt: position.prompt,
    }
  }),
  positionReadings: spread.positions.map((position, index) => ({
    positionKey: position.key,
    label: position.label,
    prompt: position.prompt,
    cardId: TAROT_DECK[index]!.id,
    cardName: TAROT_DECK[index]!.nameZh,
    orientation: index === 1 ? 'down' : 'up',
    message: `Reading ${position.key}`,
    keywords: ['clarity', 'relationship'],
  })),
  summary: 'The spread says pacing matters more than intensity right now.',
  deepNarrative:
    'The cards point to timing, boundaries, and a need to separate real progress from anxious overreach.',
  narrativeMeta: {
    targetLength: 900,
    actualLength: 362,
    coverageScore: 0.86,
    validationPassed: true,
  },
  advice: ['Name the real bottleneck.', 'Make the next ask concrete and measurable.'],
  actionPlan: [
    { id: 'step-1', title: 'Clarify the pressure', detail: 'Write what feels blocked right now.' },
    { id: 'step-2', title: 'Make one explicit ask', detail: 'Turn the next move into one sentence.' },
  ],
  tone: 'Recalibrate before you push.',
  dominantSignals: ['relationship', 'timing', 'boundaries'],
  depthLevel: 'deep',
  interpretation: {
    depthSignals: ['Elemental tension is concentrated around swords.'],
    ruleHits: ['R_ELM_01', 'R_REV_01'],
    queryFlags: [],
    softenedForSafety: false,
    elementalDynamics: {
      dominant: 'swords',
      missing: ['wands', 'pentacles'],
      conflicts: ['Context and resistance point in different directions.'],
      harmonies: [],
    },
  },
  reportSections: {
    coreConclusion: '核心结论是先重新校准节奏，再决定要不要继续推进。',
    currentState: '当前状态显示真正的压力来自边界不清，而不是感情本身不存在。',
    riskAlert: '风险提醒是不要把焦虑感误当成必须立刻表态的信号。',
    actionFocus: '先做什么：先用一句明确的话把你的边界和期待说清楚。',
    reviewPrompt: '回看问题：如果一周后再看，你是否先做了说清边界这一步？',
  },
}

describe('ReadingResultSection', () => {
  it('keeps follow-up exploration collapsed by default and exposes icon-only secondary actions', async () => {
    const { container } = render(
      <ReadingResultSection
        actionPlanDoneIds={[]}
        followUpQuestion=""
        followUpSuggestions={['What changes if I move first?']}
        followUps={[]}
        onDownloadPoster={vi.fn()}
        onFollowUpQuestionChange={vi.fn()}
        onRecordTagsChange={vi.fn()}
        onRecordTitleChange={vi.fn()}
        onReveal={vi.fn()}
        onRevealAll={vi.fn()}
        onSaveReading={vi.fn()}
        onShareReading={vi.fn()}
        onSubmitFollowUp={vi.fn()}
        onToggleActionPlan={vi.fn()}
        reading={reading}
        recordNotice={null}
        recordTagsInput=""
        recordTitle=""
        revealedPositions={[]}
        shareMessage={null}
      />,
    )

    await act(() => vi.dynamicImportSettled())
    expect(screen.getByRole('region', { name: '牌阵桌面' })).toBeInTheDocument()

    expect(container.querySelector('.result-actions__primary')).toBeInTheDocument()
    expect(container.querySelectorAll('.ghost-button--icon-only')).toHaveLength(2)
    expect(screen.getByTestId('follow-up-accordion')).not.toHaveAttribute('open')
    expect(screen.getByTestId('deep-signals-panel')).toBeInTheDocument()
    for (const [name, target] of [['核心结论', 'core-conclusion'], ['逐牌解读', 'card-readings'], ['保存', 'save-reading']]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', `#${target}`)
      expect(document.getElementById(target)).toBeInTheDocument()
    }
  })

  it('keeps the archive inputs writable through the existing handlers', async () => {
    const onRecordTitleChange = vi.fn()
    const onRecordTagsChange = vi.fn()
    const { container } = render(
      <ReadingResultSection
        actionPlanDoneIds={[]}
        followUpQuestion=""
        followUpSuggestions={[]}
        followUps={[]}
        onDownloadPoster={vi.fn()}
        onFollowUpQuestionChange={vi.fn()}
        onRecordTagsChange={onRecordTagsChange}
        onRecordTitleChange={onRecordTitleChange}
        onReveal={vi.fn()}
        onRevealAll={vi.fn()}
        onSaveReading={vi.fn()}
        onShareReading={vi.fn()}
        onSubmitFollowUp={vi.fn()}
        onToggleActionPlan={vi.fn()}
        reading={reading}
        recordNotice={null}
        recordTagsInput=""
        recordTitle=""
        revealedPositions={reading.cards.map((entry) => entry.drawn.positionKey)}
        shareMessage={null}
      />,
    )

    await act(() => vi.dynamicImportSettled())
    expect(screen.getByRole('region', { name: '牌阵桌面' })).toBeInTheDocument()

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]')

    fireEvent.change(inputs[0]!, {
      target: { value: 'Relationship recalibration' },
    })
    fireEvent.change(inputs[1]!, {
      target: { value: 'relationship pacing' },
    })

    expect(onRecordTitleChange).toHaveBeenCalledWith('Relationship recalibration')
    expect(onRecordTagsChange).toHaveBeenCalledWith('relationship pacing')
  })

  it('renders the fixed five-part report structure when present', async () => {
    render(
      <ReadingResultSection
        actionPlanDoneIds={[]}
        followUpQuestion=""
        followUpSuggestions={[]}
        followUps={[]}
        onDownloadPoster={vi.fn()}
        onFollowUpQuestionChange={vi.fn()}
        onRecordTagsChange={vi.fn()}
        onRecordTitleChange={vi.fn()}
        onReveal={vi.fn()}
        onRevealAll={vi.fn()}
        onSaveReading={vi.fn()}
        onShareReading={vi.fn()}
        onSubmitFollowUp={vi.fn()}
        onToggleActionPlan={vi.fn()}
        reading={reading}
        recordNotice={null}
        recordTagsInput=""
        recordTitle=""
        revealedPositions={reading.cards.map((entry) => entry.drawn.positionKey)}
        shareMessage={null}
      />,
    )

    await act(() => vi.dynamicImportSettled())
    expect(screen.getByRole('region', { name: '牌阵桌面' })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: '核心结论' })).toBeInTheDocument()
    expect(screen.getByText(reading.reportSections.coreConclusion)).toBeInTheDocument()
    expect(screen.getByText('当前状态')).toBeInTheDocument()
    expect(screen.getByText(reading.reportSections.currentState)).toBeInTheDocument()
    expect(screen.getByText('风险提醒')).toBeInTheDocument()
    expect(screen.getByText(reading.reportSections.riskAlert)).toBeInTheDocument()
    expect(screen.getByText('先做什么')).toBeInTheDocument()
    expect(screen.getByText(reading.reportSections.actionFocus)).toBeInTheDocument()
    expect(screen.getByText('回看问题')).toBeInTheDocument()
    expect(screen.getByText(reading.reportSections.reviewPrompt)).toBeInTheDocument()
    expect(screen.getByText('完整解读')).toBeInTheDocument()
    expect(document.querySelector('.reading-details')).not.toHaveAttribute('open')
  })

  it('only lists revealed cards and uses their generated position readings', async () => {
    const { container, rerender } = render(
      <ReadingResultSection
        actionPlanDoneIds={[]}
        followUpQuestion=""
        followUpSuggestions={[]}
        followUps={[]}
        onDownloadPoster={vi.fn()}
        onFollowUpQuestionChange={vi.fn()}
        onRecordTagsChange={vi.fn()}
        onRecordTitleChange={vi.fn()}
        onReveal={vi.fn()}
        onRevealAll={vi.fn()}
        onSaveReading={vi.fn()}
        onShareReading={vi.fn()}
        onSubmitFollowUp={vi.fn()}
        onToggleActionPlan={vi.fn()}
        reading={reading}
        recordNotice={null}
        recordTagsInput=""
        recordTitle=""
        revealedPositions={[]}
        shareMessage={null}
      />,
    )

    await act(() => vi.dynamicImportSettled())
    expect(screen.getByRole('region', { name: '牌阵桌面' })).toBeInTheDocument()

    const readingList = container.querySelector<HTMLDivElement>('.spread-board__reading-list')!
    expect(readingList).toBeEmptyDOMElement()

    rerender(
      <ReadingResultSection
        actionPlanDoneIds={[]}
        followUpQuestion=""
        followUpSuggestions={[]}
        followUps={[]}
        onDownloadPoster={vi.fn()}
        onFollowUpQuestionChange={vi.fn()}
        onRecordTagsChange={vi.fn()}
        onRecordTitleChange={vi.fn()}
        onReveal={vi.fn()}
        onRevealAll={vi.fn()}
        onSaveReading={vi.fn()}
        onShareReading={vi.fn()}
        onSubmitFollowUp={vi.fn()}
        onToggleActionPlan={vi.fn()}
        reading={reading}
        recordNotice={null}
        recordTagsInput=""
        recordTitle=""
        revealedPositions={[reading.cards[0]!.drawn.positionKey]}
        shareMessage={null}
      />,
    )

    await act(() => vi.dynamicImportSettled())
    expect(screen.getByRole('region', { name: '牌阵桌面' })).toBeInTheDocument()

    expect(within(readingList).getByText(reading.positionReadings[0]!.message)).toBeInTheDocument()
  })
})

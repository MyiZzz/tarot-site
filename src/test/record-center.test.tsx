import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RecordCenter } from '../components/RecordCenter'
import type { ReadingRecord } from '../domain/tarot'

const createRecord = (
  id: string,
  overrides: Partial<ReadingRecord> = {},
): ReadingRecord => ({
  version: 4,
  id,
  kind: 'reading',
  saved: false,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
  title: `Record ${id}`,
  question: `Question ${id}`,
  topicId: 'general',
  topicLabel: 'General',
  spreadId: 'holy-triangle',
  spreadTitle: 'Holy Triangle',
  tone: 'Steady forward motion',
  summary: `Summary ${id}`,
  dominantSignals: ['general'],
  tags: [],
  cards: [],
  actionPlan: [],
  followUps: [],
  dailyReflection: {
    morningIntent: '',
    eveningReview: '',
    resonance: null,
  },
  depthLevel: 'standard',
  depthSignals: [],
  ruleHits: [],
  queryFlags: [],
  interpretationSummary: `Summary ${id}`,
  deepNarrative: `Long form ${id}`,
  narrativeMeta: {
    targetLength: 900,
    actualLength: 320,
    coverageScore: 0.7,
    validationPassed: true,
  },
  reportSections: {
    coreConclusion: `这次阅读的主线 ${id}`,
    currentState: `当前状态 ${id}`,
    riskAlert: `风险提醒 ${id}`,
    actionFocus: `行动焦点 ${id}`,
    reviewPrompt: `现在回看 ${id}`,
  },
  ...overrides,
})

describe('RecordCenter filters and compare', () => {
  it('applies tag and date filters and triggers compare callback', async () => {
    const user = userEvent.setup()
    const onToggleCompare = vi.fn()

    const records = [
      createRecord('recent', {
        updatedAt: new Date().toISOString(),
        tags: ['focus'],
      }),
      createRecord('old', {
        updatedAt: '2024-01-01T00:00:00.000Z',
        tags: ['archive'],
      }),
    ]

    render(
      <RecordCenter
        compareSelection={[]}
        dateFilter="7d"
        filter="all"
        onClearCompare={vi.fn()}
        onDateFilterChange={vi.fn()}
        onExportRecords={vi.fn()}
        onFilterChange={vi.fn()}
        onImportRecords={vi.fn()}
        onQueryChange={vi.fn()}
        onTagFilterChange={vi.fn()}
        onToggleCompare={onToggleCompare}
        query=""
        records={records}
        recordsMessage={null}
        storageBackend="indexeddb"
        storageReady
        tagFilter="focus"
      />,
    )

    expect(screen.getByText('Record recent')).toBeInTheDocument()
    expect(screen.queryByText('Record old')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '加入对比' }))
    expect(onToggleCompare).toHaveBeenCalledWith('recent')
  })

  it('renders review summaries for list and compare views', () => {
    const records = [
      createRecord('structured', {
        summary: 'legacy summary',
        reportSections: {
          coreConclusion: '这次阅读的主线是先稳住推进节奏。',
          currentState: '当前状态是关系里节奏感失衡。',
          riskAlert: '风险提醒是不要把焦虑误当行动。',
          actionFocus: '行动焦点是先说清边界。',
          reviewPrompt: '现在回看：这次你有没有先稳住节奏再行动？',
        },
      }),
    ]

    render(
      <RecordCenter
        compareSelection={['structured']}
        dateFilter="all"
        filter="all"
        onClearCompare={vi.fn()}
        onDateFilterChange={vi.fn()}
        onExportRecords={vi.fn()}
        onFilterChange={vi.fn()}
        onImportRecords={vi.fn()}
        onQueryChange={vi.fn()}
        onTagFilterChange={vi.fn()}
        onToggleCompare={vi.fn()}
        query=""
        records={records}
        recordsMessage={null}
        storageBackend="indexeddb"
        storageReady
        tagFilter=""
      />,
    )

    expect(screen.getAllByText('当时主线').length).toBeGreaterThan(0)
    expect(screen.getAllByText('这次阅读的主线是先稳住推进节奏。').length).toBeGreaterThan(0)
    expect(screen.getAllByText('风险提醒').length).toBeGreaterThan(0)
    expect(screen.getAllByText('风险提醒是不要把焦虑误当行动。').length).toBeGreaterThan(0)
    expect(screen.getAllByText('现在回看').length).toBeGreaterThan(0)
    expect(screen.getAllByText('现在回看：这次你有没有先稳住节奏再行动？').length).toBeGreaterThan(0)
  })
})

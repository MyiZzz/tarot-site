import { beforeEach, describe, expect, it } from 'vitest'
import { createReading } from '../engine/reading'
import {
  buildDailyRecord,
  buildReadingRecordFromReading,
  exportReadingRecordsJson,
  loadReadingRecords,
  mergeReadingRecords,
  parseReadingRecordsJson,
  saveReadingRecord,
} from '../engine/storage'

describe('reading storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('migrates legacy saved readings and history into the v4 record store', () => {
    window.localStorage.setItem(
      'ukiyo-tarot.saved-readings',
      JSON.stringify([
        {
          id: 'legacy-saved',
          title: '旧收藏',
          category: 'love',
          tags: ['关系'],
          createdAt: '2026-03-08T08:00:00.000Z',
          question: '这段关系值得继续吗？',
          spreadTitle: '过去 / 现在 / 未来',
          topicLabel: '爱情',
          tone: '情绪流动',
          summary: '旧的收藏记录。',
          dominantSignals: ['主题：爱情'],
          cards: [
            { positionLabel: '过去', cardName: '恋人', orientation: 'up' },
            { positionLabel: '现在', cardName: '力量', orientation: 'down' },
            { positionLabel: '未来', cardName: '太阳', orientation: 'up' },
          ],
          actionPlan: [],
          followUps: [],
        },
      ]),
    )
    window.localStorage.setItem(
      'ukiyo-tarot:reading-history',
      JSON.stringify([
        {
          id: 'legacy-history',
          createdAt: '2026-03-07T08:00:00.000Z',
          question: '我该如何做选择？',
          topicId: 'career',
          topicLabel: '事业',
          spreadId: 'situation-obstacle-advice',
          spreadTitle: '现状 / 阻碍 / 建议',
          tone: '锋利辨析',
          summary: '旧自动归档。',
          advice: ['先厘清标准'],
          dominantSignals: ['主题：事业'],
          cards: [
            { positionLabel: '现状', cardName: '战车', orientation: 'up' },
            { positionLabel: '阻碍', cardName: '隐士', orientation: 'down' },
            { positionLabel: '建议', cardName: '皇帝', orientation: 'up' },
          ],
        },
      ]),
    )

    const records = loadReadingRecords()

    expect(records).toHaveLength(2)
    expect(records[0].version).toBe(4)
    expect(records.find((entry) => entry.id === 'legacy-saved')?.saved).toBe(true)
    expect(
      records.find((entry) => entry.id === 'legacy-history')?.variantId,
    ).toBe('diagnostic')
    expect(records.every((entry) => entry.deepNarrative.length > 0)).toBe(true)
    expect(records.every((entry) => entry.reportSections.coreConclusion.length > 0)).toBe(true)
    expect(records.every((entry) => entry.reportSections.reviewPrompt.length > 0)).toBe(true)
    expect(
      records.every((entry) => entry.narrativeMeta.actualLength === entry.deepNarrative.length),
    ).toBe(true)
    expect(window.localStorage.getItem('ukiyo-tarot.records-v4')).not.toBeNull()
  })

  it('updates the same record when a reading is saved after auto-archive', () => {
    const reading = createReading(
      {
        question: '我该如何推进这个项目？',
        topic: 'career',
        spreadId: 'holy-triangle',
        variantId: 'diagnostic',
      },
      { seed: 'record-upsert' },
    )

    const autoRecord = buildReadingRecordFromReading(reading, {
      recordId: 'reading-1',
      saved: false,
      title: '',
      tags: [],
      actionPlanDoneIds: [],
      followUps: [],
    })

    saveReadingRecord(autoRecord)

    const savedRecord = buildReadingRecordFromReading(reading, {
      recordId: 'reading-1',
      saved: true,
      title: '项目推进占卜',
      tags: ['项目', '决策'],
      actionPlanDoneIds: [reading.actionPlan[0].id],
      followUps: [],
    })

    const records = saveReadingRecord(savedRecord)

    expect(records).toHaveLength(1)
    expect(records[0].saved).toBe(true)
    expect(records[0].title).toBe('项目推进占卜')
    expect(records[0].tags).toEqual(['项目', '决策'])
    expect(records[0].actionPlan[0].done).toBe(true)
    expect(records[0].version).toBe(4)
    expect(records[0].depthLevel).toBe('deep')
    expect(records[0].ruleHits.length).toBeGreaterThan(0)
    expect(records[0].deepNarrative).toBe(reading.deepNarrative)
    expect(records[0].narrativeMeta.targetLength).toBe(reading.narrativeMeta.targetLength)
    expect(records[0].reportSections).toEqual(reading.reportSections)
  })

  it('creates stable daily records for the same date', () => {
    const daily = createReading(
      {
        question: '今天最值得留意的能量是什么？',
        topic: 'general',
        spreadId: 'daily-energy',
      },
      { seed: 'daily-2026-03-08' },
    )

    const first = buildDailyRecord(
      daily,
      new Date(2026, 2, 8, 0, 30),
      {
        morningIntent: '保持专注',
        eveningReview: '',
        resonance: 'strong',
      },
    )
    const second = buildDailyRecord(
      daily,
      new Date(2026, 2, 8, 23, 30),
      {
        morningIntent: '保持专注',
        eveningReview: '确实有帮助。',
        resonance: 'strong',
      },
    )

    expect(first.id).toBe('daily-2026-03-08')
    expect(second.id).toBe(first.id)
    expect(buildDailyRecord(daily, new Date(2026, 2, 9, 0, 0)).id).toBe(
      'daily-2026-03-09',
    )
    expect(first.createdAt).toBe(new Date(2026, 2, 8, 0, 30).toISOString())
    expect(second.dailyReflection.eveningReview).toContain('帮助')
  })
  it('serializes and parses record exports while preserving normalized order', () => {
    const first = createReading(
      {
        question: '我需要先处理什么？',
        topic: 'general',
        spreadId: 'daily-energy',
      },
      { seed: 'export-first' },
    )
    const second = createReading(
      {
        question: '我要如何推进合作？',
        topic: 'career',
        spreadId: 'holy-triangle',
        variantId: 'diagnostic',
      },
      { seed: 'export-second' },
    )

    const exported = exportReadingRecordsJson([
      buildReadingRecordFromReading(first, {
        recordId: 'first-record',
        saved: false,
        title: '第一条',
        tags: ['daily'],
        actionPlanDoneIds: [],
        followUps: [],
      }),
      buildReadingRecordFromReading(second, {
        recordId: 'second-record',
        saved: true,
        title: '第二条',
        tags: ['career'],
        actionPlanDoneIds: [],
        followUps: [],
      }),
    ])

    const parsed = parseReadingRecordsJson(exported)

    expect(parsed).toHaveLength(2)
    expect(parsed.map((entry) => entry.id).sort()).toEqual([
      'first-record',
      'second-record',
    ])
    expect(parsed.every((entry) => entry.version === 4)).toBe(true)
    expect(parsed.every((entry) => entry.deepNarrative.length > 0)).toBe(true)
    expect(parsed.every((entry) => entry.narrativeMeta.actualLength > 0)).toBe(true)
    expect(parsed.every((entry) => entry.reportSections.actionFocus.length > 0)).toBe(true)
  })

  it('upgrades imported v3 payloads into v4 records with default report sections', () => {
    const imported = parseReadingRecordsJson(
      JSON.stringify({
        version: 3,
        records: [
          {
            version: 3,
            id: 'legacy-v3-import',
            kind: 'reading',
            saved: true,
            createdAt: '2026-03-08T08:00:00.000Z',
            updatedAt: '2026-03-08T08:00:00.000Z',
            title: '旧版导入',
            question: '这次关系里我最该先处理什么？',
            topicId: 'love',
            topicLabel: '爱情',
            spreadId: 'holy-triangle',
            spreadTitle: '圣三角',
            variantId: 'diagnostic',
            variantTitle: '现状 / 阻碍 / 建议',
            tone: '先稳住节奏',
            summary: '先把真正的阻力说清楚，再决定是否继续推进。',
            dominantSignals: ['关系', '沟通'],
            tags: ['导入'],
            cards: [
              {
                positionLabel: '现状',
                cardId: 'the-fool',
                cardName: '愚人',
                orientation: 'up',
              },
            ],
            actionPlan: [],
            followUps: [],
            dailyReflection: {
              morningIntent: '',
              eveningReview: '',
              resonance: null,
            },
            depthLevel: 'standard',
            depthSignals: ['旧版导入'],
            ruleHits: [],
            queryFlags: [],
            interpretationSummary: '先把真正的阻力说清楚，再决定是否继续推进。',
            deepNarrative: '先把真正的阻力说清楚，再决定是否继续推进。',
            narrativeMeta: {
              targetLength: 420,
              actualLength: 20,
              coverageScore: 0.45,
              validationPassed: false,
            },
          },
        ],
      }),
    )

    expect(imported).toHaveLength(1)
    expect(imported[0].version).toBe(4)
    expect(imported[0].reportSections.coreConclusion).toContain('阻力')
    expect(imported[0].reportSections.reviewPrompt.length).toBeGreaterThan(0)
  })

  it('keeps the newest duplicate record without reviving older fields', () => {
    const reading = createReading(
      {
        question: '这次合作应该怎样推进？',
        topic: 'career',
        spreadId: 'holy-triangle',
        variantId: 'diagnostic',
      },
      { seed: 'newest-record-wins' },
    )
    const older = {
      ...buildReadingRecordFromReading(reading, {
        recordId: 'duplicate-record',
        saved: true,
        title: '旧标题',
        tags: ['旧标签'],
        actionPlanDoneIds: [],
        followUps: [],
      }),
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const newer = {
      ...older,
      title: '新标题',
      tags: [],
      actionPlan: older.actionPlan.map((step, index) => ({ ...step, done: index === 0 })),
      updatedAt: '2026-01-02T00:00:00.000Z',
    }

    expect(mergeReadingRecords([newer, older])[0]).toMatchObject({
      title: '新标题',
      tags: [],
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
    expect(mergeReadingRecords([newer, older])[0].actionPlan[0]?.done).toBe(true)
  })

  it('rejects imported records with invalid timestamps', () => {
    const reading = createReading(
      {
        question: '导入的时间戳是否有效？',
        topic: 'general',
        spreadId: 'daily-energy',
      },
      { seed: 'invalid-import-date' },
    )
    const record = buildReadingRecordFromReading(reading, {
      saved: false,
      title: '无效导入',
      tags: [],
      actionPlanDoneIds: [],
      followUps: [],
    })

    expect(parseReadingRecordsJson(JSON.stringify({ records: [{ ...record, updatedAt: 'not-a-date' }] }))).toEqual([])
  })
})

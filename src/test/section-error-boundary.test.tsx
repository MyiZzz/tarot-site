import { lazy, Suspense } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import App from '../App'
import { SectionErrorBoundary } from '../components/SectionErrorBoundary'
import { ReadingResultSection } from '../sections/ReadingResultSection'
import { createDailyReading } from '../lib/daily'

vi.mock('../components/RecordCenter', () => {
  throw new Error('Chunk unavailable')
})
vi.mock('../components/CardEncyclopedia', () => {
  throw new Error('Chunk unavailable')
})
vi.mock('../components/SpreadLayoutBoard', () => {
  throw new Error('Chunk unavailable')
})

it('keeps report text and save controls usable when the board chunk rejects', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const onSaveReading = vi.fn()
  const reading = createDailyReading()
  render(<ReadingResultSection
    reading={reading} actionPlanDoneIds={[]} followUpQuestion="" followUpSuggestions={[]}
    followUps={[]} revealedPositions={[]} recordNotice={null} recordTagsInput=""
    recordTitle="" shareMessage={null} onSaveReading={onSaveReading}
    onDownloadPoster={vi.fn()} onFollowUpQuestionChange={vi.fn()}
    onRecordTagsChange={vi.fn()} onRecordTitleChange={vi.fn()} onReveal={vi.fn()}
    onRevealAll={vi.fn()} onShareReading={vi.fn()} onSubmitFollowUp={vi.fn()}
    onToggleActionPlan={vi.fn()}
  />)
  expect(await screen.findByRole('region', { name: '牌阵桌面' })).toHaveTextContent('加载失败')
  expect(screen.getByText(reading.reportSections.coreConclusion)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '加入收藏' }))
  expect(onSaveReading).toHaveBeenCalledOnce()
})

it('contains rejected app chunks and preserves daily and reading sections', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<App />)
  expect(await screen.findByRole('region', { name: '记录中心' })).toHaveTextContent('加载失败')
  expect(await screen.findByRole('region', { name: '牌卡百科' })).toHaveTextContent('加载失败')
  expect(screen.getByRole('heading', { name: '等待抽牌' })).toBeInTheDocument()
  expect(document.getElementById('daily')).toBeInTheDocument()
  expect(document.getElementById('reading')).toBeInTheDocument()
})

it('reloads the document to recover from a cached rejected lazy import', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const FailedChunk = lazy(() => Promise.reject(new Error('Chunk unavailable')))
  render(
    <SectionErrorBoundary title="牌阵桌面">
      <Suspense fallback="加载中"><FailedChunk /></Suspense>
    </SectionErrorBoundary>,
  )
  const button = await screen.findByRole('button', { name: '重新加载页面' })
  const reload = vi.fn()
  vi.stubGlobal('window', { location: { reload } })
  try {
    fireEvent.click(button)
    expect(reload).toHaveBeenCalledOnce()
  } finally {
    vi.unstubAllGlobals()
  }
})

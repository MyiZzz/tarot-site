import {
  Suspense,
  lazy,
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './App.css'
import { scrollToSection } from './lib/scroll'
import { GuidePanel } from './components/GuidePanel'
import { LazySection } from './components/LazySection'
import { RevealText } from './components/RevealText'
import {
  buildDailyRecord,
  loadGuideDismissed,
  storeGuideDismissed,
} from './engine/storage'
import { TOPIC_BY_ID } from './data/topics'
import type { ReadingPreferences } from './domain/tarot'
import { useDailyReadingState } from './hooks/useDailyReadingState'
import { usePersistentRecords } from './hooks/usePersistentRecords'
import { FOLLOW_UP_SUGGESTIONS, useReadingSession } from './hooks/useReadingSession'
import { formatLocalFileDate } from './lib/localDate'
import { buildReadingShareText, shareText } from './lib/share'
import { DailyPanel } from './sections/DailyPanel'
import { ReadingResultSection } from './sections/ReadingResultSection'
import { ReadingStudioSection } from './sections/ReadingStudioSection'

const RecordCenter = lazy(async () => {
  const module = await import('./components/RecordCenter')
  return { default: module.RecordCenter }
})

const CardEncyclopedia = lazy(async () => {
  const module = await import('./components/CardEncyclopedia')
  return { default: module.CardEncyclopedia }
})

const FIXED_READING_PREFERENCES: ReadingPreferences = {
  shuffleSpeed: 'normal',
  orientationMode: 'random',
}

interface AppProps {
  shuffleDelayMs?: number
}

type RecordFilter = 'all' | 'saved' | 'auto' | 'daily'
type NavSection = 'daily' | 'reading' | 'result' | 'records' | 'encyclopedia'

const NAV_ITEMS: Array<{ id: NavSection; label: string; subtitle: string }> = [
  { id: 'daily', label: '每日一张', subtitle: 'Daily Guidance' },
  { id: 'reading', label: '开始占卜', subtitle: 'Ritual Studio' },
  { id: 'result', label: '结果解读', subtitle: 'Reading Report' },
  { id: 'records', label: '记录中心', subtitle: 'Record Center' },
  { id: 'encyclopedia', label: '牌卡百科', subtitle: 'Card Encyclopedia' },
]

const LazySectionFallback = ({
  id,
  title,
}: {
  id: string
  title: string
}) => (
  <section className="panel section" id={id}>
    <div className="section__heading">
      <div>
        <p className="eyebrow">Loading</p>
        <RevealText as="h2" text={title} />
      </div>
    </div>
    <p className="selection-note">正在加载…</p>
  </section>
)

function App({ shuffleDelayMs }: AppProps) {
  const [navSection, setNavSection] = useState<NavSection>('daily')
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all')
  const [recordQuery, setRecordQuery] = useState('')
  const [recordTagFilter, setRecordTagFilter] = useState('')
  const [recordDateFilter, setRecordDateFilter] = useState<'all' | '7d' | '30d'>('all')
  const [compareSelection, setCompareSelection] = useState<string[]>([])
  const [guideDismissed, setGuideDismissed] = useState(() => loadGuideDismissed())
  const [recordsMessage, setRecordsMessage] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const {
    records,
    storageBackend,
    storageReady,
    exportRecordsJson,
    importRecordsFromText,
    upsertRecord,
  } = usePersistentRecords()

  const {
    dailyDate,
    dailyLabel,
    dailyMessage,
    dailyReading,
    dailyRevealed,
    setDailyMessage,
    setDailyRevealed,
  } = useDailyReadingState()

  const readingSession = useReadingSession({
    onOpenResult: () => {
      setNavSection('result')
      window.requestAnimationFrame(() => scrollToSection('result'))
    },
    preferences: FIXED_READING_PREFERENCES,
    records,
    shuffleDelayMs,
    upsertRecord,
  })

  const featuredCardIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...(readingSession.reading?.cards.map((entry) => entry.card.id) ?? []),
          ...(dailyRevealed ? [dailyReading.cards[0].card.id] : []),
        ]),
      ),
    [dailyReading.cards, dailyRevealed, readingSession.reading],
  )

  useEffect(() => {
    storeGuideDismissed(guideDismissed)
  }, [guideDismissed])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

        if (active?.target.id) {
          setNavSection(active.target.id as NavSection)
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.2, 0.45, 0.75] },
    )

    NAV_ITEMS.forEach((entry) => {
      const element = document.getElementById(entry.id)

      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [storageReady])

  const handleRevealDaily = () => {
    if (dailyRevealed) {
      return
    }

    const nextRecord = buildDailyRecord(dailyReading, dailyDate)
    upsertRecord(nextRecord)
    setDailyRevealed(true)
  }

  const handleShareDaily = async () => {
    try {
      const message = await shareText(
        '浮世塔罗 · 每日一张',
        buildReadingShareText(dailyReading, TOPIC_BY_ID.general.label),
      )
      setDailyMessage(message)
    } catch (error) {
      setDailyMessage(error instanceof Error ? error.message : '分享失败。')
    }
  }

  const handleDownloadDailyPoster = async () => {
    try {
      const message = await (await import('./lib/poster')).downloadPosterPng(
        {
          title: `每日一张 · ${dailyLabel}`,
          question: dailyReading.input.question,
          spreadTitle: dailyReading.spread.title,
          summary: dailyReading.summary,
          cards: dailyReading.cards.map((entry) => ({
            label: entry.positionLabel,
            cardName: entry.card.nameZh,
            orientation: entry.drawn.orientation,
          })),
        },
        `daily-${formatLocalFileDate(dailyDate)}.png`,
      )
      setDailyMessage(message)
    } catch (error) {
      setDailyMessage(error instanceof Error ? error.message : '海报导出失败。')
    }
  }

  const handleToggleCompare = (recordId: string) => {
    setCompareSelection((current) => {
      const validCurrent = current.filter((id) =>
        records.some((record) => record.id === id),
      )

      if (validCurrent.includes(recordId)) {
        return validCurrent.filter((id) => id !== recordId)
      }

      if (validCurrent.length >= 2) {
        return validCurrent
      }

      return [...validCurrent, recordId]
    })
  }

  const handleExportRecords = () => {
    const blob = new Blob([exportRecordsJson()], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `ukiyo-records-${formatLocalFileDate(new Date())}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setRecordsMessage('记录导出已开始下载。')
  }

  const handleImportRecords = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const count = await importRecordsFromText(await file.text())
      setRecordsMessage(count > 0 ? `已导入 ${count} 条记录。` : '没有发现可导入的记录。')
    } catch (error) {
      setRecordsMessage(error instanceof Error ? error.message : '记录导入失败。')
    } finally {
      event.target.value = ''
    }
  }

  const normalizedCompareSelection = compareSelection.filter((id) =>
    records.some((record) => record.id === id),
  )

  const renderNavButton = (
    item: (typeof NAV_ITEMS)[number],
    compact = false,
    mode: 'top' | 'side' | 'mobile' = 'side',
  ) => (
    <button
      key={item.id}
      aria-current={navSection === item.id ? 'page' : undefined}
      aria-label={
        mode === 'mobile' ? item.label : `${mode === 'top' ? '顶部' : '侧边'}导航：${item.label}`
      }
      className={`stitch-nav-button ${navSection === item.id ? 'is-active' : ''} ${
        compact ? 'is-compact' : ''
      }`}
      type="button"
      onClick={() => {
        setNavSection(item.id)
        scrollToSection(item.id)
      }}
    >
      <span className="stitch-nav-button__label">{item.label}</span>
      {!compact ? <small>{item.subtitle}</small> : null}
    </button>
  )

  return (
    <div className="stitch-app bg-surface-container-lowest text-on-surface">
      <input
        ref={importInputRef}
        accept="application/json"
        hidden
        type="file"
        onChange={handleImportRecords}
      />

      <header className="stitch-topbar">
        <div className="stitch-topbar__inner">
          <div className="stitch-brand">
            <span className="stitch-brand__mark">浮世塔罗</span>
            <span className="stitch-brand__sub">UKIYO TAROT</span>
          </div>
          <nav className="stitch-topbar__nav" aria-label="主导航">
            {NAV_ITEMS.map((item) => renderNavButton(item, true, 'top'))}
          </nav>
        </div>
      </header>

      <aside className="stitch-sidenav" aria-label="侧边导航">
        <div className="stitch-sidenav__heading">
          <p className="eyebrow">The Obsidian Sanctuary</p>
          <h2>你的专属占卜仪式空间</h2>
        </div>
        <nav className="stitch-sidenav__nav" aria-label="分区导航">
          {NAV_ITEMS.map((item) => renderNavButton(item, false, 'side'))}
        </nav>
      </aside>

      <main className="stitch-main">
        <div className="layout stitch-layout">
          <section className="panel stitch-hero" aria-label="首页引导">
            <div className="stitch-hero__text">
              <p className="eyebrow">Tarot Salon</p>
              <RevealText as="h1" className="hero__title" text="把抽到的 78 张牌，真正铺上桌面。" />
              <p className="hero__lede">
                浮世塔罗把每日一张、深度牌阵、记录归档、追问与分享海报接成一条完整的解读动线。
              </p>
              <div className="hero__meta">
                <span>78 张独立牌面</span>
                <span>11 套牌阵</span>
                <span>{storageBackend === 'indexeddb' ? 'IndexedDB 记录中心' : '本地记录中心'}</span>
                <span>PNG 海报导出</span>
              </div>
            </div>
            <div className="stitch-hero__cta">
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setNavSection('reading')
                  scrollToSection('reading')
                }}
              >
                开始仪式占卜
              </button>
            </div>
          </section>

          <DailyPanel
            dailyLabel={dailyLabel}
            dailyMessage={dailyMessage}
            dailyRevealed={dailyRevealed}
            entry={dailyReading.cards[0]}
            onDownloadPoster={handleDownloadDailyPoster}
            onReveal={handleRevealDaily}
            onShare={handleShareDaily}
          />

          <GuidePanel
            dismissed={guideDismissed}
            onDismiss={() => setGuideDismissed(true)}
            onRestore={() => setGuideDismissed(false)}
          />

          <ReadingStudioSection
            canDraw={readingSession.canDraw}
            drawNotice={readingSession.drawNotice}
            isShuffling={readingSession.isShuffling}
            needsReDrawConfirm={readingSession.needsReDrawConfirm}
            onDraw={readingSession.handleDraw}
            onQuestionChange={readingSession.updateQuestion}
            onSelectSpread={readingSession.handleSelectSpread}
            onSelectTopic={readingSession.updateTopic}
            onSelectVariant={readingSession.updateVariant}
            question={readingSession.question}
            selectedSpread={readingSession.selectedSpread}
            selectedTopic={readingSession.selectedTopic}
            selectedVariant={readingSession.selectedVariant}
            spreadId={readingSession.spreadId}
            topic={readingSession.topic}
            variantId={readingSession.variantId}
          />

          <ReadingResultSection
            actionPlanDoneIds={readingSession.actionPlanDoneIds}
            followUpQuestion={readingSession.followUpQuestion}
            followUpSuggestions={FOLLOW_UP_SUGGESTIONS}
            followUps={readingSession.followUps}
            onDownloadPoster={readingSession.handleDownloadReadingPoster}
            onFollowUpQuestionChange={readingSession.setFollowUpQuestion}
            onRecordTagsChange={readingSession.setRecordTagsInput}
            onRecordTitleChange={readingSession.setRecordTitle}
            onReveal={readingSession.handleReveal}
            onRevealAll={readingSession.handleRevealAll}
            onSaveReading={readingSession.handleSaveReading}
            onShareReading={readingSession.handleShareReading}
            onSubmitFollowUp={readingSession.handleFollowUp}
            onToggleActionPlan={readingSession.handleToggleActionPlan}
            reading={readingSession.reading}
            recordNotice={readingSession.recordNotice}
            recordTagsInput={readingSession.recordTagsInput}
            recordTitle={readingSession.recordTitle}
            revealedPositions={readingSession.revealedPositions}
            shareMessage={readingSession.shareMessage}
          />

          <LazySection fallback={<LazySectionFallback id="records" title="记录中心" />}>
            <Suspense fallback={<LazySectionFallback id="records" title="记录中心" />}>
              <RecordCenter
                compareSelection={normalizedCompareSelection}
                dateFilter={recordDateFilter}
                filter={recordFilter}
                onClearCompare={() => setCompareSelection([])}
                onDateFilterChange={setRecordDateFilter}
                onExportRecords={handleExportRecords}
                onImportRecords={() => importInputRef.current?.click()}
                onFilterChange={setRecordFilter}
                onQueryChange={setRecordQuery}
                onTagFilterChange={setRecordTagFilter}
                onToggleCompare={handleToggleCompare}
                query={recordQuery}
                records={records}
                recordsMessage={recordsMessage}
                sectionId="records"
                storageBackend={storageBackend}
                storageReady={storageReady}
                tagFilter={recordTagFilter}
              />
            </Suspense>
          </LazySection>

          <section id="encyclopedia">
            <LazySection
              fallback={<LazySectionFallback id="encyclopedia-fallback" title="牌卡百科" />}
            >
              <Suspense
                fallback={<LazySectionFallback id="encyclopedia-fallback" title="牌卡百科" />}
              >
                <CardEncyclopedia featuredCardIds={featuredCardIds} />
              </Suspense>
            </LazySection>
          </section>
        </div>
      </main>

      <nav className="stitch-mobile-nav" aria-label="移动端导航">
        {NAV_ITEMS.map((item) => renderNavButton(item, true, 'mobile'))}
      </nav>

      <div className="stitch-mobile-spacer" />
    </div>
  )
}

export default App

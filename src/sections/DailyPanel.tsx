import { StatusMessage } from '../components/StatusMessage'
import { TarotCardButton } from '../components/TarotCardButton'
import { RevealText } from '../components/RevealText'
import type { ReadingCardView } from '../domain/tarot'

interface DailyPanelProps {
  dailyLabel: string
  dailyMessage: string | null
  dailyRevealed: boolean
  entry: ReadingCardView
  onDownloadPoster: () => void
  onReveal: () => void
  onShare: () => void
}

export function DailyPanel({
  dailyLabel,
  dailyMessage,
  dailyRevealed,
  entry,
  onDownloadPoster,
  onReveal,
  onShare,
}: DailyPanelProps) {
  const energyText = entry.card.meaning[entry.drawn.orientation]

  return (
    <section className="panel section daily-panel stitch-panel stitch-panel--daily" id="daily">
      <div className="section__heading">
        <div>
          <p className="eyebrow">Daily Guidance</p>
          <RevealText as="h2" text="今日指引" />
        </div>
        <span className="section__count">{dailyLabel}</span>
      </div>

      <div className="daily-layout">
        <div className="daily-copy">
          {!dailyRevealed ? (
            <div className="draw-summary__actions">
              <button className="primary-button" type="button" onClick={onReveal}>
                揭晓今日能量
              </button>
            </div>
          ) : (
            <div
              className="daily-revealed-content fade-in-block"
              data-testid="daily-revealed-content"
            >
              <article className="result-panel daily-guidance-panel">
                <p className="eyebrow">Energy of the Day</p>
                <h3>核心指引</h3>
                <p>{energyText}</p>
              </article>

              <div className="draw-summary__actions daily-revealed-content__actions">
                <button className="ghost-button" type="button" onClick={onShare}>
                  分享今日卡面
                </button>
                <button className="ghost-button" type="button" onClick={onDownloadPoster}>
                  下载今日海报
                </button>
              </div>
              <StatusMessage message={dailyMessage} />
            </div>
          )}
        </div>

        <div className="daily-card-slot">
          <TarotCardButton loading="eager" entry={entry} onReveal={onReveal} revealed={dailyRevealed} />
        </div>
      </div>
    </section>
  )
}

import { useMemo, type CSSProperties } from 'react'
import type { PositionReading, ReadingCardView, ResolvedSpreadDefinition } from '../domain/tarot'
import { buildSpreadStageLayout, getBoardMetaForSpread } from '../lib/spreadBoardLayout'
import { TarotCardFigure } from './TarotCardFigure'
import { SpreadRitualLayer } from './SpreadRitualLayer'

interface SpreadLayoutBoardProps {
  cards: ReadingCardView[]
  positionReadings: PositionReading[]
  spread: ResolvedSpreadDefinition
  revealedPositions: string[]
  onReveal: (positionKey: string) => void
}

export function SpreadLayoutBoard({
  cards,
  positionReadings,
  spread,
  revealedPositions,
  onReveal,
}: SpreadLayoutBoardProps) {
  const boardMeta = useMemo(() => getBoardMetaForSpread(spread), [spread])
  const stageLayout = useMemo(
    () => buildSpreadStageLayout(boardMeta, revealedPositions),
    [boardMeta, revealedPositions],
  )
  const cardMap = useMemo(
    () => Object.fromEntries(stageLayout.cards.map((entry) => [entry.key, entry])),
    [stageLayout.cards],
  )
  const captionMap = useMemo(
    () => Object.fromEntries(stageLayout.captions.map((entry) => [entry.key, entry])),
    [stageLayout.captions],
  )
  const positionReadingMap = useMemo(
    () => Object.fromEntries(positionReadings.map((entry) => [entry.positionKey, entry])),
    [positionReadings],
  )

  return (
    <div className="spread-board-shell">
      <div className="spread-board-scroll" role="region" aria-label="牌阵桌面" tabIndex={0}>
        <div
          className="spread-board-stage"
          style={
            {
              '--stage-width': `${stageLayout.stageWidth}px`,
              '--stage-height': `${stageLayout.stageHeight}px`,
              '--board-left': `${stageLayout.boardLeft}px`,
              '--board-top': `${stageLayout.boardTop}px`,
              '--board-width': `${stageLayout.boardWidth}px`,
              '--board-height': `${stageLayout.boardHeight}px`,
            } as CSSProperties
          }
        >
          <div className={`spread-board spread-board--${spread.layoutId}`} />
          <SpreadRitualLayer layout={stageLayout} revealedPositions={revealedPositions} />
          <div className="spread-board__cards-layer">
            {cards.map((entry) => {
              const coordinate = cardMap[entry.drawn.positionKey]
              const revealed = revealedPositions.includes(entry.drawn.positionKey)

              return (
                <div
                  key={entry.drawn.positionKey}
                  className="spread-board__slot spread-board__slot--card"
                  data-position-key={entry.drawn.positionKey}
                  style={
                    {
                      '--slot-x': `${coordinate.centerX}px`,
                      '--slot-y': `${coordinate.centerY}px`,
                      '--slot-rotation': `${coordinate.rotation ?? 0}deg`,
                      '--slot-z': `${Math.max(1, Math.round(coordinate.centerY))}`,
                      '--slot-width': `${coordinate.width}px`,
                    } as CSSProperties
                  }
                >
                  <TarotCardFigure
                    art={entry.art}
                    card={entry.card}
                    interactive={!revealed}
                    onClick={() => onReveal(entry.drawn.positionKey)}
                    orientation={entry.drawn.orientation}
                    revealed={revealed}
                  />
                </div>
              )
            })}
          </div>
          <div className="spread-board__captions-layer" aria-hidden="true">
            {cards.map((entry) => {
              const coordinate = captionMap[entry.drawn.positionKey]

              if (!coordinate) {
                return null
              }

              return (
                <div
                  key={`${entry.drawn.positionKey}-caption`}
                  className="spread-board__slot spread-board__slot--caption"
                  data-position-key={entry.drawn.positionKey}
                  data-side={coordinate.side}
                  style={
                    {
                      '--slot-x': `${coordinate.centerX}px`,
                      '--slot-y': `${coordinate.centerY}px`,
                      '--caption-width': `${coordinate.width}px`,
                      '--caption-height': `${coordinate.height}px`,
                      '--caption-connector-length': `${coordinate.connectorLength}px`,
                    } as CSSProperties
                  }
                >
                  <div className="spread-board__caption">
                    <strong>{entry.positionLabel}</strong>
                    <span>{entry.meaningHint}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="spread-board__reading-list">
        {cards.map((entry) => {
          if (!revealedPositions.includes(entry.drawn.positionKey)) {
            return null
          }

          const positionReading = positionReadingMap[entry.drawn.positionKey]

          return (
            <article key={`${entry.drawn.positionKey}-summary`} className="result-panel">
              <p className="eyebrow">牌位 · {entry.positionLabel}</p>
              <h3>
                {entry.card.nameZh} · {entry.drawn.orientation === 'up' ? '正位' : '逆位'}
              </h3>
              <p>{positionReading?.message ?? entry.meaningHint}</p>
            </article>
          )
        })}
      </div>
    </div>
  )
}

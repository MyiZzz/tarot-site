import { useMemo, useState } from 'react'
import { RevealText } from './RevealText'

interface GuideStep {
  title: string
  detail: string
  meaningHint?: string
}

interface GuideContent {
  eyebrow?: string
  title?: string
  collapsedNote?: string
  steps?: GuideStep[]
}

interface GuidePanelProps {
  dismissed: boolean
  guide?: GuideContent
  onDismiss: () => void
  onRestore: () => void
}

const DEFAULT_GUIDE: Required<Pick<GuideContent, 'eyebrow' | 'title' | 'collapsedNote'>> & {
  steps: GuideStep[]
} = {
  eyebrow: 'Onboarding',
  title: '新手引导',
  collapsedNote:
    '引导已收起。你可以随时重新展开，快速回顾提问、选阵、看结果和保存动作的顺序。',
  steps: [
    {
      title: '怎么问，决定答案有没有用',
      detail:
        '推荐把问题写成“我接下来该如何处理 X”或“我该先推进哪一步”。不推荐只问“会不会”“是不是”或“以后怎样”。问题越具体，结果越可执行。',
    },
    {
      title: '怎么选牌阵，决定你看到的是哪一层',
      detail:
        '想快速定调，用单张或圣三角；要比较两个方向，用抉择罗盘；要看复杂结构，再上深度牌阵。先选信息结构，再抽牌。',
    },
    {
      title: '怎么看结果，决定这次占卜会不会落地',
      detail:
        '先完整揭牌，再看五段式报告：核心结论、当前状态、风险提醒、先做什么、回看问题。最后把值得执行的动作保存到记录中心。',
    },
  ],
}

const resolveGuideContent = (guide?: GuideContent) => ({
  eyebrow: guide?.eyebrow ?? DEFAULT_GUIDE.eyebrow,
  title: guide?.title ?? DEFAULT_GUIDE.title,
  collapsedNote: guide?.collapsedNote ?? DEFAULT_GUIDE.collapsedNote,
  steps: guide?.steps?.length ? guide.steps : DEFAULT_GUIDE.steps,
})

export function GuidePanel({ dismissed, guide, onDismiss, onRestore }: GuidePanelProps) {
  const guideContent = useMemo(() => resolveGuideContent(guide), [guide])
  const [stepIndex, setStepIndex] = useState(0)
  const boundedStepIndex = Math.min(stepIndex, guideContent.steps.length - 1)
  const currentStep = guideContent.steps[boundedStepIndex]
  const isLast = boundedStepIndex === guideContent.steps.length - 1

  const handleDismiss = () => {
    setStepIndex(0)
    onDismiss()
  }

  const handleRestore = () => {
    setStepIndex(0)
    onRestore()
  }

  return (
    <section className="panel section guide-panel stitch-panel stitch-panel--guide">
      <div className="section__heading">
        <div>
          <p className="eyebrow">{guideContent.eyebrow}</p>
          <RevealText as="h2" text={guideContent.title} />
        </div>
        {dismissed ? (
          <button className="ghost-button" type="button" onClick={handleRestore}>
            重新查看
          </button>
        ) : (
          <button className="ghost-button" type="button" onClick={handleDismiss}>
            关闭引导
          </button>
        )}
      </div>

      {dismissed ? (
        <p className="selection-note">{guideContent.collapsedNote}</p>
      ) : (
        <>
          <div className="guide-progress">
            <span className="section__count">
              第 {boundedStepIndex + 1} / {guideContent.steps.length} 步
            </span>
            <div
              className="guide-progress__bar"
              role="progressbar"
              aria-label={guideContent.title}
              aria-valuemin={1}
              aria-valuemax={guideContent.steps.length}
              aria-valuenow={boundedStepIndex + 1}
            >
              <span
                style={{
                  width: `${((boundedStepIndex + 1) / guideContent.steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <article className="result-panel">
            <p className="eyebrow">Step {String(boundedStepIndex + 1).padStart(2, '0')}</p>
            <RevealText as="h3" text={currentStep.title} />
            <p>{currentStep.detail}</p>
            {currentStep.meaningHint ? (
              <p className="selection-note">{currentStep.meaningHint}</p>
            ) : null}
          </article>

          <div className="draw-summary__actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={boundedStepIndex === 0}
            >
              上一步
            </button>
            {!isLast ? (
              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  setStepIndex((current) => Math.min(guideContent.steps.length - 1, current + 1))
                }
              >
                下一步
              </button>
            ) : (
              <button className="primary-button" type="button" onClick={handleDismiss}>
                完成引导
              </button>
            )}
          </div>
        </>
      )}
    </section>
  )
}

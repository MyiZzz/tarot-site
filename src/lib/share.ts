import type { ReadingResult } from '../domain/tarot'

export const buildReadingShareText = (
  reading: ReadingResult,
  topicLabel: string,
): string => {
  const cardsLine = reading.cards
    .map(
      (entry) =>
        `${entry.positionLabel}: ${entry.card.nameZh}${
          entry.drawn.orientation === 'up'
            ? ' (正位)'
            : ' (逆位)'
        }`,
    )
    .join(' / ')

  return [
    `浮世占 / ${reading.input.question}`,
    `主题: ${topicLabel}`,
    `牌阵: ${reading.spread.title}`,
    reading.spread.activeVariantTitle
      ? `模式: ${reading.spread.activeVariantTitle}`
      : null,
    `牌面: ${cardsLine}`,
    `结论: ${reading.summary}`,
    `建议: ${reading.advice.join('；')}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export const shareText = async (title: string, text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return '分享文案已复制到剪贴板。'
  }

  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    window.prompt(`${title}：请手动复制以下内容`, text)
    return '当前环境不支持剪贴板，已打开手动复制面板。'
  }

  throw new Error('当前环境不支持剪贴板复制。为保护隐私，已禁用系统分享。')
}

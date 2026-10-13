import type { Orientation } from '../domain/tarot'

interface PosterCard {
  label: string
  cardName: string
  orientation: Orientation
}

interface PosterPayload {
  title: string
  question: string
  spreadTitle: string
  summary: string
  cards: PosterCard[]
}

const SVG_FONT_TOKEN_CSS = `
  :root {
    --font-display: 'Baskerville Old Face', 'Times New Roman', 'Songti SC', serif;
    --font-accent: 'Cormorant Garamond', 'Baskerville Old Face', 'Times New Roman', serif;
  }
`

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const getPosterHeight = (cardCount: number) =>
  Math.max(980, 268 + Math.ceil(cardCount / 2) * 86 + 246)

export const buildReadingPosterSvg = (payload: PosterPayload) => {
  const posterHeight = getPosterHeight(payload.cards.length)
  const summaryY = 268 + Math.ceil(payload.cards.length / 2) * 86 + 30
  const cardRows = payload.cards
    .map((card, index) => {
      const row = Math.floor(index / 2)
      const column = index % 2
      const x = 54 + column * 328
      const y = 268 + row * 86

      return `
        <g transform="translate(${x} ${y})">
          <rect width="284" height="58" rx="18" fill="rgba(255,255,255,0.08)" stroke="rgba(255,232,184,0.16)" />
          <text x="20" y="23" fill="#e4c98a" font-size="14" font-family="var(--font-accent)">${escapeXml(card.label)}</text>
          <text x="20" y="42" fill="#f7f0de" font-size="20" font-family="var(--font-display)">${escapeXml(card.cardName)}</text>
          <text x="242" y="37" fill="#cfd7e8" font-size="12" text-anchor="end" font-family="var(--font-accent)">${card.orientation === 'up' ? '正位' : '逆位'}</text>
        </g>
      `
    })
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${posterHeight}" viewBox="0 0 760 ${posterHeight}" fill="none">
    <defs>
      <linearGradient id="poster-bg" x1="120" y1="60" x2="660" y2="920" gradientUnits="userSpaceOnUse">
        <stop stop-color="#19324a"/>
        <stop offset="0.45" stop-color="#0f1c29"/>
        <stop offset="1" stop-color="#1d1015"/>
      </linearGradient>
      <radialGradient id="poster-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(620 120) rotate(142) scale(280 240)">
        <stop stop-color="#d7a34f" stop-opacity="0.34"/>
        <stop offset="1" stop-color="#d7a34f" stop-opacity="0"/>
      </radialGradient>
      <style><![CDATA[${SVG_FONT_TOKEN_CSS}]]></style>
    </defs>
    <rect width="760" height="${posterHeight}" rx="34" fill="url(#poster-bg)"/>
    <rect width="760" height="${posterHeight}" rx="34" fill="url(#poster-glow)"/>
    <rect x="28" y="28" width="704" height="${posterHeight - 56}" rx="28" stroke="rgba(255,238,205,0.18)"/>
    <text x="54" y="84" fill="#e4c98a" font-size="20" font-family="var(--font-accent)" letter-spacing="4">UKIYO TAROT SALON</text>
    <text x="54" y="144" fill="#f7f0de" font-size="42" font-family="var(--font-display)">${escapeXml(payload.title)}</text>
    <text x="54" y="190" fill="#cad5e5" font-size="18" font-family="var(--font-display)">${escapeXml(payload.spreadTitle)}</text>
    <foreignObject x="54" y="212" width="652" height="54">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:var(--font-display);font-size:18px;color:#dfe8f8;line-height:1.55;">${escapeXml(payload.question)}</div>
    </foreignObject>
    ${cardRows}
    <text x="54" y="${summaryY}" fill="#e4c98a" font-size="18" font-family="var(--font-accent)" letter-spacing="3">SUMMARY</text>
    <foreignObject x="54" y="${summaryY + 16}" width="652" height="154">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:var(--font-display);font-size:22px;color:#f8f2e5;line-height:1.7;">${escapeXml(payload.summary)}</div>
    </foreignObject>
    <text x="54" y="${posterHeight - 48}" fill="#bfc9d9" font-size="16" font-family="var(--font-display)">浮世塔罗 · 以牌为镜，以行动落地</text>
  </svg>`
}

export const downloadPosterPng = async (
  payload: PosterPayload,
  fileName: string,
) => {
  const svg = buildReadingPosterSvg(payload)
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image()
      nextImage.onload = () => resolve(nextImage)
      nextImage.onerror = () => reject(new Error('海报图像生成失败。'))
      nextImage.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = 760
    canvas.height = getPosterHeight(payload.cards.length)
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('当前环境不支持海报导出。')
    }

    context.drawImage(image, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    )

    if (!blob) {
      throw new Error('PNG 海报生成失败。')
    }

    const blobUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = blobUrl
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(blobUrl)
    return 'PNG 海报已开始下载。'
  } finally {
    URL.revokeObjectURL(url)
  }
}

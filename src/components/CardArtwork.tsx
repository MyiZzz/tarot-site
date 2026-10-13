import { useState, type ImgHTMLAttributes } from 'react'
import type { CardImageAsset } from '../data/cardImages'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'onError'> & {
  asset: CardImageAsset
}

const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="400" viewBox="0 0 240 400"><rect width="240" height="400" rx="16" fill="#292432"/><rect x="16" y="16" width="208" height="368" rx="12" fill="none" stroke="#eac382"/><text x="120" y="215" text-anchor="middle" fill="#eac382" font-size="48">✦</text></svg>')}`

// A new asset gets a fresh attempt; rerenders of the same asset never restart retries.
export function CardArtwork(props: Props) {
  return <ArtworkAttempt key={props.asset.fallbackUrl} {...props} />
}

function ArtworkAttempt({ asset, alt, sizes, ...props }: Props) {
  const [stage, setStage] = useState(0)
  return (
    <picture key={stage}>
      {stage === 0 && <source sizes={sizes} srcSet={asset.avifSrcSet} type="image/avif" />}
      {stage <= 1 && <source sizes={sizes} srcSet={asset.webpSrcSet} type="image/webp" />}
      <img
        {...props}
        sizes={sizes}
        src={stage === 3 ? PLACEHOLDER : asset.fallbackUrl}
        alt={stage === 3 ? `${alt ?? '牌面'}（图片暂不可用）` : alt}
        onError={stage === 3 ? undefined : (event) => {
          // currentSrc also handles browsers that skipped an unsupported format.
          const failed = event.currentTarget.currentSrc
          const next = /\.jpg(?:\?|$)/.test(failed) ? 3 : /\.webp(?:\?|$)/.test(failed) ? 2 : stage + 1
          setStage((previous) => Math.max(previous, next))
        }}
      />
    </picture>
  )
}

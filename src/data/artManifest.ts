import type { CardArtManifest } from '../domain/tarot'
import { CARD_IMAGE_ASSET_BY_ID, CARD_IMAGE_CREDIT } from './cardImages'
import { TAROT_DECK } from './cards'

const MAJOR_MOTIFS: Record<string, string> = {
  'the-fool': '风鹤',
  'the-magician': '镜印',
  'the-high-priestess': '月门',
  'the-empress': '花潮',
  'the-emperor': '石座',
  'the-hierophant': '礼印',
  'the-lovers': '双枝',
  'the-chariot': '辕轨',
  strength: '金狮',
  'the-hermit': '灯塔',
  'wheel-of-fortune': '轮盘',
  justice: '衡羽',
  'the-hanged-man': '悬川',
  death: '蜕壳',
  temperance: '流金',
  'the-devil': '锁纹',
  'the-tower': '裂塔',
  'the-star': '泉星',
  'the-moon': '潮月',
  'the-sun': '日冕',
  judgement: '回响',
  'the-world': '圆环',
}

const SUIT_MOTIFS = {
  wands: ['火羽', '焰印', '燎原', '流火'],
  cups: ['潮纹', '月潮', '镜湖', '潮杯'],
  swords: ['风刃', '寒光', '裂羽', '锋痕'],
  pentacles: ['谷仓', '土印', '穗环', '金穗'],
} as const

const SUIT_SEALS = {
  wands: '焰',
  cups: '潮',
  swords: '锋',
  pentacles: '穗',
} as const

const createGlyphs = (seed: string) => {
  const chars = Array.from(seed.replace(/[^a-z0-9]/gi, '').toUpperCase())

  return [chars[0] ?? 'T', chars[1] ?? 'A', chars[2] ?? 'R']
}

export const CARD_ART_MANIFEST: Record<string, CardArtManifest> = Object.fromEntries(
  TAROT_DECK.map((card) => {
    const glyphs = createGlyphs(card.id)

    if (card.arcana === 'major') {
      return [
        card.id,
        {
          cardId: card.id,
          frame:
            card.number % 4 === 0
              ? 'sun'
              : card.number % 4 === 1
                ? 'moon'
                : card.number % 4 === 2
                  ? 'gate'
                  : 'ribbon',
          motif: MAJOR_MOTIFS[card.id] ?? '命途',
          constellation: `大牌 ${String(card.number).padStart(2, '0')}`,
          seal: `阿尔卡那 ${card.number}`,
          glyphs,
          imageUrl: CARD_IMAGE_ASSET_BY_ID[card.id].fallbackUrl,
          imageCredit: CARD_IMAGE_CREDIT,
        } satisfies CardArtManifest,
      ]
    }

    const motifSet = SUIT_MOTIFS[card.suit]
    const motif = motifSet[(card.number - 1) % motifSet.length]

    return [
      card.id,
      {
        cardId: card.id,
        frame: card.number <= 4 ? 'gate' : card.number <= 10 ? 'ribbon' : 'moon',
        motif,
        constellation: `${card.nameEn.split(' of ')[0]} · ${card.nameEn.split(' of ')[1]}`,
        seal: `${SUIT_SEALS[card.suit]} ${card.number}`,
        glyphs,
        imageUrl: CARD_IMAGE_ASSET_BY_ID[card.id].fallbackUrl,
        imageCredit: CARD_IMAGE_CREDIT,
      } satisfies CardArtManifest,
    ]
  }),
)

import type { ResolvedSpreadDefinition } from '../domain/tarot'

export interface LayoutCoordinate {
  key: string
  x: number
  y: number
  rotation?: number
}

export interface BoardMeta {
  width: number
  height: number
  coordinates: LayoutCoordinate[]
}

interface LayoutRect {
  left: number
  right: number
  top: number
  bottom: number
}

interface BoardCardLayout extends LayoutCoordinate {
  centerX: number
  centerY: number
  width: number
  height: number
  rect: LayoutRect
}

type CaptionSide = 'top' | 'right' | 'bottom' | 'left'

interface BoardCaptionLayout {
  key: string
  side: CaptionSide
  centerX: number
  centerY: number
  width: number
  height: number
  rect: LayoutRect
  connectorLength: number
}

export interface SpreadStageLayout {
  stageWidth: number
  stageHeight: number
  boardLeft: number
  boardTop: number
  boardWidth: number
  boardHeight: number
  cardScale: number
  cards: BoardCardLayout[]
  captions: BoardCaptionLayout[]
}

const CARD_ASPECT_RATIO = 1.6
const CAPTION_GAP_X = 18
const CAPTION_GAP_Y = 14
const CAPTION_OFFSET = 24

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const uniqueSides = (sides: CaptionSide[]) =>
  sides.filter((side, index) => sides.indexOf(side) === index)

const buildRect = (centerX: number, centerY: number, width: number, height: number): LayoutRect => ({
  left: centerX - width / 2,
  right: centerX + width / 2,
  top: centerY - height / 2,
  bottom: centerY + height / 2,
})

const getCaptionConnectorLength = (
  card: BoardCardLayout,
  captionRect: LayoutRect,
  side: CaptionSide,
) => {
  const gap =
    side === 'left'
      ? card.rect.left - captionRect.right
      : side === 'right'
        ? captionRect.left - card.rect.right
        : side === 'top'
          ? card.rect.top - captionRect.bottom
          : captionRect.top - card.rect.bottom

  return Math.max(32, Math.round(gap))
}

const getRotatedBounds = (width: number, height: number, rotation = 0) => {
  const radians = (Math.abs(rotation) * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))

  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  }
}

const getCardBaseWidth = (boardWidth: number) => clampValue(boardWidth * 0.17, 144, 208)

const getCaptionWidth = (boardWidth: number) => clampValue(boardWidth * 0.24, 220, 312)

const getCaptionHeight = (boardWidth: number) => clampValue(boardWidth * 0.068, 88, 110)

const isIntentionalOverlapPair = (left: LayoutCoordinate, right: LayoutCoordinate) => {
  const sameAnchor = Math.abs(left.x - right.x) < 0.01 && Math.abs(left.y - right.y) < 0.01
  if (!sameAnchor) {
    return false
  }

  const rotationDelta = Math.abs((left.rotation ?? 0) - (right.rotation ?? 0))
  return rotationDelta >= 60
}

const optimizeCardCoordinates = (
  coordinates: LayoutCoordinate[],
  boardWidth: number,
  boardHeight: number,
) => {
  if (coordinates.length <= 1) {
    return { cardScale: 1, coordinates }
  }

  const slotWidth = getCardBaseWidth(boardWidth)
  const slotHeight = slotWidth * CARD_ASPECT_RATIO
  const marginX = slotWidth * 0.44
  const marginY = slotHeight * 0.44
  const desiredDistance = slotWidth * 0.92
  const iterations = 70

  const nodes = coordinates.map((coordinate) => ({
    ...coordinate,
    anchorX: (coordinate.x / 100) * boardWidth,
    anchorY: (coordinate.y / 100) * boardHeight,
    xPx: (coordinate.x / 100) * boardWidth,
    yPx: (coordinate.y / 100) * boardHeight,
  }))

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const xForces = new Array(nodes.length).fill(0)
    const yForces = new Array(nodes.length).fill(0)

    for (let index = 0; index < nodes.length; index += 1) {
      for (let next = index + 1; next < nodes.length; next += 1) {
        const left = nodes[index]
        const right = nodes[next]

        if (isIntentionalOverlapPair(left, right)) {
          continue
        }

        const dx = left.xPx - right.xPx
        const dy = left.yPx - right.yPx
        const distance = Math.hypot(dx, dy) || 0.0001

        if (distance >= desiredDistance) {
          continue
        }

        const push = (desiredDistance - distance) / desiredDistance
        const unitX = dx / distance
        const unitY = dy / distance

        xForces[index] += unitX * push
        yForces[index] += unitY * push
        xForces[next] -= unitX * push
        yForces[next] -= unitY * push
      }
    }

    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index]
      const anchorTension = 0.1 + iteration * 0.0008
      const step = 7.2

      xForces[index] += (node.anchorX - node.xPx) * anchorTension * 0.01
      yForces[index] += (node.anchorY - node.yPx) * anchorTension * 0.01

      node.xPx = clampValue(node.xPx + xForces[index] * step, marginX, boardWidth - marginX)
      node.yPx = clampValue(node.yPx + yForces[index] * step, marginY, boardHeight - marginY)
    }
  }

  let separationScale = 1
  for (let index = 0; index < nodes.length; index += 1) {
    for (let next = index + 1; next < nodes.length; next += 1) {
      const left = nodes[index]
      const right = nodes[next]

      if (isIntentionalOverlapPair(left, right)) {
        continue
      }

      const leftBounds = getRotatedBounds(slotWidth, slotHeight, left.rotation)
      const rightBounds = getRotatedBounds(slotWidth, slotHeight, right.rotation)
      // Either axis must separate the full rotated rectangles, with breathing room.
      const scaleX = Math.abs(left.xPx - right.xPx) / ((leftBounds.width + rightBounds.width) / 2 + 16)
      const scaleY = Math.abs(left.yPx - right.yPx) / ((leftBounds.height + rightBounds.height) / 2 + 16)
      separationScale = Math.min(separationScale, Math.max(scaleX, scaleY))
    }
  }

  const densityScale = clampValue(1 - Math.max(0, nodes.length - 5) * 0.012, 0.84, 1)
  const cardScale = Math.min(densityScale, separationScale)

  return {
    cardScale,
    coordinates: nodes.map((node) => ({
      key: node.key,
      x: (node.xPx / boardWidth) * 100,
      y: (node.yPx / boardHeight) * 100,
      rotation: node.rotation,
    })),
  }
}

const getSidePreference = (
  card: BoardCardLayout,
  board: { left: number; right: number; top: number; bottom: number; centerX: number; centerY: number },
  index: number,
): CaptionSide[] => {
  const distances: Array<[CaptionSide, number]> = [
    ['top', card.centerY - board.top],
    ['right', board.right - card.centerX],
    ['bottom', board.bottom - card.centerY],
    ['left', card.centerX - board.left],
  ]

  const dx = card.centerX - board.centerX
  const dy = card.centerY - board.centerY

  const dominantSide: CaptionSide =
    Math.abs(dx) > Math.abs(dy)
      ? dx >= 0
        ? 'right'
        : 'left'
      : Math.abs(dy) > 0
        ? dy >= 0
          ? 'bottom'
          : 'top'
        : index % 2 === 0
          ? 'top'
          : 'bottom'

  const verticalSide: CaptionSide = dy >= 0 ? 'bottom' : 'top'
  const horizontalSide: CaptionSide = dx >= 0 ? 'right' : 'left'

  return uniqueSides([
    dominantSide,
    ...distances.sort((left, right) => left[1] - right[1]).map(([side]) => side),
    verticalSide,
    horizontalSide,
    'top',
    'right',
    'bottom',
    'left',
  ])
}

const assignCaptionSides = (
  cards: BoardCardLayout[],
  boardWidth: number,
  boardHeight: number,
  captionWidth: number,
  captionHeight: number,
) => {
  const capacities = {
    top: Math.max(1, Math.floor((boardWidth + CAPTION_GAP_X) / (captionWidth + CAPTION_GAP_X))),
    right: Math.max(1, Math.floor((boardHeight + CAPTION_GAP_Y) / (captionHeight + CAPTION_GAP_Y))),
    bottom: Math.max(1, Math.floor((boardWidth + CAPTION_GAP_X) / (captionWidth + CAPTION_GAP_X))),
    left: Math.max(1, Math.floor((boardHeight + CAPTION_GAP_Y) / (captionHeight + CAPTION_GAP_Y))),
  } satisfies Record<CaptionSide, number>

  const counts = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  } satisfies Record<CaptionSide, number>

  const boardBounds = {
    left: 0,
    right: boardWidth,
    top: 0,
    bottom: boardHeight,
    centerX: boardWidth / 2,
    centerY: boardHeight / 2,
  }

  return cards.map((card, index) => {
    const preferences = getSidePreference(card, boardBounds, index)
    const selected =
      preferences.find((side) => counts[side] < capacities[side]) ??
      preferences.reduce((best, side) => (counts[side] < counts[best] ? side : best), preferences[0]!)

    counts[selected] += 1

    return {
      card,
      side: selected,
    }
  })
}

const packLaneCenters = (targets: number[], min: number, max: number, gap: number) => {
  if (targets.length === 0) {
    return []
  }

  const centers = targets.map((value) => clampValue(value, min, max))

  for (let index = 1; index < centers.length; index += 1) {
    centers[index] = Math.max(centers[index]!, centers[index - 1]! + gap)
  }

  const overflow = centers[centers.length - 1]! - max
  if (overflow > 0) {
    centers[centers.length - 1] = max
    for (let index = centers.length - 2; index >= 0; index -= 1) {
      centers[index] = Math.min(centers[index]!, centers[index + 1]! - gap)
    }
  }

  const underflow = min - centers[0]!
  if (underflow > 0) {
    centers[0] = min
    for (let index = 1; index < centers.length; index += 1) {
      centers[index] = Math.max(centers[index]!, centers[index - 1]! + gap)
    }
  }

  return centers
}

const buildCaptionLayouts = (
  assigned: Array<{ card: BoardCardLayout; side: CaptionSide }>,
  boardRect: { left: number; right: number; top: number; bottom: number },
  captionWidth: number,
  captionHeight: number,
) => {
  const groups = {
    top: [] as Array<{ card: BoardCardLayout; side: CaptionSide }>,
    right: [] as Array<{ card: BoardCardLayout; side: CaptionSide }>,
    bottom: [] as Array<{ card: BoardCardLayout; side: CaptionSide }>,
    left: [] as Array<{ card: BoardCardLayout; side: CaptionSide }>,
  }

  for (const entry of assigned) {
    groups[entry.side].push(entry)
  }

  const captions: BoardCaptionLayout[] = []

  const horizontalRange = {
    min: boardRect.left + captionWidth / 2,
    max: boardRect.right - captionWidth / 2,
  }
  const verticalRange = {
    min: boardRect.top + captionHeight / 2,
    max: boardRect.bottom - captionHeight / 2,
  }

  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const items = groups[side]
    if (items.length === 0) {
      continue
    }

    const isHorizontal = side === 'top' || side === 'bottom'
    const ordered = [...items].sort((left, right) =>
      isHorizontal ? left.card.centerX - right.card.centerX : left.card.centerY - right.card.centerY,
    )
    const targets = ordered.map((entry) => (isHorizontal ? entry.card.centerX : entry.card.centerY))
    const centers = packLaneCenters(
      targets,
      isHorizontal ? horizontalRange.min : verticalRange.min,
      isHorizontal ? horizontalRange.max : verticalRange.max,
      isHorizontal ? captionWidth + CAPTION_GAP_X : captionHeight + CAPTION_GAP_Y,
    )

    ordered.forEach((entry, index) => {
      const centerX =
        side === 'left'
          ? boardRect.left - captionWidth / 2 - CAPTION_OFFSET
          : side === 'right'
            ? boardRect.right + captionWidth / 2 + CAPTION_OFFSET
            : centers[index]!
      const centerY =
        side === 'top'
          ? boardRect.top - captionHeight / 2 - CAPTION_OFFSET
          : side === 'bottom'
            ? boardRect.bottom + captionHeight / 2 + CAPTION_OFFSET
            : centers[index]!
      const rect = buildRect(centerX, centerY, captionWidth, captionHeight)

      captions.push({
        key: entry.card.key,
        side,
        centerX,
        centerY,
        width: captionWidth,
        height: captionHeight,
        rect,
        connectorLength: getCaptionConnectorLength(entry.card, rect, side),
      })
    })
  }

  return captions
}

export const getBoardMetaForSpread = (
  spread: Pick<ResolvedSpreadDefinition, 'layoutId' | 'positions'>,
): BoardMeta => {
  switch (spread.layoutId) {
    case 'single':
      return {
        width: 420,
        height: 540,
        coordinates: [{ key: spread.positions[0]!.key, x: 50, y: 50 }],
      }
    case 'line-3':
      return {
        width: 900,
        height: 520,
        coordinates: spread.positions.map((position, index) => ({
          key: position.key,
          x: 18 + index * 32,
          y: 50,
        })),
      }
    case 'cross-5':
      return {
        width: 900,
        height: 720,
        coordinates: [
          { key: spread.positions[0]!.key, x: 50, y: 50 },
          { key: spread.positions[1]!.key, x: 50, y: 18 },
          { key: spread.positions[2]!.key, x: 18, y: 50 },
          { key: spread.positions[3]!.key, x: 82, y: 50 },
          { key: spread.positions[4]!.key, x: 50, y: 82 },
        ],
      }
    case 'decision-compass':
      return {
        width: 900,
        height: 620,
        coordinates: [
          { key: spread.positions[0]!.key, x: 50, y: 20 },
          { key: spread.positions[1]!.key, x: 20, y: 58, rotation: -4 },
          { key: spread.positions[2]!.key, x: 80, y: 58, rotation: 4 },
          { key: spread.positions[3]!.key, x: 50, y: 80 },
        ],
      }
    case 'relationship-mirror':
      return {
        width: 880,
        height: 620,
        coordinates: [
          { key: spread.positions[0]!.key, x: 28, y: 30 },
          { key: spread.positions[1]!.key, x: 72, y: 30 },
          { key: spread.positions[2]!.key, x: 28, y: 74 },
          { key: spread.positions[3]!.key, x: 72, y: 74 },
        ],
      }
    case 'weekly-flow':
      return {
        width: 1120,
        height: 580,
        coordinates: [
          { key: spread.positions[0]!.key, x: 12, y: 50, rotation: -6 },
          { key: spread.positions[1]!.key, x: 32, y: 32, rotation: -3 },
          { key: spread.positions[2]!.key, x: 52, y: 50 },
          { key: spread.positions[3]!.key, x: 72, y: 32, rotation: 3 },
          { key: spread.positions[4]!.key, x: 88, y: 50, rotation: 6 },
        ],
      }
    case 'celtic-cross':
      return {
        width: 1180,
        height: 940,
        coordinates: [
          { key: spread.positions[0]!.key, x: 24, y: 40 },
          { key: spread.positions[1]!.key, x: 24, y: 40, rotation: 90 },
          { key: spread.positions[2]!.key, x: 24, y: 12 },
          { key: spread.positions[3]!.key, x: 24, y: 68 },
          { key: spread.positions[4]!.key, x: 8, y: 40 },
          { key: spread.positions[5]!.key, x: 40, y: 40 },
          { key: spread.positions[6]!.key, x: 72, y: 14 },
          { key: spread.positions[7]!.key, x: 72, y: 36 },
          { key: spread.positions[8]!.key, x: 72, y: 58 },
          { key: spread.positions[9]!.key, x: 72, y: 80 },
        ],
      }
    case 'zodiac-wheel':
      return {
        width: 1240,
        height: 1240,
        coordinates: spread.positions.map((position, index) => {
          const angle = (Math.PI * 2 * index) / spread.positions.length - Math.PI / 2
          const radius = 36

          return {
            key: position.key,
            x: 50 + Math.cos(angle) * radius,
            y: 50 + Math.sin(angle) * radius,
            rotation: ((index + 1) % 2 === 0 ? -1 : 1) * 4,
          }
        }),
      }
    case 'tree-of-life':
      return {
        width: 1040,
        height: 1280,
        coordinates: [
          { key: spread.positions[0]!.key, x: 50, y: 8 },
          { key: spread.positions[1]!.key, x: 32, y: 22 },
          { key: spread.positions[2]!.key, x: 68, y: 22 },
          { key: spread.positions[3]!.key, x: 24, y: 44 },
          { key: spread.positions[4]!.key, x: 76, y: 44 },
          { key: spread.positions[5]!.key, x: 50, y: 52 },
          { key: spread.positions[6]!.key, x: 28, y: 72 },
          { key: spread.positions[7]!.key, x: 72, y: 72 },
          { key: spread.positions[8]!.key, x: 50, y: 88 },
          { key: spread.positions[9]!.key, x: 50, y: 108 },
        ],
      }
  }
}

export const buildSpreadStageLayout = (
  boardMeta: BoardMeta,
  revealedKeys: string[],
): SpreadStageLayout => {
  const optimized = optimizeCardCoordinates(boardMeta.coordinates, boardMeta.width, boardMeta.height)
  const cardWidth = getCardBaseWidth(boardMeta.width) * optimized.cardScale
  const cardHeight = cardWidth * CARD_ASPECT_RATIO
  const captionWidth = getCaptionWidth(boardMeta.width)
  const captionHeight = getCaptionHeight(boardMeta.width)

  const horizontalGutter = captionWidth + CAPTION_OFFSET * 2
  const verticalGutter = captionHeight + CAPTION_OFFSET * 2
  const boardLeft = horizontalGutter
  const boardTop = verticalGutter
  const boardRect = {
    left: boardLeft,
    right: boardLeft + boardMeta.width,
    top: boardTop,
    bottom: boardTop + boardMeta.height,
  }

  const cards = optimized.coordinates.map((coordinate) => {
    const centerX = boardLeft + (boardMeta.width * coordinate.x) / 100
    const centerY = boardTop + (boardMeta.height * coordinate.y) / 100
    const rotated = getRotatedBounds(cardWidth, cardHeight, coordinate.rotation)

    return {
      ...coordinate,
      centerX,
      centerY,
      width: cardWidth,
      height: cardHeight,
      rect: buildRect(centerX, centerY, rotated.width, rotated.height),
    }
  })

  const revealedCards = cards.filter((card) => revealedKeys.includes(card.key))
  const assigned = assignCaptionSides(revealedCards, boardMeta.width, boardMeta.height, captionWidth, captionHeight)
  const captions = buildCaptionLayouts(assigned, boardRect, captionWidth, captionHeight)

  return {
    stageWidth: boardMeta.width + horizontalGutter * 2,
    stageHeight: boardMeta.height + verticalGutter * 2,
    boardLeft,
    boardTop,
    boardWidth: boardMeta.width,
    boardHeight: boardMeta.height,
    cardScale: optimized.cardScale,
    cards,
    captions,
  }
}

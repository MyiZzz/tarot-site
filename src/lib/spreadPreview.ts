import type { ResolvedSpreadDefinition, SpreadPosition } from '../domain/tarot'

export const getSpreadPreviewPositions = (
  layoutId: ResolvedSpreadDefinition['layoutId'],
  positions: SpreadPosition[],
) => {
  if (layoutId === 'line-3') {
    return positions.map((position, index) => ({
      key: position.key,
      x: 20 + index * 30,
      y: 50,
    }))
  }

  if (layoutId === 'cross-5') {
    const coords = [
      { x: 50, y: 50 },
      { x: 50, y: 18 },
      { x: 18, y: 50 },
      { x: 82, y: 50 },
      { x: 50, y: 82 },
    ]

    return positions.map((position, index) => ({
      key: position.key,
      ...coords[index],
    }))
  }

  return positions.map((position, index) => ({
    key: position.key,
    x: 16 + (index % 4) * 22,
    y: 18 + Math.floor(index / 4) * 22,
  }))
}

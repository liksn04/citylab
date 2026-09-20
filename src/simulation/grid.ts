import type { IntersectionState } from './types'

export function buildGrid(rows: number, cols: number): IntersectionState[] {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 2 || cols < 2) {
    throw new Error('Grid must be at least 2×2 with integer dimensions')
  }
  const nodes: IntersectionState[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const targetPhase = (row + col) % 2 === 0 ? 'NS' : 'EW'
      nodes.push({
        id: `I-${row}-${col}`,
        row,
        col,
        phase: targetPhase,
        targetPhase,
        phaseElapsedSec: 0,
      })
    }
  }
  return nodes
}

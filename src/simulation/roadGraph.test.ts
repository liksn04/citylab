import { describe, expect, it } from 'vitest'
import { buildRoadGraph, edgeId, nodeId } from './roadGraph'

describe('buildRoadGraph', () => {
  const g = buildRoadGraph(4, 4)

  it('creates one node per intersection', () => {
    expect(g.nodes).toHaveLength(16)
    expect(g.nodeById.get('I-0-0')).toEqual({ id: 'I-0-0', row: 0, col: 0 })
    expect(g.nodeById.get('I-3-3')).toEqual({ id: 'I-3-3', row: 3, col: 3 })
  })

  it('creates two directed edges for every adjacency', () => {
    // horizontal: 2 * rows * (cols-1); vertical: 2 * cols * (rows-1)
    const expected = 2 * 4 * 3 + 2 * 4 * 3
    expect(g.edges).toHaveLength(expected) // 48
  })

  it('pairs every edge with its opposite direction', () => {
    for (const e of g.edges) {
      expect(g.edgeById.has(edgeId(e.to, e.from))).toBe(true)
    }
  })

  it('assigns axis from heading consistently', () => {
    for (const e of g.edges) {
      const expectedAxis = e.heading === 'N' || e.heading === 'S' ? 'NS' : 'EW'
      expect(e.axis).toBe(expectedAxis)
    }
  })

  it('gives corner nodes 2 exits and interior nodes 4', () => {
    expect(g.outgoing.get(nodeId(0, 0))).toHaveLength(2)
    expect(g.outgoing.get(nodeId(3, 3))).toHaveLength(2)
    expect(g.outgoing.get(nodeId(1, 1))).toHaveLength(4)
  })

  it('orders outgoing edges canonically (N, E, S, W)', () => {
    const center = g.outgoing.get(nodeId(1, 1))!
    expect(center.map((e) => e.heading)).toEqual(['N', 'E', 'S', 'W'])
    expect(center.map((e) => e.to)).toEqual(['I-0-1', 'I-1-2', 'I-2-1', 'I-1-0'])
  })

  it('never emits an edge that leaves the grid', () => {
    for (const e of g.edges) {
      const to = g.nodeById.get(e.to)!
      expect(to.row).toBeGreaterThanOrEqual(0)
      expect(to.row).toBeLessThan(4)
      expect(to.col).toBeGreaterThanOrEqual(0)
      expect(to.col).toBeLessThan(4)
      // edges connect strictly adjacent cells (Manhattan distance 1)
      const from = g.nodeById.get(e.from)!
      expect(Math.abs(from.row - to.row) + Math.abs(from.col - to.col)).toBe(1)
    }
  })

  it('rejects degenerate grids', () => {
    expect(() => buildRoadGraph(1, 4)).toThrow()
  })
})

import type { Axis, Heading, RoadEdge, RoadGraph, RoadNode } from './types'

/** Canonical id for an intersection at (row, col). */
export function nodeId(row: number, col: number): string {
  return `I-${row}-${col}`
}

/** Canonical id for the directed edge from one node to another. */
export function edgeId(from: string, to: string): string {
  return `E-${from}-${to}`
}

/** Canonical order used for outgoing edges and routing tie-breaks. */
const HEADING_ORDER: Heading[] = ['N', 'E', 'S', 'W']

interface Neighbor {
  row: number
  col: number
  heading: Heading
  axis: Axis
}

function neighbors(row: number, col: number): Neighbor[] {
  return [
    { row: row - 1, col, heading: 'N', axis: 'NS' },
    { row, col: col + 1, heading: 'E', axis: 'EW' },
    { row: row + 1, col, heading: 'S', axis: 'NS' },
    { row, col: col - 1, heading: 'W', axis: 'EW' },
  ]
}

/**
 * Build a directed grid road graph. Every pair of adjacent intersections is
 * connected by two directed edges (one each way). Outgoing edges are stored in
 * canonical heading order (N, E, S, W) so downstream routing is deterministic.
 */
export function buildRoadGraph(rows: number, cols: number): RoadGraph {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 2 || cols < 2) {
    throw new Error('Road graph must be at least 2×2 with integer dimensions')
  }

  const nodes: RoadNode[] = []
  const nodeById = new Map<string, RoadNode>()
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const node: RoadNode = { id: nodeId(row, col), row, col }
      nodes.push(node)
      nodeById.set(node.id, node)
    }
  }

  const edges: RoadEdge[] = []
  const edgeById = new Map<string, RoadEdge>()
  const outgoing = new Map<string, RoadEdge[]>()

  for (const node of nodes) {
    const out: RoadEdge[] = []
    for (const heading of HEADING_ORDER) {
      const n = neighbors(node.row, node.col).find((cand) => cand.heading === heading)!
      if (n.row < 0 || n.row >= rows || n.col < 0 || n.col >= cols) continue
      const toId = nodeId(n.row, n.col)
      const edge: RoadEdge = {
        id: edgeId(node.id, toId),
        from: node.id,
        to: toId,
        axis: n.axis,
        heading,
      }
      edges.push(edge)
      edgeById.set(edge.id, edge)
      out.push(edge)
    }
    outgoing.set(node.id, out)
  }

  return { rows, cols, nodes, edges, nodeById, edgeById, outgoing }
}

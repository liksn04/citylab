import type { RoadEdge, RoadGraph } from './types'

/**
 * Deterministic shortest-path router. Every edge has equal length, so a
 * breadth-first search yields a minimum-edge (therefore minimum-distance) route.
 * Ties are broken by the graph's canonical outgoing edge order (N, E, S, W),
 * so the same origin/destination always produces the same route.
 *
 * Returns the ordered list of directed edges from origin to destination.
 * An origin equal to the destination yields an empty route. Throws if the
 * destination is unreachable (never happens on a connected grid).
 */
export function findRoute(graph: RoadGraph, originId: string, destId: string): RoadEdge[] {
  if (!graph.nodeById.has(originId)) throw new Error(`Unknown origin node: ${originId}`)
  if (!graph.nodeById.has(destId)) throw new Error(`Unknown destination node: ${destId}`)
  if (originId === destId) return []

  const predecessor = new Map<string, RoadEdge>()
  const visited = new Set<string>([originId])
  const queue: string[] = [originId]
  let head = 0

  while (head < queue.length) {
    const current = queue[head++]!
    if (current === destId) break
    for (const edge of graph.outgoing.get(current) ?? []) {
      if (visited.has(edge.to)) continue
      visited.add(edge.to)
      predecessor.set(edge.to, edge)
      queue.push(edge.to)
    }
  }

  if (!predecessor.has(destId)) throw new Error(`No route from ${originId} to ${destId}`)

  const route: RoadEdge[] = []
  let cursor = destId
  while (cursor !== originId) {
    const edge = predecessor.get(cursor)!
    route.push(edge)
    cursor = edge.from
  }
  route.reverse()
  return route
}

/**
 * True when `route` is a legal, contiguous path from origin to destination: every
 * edge exists in the graph, each edge starts where the previous one ended, and
 * the endpoints match. Used to guarantee no vehicle ever traverses an illegal edge.
 */
export function isLegalRoute(graph: RoadGraph, originId: string, destId: string, route: readonly RoadEdge[]): boolean {
  if (route.length === 0) return originId === destId
  if (route[0]!.from !== originId) return false
  if (route[route.length - 1]!.to !== destId) return false
  for (let i = 0; i < route.length; i += 1) {
    const edge = route[i]!
    if (graph.edgeById.get(edge.id) !== edge) return false
    if (i > 0 && route[i - 1]!.to !== edge.from) return false
  }
  return true
}

import type { Axis, Heading, RoadEdge, RoadGraph } from './types'

/**
 * Lane pressure for Max Pressure control (M2.2, D-009). Pure topology + queue
 * arithmetic: pressure is computed from the road graph and a per-edge queue
 * count, independent of vehicle internals or routing, so it is deterministic and
 * hand-fixturable. The MaxPressure *decision* (which axis to serve) is M2.3;
 * this module only defines the signal, tuning nothing.
 */

/** One approach into an intersection and the straight-through edge it discharges to. */
export interface ApproachMovement {
  /** Approach edge id (its `to` is the intersection). */
  approachId: string
  axis: Axis
  /** Straight-through outgoing edge id (same heading), or null at the grid boundary. */
  continuationId: string | null
}

export interface AxisPressure {
  NS: number
  EW: number
}

/**
 * Precompute, per intersection, its approach movements and their straight
 * continuations. The graph is static, so this is built once and reused every
 * decision tick. Movements are sorted by approach id for deterministic order.
 */
export function buildApproachIndex(graph: RoadGraph): Map<string, ApproachMovement[]> {
  const incoming = new Map<string, RoadEdge[]>()
  for (const e of graph.edges) {
    const list = incoming.get(e.to)
    if (list) list.push(e)
    else incoming.set(e.to, [e])
  }

  const index = new Map<string, ApproachMovement[]>()
  for (const node of graph.nodes) {
    const byHeading = new Map<Heading, RoadEdge>()
    for (const out of graph.outgoing.get(node.id) ?? []) byHeading.set(out.heading, out)

    const movements: ApproachMovement[] = (incoming.get(node.id) ?? []).map((e) => ({
      approachId: e.id,
      axis: e.axis,
      continuationId: byHeading.get(e.heading)?.id ?? null,
    }))
    movements.sort((a, b) => (a.approachId < b.approachId ? -1 : a.approachId > b.approachId ? 1 : 0))
    index.set(node.id, movements)
  }
  return index
}

/**
 * Pressure per axis for one intersection: sum over that axis's approaches of
 * (upstream queue − downstream straight-continuation queue). A missing edge in
 * `queueByEdge` counts as 0; a boundary approach (null continuation) contributes
 * its upstream queue only.
 */
export function pressureByAxis(
  movements: readonly ApproachMovement[],
  queueByEdge: ReadonlyMap<string, number>,
): AxisPressure {
  const pressure: AxisPressure = { NS: 0, EW: 0 }
  for (const m of movements) {
    const upstream = queueByEdge.get(m.approachId) ?? 0
    const downstream = m.continuationId ? queueByEdge.get(m.continuationId) ?? 0 : 0
    pressure[m.axis] += upstream - downstream
  }
  return pressure
}

/** Axis pressure for every intersection in the graph. */
export function computePressure(
  index: ReadonlyMap<string, ApproachMovement[]>,
  queueByEdge: ReadonlyMap<string, number>,
): Map<string, AxisPressure> {
  const out = new Map<string, AxisPressure>()
  for (const [id, movements] of index) out.set(id, pressureByAxis(movements, queueByEdge))
  return out
}

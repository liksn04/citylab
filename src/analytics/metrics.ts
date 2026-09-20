import { EDGE_LENGTH_M, QUEUE_ZONE_M } from '../simulation/constants'
import { currentEdge, type Vehicle } from '../simulation/vehicle'

/**
 * Aggregate metric definitions. Per docs/ARCHITECTURE.md these live only here;
 * UI and engine code must not recompute them. Meanings are pinned in
 * docs/DATA_CONTRACTS.md and versioned by METRIC_VERSION.
 */

/**
 * Queue membership (docs/DATA_CONTRACTS.md — Q2): a vehicle counts toward its
 * approach edge's queue when it is stopped this tick (status QUEUED) and within
 * QUEUE_ZONE_M of the stop line. CROSSING/MOVING vehicles never count.
 */
export function isQueued(v: Vehicle): boolean {
  if (v.status !== 'QUEUED') return false
  return v.posOnEdge >= EDGE_LENGTH_M - QUEUE_ZONE_M
}

/** Queue length per approach edge for a single snapshot of the vehicle population. */
export function queueLengthsByEdge(vehicles: Iterable<Vehicle>): Map<string, number> {
  const counts = new Map<string, number>()
  for (const v of vehicles) {
    if (!isQueued(v)) continue
    const edge = currentEdge(v)
    if (!edge) continue
    counts.set(edge.id, (counts.get(edge.id) ?? 0) + 1)
  }
  return counts
}

/** Largest single-edge queue in this snapshot. The engine tracks the run-wide max. */
export function maxQueueSnapshot(vehicles: Iterable<Vehicle>): number {
  let max = 0
  for (const n of queueLengthsByEdge(vehicles).values()) if (n > max) max = n
  return max
}

/** Mean of completed-trip waiting times (0 when no trips completed). */
export function avgWaitingTimeSec(waits: readonly number[]): number {
  if (waits.length === 0) return 0
  let sum = 0
  for (const w of waits) sum += w
  return sum / waits.length
}

/**
 * 95th percentile of completed-trip waiting times using the nearest-rank method
 * (0 when no trips completed). Surfaces tail starvation that the mean hides (R2).
 */
export function p95WaitingTimeSec(waits: readonly number[]): number {
  if (waits.length === 0) return 0
  const sorted = [...waits].sort((a, b) => a - b)
  const rank = Math.ceil(0.95 * sorted.length) // 1-indexed nearest rank
  return sorted[rank - 1]!
}

import type { ApproachMovement } from '../simulation/pressure'

/**
 * Shared-DQN reward (M4.3, D-017). A per-intersection local reward: the negative
 * sum of the Q2 approach queues entering the intersection. Fewer stopped, waiting
 * vehicles → a reward closer to zero, so maximizing it minimizes waiting and
 * queue length, the MVP's primary metrics.
 *
 * Pure topology + queue arithmetic that reuses the same approach index and
 * per-edge queue map already computed each tick for lane pressure (D-009), so it
 * is deterministic and hand-fixturable. It is a learning signal, not a reported
 * metric (metricVersion-independent, like observation/pressure). Any reward
 * scaling/clipping is a training hyperparameter (M4.6), separate from this
 * definition.
 */

/**
 * Reward for one intersection: `−Σ queue(approach)` over its approach edges.
 * A missing edge in `queueByEdge` counts as 0. Always ≤ 0.
 */
export function queueReward(
  movements: readonly ApproachMovement[],
  queueByEdge: ReadonlyMap<string, number>,
): number {
  let total = 0
  for (const m of movements) total += queueByEdge.get(m.approachId) ?? 0
  return total === 0 ? 0 : -total // avoid negative zero for an empty/queue-free intersection
}

/** Per-intersection reward for every intersection in the graph (mirrors computePressure). */
export function computeQueueRewards(
  index: ReadonlyMap<string, ApproachMovement[]>,
  queueByEdge: ReadonlyMap<string, number>,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const [id, movements] of index) out.set(id, queueReward(movements, queueByEdge))
  return out
}

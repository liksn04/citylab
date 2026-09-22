import type { RandomSource } from '../simulation/seededRandom'
import { ACTION_SIZE } from './action'

/**
 * Epsilon-greedy exploration for the shared DQN (M4.5). Pure and deterministic:
 * the schedule is a function of the step, and action selection is a function of
 * the Q-row and a seeded `RandomSource`. These are training hyperparameters, not
 * reward/metric semantics — no metricVersion impact.
 */

export interface EpsilonSchedule {
  /** Exploration rate at step 0. */
  start: number
  /** Floor exploration rate reached at (and past) `decaySteps`. */
  end: number
  /** Number of steps to linearly anneal from `start` to `end`. */
  decaySteps: number
}

/** Default annealing: fully exploratory → 5% floor over 10k steps (tunable). */
export const DEFAULT_EPSILON_SCHEDULE: EpsilonSchedule = { start: 1, end: 0.05, decaySteps: 10_000 }

/**
 * Linear epsilon anneal: `start` at step 0, `end` at/after `decaySteps`,
 * monotonically non-increasing in between. A negative step clamps to `start`.
 */
export function epsilonAt(step: number, schedule: EpsilonSchedule = DEFAULT_EPSILON_SCHEDULE): number {
  const { start, end, decaySteps } = schedule
  if (step <= 0 || decaySteps <= 0) return start
  const t = Math.min(step / decaySteps, 1)
  return start + (end - start) * t
}

/** Greedy action = argmax Q with a deterministic lowest-index tie-break. */
export function greedyAction(qRow: readonly number[]): number {
  if (qRow.length === 0) throw new Error('greedyAction requires a non-empty Q-row')
  let best = 0
  for (let i = 1; i < qRow.length; i += 1) {
    if (qRow[i]! > qRow[best]!) best = i
  }
  return best
}

/**
 * Pick an action index: explore a uniform random action with probability
 * `epsilon`, otherwise exploit the greedy action. Deterministic for a given
 * `RandomSource` — the explore roll is drawn first so the RNG stream is stable.
 */
export function epsilonGreedyAction(
  qRow: readonly number[],
  epsilon: number,
  rng: RandomSource,
): number {
  const explore = rng.next() < epsilon
  if (explore) return rng.int(0, ACTION_SIZE)
  return greedyAction(qRow)
}

import type { LayersModel } from '@tensorflow/tfjs'
import type { RandomSource } from '../simulation/seededRandom'
import type { Policy } from './DqnController'
import { epsilonAt, epsilonGreedyAction, greedyAction, type EpsilonSchedule } from './epsilon'
import { predictQValues } from './qNetwork'

/**
 * Policies over a Q-network for the DqnController seam (M4.9). `greedyPolicy` is
 * the evaluation policy (argmax Q, no exploration). `epsilonGreedyPolicy` is the
 * training policy: it anneals epsilon over a step counter it increments per
 * action, so exploration decays across a whole training run, and it is
 * deterministic for a given `RandomSource`.
 */

/** Evaluation policy: always exploit the greedy (argmax Q) action. */
export function greedyPolicy(model: LayersModel): Policy {
  return (obs) => greedyAction(predictQValues(model, [obs])[0]!)
}

/**
 * Training policy: epsilon-greedy with `epsilonAt(step, schedule)`, incrementing
 * `step` on every action so epsilon decays across the run. `startStep` seeds the
 * counter (default 0).
 */
export function epsilonGreedyPolicy(
  model: LayersModel,
  schedule: EpsilonSchedule,
  rng: RandomSource,
  startStep = 0,
): Policy {
  let step = startStep
  return (obs) => {
    const eps = epsilonAt(step, schedule)
    step += 1
    return epsilonGreedyAction(predictQValues(model, [obs])[0]!, eps, rng)
  }
}

import type { Controller, ObservationInput, SignalIntent } from '../controllers/Controller'
import { actionToIntent } from './action'
import { encodeObservation } from './observation'

/**
 * A greedy policy over an encoded observation: it takes the length-
 * `OBSERVATION_SIZE` vector (M4.1) and returns an action index in
 * `[0, ACTION_SIZE)`. This is the injectable seam — before training it can be any
 * deterministic stub; later slices back it with a TensorFlow.js model
 * (M4.6/M4.8). No tensors or training live behind this type here.
 */
export type Policy = (observation: number[]) => number

/**
 * Shared-DQN action adapter (M4.2, D-016). It drives a learned policy through the
 * same `Controller` contract as Fixed and Max Pressure, so the environment can
 * run it and experiments can compare it under common random numbers (D-006).
 *
 * `decide` encodes the observation (M4.1), asks the injected policy for an action,
 * and maps that action to a HOLD|SWITCH intent. Safety (min-green + yellow) stays
 * environment-owned via `applySignalIntent`: even a policy that always requests
 * SWITCH cannot switch before min-green or skip yellow, and this controller never
 * sets a colour (D-008). No training or tensors live here — the policy is injected.
 */
export class DqnController implements Controller<ObservationInput> {
  readonly id: string
  private readonly policy: Policy

  constructor(policy: Policy, id = 'dqn-v1') {
    this.policy = policy
    this.id = id
  }

  observe(input: ObservationInput): ObservationInput {
    // The DQN needs the full input (timing + pressure) to encode at decide time.
    return input
  }

  decide(obs: ObservationInput): SignalIntent {
    // The environment never consults a controller during yellow; guard anyway so
    // encodeObservation (green-only) is never fed a YELLOW state.
    if (obs.activeAxis === null) return 'HOLD'
    return actionToIntent(this.policy(encodeObservation(obs)))
  }
}

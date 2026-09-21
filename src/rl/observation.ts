import type { ObservationInput } from '../controllers/Controller'
import type { Axis } from '../simulation/types'
import { EDGE_CAPACITY, FIXED_GREEN_SEC } from '../simulation/constants'

/**
 * Shared-DQN observation encoding (M4.1, D-015). A pure normalizer that turns the
 * environment's per-intersection `ObservationInput` (base timing + lane pressure —
 * the same input every controller receives on a green decision tick, D-008) into
 * a fixed-length numeric vector a single shared policy network consumes
 * identically for every intersection (D-002).
 *
 * The encoding is framed relative to the *currently green* axis, not absolute
 * NS/EW: with a HOLD|SWITCH action on a symmetric two-phase signal, the same
 * "current vs other" situation must encode identically whether NS or EW is green.
 * No training here — this only defines what the agent sees.
 *
 * Scales are derived from the single source of truth (`simulation/constants.ts`),
 * never hard-coded. Dependency direction stays legal: rl → controller contract
 * (the `ObservationInput` type) and rl reads simulation constants (docs/ARCHITECTURE.md).
 */

/** Lane-pressure scale for tanh squashing: one fully jammed approach (D-015). */
export const PRESSURE_OBS_SCALE = EDGE_CAPACITY

/** Phase-time scale for phaseProgress: one nominal green (D-015). */
export const PHASE_TIME_OBS_SCALE = FIXED_GREEN_SEC

/**
 * Feature order of the encoded observation vector. The shared network depends on
 * this order, so changing it changes what every trained model sees (bump D-015).
 */
export const OBSERVATION_FEATURES = [
  'pressureCurrent',
  'pressureOther',
  'phaseProgress',
  'minGreenSatisfied',
] as const

/** Length of the shared observation vector. */
export const OBSERVATION_SIZE = OBSERVATION_FEATURES.length

function clamp01(x: number): number {
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function opposite(axis: Axis): Axis {
  return axis === 'NS' ? 'EW' : 'NS'
}

/**
 * Encode a *green* per-intersection observation into the shared, normalized
 * vector (length {@link OBSERVATION_SIZE}, order {@link OBSERVATION_FEATURES}).
 * Pure and deterministic. Every component is finite and bounded: the pressure
 * features to [−1, 1] via tanh (saturating to ±1 in float64 at large magnitude),
 * `phaseProgress` to [0, 1], `minGreenSatisfied` to {0, 1}.
 *
 * @throws if the observation is YELLOW (`activeAxis === null`). A controller is
 * never consulted during yellow (D-008), so decisions — and stored transitions —
 * only ever occur on green; a yellow state has no defined current/other frame.
 */
export function encodeObservation(input: ObservationInput): number[] {
  const current = input.activeAxis
  if (current === null) {
    throw new Error(
      `encodeObservation requires a green observation (activeAxis != null); got YELLOW at ${input.id}`,
    )
  }
  const other = opposite(current)
  return [
    Math.tanh(input.pressure[current] / PRESSURE_OBS_SCALE),
    Math.tanh(input.pressure[other] / PRESSURE_OBS_SCALE),
    clamp01(input.phaseElapsedSec / PHASE_TIME_OBS_SCALE),
    input.minGreenSatisfied ? 1 : 0,
  ]
}

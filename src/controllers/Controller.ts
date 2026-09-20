import type { Axis, SignalPhase } from '../simulation/types'

/** A controller's only lever over a signal: keep the current green, or request a switch. */
export type SignalIntent = 'HOLD' | 'SWITCH'

/**
 * Raw per-intersection state the environment hands a controller at a decision
 * point. The environment computes these; a controller never reads simulation
 * internals directly. `minGreenSatisfied` is environment-owned truth — even a
 * SWITCH intent is ignored until it holds, because safety is enforced by the
 * environment, never trusted to the agent (docs/DATA_CONTRACTS.md Q4, D-008).
 *
 * `phaseElapsedSec` is the time in the current phase *after* the environment has
 * advanced the tick, so a controller's decision uses the same clock the
 * transition machine (`applySignalIntent`) does.
 */
export interface SignalObservationInput {
  id: string
  phase: SignalPhase
  /** The green axis, or null while the phase is YELLOW. */
  activeAxis: Axis | null
  phaseElapsedSec: number
  minGreenSatisfied: boolean
}

/** Base observation shared by every controller. Specific controllers may extend it. */
export type IntersectionObservation = SignalObservationInput

/**
 * A signal control policy. Fixed and Max Pressure (and later the shared DQN)
 * all satisfy this one contract, so the environment can drive any of them and
 * experiments can compare them under common random numbers (D-006).
 *
 * The environment consults a controller only for a green phase and applies its
 * intent through the environment-enforced transition machine (min-green +
 * yellow). Controllers never set a signal colour directly (D-008).
 */
export interface Controller<Obs extends IntersectionObservation = IntersectionObservation> {
  readonly id: string
  /** Project raw environment inputs into this controller's observation. */
  observe(input: SignalObservationInput): Obs
  /** Emit an intent from an observation. Must be pure and deterministic. */
  decide(obs: Obs): SignalIntent
}

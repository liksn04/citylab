import type { SignalIntent, SignalObservationInput } from '../controllers/Controller'
import type { Axis, IntersectionState } from './types'

export interface EnvSignalConfig {
  /** Minimum green duration before any switch is honoured (seconds). */
  minGreenSec: number
  /** Fixed yellow duration inserted on every switch (seconds). */
  yellowSec: number
}

export interface SignalStepResult {
  state: IntersectionState
  /** True when this step turned a green phase into YELLOW (a controller-driven switch). */
  didSwitch: boolean
}

function opposite(axis: Axis): Axis {
  return axis === 'NS' ? 'EW' : 'NS'
}

/**
 * Build the observation input the environment hands a controller for the current
 * tick. `phaseElapsedSec` is the post-advance clock, matching what
 * {@link applySignalIntent} uses, so a controller decides on the same time the
 * transition applies. This is the seam the engine reuses when it drives a
 * {@link Controller} (M2.3).
 */
export function buildObservationInput(
  state: IntersectionState,
  dtSec: number,
  config: EnvSignalConfig,
): SignalObservationInput {
  const elapsed = state.phaseElapsedSec + dtSec
  return {
    id: state.id,
    phase: state.phase,
    activeAxis: state.phase === 'YELLOW' ? null : state.phase,
    phaseElapsedSec: elapsed,
    minGreenSatisfied: elapsed >= config.minGreenSec,
  }
}

/**
 * Environment-enforced signal transition (M2, D-008). Advances one intersection
 * by one tick given the controller's intent. The environment — not the
 * controller — owns safety:
 *
 * - a SWITCH is ignored until min-green is satisfied,
 * - every switch passes through a full `yellowSec` yellow,
 * - the controller is never consulted during yellow.
 *
 * Configs are expected to be whole multiples of `TICK_SEC`; a fresh phase starts
 * at `phaseElapsedSec = 0`, which equals the legacy carryover exactly when
 * thresholds land on a tick boundary (docs/DATA_CONTRACTS.md — Time).
 */
export function applySignalIntent(
  state: IntersectionState,
  dtSec: number,
  intent: SignalIntent,
  config: EnvSignalConfig,
): SignalStepResult {
  const elapsed = state.phaseElapsedSec + dtSec

  if (state.phase === 'YELLOW') {
    if (elapsed >= config.yellowSec) {
      // Yellow completes into the pre-committed target green.
      return {
        state: { ...state, phase: state.targetPhase, phaseElapsedSec: 0 },
        didSwitch: false,
      }
    }
    return { state: { ...state, phaseElapsedSec: elapsed }, didSwitch: false }
  }

  // Green: consult the controller's intent, but honour a switch only past min-green.
  if (intent === 'SWITCH' && elapsed >= config.minGreenSec) {
    const next = opposite(state.phase)
    return {
      state: { ...state, phase: 'YELLOW', targetPhase: next, phaseElapsedSec: 0 },
      didSwitch: true,
    }
  }
  return { state: { ...state, phaseElapsedSec: elapsed }, didSwitch: false }
}

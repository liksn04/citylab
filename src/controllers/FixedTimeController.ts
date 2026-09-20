import type { Axis, SignalPhase } from '../simulation/types'
import type { Controller, IntersectionObservation, SignalIntent, SignalObservationInput } from './Controller'

export interface FixedSignalState {
  phase: SignalPhase
  targetPhase: Axis
  phaseElapsedSec: number
}

export interface FixedControllerConfig {
  greenSec: number
  yellowSec: number
}

const DEFAULT_CONFIG: FixedControllerConfig = { greenSec: 20, yellowSec: 3 }

export function stepFixedSignal(state: FixedSignalState, dt: number, config = DEFAULT_CONFIG): FixedSignalState {
  const elapsed = state.phaseElapsedSec + dt

  if (state.phase === 'YELLOW') {
    if (elapsed >= config.yellowSec) {
      return { phase: state.targetPhase, targetPhase: state.targetPhase, phaseElapsedSec: elapsed - config.yellowSec }
    }
    return { ...state, phaseElapsedSec: elapsed }
  }

  if (elapsed >= config.greenSec) {
    const next: Axis = state.phase === 'NS' ? 'EW' : 'NS'
    return { phase: 'YELLOW', targetPhase: next, phaseElapsedSec: elapsed - config.greenSec }
  }

  return { ...state, phaseElapsedSec: elapsed }
}

/**
 * Fixed-time policy expressed as a {@link Controller} (M2.1). It ignores traffic
 * and requests a SWITCH once the green phase has run for `greenSec`; the
 * environment enforces min-green and the yellow transition (`applySignalIntent`).
 *
 * For tick-aligned configs this is behaviourally identical to `stepFixedSignal`
 * — locked by an equivalence test — so wiring the engine through this controller
 * would leave the M1 golden baseline unchanged. Yellow duration is owned by the
 * environment now, so this controller only needs `greenSec`.
 */
export class FixedTimeController implements Controller {
  readonly id: string
  private readonly greenSec: number

  constructor(config: Partial<Pick<FixedControllerConfig, 'greenSec'>> = {}, id = 'fixed-v1') {
    this.greenSec = config.greenSec ?? DEFAULT_CONFIG.greenSec
    this.id = id
  }

  observe(input: SignalObservationInput): IntersectionObservation {
    // Fixed time is blind to traffic; it needs nothing beyond the base observation.
    return input
  }

  decide(obs: IntersectionObservation): SignalIntent {
    if (obs.phase === 'YELLOW') return 'HOLD'
    return obs.phaseElapsedSec >= this.greenSec ? 'SWITCH' : 'HOLD'
  }
}

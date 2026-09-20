import type { Axis, SignalPhase } from '../simulation/types'

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

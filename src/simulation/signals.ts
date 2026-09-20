import type { Axis, SignalPhase } from './types'

/**
 * Environment-enforced signal safety gate.
 *
 * A vehicle may begin crossing an intersection only when the phase is green for
 * the vehicle's approach axis. YELLOW matches neither axis, so no new entry is
 * ever permitted during yellow (docs/DATA_CONTRACTS.md — Signal safety). The
 * controller never grants entry directly; the environment does, through this gate.
 */
export function signalAllowsEntry(phase: SignalPhase, approachAxis: Axis): boolean {
  return phase === approachAxis
}

export function isYellow(phase: SignalPhase): boolean {
  return phase === 'YELLOW'
}

/**
 * True when a step turned a green phase into YELLOW — i.e. a controller-driven
 * phase switch occurred. Used to count `signalSwitches`.
 */
export function causedSwitch(before: SignalPhase, after: SignalPhase): boolean {
  return before !== 'YELLOW' && after === 'YELLOW'
}

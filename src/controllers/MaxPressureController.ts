import type { Axis } from '../simulation/types'
import type { Controller, ObservationInput, SignalIntent } from './Controller'

/**
 * Max Pressure controller (M2.3). Serves the axis with the greater lane pressure
 * (D-009). It requests a SWITCH only when the opposite axis is *strictly* higher
 * pressure than the axis currently green; ties and lower pressure HOLD. That
 * deterministic, HOLD-first tie-break avoids gratuitous switching, and the
 * environment still enforces min-green + yellow (`applySignalIntent`), so this
 * controller only expresses a preference — it never sets a colour (D-008).
 *
 * This is a learning-free adaptive baseline: it is NOT assumed to beat Fixed;
 * results are recorded as measured (M2 exit criteria, R2).
 */
export class MaxPressureController implements Controller<ObservationInput> {
  readonly id: string

  constructor(id = 'maxpressure-v1') {
    this.id = id
  }

  observe(input: ObservationInput): ObservationInput {
    // Max Pressure needs the base timing and the pressure signal — the full input.
    return input
  }

  decide(obs: ObservationInput): SignalIntent {
    // The environment never consults a controller during yellow, but guard anyway.
    if (obs.activeAxis === null) return 'HOLD'
    const current: Axis = obs.activeAxis
    const other: Axis = current === 'NS' ? 'EW' : 'NS'
    return obs.pressure[other] > obs.pressure[current] ? 'SWITCH' : 'HOLD'
  }
}

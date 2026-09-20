import { describe, expect, it } from 'vitest'
import type { ObservationInput } from './Controller'
import { MaxPressureController } from './MaxPressureController'
import { MIN_GREEN_SEC, TICK_SEC, YELLOW_SEC } from '../simulation/constants'
import { applySignalIntent, type EnvSignalConfig } from '../simulation/signalMachine'
import type { IntersectionState } from '../simulation/types'

function obs(partial: Partial<ObservationInput>): ObservationInput {
  return {
    id: 'I-1-1',
    phase: 'NS',
    activeAxis: 'NS',
    phaseElapsedSec: 10,
    minGreenSatisfied: true,
    pressure: { NS: 0, EW: 0 },
    ...partial,
  }
}

describe('MaxPressureController.decide (M2.3, D-009)', () => {
  const c = new MaxPressureController()

  it('switches only when the opposite axis has strictly greater pressure', () => {
    expect(c.decide(obs({ activeAxis: 'NS', pressure: { NS: 2, EW: 5 } }))).toBe('SWITCH')
    expect(c.decide(obs({ activeAxis: 'EW', pressure: { NS: 7, EW: 3 } }))).toBe('SWITCH')
  })

  it('holds on a tie (deterministic HOLD-first tie-break)', () => {
    expect(c.decide(obs({ activeAxis: 'NS', pressure: { NS: 4, EW: 4 } }))).toBe('HOLD')
  })

  it('holds when the current axis is already the higher-pressure axis', () => {
    expect(c.decide(obs({ activeAxis: 'NS', pressure: { NS: 6, EW: 1 } }))).toBe('HOLD')
    expect(c.decide(obs({ activeAxis: 'EW', pressure: { NS: 1, EW: 6 } }))).toBe('HOLD')
  })

  it('holds during yellow (no active axis)', () => {
    expect(c.decide(obs({ phase: 'YELLOW', activeAxis: null, pressure: { NS: 0, EW: 9 } }))).toBe('HOLD')
  })

  it('is deterministic for the same observation', () => {
    const o = obs({ activeAxis: 'NS', pressure: { NS: 1, EW: 9 } })
    expect(c.decide(o)).toBe(c.decide(o))
  })

  it('exposes a stable id and passes pressure through observe', () => {
    expect(c.id).toBe('maxpressure-v1')
    const o = obs({ pressure: { NS: 3, EW: 8 } })
    expect(c.observe(o)).toEqual(o)
  })
})

describe('MaxPressure switch is gated by environment min-green (M2.4)', () => {
  it('cannot switch faster than min-green even when it always wants to', () => {
    const env: EnvSignalConfig = { minGreenSec: MIN_GREEN_SEC, yellowSec: YELLOW_SEC }
    const c = new MaxPressureController()
    let state: IntersectionState = { id: 'I-1-1', row: 1, col: 1, phase: 'NS', targetPhase: 'NS', phaseElapsedSec: 0 }
    // EW pressure always dominates, so the controller emits SWITCH every green tick.
    const dominatingEW = { NS: 0, EW: 10 }

    const minGreenTicks = MIN_GREEN_SEC / TICK_SEC // 10 ticks at 0.5s
    for (let i = 0; i < minGreenTicks - 1; i += 1) {
      const input: ObservationInput = {
        id: state.id,
        phase: state.phase,
        activeAxis: state.phase === 'YELLOW' ? null : state.phase,
        phaseElapsedSec: state.phaseElapsedSec + TICK_SEC,
        minGreenSatisfied: state.phaseElapsedSec + TICK_SEC >= env.minGreenSec,
        pressure: dominatingEW,
      }
      const intent = state.phase === 'YELLOW' ? 'HOLD' : c.decide(c.observe(input))
      const r = applySignalIntent(state, TICK_SEC, intent, env)
      // Every attempted switch before min-green is ignored: still green NS.
      expect(r.state.phase).toBe('NS')
      expect(r.didSwitch).toBe(false)
      state = r.state
    }

    // The tick that reaches min-green finally honours the switch.
    const finalInput: ObservationInput = {
      id: state.id,
      phase: state.phase,
      activeAxis: 'NS',
      phaseElapsedSec: state.phaseElapsedSec + TICK_SEC,
      minGreenSatisfied: true,
      pressure: dominatingEW,
    }
    const r = applySignalIntent(state, TICK_SEC, c.decide(c.observe(finalInput)), env)
    expect(r.state.phase).toBe('YELLOW')
    expect(r.state.targetPhase).toBe('EW')
    expect(r.didSwitch).toBe(true)
  })
})

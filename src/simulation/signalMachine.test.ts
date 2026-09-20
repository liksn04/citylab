import { describe, expect, it } from 'vitest'
import { FixedTimeController, stepFixedSignal, type FixedSignalState } from '../controllers/FixedTimeController'
import { TICK_SEC } from './constants'
import { applySignalIntent, buildObservationInput, type EnvSignalConfig } from './signalMachine'
import { signalAllowsEntry } from './signals'
import type { IntersectionState, SignalPhase } from './types'

const CONFIG: EnvSignalConfig = { minGreenSec: 5, yellowSec: 3 }

function green(phase: 'NS' | 'EW', phaseElapsedSec = 0): IntersectionState {
  return { id: 'I-0-0', row: 0, col: 0, phase, targetPhase: phase, phaseElapsedSec }
}

describe('applySignalIntent — environment-enforced safety (M2.4, D-008)', () => {
  it('holds green on HOLD, advancing the phase clock', () => {
    const r = applySignalIntent(green('NS', 4), TICK_SEC, 'HOLD', CONFIG)
    expect(r.state.phase).toBe('NS')
    expect(r.state.phaseElapsedSec).toBe(4.5)
    expect(r.didSwitch).toBe(false)
  })

  it('ignores a SWITCH before min-green is satisfied', () => {
    // elapsed becomes 4.5 < minGreenSec (5): the switch must be refused.
    const r = applySignalIntent(green('NS', 4), TICK_SEC, 'SWITCH', CONFIG)
    expect(r.state.phase).toBe('NS')
    expect(r.didSwitch).toBe(false)
  })

  it('honours a SWITCH once min-green is satisfied, entering yellow toward the other axis', () => {
    // elapsed becomes 5.0 >= minGreenSec (5).
    const r = applySignalIntent(green('NS', 4.5), TICK_SEC, 'SWITCH', CONFIG)
    expect(r.state.phase).toBe('YELLOW')
    expect(r.state.targetPhase).toBe('EW')
    expect(r.state.phaseElapsedSec).toBe(0)
    expect(r.didSwitch).toBe(true)
  })

  it('never lets a controller escape yellow early; yellow completes into the target green', () => {
    let s: IntersectionState = { id: 'I-0-0', row: 0, col: 0, phase: 'YELLOW', targetPhase: 'EW', phaseElapsedSec: 0 }
    // yellowSec = 3, tick = 0.5 -> 6 ticks of yellow, controller intent ignored throughout.
    for (let i = 0; i < 5; i += 1) {
      s = applySignalIntent(s, TICK_SEC, 'SWITCH', CONFIG).state
      expect(s.phase).toBe('YELLOW')
      // Safety invariant: no approach may enter during yellow.
      expect(signalAllowsEntry(s.phase, 'NS')).toBe(false)
      expect(signalAllowsEntry(s.phase, 'EW')).toBe(false)
    }
    const done = applySignalIntent(s, TICK_SEC, 'SWITCH', CONFIG)
    expect(done.state.phase).toBe('EW')
    expect(done.state.phaseElapsedSec).toBe(0)
    expect(done.didSwitch).toBe(false)
  })

  it('is deterministic across repeated application', () => {
    const run = () => applySignalIntent(green('NS', 4.5), TICK_SEC, 'SWITCH', CONFIG)
    expect(run()).toEqual(run())
  })
})

describe('buildObservationInput', () => {
  it('reports the post-advance clock and min-green truth', () => {
    const input = buildObservationInput(green('NS', 4.5), TICK_SEC, CONFIG)
    expect(input.phaseElapsedSec).toBe(5)
    expect(input.activeAxis).toBe('NS')
    expect(input.minGreenSatisfied).toBe(true)
  })

  it('reports null active axis and blocked min-green during yellow', () => {
    const yellow: IntersectionState = { id: 'I-0-0', row: 0, col: 0, phase: 'YELLOW', targetPhase: 'EW', phaseElapsedSec: 0 }
    const input = buildObservationInput(yellow, TICK_SEC, CONFIG)
    expect(input.activeAxis).toBeNull()
    expect(input.minGreenSatisfied).toBe(false)
  })
})

describe('Fixed via Controller reproduces legacy stepFixedSignal (equivalence, D-008)', () => {
  // Drive (FixedTimeController + applySignalIntent) tick-by-tick and compare the
  // phase sequence to the legacy stepFixedSignal path. Environment min-green is a
  // real floor (< greenSec) that Fixed always clears, so the sequences must match.
  function phaseSequences(greenSec: number, yellowSec: number, ticks: number, start: 'NS' | 'EW') {
    const env: EnvSignalConfig = { minGreenSec: 5, yellowSec }
    const controller = new FixedTimeController({ greenSec })

    let modern: IntersectionState = green(start)
    let legacy: FixedSignalState = { phase: start, targetPhase: start, phaseElapsedSec: 0 }
    const modernSeq: SignalPhase[] = []
    const legacySeq: SignalPhase[] = []

    for (let i = 0; i < ticks; i += 1) {
      modernSeq.push(modern.phase)
      legacySeq.push(legacy.phase)

      const input = buildObservationInput(modern, TICK_SEC, env)
      const intent = modern.phase === 'YELLOW' ? 'HOLD' : controller.decide(controller.observe(input))
      modern = applySignalIntent(modern, TICK_SEC, intent, env).state

      legacy = stepFixedSignal(legacy, TICK_SEC, { greenSec, yellowSec })
    }
    return { modernSeq, legacySeq }
  }

  it('matches over ~4 cycles at the golden config (green 20, yellow 3)', () => {
    const { modernSeq, legacySeq } = phaseSequences(20, 3, 400, 'NS')
    expect(modernSeq).toEqual(legacySeq)
    expect(new Set(modernSeq)).toEqual(new Set<SignalPhase>(['NS', 'EW', 'YELLOW']))
  })

  it('matches for a different tick-aligned config and the EW checkerboard start', () => {
    const { modernSeq, legacySeq } = phaseSequences(10, 2, 300, 'EW')
    expect(modernSeq).toEqual(legacySeq)
  })
})

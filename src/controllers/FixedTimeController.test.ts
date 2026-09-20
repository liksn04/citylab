import { describe, expect, it } from 'vitest'
import { FixedTimeController, stepFixedSignal } from './FixedTimeController'
import type { ObservationInput } from './Controller'

function obs(partial: Partial<ObservationInput>): ObservationInput {
  return {
    id: 'I-0-0',
    phase: 'NS',
    activeAxis: 'NS',
    phaseElapsedSec: 0,
    minGreenSatisfied: true,
    pressure: { NS: 0, EW: 0 },
    ...partial,
  }
}

describe('stepFixedSignal', () => {
  it('holds a green phase before greenSec', () => {
    const next = stepFixedSignal({ phase: 'NS', targetPhase: 'NS', phaseElapsedSec: 0 }, 10)
    expect(next.phase).toBe('NS')
  })

  it('enters yellow before switching axis', () => {
    const yellow = stepFixedSignal({ phase: 'NS', targetPhase: 'NS', phaseElapsedSec: 19 }, 1.5)
    expect(yellow.phase).toBe('YELLOW')
    expect(yellow.targetPhase).toBe('EW')
    const switched = stepFixedSignal(yellow, 3)
    expect(switched.phase).toBe('EW')
  })
})

describe('FixedTimeController (Controller interface, M2.1)', () => {
  it('holds while green has run less than greenSec', () => {
    const c = new FixedTimeController({ greenSec: 20 })
    expect(c.decide(obs({ phase: 'NS', phaseElapsedSec: 0 }))).toBe('HOLD')
    expect(c.decide(obs({ phase: 'NS', phaseElapsedSec: 19.5 }))).toBe('HOLD')
  })

  it('requests a switch once green reaches greenSec', () => {
    const c = new FixedTimeController({ greenSec: 20 })
    expect(c.decide(obs({ phase: 'EW', activeAxis: 'EW', phaseElapsedSec: 20 }))).toBe('SWITCH')
    expect(c.decide(obs({ phase: 'EW', activeAxis: 'EW', phaseElapsedSec: 25 }))).toBe('SWITCH')
  })

  it('never requests a switch during yellow (environment owns the yellow phase)', () => {
    const c = new FixedTimeController({ greenSec: 20 })
    expect(c.decide(obs({ phase: 'YELLOW', activeAxis: null, phaseElapsedSec: 100 }))).toBe('HOLD')
  })

  it('is blind to traffic — observe drops pressure, keeping the base observation', () => {
    const c = new FixedTimeController({ greenSec: 20 })
    const input = obs({ phase: 'NS', phaseElapsedSec: 5, pressure: { NS: 9, EW: 1 } })
    expect(c.observe(input)).toEqual({
      id: input.id,
      phase: input.phase,
      activeAxis: input.activeAxis,
      phaseElapsedSec: input.phaseElapsedSec,
      minGreenSatisfied: input.minGreenSatisfied,
    })
    expect('pressure' in c.observe(input)).toBe(false)
  })

  it('is deterministic for a given observation', () => {
    const c = new FixedTimeController({ greenSec: 20 })
    const input = obs({ phase: 'NS', phaseElapsedSec: 20 })
    expect(c.decide(input)).toBe(c.decide(input))
  })

  it('defaults greenSec to the fixed-v1 baseline (20s)', () => {
    const c = new FixedTimeController()
    expect(c.id).toBe('fixed-v1')
    expect(c.decide(obs({ phaseElapsedSec: 19.5 }))).toBe('HOLD')
    expect(c.decide(obs({ phaseElapsedSec: 20 }))).toBe('SWITCH')
  })
})

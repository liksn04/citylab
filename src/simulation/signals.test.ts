import { describe, expect, it } from 'vitest'
import { stepFixedSignal } from '../controllers/FixedTimeController'
import { TICK_SEC } from './constants'
import { causedSwitch, isYellow, signalAllowsEntry } from './signals'
import type { SignalPhase } from './types'

describe('signalAllowsEntry', () => {
  it('permits entry only on a matching green axis', () => {
    expect(signalAllowsEntry('NS', 'NS')).toBe(true)
    expect(signalAllowsEntry('NS', 'EW')).toBe(false)
    expect(signalAllowsEntry('EW', 'EW')).toBe(true)
    expect(signalAllowsEntry('EW', 'NS')).toBe(false)
  })

  it('never permits entry during yellow (both axes blocked)', () => {
    expect(signalAllowsEntry('YELLOW', 'NS')).toBe(false)
    expect(signalAllowsEntry('YELLOW', 'EW')).toBe(false)
  })
})

describe('causedSwitch', () => {
  it('counts only green->yellow transitions', () => {
    expect(causedSwitch('NS', 'YELLOW')).toBe(true)
    expect(causedSwitch('EW', 'YELLOW')).toBe(true)
    expect(causedSwitch('YELLOW', 'EW')).toBe(false)
    expect(causedSwitch('NS', 'NS')).toBe(false)
  })
})

describe('fixed signal safety over a full cycle', () => {
  it('blocks entry during yellow and blocks the cross axis on green', () => {
    let state = { phase: 'NS' as SignalPhase, targetPhase: 'NS' as const, phaseElapsedSec: 0 }
    let yellowTicks = 0
    let switches = 0
    const observed = new Set<SignalPhase>()

    // ~2 full cycles: 20s green + 3s yellow each, at 0.5s ticks.
    for (let i = 0; i < 200; i += 1) {
      observed.add(state.phase)
      // Safety invariant: during yellow no approach may enter.
      if (isYellow(state.phase)) {
        yellowTicks += 1
        expect(signalAllowsEntry(state.phase, 'NS')).toBe(false)
        expect(signalAllowsEntry(state.phase, 'EW')).toBe(false)
      } else {
        // Exactly one axis may enter on green.
        expect(signalAllowsEntry(state.phase, 'NS')).toBe(state.phase === 'NS')
        expect(signalAllowsEntry(state.phase, 'EW')).toBe(state.phase === 'EW')
      }
      const next = stepFixedSignal(state, TICK_SEC)
      if (causedSwitch(state.phase, next.phase)) switches += 1
      state = next
    }

    expect(observed.has('NS')).toBe(true)
    expect(observed.has('EW')).toBe(true)
    expect(observed.has('YELLOW')).toBe(true)
    expect(yellowTicks).toBeGreaterThan(0)
    expect(switches).toBeGreaterThanOrEqual(4) // ~2 switches per cycle
  })

  it('is deterministic across repeated stepping', () => {
    const run = () => {
      let s = { phase: 'NS' as SignalPhase, targetPhase: 'NS' as const, phaseElapsedSec: 0 }
      const trace: SignalPhase[] = []
      for (let i = 0; i < 100; i += 1) {
        trace.push(s.phase)
        s = stepFixedSignal(s, TICK_SEC)
      }
      return trace
    }
    expect(run()).toEqual(run())
  })
})

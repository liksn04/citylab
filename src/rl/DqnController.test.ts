import { describe, expect, it, vi } from 'vitest'
import { DqnController, type Policy } from './DqnController'
import { encodeObservation, OBSERVATION_SIZE } from './observation'
import type { ObservationInput } from '../controllers/Controller'
import { applySignalIntent, buildObservationInput, type EnvSignalConfig } from '../simulation/signalMachine'
import { MIN_GREEN_SEC, TICK_SEC, YELLOW_SEC } from '../simulation/constants'
import type { IntersectionState } from '../simulation/types'

/** A green NS observation with everything neutral; override per test. */
function obs(partial: Partial<ObservationInput>): ObservationInput {
  return {
    id: 'I-1-1',
    phase: 'NS',
    activeAxis: 'NS',
    phaseElapsedSec: 0,
    minGreenSatisfied: false,
    pressure: { NS: 0, EW: 0 },
    ...partial,
  }
}

const holdPolicy: Policy = () => 0
const switchPolicy: Policy = () => 1

describe('DqnController — action adapter (M4.2, D-016)', () => {
  it('defaults to the dqn-v1 id and accepts an override', () => {
    expect(new DqnController(holdPolicy).id).toBe('dqn-v1')
    expect(new DqnController(holdPolicy, 'dqn-test').id).toBe('dqn-test')
  })

  it('keeps the full input (timing + pressure) in observe', () => {
    const c = new DqnController(holdPolicy)
    const input = obs({ pressure: { NS: 9, EW: 1 } })
    expect(c.observe(input)).toEqual(input)
    expect('pressure' in c.observe(input)).toBe(true)
  })

  it('maps the policy action index to a HOLD or SWITCH intent', () => {
    expect(new DqnController(holdPolicy).decide(obs({}))).toBe('HOLD')
    expect(new DqnController(switchPolicy).decide(obs({}))).toBe('SWITCH')
  })

  it('feeds the policy the encoded observation vector (M4.1)', () => {
    const spy = vi.fn<Policy>(() => 0)
    const c = new DqnController(spy)
    const input = obs({ pressure: { NS: 8, EW: -2 }, phaseElapsedSec: 3, minGreenSatisfied: true })
    c.decide(input)
    expect(spy).toHaveBeenCalledTimes(1)
    const vector = spy.mock.calls[0]![0]
    expect(vector).toHaveLength(OBSERVATION_SIZE)
    expect(vector).toEqual(encodeObservation(input))
  })

  it('guards yellow: returns HOLD without consulting the policy (never encodes a yellow state)', () => {
    const spy = vi.fn<Policy>(() => 1)
    const c = new DqnController(spy)
    expect(c.decide(obs({ phase: 'YELLOW', activeAxis: null, phaseElapsedSec: 100 }))).toBe('HOLD')
    expect(spy).not.toHaveBeenCalled()
  })

  it('is deterministic for a given observation and policy', () => {
    const c = new DqnController(switchPolicy)
    const input = obs({ pressure: { NS: 1, EW: 7 }, phaseElapsedSec: 6 })
    expect(c.decide(input)).toBe(c.decide(input))
  })
})

describe('DqnController — safety stays environment-owned (D-008)', () => {
  it('cannot switch before min-green even when the policy always requests SWITCH', () => {
    const controller = new DqnController(switchPolicy) // asks to SWITCH every tick
    const config: EnvSignalConfig = { minGreenSec: MIN_GREEN_SEC, yellowSec: YELLOW_SEC }
    let state: IntersectionState = {
      id: 'I-0-0',
      row: 0,
      col: 0,
      phase: 'NS',
      targetPhase: 'NS',
      phaseElapsedSec: 0,
    }

    let firstSwitchTick = -1
    const greenPhasesBeforeSwitch: string[] = []
    for (let t = 0; t < 12; t += 1) {
      const green = state.phase !== 'YELLOW'
      if (green) greenPhasesBeforeSwitch.push(state.phase)
      const base = buildObservationInput(state, TICK_SEC, config)
      const input: ObservationInput = { ...base, pressure: { NS: 0, EW: 5 } }
      const intent = green ? controller.decide(input) : 'HOLD'
      const result = applySignalIntent(state, TICK_SEC, intent, config)
      if (result.didSwitch && firstSwitchTick === -1) firstSwitchTick = t
      state = result.state
    }

    // The environment honours the first SWITCH only once min-green is served.
    const expectedFirstSwitchTick = Math.ceil(MIN_GREEN_SEC / TICK_SEC) - 1
    expect(firstSwitchTick).toBe(expectedFirstSwitchTick)
    // Green time served before the switch is exactly (or just past) min-green — never less.
    expect((firstSwitchTick + 1) * TICK_SEC).toBeGreaterThanOrEqual(MIN_GREEN_SEC)
    // Every green tick before the switch stayed NS (no early switch slipped through).
    expect(greenPhasesBeforeSwitch.every((p) => p === 'NS')).toBe(true)
    // The switch enters YELLOW first, never straight to the other green (D-008).
    expect(state.phase === 'YELLOW' || state.targetPhase === 'EW').toBe(true)
  })
})

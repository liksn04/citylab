import { describe, expect, it } from 'vitest'
import { TrafficEngine, type DecisionTickInfo } from './TrafficEngine'
import { canonicalizeRunConfig } from './runConfig'
import { buildRunProvenance } from './provenance'
import { BALANCED_4X4_V1 } from './scenarios'
import { MIN_GREEN_SEC } from './constants'
import type { Controller } from '../controllers/Controller'

// A trivial injected controller (no rl dependency) that always holds.
const holdController: Controller = {
  id: 'stub',
  observe: (input) => input,
  decide: () => 'HOLD',
}

describe('TrafficEngine — dqn controller injection (M4.9, D-021)', () => {
  it("throws when controllerKind 'dqn' has no injectedController", () => {
    expect(() => new TrafficEngine({ ...BALANCED_4X4_V1, controllerKind: 'dqn' })).toThrow(/injectedController/)
  })

  it('runs with an injected controller and fires the read-only decision hook on green only', () => {
    const ticks: DecisionTickInfo[] = []
    const engine = new TrafficEngine({
      ...BALANCED_4X4_V1,
      durationSec: 20,
      controllerKind: 'dqn',
      injectedController: holdController,
      onDecisionTick: (info) => ticks.push(info),
    })
    engine.runTicks(40)
    expect(ticks.length).toBe(40)
    // Every emitted decision is for a green (non-yellow) intersection.
    for (const t of ticks) {
      for (const d of t.decisions) expect(d.observation.activeAxis).not.toBeNull()
    }
    // The engine still produces a valid summary.
    expect(engine.summary().ticks).toBe(40)
  })
})

describe('dqn provenance & config hash (D-010/D-021)', () => {
  it('assigns the dqn-v1 controller id', () => {
    expect(buildRunProvenance(BALANCED_4X4_V1, 'dqn').controllerId).toBe('dqn-v1')
  })

  it('canonicalizes dqn as adaptive (no fixed green, env min-green)', () => {
    const cfg = canonicalizeRunConfig({ ...BALANCED_4X4_V1, controllerKind: 'dqn' })
    expect(cfg.greenSec).toBeNull()
    expect(cfg.minGreenSec).toBe(MIN_GREEN_SEC)
    expect(cfg.controllerKind).toBe('dqn')
  })

  it('hashes distinctly from fixed and maxpressure', () => {
    const dqn = buildRunProvenance(BALANCED_4X4_V1, 'dqn').configHash
    const fixed = buildRunProvenance(BALANCED_4X4_V1, 'fixed').configHash
    const maxp = buildRunProvenance(BALANCED_4X4_V1, 'maxpressure').configHash
    expect(new Set([dqn, fixed, maxp]).size).toBe(3)
  })
})

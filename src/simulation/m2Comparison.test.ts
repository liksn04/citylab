import { describe, expect, it } from 'vitest'
import saved from './__fixtures__/m2-comparison-v1.json'
import { compareControllers, type ScenarioComparison } from './compareControllers'
import { SCENARIOS } from './scenarios'

/**
 * M2.5/M2.6 — saved Fixed vs Max Pressure comparison on the balanced and rush
 * scenarios. The fixture is generated from real runs (never hand-edited); this
 * test regenerates and locks it, so a change in controller/pressure semantics
 * surfaces as a diff instead of silently reinterpreting results (R7). It makes
 * NO assumption that MaxPressure wins — the numbers are recorded as measured.
 */
const savedComparisons = saved as unknown as ScenarioComparison[]

describe('M2.5/M2.6 — controller comparison', () => {
  it('covers the balanced and rush scenarios', () => {
    expect(savedComparisons.map((c) => c.scenarioId)).toEqual(['balanced-4x4-v1', 'rush-4x4-v1'])
  })

  it('reproduces the saved comparison exactly (deterministic runs)', () => {
    const regenerated = SCENARIOS.map((s) => compareControllers(s))
    expect(regenerated).toEqual(savedComparisons)
  })

  it('feeds both controllers identical demand within a scenario (common random numbers, D-006)', () => {
    for (const sc of savedComparisons) {
      const generated = new Set(sc.runs.map((r) => r.summary.generated))
      expect(generated.size).toBe(1) // same demand -> same generated count
      for (const r of sc.runs) expect(r.summary.seed).toBe(sc.seed)
    }
  })

  it('records valid results for every controller without assuming a winner', () => {
    for (const sc of savedComparisons) {
      expect(sc.runs.map((r) => r.controllerKind)).toEqual(['fixed', 'maxpressure'])
      for (const r of sc.runs) {
        expect(r.summary.completed).toBeGreaterThan(0)
        expect(Number.isFinite(r.summary.avgWaitingTimeSec)).toBe(true)
        expect(Number.isFinite(r.summary.p95WaitingTimeSec)).toBe(true)
      }
    }
  })
})

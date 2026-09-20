import { describe, expect, it } from 'vitest'
import baseline from './__fixtures__/fixed-baseline-balanced-4x4-v1.json'
import { BALANCED_4X4_V1 } from './scenarios'
import { TrafficEngine, type RunSummary } from './TrafficEngine'

/**
 * Golden Fixed baseline for M1. See docs/TEST_STRATEGY.md:
 *   scenario: balanced-4x4-v1 · seed 41021 · 1800 s · controller fixed-v1
 * This locks the *meaning* of the metrics; an intentional change must bump the
 * fixture and record a decision (never edit the numbers to make a test pass).
 * The scenario config lives in ./scenarios so non-test code can reuse it without
 * importing this test module.
 */

const GOLDEN_TICKS = 3600 // 1800 s / 0.5 s

function runGolden(): RunSummary {
  const engine = new TrafficEngine(BALANCED_4X4_V1)
  engine.runTicks(GOLDEN_TICKS)
  return engine.summary()
}

describe('M1.10 — 30-minute Fixed baseline golden run', () => {
  it('is bit-identical across repeated runs (hash equality)', () => {
    const a = runGolden()
    const b = runGolden()
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('produces only finite metrics — no NaN/Infinity over 30 minutes', () => {
    const s = runGolden()
    for (const value of Object.values(s)) {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
    }
    expect(s.ticks).toBe(GOLDEN_TICKS)
    expect(s.simTimeSec).toBe(1800)
  })

  it('holds the conservation invariant at the 30-minute mark', () => {
    const engine = new TrafficEngine(BALANCED_4X4_V1)
    engine.runTicks(GOLDEN_TICKS)
    expect(engine.conservationHolds()).toBe(true)
    expect(engine.summary().admitted).toBe(engine.summary().active + engine.summary().completed)
  })

  it('leaks no vehicles: with drain time every generated trip completes', () => {
    const engine = new TrafficEngine(BALANCED_4X4_V1)
    engine.runTicks(GOLDEN_TICKS + 4000) // 1800 s window + generous drain
    const s = engine.summary()
    expect(s.backlog).toBe(0)
    expect(s.active).toBe(0)
    expect(s.admitted).toBe(s.completed)
    expect(s.completed).toBe(s.generated)
  })

  it('matches the saved Fixed baseline fixture', () => {
    // The persisted golden fixture is the source of truth for metric meaning.
    expect(runGolden()).toEqual(baseline.summary)
    expect(baseline.scenarioId).toBe('balanced-4x4-v1')
    expect(baseline.controllerId).toBe('fixed-v1')
  })
})

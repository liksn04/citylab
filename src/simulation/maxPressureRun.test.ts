import { describe, expect, it } from 'vitest'
import { TrafficEngine, type EngineConfig, type RunSummary } from './TrafficEngine'
import { BALANCED_4X4_V1 } from './scenarios'

/**
 * Max Pressure driven end-to-end through the production engine (M2.3). Same
 * scenario/seed as the Fixed golden run (common random numbers, D-006). This
 * checks that MaxPressure is a valid, deterministic controller — it does NOT
 * assume MaxPressure beats Fixed; the comparison is recorded as measured (M2
 * exit criteria, R2).
 */
const MP_CONFIG: EngineConfig = { ...BALANCED_4X4_V1, controllerKind: 'maxpressure' }
const GOLDEN_TICKS = 3600 // 1800 s / 0.5 s

function run(config: EngineConfig, ticks: number): { summary: RunSummary; engine: TrafficEngine } {
  const engine = new TrafficEngine(config)
  engine.runTicks(ticks)
  return { summary: engine.summary(), engine }
}

describe('M2.3 — Max Pressure through the production engine', () => {
  it('is deterministic across repeated runs (common random numbers)', () => {
    const a = run(MP_CONFIG, GOLDEN_TICKS).summary
    const b = run(MP_CONFIG, GOLDEN_TICKS).summary
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('produces only finite metrics over 30 minutes', () => {
    const s = run(MP_CONFIG, GOLDEN_TICKS).summary
    for (const value of Object.values(s)) {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
    }
    expect(s.ticks).toBe(GOLDEN_TICKS)
  })

  it('holds conservation and leaks no vehicles with drain time', () => {
    const { summary, engine } = run(MP_CONFIG, GOLDEN_TICKS + 8000)
    expect(engine.conservationHolds()).toBe(true)
    expect(summary.backlog).toBe(0)
    expect(summary.active).toBe(0)
    expect(summary.completed).toBe(summary.generated)
  })

  it('behaves differently from Fixed on the same scenario (adaptive, recorded as-is)', () => {
    const fixed = run(BALANCED_4X4_V1, GOLDEN_TICKS).summary
    const mp = run(MP_CONFIG, GOLDEN_TICKS).summary
    // Both are valid controllers over the same demand; MaxPressure is adaptive,
    // so its switching pattern differs from the fixed cycle. No claim about which
    // is better — that is what the experiment runner (M3) will measure.
    expect(mp.signalSwitches).not.toBe(fixed.signalSwitches)
    expect(mp.completed).toBeGreaterThan(0)
    expect(fixed.completed).toBeGreaterThan(0)
  })
})

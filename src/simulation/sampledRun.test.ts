import { describe, expect, it } from 'vitest'
import { runScenario } from './compareControllers'
import { DEFAULT_SAMPLE_INTERVAL_SEC, TICK_SEC } from './constants'
import { runScenarioSampled } from './sampledRun'
import { BALANCED_4X4_V1 } from './scenarios'

/**
 * M3.4 (D-011) — raw metric-sample time series alongside the aggregate summary.
 * Contract: sampling is a read-only observer (summary byte-identical to the
 * unsampled run), the cadence is a whole multiple of TICK_SEC, and the aggregate
 * maxQueue dominates every instantaneous sample.
 */
describe('M3.4 — runScenarioSampled', () => {
  const interval = DEFAULT_SAMPLE_INTERVAL_SEC
  const sampled = runScenarioSampled(BALANCED_4X4_V1, 'fixed', interval)

  it('samples at a fixed cadence over the whole run', () => {
    const expectedCount = BALANCED_4X4_V1.durationSec / interval
    expect(sampled.samples).toHaveLength(expectedCount)
    expect(sampled.samples.map((s) => s.simTimeSec)).toEqual(
      Array.from({ length: expectedCount }, (_, i) => (i + 1) * interval),
    )
  })

  it('leaves the aggregate summary byte-identical to the unsampled run', () => {
    expect(sampled.summary).toEqual(runScenario(BALANCED_4X4_V1, 'fixed'))
  })

  it('keeps the run-wide aggregate maxQueue >= every instantaneous sample maxQueue (D-011)', () => {
    const sampleMax = Math.max(...sampled.samples.map((s) => s.maxQueue))
    expect(sampled.summary.maxQueue).toBeGreaterThanOrEqual(sampleMax)
  })

  it('produces finite, non-decreasing completion over samples', () => {
    let prevCompleted = -1
    for (const s of sampled.samples) {
      expect(Number.isFinite(s.avgWaitSec)).toBe(true)
      expect(Number.isFinite(s.throughputPerHour)).toBe(true)
      expect(s.activeVehicles).toBeGreaterThanOrEqual(0)
      expect(s.maxQueue).toBeGreaterThanOrEqual(0)
      expect(s.completedVehicles).toBeGreaterThanOrEqual(prevCompleted)
      prevCompleted = s.completedVehicles
    }
  })

  it('survives an in-memory JSON roundtrip (export-ready schema)', () => {
    expect(JSON.parse(JSON.stringify(sampled))).toEqual(sampled)
  })

  it('is fully deterministic', () => {
    expect(runScenarioSampled(BALANCED_4X4_V1, 'fixed', interval)).toEqual(sampled)
  })

  it('rejects a cadence that is not a whole multiple of TICK_SEC', () => {
    expect(() => runScenarioSampled(BALANCED_4X4_V1, 'fixed', TICK_SEC / 2)).toThrow(/multiple of TICK_SEC/)
    expect(() => runScenarioSampled(BALANCED_4X4_V1, 'fixed', 0)).toThrow(/positive/)
  })
})

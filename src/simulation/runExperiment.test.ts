import { describe, expect, it } from 'vitest'
import { DEFAULT_SAMPLE_INTERVAL_SEC } from './constants'
import { CONTROLLER_IDS } from './provenance'
import { runExperiment } from './runExperiment'
import { BALANCED_4X4_V1 } from './scenarios'

/**
 * M3.3 — seed-set runner. Contract: for each seed both controllers see the same
 * demand (D-006); across seeds the demand instance changes; every run carries
 * its deterministic provenance. Makes no assumption about a winner (R2).
 */
const SEEDS = [41021, 41022, 41023]

describe('M3.3 — runExperiment (seed-set runner)', () => {
  const result = runExperiment(BALANCED_4X4_V1, SEEDS)

  it('produces one run per (seed, controller), seed-major', () => {
    expect(result.seeds).toEqual(SEEDS)
    expect(result.controllers).toEqual(['fixed', 'maxpressure'])
    expect(result.runs).toHaveLength(SEEDS.length * 2)
    expect(result.runs.map((r) => [r.seed, r.controllerKind])).toEqual([
      [41021, 'fixed'], [41021, 'maxpressure'],
      [41022, 'fixed'], [41022, 'maxpressure'],
      [41023, 'fixed'], [41023, 'maxpressure'],
    ])
  })

  it('feeds both controllers identical demand within a seed (common random numbers, D-006)', () => {
    for (const seed of SEEDS) {
      const forSeed = result.runs.filter((r) => r.seed === seed)
      const generated = new Set(forSeed.map((r) => r.summary.generated))
      expect(generated.size).toBe(1) // same seed -> same generated demand
      for (const r of forSeed) expect(r.summary.seed).toBe(seed)
    }
  })

  it('varies the demand instance across seeds', () => {
    // Arrival count is rate-driven (seed-independent, demand.ts), so the seed
    // varies the OD draw, not the count — evidence shows up in the outcome.
    const fixedWaits = result.runs.filter((r) => r.controllerKind === 'fixed').map((r) => r.summary.avgWaitingTimeSec)
    expect(new Set(fixedWaits).size).toBeGreaterThan(1)
  })

  it('attaches deterministic provenance to every run', () => {
    for (const r of result.runs) {
      expect(r.provenance.seed).toBe(r.seed)
      expect(r.provenance.controllerId).toBe(CONTROLLER_IDS[r.controllerKind])
      expect(r.provenance.scenarioId).toBe('balanced-4x4-v1')
      expect(r.provenance.scenarioVersion).toBe('v1')
      expect(r.provenance.configHash).toMatch(/^m3-[0-9a-f]{16}$/)
    }
  })

  it('gives every (seed, controller) run a distinct config hash', () => {
    const hashes = result.runs.map((r) => r.provenance.configHash)
    expect(new Set(hashes).size).toBe(hashes.length)
  })

  it('shares a seed across controllers but distinguishes them by config hash', () => {
    const forFirst = result.runs.filter((r) => r.seed === SEEDS[0])
    const [fixed, maxp] = forFirst
    expect(maxp!.provenance.seed).toBe(fixed!.provenance.seed)
    expect(maxp!.provenance.configHash).not.toBe(fixed!.provenance.configHash)
  })

  it('is fully deterministic (same experiment -> identical result)', () => {
    expect(runExperiment(BALANCED_4X4_V1, SEEDS)).toEqual(result)
  })

  it('omits raw samples unless a sample interval is requested (aggregate-only default)', () => {
    for (const r of result.runs) expect(r.samples).toBeUndefined()
  })

  it('attaches a raw metric-sample time series to every run when sampling is requested (M3.4)', () => {
    const sampledResult = runExperiment(BALANCED_4X4_V1, SEEDS, ['fixed', 'maxpressure'], DEFAULT_SAMPLE_INTERVAL_SEC)
    const expectedCount = BALANCED_4X4_V1.durationSec / DEFAULT_SAMPLE_INTERVAL_SEC
    for (const r of sampledResult.runs) {
      expect(r.samples).toHaveLength(expectedCount)
      // Aggregate summary is unchanged by sampling: it matches the aggregate-only run.
      const plain = result.runs.find((x) => x.seed === r.seed && x.controllerKind === r.controllerKind)!
      expect(r.summary).toEqual(plain.summary)
    }
  })

  it('constrains its public contract to baseline kinds — dqn cannot run without an injected model (D-021)', () => {
    // Positive: baseline kinds (fixed / maxpressure) run from an EngineConfig alone.
    expect(runExperiment(BALANCED_4X4_V1, [41021], ['fixed', 'maxpressure']).controllers).toEqual([
      'fixed',
      'maxpressure',
    ])

    // Negative (compile-time only, enforced by `tsc -b`; the closure is never
    // invoked so it never throws at runtime): the runner must not type-check
    // 'dqn'. 'dqn' needs an injected DqnController wrapping a trained network
    // (D-021), which `runScenario`/`runExperiment` cannot build. If the `kinds`
    // param were widened back to ControllerKind, this @ts-expect-error would go
    // unused and the build would fail — that is the regression guard.
    const rejectsDqnAtCompileTime = () =>
      // @ts-expect-error 'dqn' is not a BaselineControllerKind — runExperiment has no injected model to run it
      runExperiment(BALANCED_4X4_V1, [41021], ['dqn'])
    expect(rejectsDqnAtCompileTime).toBeTypeOf('function')
  })
})

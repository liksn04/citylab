import { describe, expect, it } from 'vitest'
import { InMemoryRunStore } from '../persistence/db'
import { runExperiment } from '../simulation/runExperiment'
import { BALANCED_4X4_V1 } from '../simulation/scenarios'
import {
  experimentToRecords,
  loadExperiment,
  recordsToExperiment,
  saveExperiment,
  type RuntimeMeta,
} from './experimentPersistence'

/**
 * M3.5 (D-012) — experiment persistence coordinator. Verifies the pure mapping
 * (ExperimentResult -> records -> re-analysis view) and a save/load roundtrip
 * through an in-memory RunStore. The Dexie reload-after-refresh path is covered
 * in persistence/dexieRunStore.test.ts.
 */
const SEEDS = [41021, 41022]
const SAMPLE_INTERVAL = 600 // 3 samples per 1800s run — keeps assertions light
const META: RuntimeMeta = {
  experimentId: 'exp-balanced-1',
  name: 'Balanced sweep',
  startedAt: '2026-09-21T00:00:00.000Z',
  createdAt: '2026-09-21T00:05:00.000Z',
}

const result = runExperiment(BALANCED_4X4_V1, SEEDS, ['fixed', 'maxpressure'], SAMPLE_INTERVAL)

describe('M3.5 — experimentToRecords (pure mapping)', () => {
  const bundle = experimentToRecords(result, META)

  it('maps experiment identity + runtime timestamps', () => {
    expect(bundle.experiment).toEqual({
      id: 'exp-balanced-1',
      name: 'Balanced sweep',
      scenarioId: 'balanced-4x4-v1',
      scenarioVersion: 'v1',
      startedAt: META.startedAt,
      createdAt: META.createdAt,
    })
  })

  it('creates one run record per (seed, controller) with provenance + runtime fields', () => {
    expect(bundle.runs).toHaveLength(SEEDS.length * 2)
    const first = bundle.runs[0]!
    expect(first.id).toBe('exp-balanced-1--fixed-v1--seed41021')
    expect(first.experimentId).toBe('exp-balanced-1')
    expect(first.controllerId).toBe('fixed-v1')
    expect(first.seed).toBe(41021)
    expect(first.scenarioVersion).toBe('v1')
    expect(first.simulationDurationSec).toBe(1800)
    expect(first.configHash).toMatch(/^m3-[0-9a-f]{16}$/)
    expect(first.codeVersion).toBeNull()
    expect(first.startedAt).toBe(META.startedAt)
    expect(first.summary).toEqual(result.runs[0]!.summary)
  })

  it('gives every run a unique id and flattens samples keyed by runId', () => {
    const runIds = bundle.runs.map((r) => r.id)
    expect(new Set(runIds).size).toBe(runIds.length)
    // 3 samples per run x 4 runs.
    expect(bundle.samples).toHaveLength(4 * 3)
    for (const s of bundle.samples) expect(runIds).toContain(s.runId)
  })

  it('honours an injected runId generator', () => {
    const custom = experimentToRecords(result, { ...META, runId: (seed, cid) => `r_${cid}_${seed}` })
    expect(custom.runs[0]!.id).toBe('r_fixed-v1_41021')
    expect(custom.samples[0]!.runId).toBe('r_fixed-v1_41021')
  })
})

describe('M3.5 — recordsToExperiment (inverse mapping)', () => {
  it('reconstructs provenance, summary and per-run samples', () => {
    const view = recordsToExperiment(experimentToRecords(result, META))
    expect(view.runs).toHaveLength(result.runs.length)
    view.runs.forEach((pr, i) => {
      const original = result.runs[i]!
      expect(pr.provenance).toEqual(original.provenance)
      expect(pr.summary).toEqual(original.summary)
      expect(pr.samples).toEqual(original.samples)
    })
  })
})

describe('M3.5 — save/load through a RunStore', () => {
  it('saves then loads an equivalent experiment (in-memory)', async () => {
    const store = new InMemoryRunStore()
    const saved = await saveExperiment(store, result, META)
    const loaded = await loadExperiment(store, 'exp-balanced-1')
    // Stores return runs in deterministic runId order, so compare against a
    // runId-sorted reconstruction of the saved bundle.
    const byId = { ...saved, runs: [...saved.runs].sort((a, b) => (a.id < b.id ? -1 : 1)) }
    expect(loaded).toEqual(recordsToExperiment(byId))
  })

  it('lists experiments and returns runs/samples by key', async () => {
    const store = new InMemoryRunStore()
    await saveExperiment(store, result, META)
    expect((await store.listExperiments()).map((e) => e.id)).toEqual(['exp-balanced-1'])
    const runs = await store.getRuns('exp-balanced-1')
    expect(runs).toHaveLength(4)
    const samples = await store.getSamples('exp-balanced-1--fixed-v1--seed41021')
    expect(samples).toHaveLength(3)
    expect(samples.map((s) => s.simTimeSec)).toEqual([600, 1200, 1800])
  })

  it('returns undefined for an unknown experiment', async () => {
    const store = new InMemoryRunStore()
    expect(await loadExperiment(store, 'nope')).toBeUndefined()
  })
})

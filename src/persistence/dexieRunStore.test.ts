import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { runExperiment } from '../simulation/runExperiment'
import { BALANCED_4X4_V1 } from '../simulation/scenarios'
import {
  loadExperiment,
  recordsToExperiment,
  saveExperiment,
  type RuntimeMeta,
} from '../runner/experimentPersistence'
import { DexieRunStore, NeuralCityDb } from './db'

/**
 * M3.5 (D-012) — Dexie persistence roundtrip via fake-indexeddb. Proves
 * reload-after-refresh: data saved through one connection is read back by a
 * fresh connection to the same database name (a new page load), byte-equivalent.
 */
const META: RuntimeMeta = {
  experimentId: 'exp-persist-1',
  name: 'Persistence roundtrip',
  startedAt: '2026-09-21T00:00:00.000Z',
  createdAt: '2026-09-21T00:05:00.000Z',
}

const dbNames: string[] = []
function freshDbName(): string {
  const name = `ncl-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  dbNames.push(name)
  return name
}

afterEach(async () => {
  while (dbNames.length) await NeuralCityDb.prototype.delete.call(new NeuralCityDb(dbNames.pop()!))
})

describe('M3.5 — DexieRunStore reload-after-refresh', () => {
  it('reads back an experiment saved by a previous connection', async () => {
    const result = runExperiment(BALANCED_4X4_V1, [41021, 41022], ['fixed', 'maxpressure'], 600)
    const name = freshDbName()

    // Connection #1: save, then close (simulate leaving the page).
    const db1 = new NeuralCityDb(name)
    const savedBundle = await saveExperiment(new DexieRunStore(db1), result, META)
    db1.close()

    // Connection #2: a fresh open of the same database (simulate a refresh).
    const db2 = new NeuralCityDb(name)
    const reloaded = await loadExperiment(new DexieRunStore(db2), 'exp-persist-1')
    db2.close()

    // The reconstructed view is id-free and runId-sorted, so it is identical
    // across the reload.
    const byId = { ...savedBundle, runs: [...savedBundle.runs].sort((a, b) => (a.id < b.id ? -1 : 1)) }
    expect(reloaded).toEqual(recordsToExperiment(byId))
  })

  it('persists the raw records (experiment, one run per (seed,controller), sample series)', async () => {
    const result = runExperiment(BALANCED_4X4_V1, [41021, 41022], ['fixed', 'maxpressure'], 600)
    const name = freshDbName()

    const db1 = new NeuralCityDb(name)
    await saveExperiment(new DexieRunStore(db1), result, META)
    db1.close()

    const db2 = new NeuralCityDb(name)
    const store = new DexieRunStore(db2)
    expect((await store.getExperiment('exp-persist-1'))?.scenarioVersion).toBe('v1')
    expect(await store.getRuns('exp-persist-1')).toHaveLength(4)
    const samples = await store.getSamples('exp-persist-1--maxpressure-v1--seed41022')
    expect(samples.map((s) => s.simTimeSec)).toEqual([600, 1200, 1800])
    expect(samples.every((s) => Number.isFinite(s.avgWaitSec))).toBe(true)
    db2.close()
  })
})

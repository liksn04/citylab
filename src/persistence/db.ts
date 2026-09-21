import Dexie, { type EntityTable } from 'dexie'

/**
 * Run persistence (M3.5, D-012). This module knows only records and the storage
 * port — never the simulation types. The coordinator (src/runner) maps an
 * ExperimentResult into these records and assigns the runtime fields, so
 * simulation never depends on Dexie (docs/ARCHITECTURE.md).
 */

export interface ExperimentRecord {
  id: string
  name: string
  scenarioId: string
  scenarioVersion: string
  /** ISO timestamp the experiment run started (runtime-assigned). */
  startedAt: string
  /** ISO timestamp the bundle was persisted (runtime-assigned). */
  createdAt: string
}

export interface RunRecord {
  /** runId — runtime-assigned (D-010). */
  id: string
  experimentId: string
  scenarioId: string
  scenarioVersion: string
  controllerId: string
  seed: number
  simulationDurationSec: number
  configHash: string
  metricVersion: string
  /** Source revision when available, else null (runtime-assigned). */
  codeVersion: string | null
  startedAt: string
  /** Aggregate summary, stored verbatim (RunSummary shape is golden-locked). */
  summary: RunSummaryRecord
}

/** RunSummary persisted verbatim; kept structural so persistence never imports simulation. */
export interface RunSummaryRecord {
  metricVersion: string
  seed: number
  ticks: number
  simTimeSec: number
  generated: number
  admitted: number
  completed: number
  active: number
  backlog: number
  avgWaitingTimeSec: number
  p95WaitingTimeSec: number
  throughput: number
  maxQueue: number
  signalSwitches: number
}

export interface MetricSampleRecord {
  id?: number
  runId: string
  simTimeSec: number
  activeVehicles: number
  completedVehicles: number
  avgWaitSec: number
  throughputPerHour: number
  maxQueue: number
}

export interface ModelSnapshotRecord {
  id: string
  runId: string
  episode: number
  artifactRef: string
}

/** Everything one experiment persists, as a single transactional unit. */
export interface ExperimentBundle {
  experiment: ExperimentRecord
  runs: RunRecord[]
  samples: MetricSampleRecord[]
}

/**
 * Persistence port. The coordinator depends on this interface, not on Dexie, so
 * the same coordinator can be tested against an in-memory store and run against
 * IndexedDB in the browser.
 */
export interface RunStore {
  saveExperiment(bundle: ExperimentBundle): Promise<void>
  getExperiment(id: string): Promise<ExperimentRecord | undefined>
  listExperiments(): Promise<ExperimentRecord[]>
  getRuns(experimentId: string): Promise<RunRecord[]>
  getSamples(runId: string): Promise<MetricSampleRecord[]>
  loadBundle(experimentId: string): Promise<ExperimentBundle | undefined>
}

export class NeuralCityDb extends Dexie {
  experiments!: EntityTable<ExperimentRecord, 'id'>
  runs!: EntityTable<RunRecord, 'id'>
  metricSamples!: EntityTable<MetricSampleRecord, 'id'>
  modelSnapshots!: EntityTable<ModelSnapshotRecord, 'id'>

  constructor(name = 'neural-city-lab') {
    super(name)
    // v1 — M0 skeleton (kept for history).
    this.version(1).stores({
      experiments: 'id, createdAt',
      runs: 'id, experimentId, scenarioId, controllerType, seed, createdAt',
      metricSamples: '++id, runId, simTimeSec',
      modelSnapshots: 'id, runId, episode',
    })
    // v2 — M3.5 experiment/run provenance persistence (D-012). Migration between
    // versions is an M6.6 concern; there is no shipped v1 data.
    this.version(2).stores({
      experiments: 'id, scenarioId, createdAt',
      runs: 'id, experimentId, scenarioId, controllerId, configHash, createdAt',
      metricSamples: '++id, runId, simTimeSec',
      modelSnapshots: 'id, runId, episode',
    })
  }
}

/** Dexie-backed RunStore. The real IndexedDB adapter used in the browser. */
export class DexieRunStore implements RunStore {
  constructor(private readonly database: NeuralCityDb) {}

  async saveExperiment(bundle: ExperimentBundle): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.experiments,
      this.database.runs,
      this.database.metricSamples,
      async () => {
        await this.database.experiments.put(bundle.experiment)
        await this.database.runs.bulkPut(bundle.runs)
        if (bundle.samples.length > 0) await this.database.metricSamples.bulkPut(bundle.samples)
      },
    )
  }

  getExperiment(id: string): Promise<ExperimentRecord | undefined> {
    return this.database.experiments.get(id)
  }

  listExperiments(): Promise<ExperimentRecord[]> {
    return this.database.experiments.toArray()
  }

  getRuns(experimentId: string): Promise<RunRecord[]> {
    // Sorted by runId for a storage-independent, deterministic order (IndexedDB
    // query order is otherwise unspecified). Consumers re-sort as needed.
    return this.database.runs.where('experimentId').equals(experimentId).sortBy('id')
  }

  getSamples(runId: string): Promise<MetricSampleRecord[]> {
    return this.database.metricSamples.where('runId').equals(runId).sortBy('simTimeSec')
  }

  async loadBundle(experimentId: string): Promise<ExperimentBundle | undefined> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment) return undefined
    const runs = await this.getRuns(experimentId)
    const samples: MetricSampleRecord[] = []
    for (const run of runs) samples.push(...(await this.getSamples(run.id)))
    return { experiment, runs, samples }
  }
}

/** In-memory RunStore for tests and non-persistent contexts. */
export class InMemoryRunStore implements RunStore {
  private readonly experimentsById = new Map<string, ExperimentRecord>()
  private readonly runsByExperiment = new Map<string, RunRecord[]>()
  private readonly samplesByRun = new Map<string, MetricSampleRecord[]>()

  async saveExperiment(bundle: ExperimentBundle): Promise<void> {
    this.experimentsById.set(bundle.experiment.id, clone(bundle.experiment))
    this.runsByExperiment.set(bundle.experiment.id, bundle.runs.map(clone))
    for (const sample of bundle.samples) {
      const list = this.samplesByRun.get(sample.runId) ?? []
      list.push(clone(sample))
      this.samplesByRun.set(sample.runId, list)
    }
  }

  async getExperiment(id: string): Promise<ExperimentRecord | undefined> {
    const found = this.experimentsById.get(id)
    return found ? clone(found) : undefined
  }

  async listExperiments(): Promise<ExperimentRecord[]> {
    return [...this.experimentsById.values()].map(clone)
  }

  async getRuns(experimentId: string): Promise<RunRecord[]> {
    // Match DexieRunStore: deterministic runId order regardless of insertion.
    return (this.runsByExperiment.get(experimentId) ?? [])
      .map(clone)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }

  async getSamples(runId: string): Promise<MetricSampleRecord[]> {
    return [...(this.samplesByRun.get(runId) ?? [])]
      .map(clone)
      .sort((a, b) => a.simTimeSec - b.simTimeSec)
  }

  async loadBundle(experimentId: string): Promise<ExperimentBundle | undefined> {
    const experiment = await this.getExperiment(experimentId)
    if (!experiment) return undefined
    const runs = await this.getRuns(experimentId)
    const samples: MetricSampleRecord[] = []
    for (const run of runs) samples.push(...(await this.getSamples(run.id)))
    return { experiment, runs, samples }
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export const db = new NeuralCityDb()

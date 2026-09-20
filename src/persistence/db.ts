import Dexie, { type EntityTable } from 'dexie'

export interface ExperimentRecord {
  id: string
  name: string
  createdAt: string
}

export interface RunRecord {
  id: string
  experimentId: string
  scenarioId: string
  controllerType: string
  seed: number
  configHash: string
  metricVersion: string
  createdAt: string
}

export interface MetricSampleRecord {
  id?: number
  runId: string
  simTimeSec: number
  avgWaitSec: number
  throughput: number
  maxQueue: number
}

export interface ModelSnapshotRecord {
  id: string
  runId: string
  episode: number
  artifactRef: string
}

class NeuralCityDb extends Dexie {
  experiments!: EntityTable<ExperimentRecord, 'id'>
  runs!: EntityTable<RunRecord, 'id'>
  metricSamples!: EntityTable<MetricSampleRecord, 'id'>
  modelSnapshots!: EntityTable<ModelSnapshotRecord, 'id'>

  constructor() {
    super('neural-city-lab')
    this.version(1).stores({
      experiments: 'id, createdAt',
      runs: 'id, experimentId, scenarioId, controllerType, seed, createdAt',
      metricSamples: '++id, runId, simTimeSec',
      modelSnapshots: 'id, runId, episode',
    })
  }
}

export const db = new NeuralCityDb()

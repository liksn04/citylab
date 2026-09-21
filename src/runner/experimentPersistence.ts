import type { MetricSample } from '../analytics/metricSamples'
import type {
  ExperimentBundle,
  ExperimentRecord,
  MetricSampleRecord,
  RunRecord,
  RunStore,
  RunSummaryRecord,
} from '../persistence/db'
import type { RunProvenance } from '../simulation/provenance'
import type { ExperimentResult } from '../simulation/runExperiment'
import type { RunSummary } from '../simulation/TrafficEngine'

/**
 * Experiment persistence coordinator (M3.5, D-012). The single bridge between
 * simulation and persistence: it maps an ExperimentResult into storage records,
 * assigns the runtime provenance fields (runId/startedAt/codeVersion/persistedAt,
 * D-010), and reconstructs a re-analysis view on load. simulation/ never imports
 * this module, so it never depends on Dexie (docs/ARCHITECTURE.md).
 */

export interface RuntimeMeta {
  experimentId: string
  name: string
  /** ISO timestamp the experiment started. */
  startedAt: string
  /** ISO timestamp the bundle is persisted. */
  createdAt: string
  /** Source revision when known. */
  codeVersion?: string | null
  /** Runtime runId per (seed, controllerId); defaults to a deterministic id. */
  runId?: (seed: number, controllerId: string) => string
}

/** A single run reconstructed from storage, ready for re-analysis. */
export interface PersistedRun {
  provenance: RunProvenance
  summary: RunSummary
  samples: MetricSample[]
}

export interface PersistedExperiment {
  experiment: ExperimentRecord
  runs: PersistedRun[]
}

function defaultRunId(experimentId: string, controllerId: string, seed: number): string {
  return `${experimentId}--${controllerId}--seed${seed}`
}

/** Pure mapping: ExperimentResult (+ runtime meta) → storage records. */
export function experimentToRecords(result: ExperimentResult, meta: RuntimeMeta): ExperimentBundle {
  const codeVersion = meta.codeVersion ?? null
  const experiment: ExperimentRecord = {
    id: meta.experimentId,
    name: meta.name,
    scenarioId: result.scenarioId,
    scenarioVersion: result.scenarioVersion,
    startedAt: meta.startedAt,
    createdAt: meta.createdAt,
  }

  const runs: RunRecord[] = []
  const samples: MetricSampleRecord[] = []
  for (const run of result.runs) {
    const p = run.provenance
    const runId = meta.runId?.(run.seed, p.controllerId) ?? defaultRunId(meta.experimentId, p.controllerId, run.seed)
    runs.push({
      id: runId,
      experimentId: meta.experimentId,
      scenarioId: p.scenarioId,
      scenarioVersion: p.scenarioVersion,
      controllerId: p.controllerId,
      seed: p.seed,
      simulationDurationSec: p.simulationDurationSec,
      configHash: p.configHash,
      metricVersion: p.metricVersion,
      codeVersion,
      startedAt: meta.startedAt,
      summary: run.summary as RunSummaryRecord,
    })
    for (const s of run.samples ?? []) {
      samples.push({
        runId,
        simTimeSec: s.simTimeSec,
        activeVehicles: s.activeVehicles,
        completedVehicles: s.completedVehicles,
        avgWaitSec: s.avgWaitSec,
        throughputPerHour: s.throughputPerHour,
        maxQueue: s.maxQueue,
      })
    }
  }
  return { experiment, runs, samples }
}

/** Pure inverse: storage records → a re-analysis view (provenance + summary + samples per run). */
export function recordsToExperiment(bundle: ExperimentBundle): PersistedExperiment {
  const samplesByRun = new Map<string, MetricSample[]>()
  for (const s of bundle.samples) {
    const list = samplesByRun.get(s.runId) ?? []
    list.push({
      simTimeSec: s.simTimeSec,
      activeVehicles: s.activeVehicles,
      completedVehicles: s.completedVehicles,
      avgWaitSec: s.avgWaitSec,
      throughputPerHour: s.throughputPerHour,
      maxQueue: s.maxQueue,
    })
    samplesByRun.set(s.runId, list)
  }
  for (const list of samplesByRun.values()) list.sort((a, b) => a.simTimeSec - b.simTimeSec)

  const runs: PersistedRun[] = bundle.runs.map((r) => ({
    provenance: {
      scenarioId: r.scenarioId,
      scenarioVersion: r.scenarioVersion,
      controllerId: r.controllerId,
      seed: r.seed,
      simulationDurationSec: r.simulationDurationSec,
      configHash: r.configHash,
      metricVersion: r.metricVersion,
    },
    summary: r.summary as RunSummary,
    samples: samplesByRun.get(r.id) ?? [],
  }))
  return { experiment: bundle.experiment, runs }
}

/** Persist an experiment result through a RunStore (coordinator entry point). */
export async function saveExperiment(store: RunStore, result: ExperimentResult, meta: RuntimeMeta): Promise<ExperimentBundle> {
  const bundle = experimentToRecords(result, meta)
  await store.saveExperiment(bundle)
  return bundle
}

/** Load and reconstruct a persisted experiment for re-analysis (undefined if absent). */
export async function loadExperiment(store: RunStore, experimentId: string): Promise<PersistedExperiment | undefined> {
  const bundle = await store.loadBundle(experimentId)
  return bundle ? recordsToExperiment(bundle) : undefined
}

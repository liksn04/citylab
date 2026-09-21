import type { ExperimentBundle, ExperimentRecord, MetricSampleRecord, RunRecord } from '../persistence/db'

/**
 * JSON export/import (M3.7, D-014). Wraps a storage-faithful ExperimentBundle in
 * a versioned envelope so an experiment can move between browsers and be
 * re-imported losslessly. Import validates the format tag and schema version so
 * a corrupt or wrong-version file is rejected rather than silently accepted.
 * Pure (de)serialization — no metric is recomputed and simulation is untouched.
 */

export const EXPERIMENT_EXPORT_FORMAT = 'neural-city-lab/experiment'
export const EXPERIMENT_EXPORT_SCHEMA_VERSION = 1

export interface ExperimentExport {
  format: typeof EXPERIMENT_EXPORT_FORMAT
  schemaVersion: number
  /** Optional metadata; null when not supplied (kept out of the payload). */
  exportedAt: string | null
  experiment: ExperimentRecord
  runs: RunRecord[]
  samples: MetricSampleRecord[]
}

/** Serialize an experiment bundle to a pretty, versioned JSON string. */
export function exportExperimentJson(bundle: ExperimentBundle, meta?: { exportedAt?: string }): string {
  const envelope: ExperimentExport = {
    format: EXPERIMENT_EXPORT_FORMAT,
    schemaVersion: EXPERIMENT_EXPORT_SCHEMA_VERSION,
    exportedAt: meta?.exportedAt ?? null,
    experiment: bundle.experiment,
    runs: bundle.runs,
    samples: bundle.samples,
  }
  return JSON.stringify(envelope, null, 2) + '\n'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Parse and validate an exported envelope. Throws a descriptive Error on invalid
 * JSON, an unknown format tag, an unsupported schema version, or a malformed
 * payload shape.
 */
export function parseExperimentExport(json: string): ExperimentExport {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Invalid experiment export: not valid JSON')
  }
  if (!isObject(data)) throw new Error('Invalid experiment export: expected a JSON object')
  if (data.format !== EXPERIMENT_EXPORT_FORMAT) {
    throw new Error(`Invalid experiment export: unknown format ${JSON.stringify(data.format)}`)
  }
  if (data.schemaVersion !== EXPERIMENT_EXPORT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported experiment export schemaVersion ${JSON.stringify(data.schemaVersion)} (expected ${EXPERIMENT_EXPORT_SCHEMA_VERSION})`,
    )
  }
  if (!isObject(data.experiment)) throw new Error('Invalid experiment export: missing experiment')
  if (!Array.isArray(data.runs)) throw new Error('Invalid experiment export: runs must be an array')
  if (!Array.isArray(data.samples)) throw new Error('Invalid experiment export: samples must be an array')
  return data as unknown as ExperimentExport
}

/** Parse, validate, and return the ExperimentBundle ready for RunStore.saveExperiment. */
export function importExperimentBundle(json: string): ExperimentBundle {
  const parsed = parseExperimentExport(json)
  return { experiment: parsed.experiment, runs: parsed.runs, samples: parsed.samples }
}

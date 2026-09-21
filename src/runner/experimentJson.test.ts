import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { runExperiment } from '../simulation/runExperiment'
import { BALANCED_4X4_V1 } from '../simulation/scenarios'
import {
  EXPERIMENT_EXPORT_FORMAT,
  EXPERIMENT_EXPORT_SCHEMA_VERSION,
  exportExperimentJson,
  importExperimentBundle,
  parseExperimentExport,
} from './experimentJson'
import { experimentToRecords, recordsToExperiment, type RuntimeMeta } from './experimentPersistence'
import type { ExperimentBundle } from '../persistence/db'

/**
 * M3.7 (D-014) — JSON export/import. The golden fixture locks the versioned
 * envelope; the roundtrip proves the bundle survives export→import byte-for-byte
 * so an experiment can move between browsers and be re-analyzed losslessly.
 */
const META: RuntimeMeta = {
  experimentId: 'exp-json-1',
  name: 'JSON export sample',
  startedAt: '2026-09-21T00:00:00.000Z',
  createdAt: '2026-09-21T00:05:00.000Z',
}

function buildBundle(): ExperimentBundle {
  return experimentToRecords(runExperiment(BALANCED_4X4_V1, [41021], ['fixed', 'maxpressure'], 600), META)
}

function fixture(): string {
  return readFileSync(new URL('./__fixtures__/m3-export-v1.json', import.meta.url), 'utf8')
}

describe('M3.7 — experiment JSON export/import', () => {
  const bundle = buildBundle()

  it('reproduces the saved export fixture exactly', () => {
    expect(exportExperimentJson(bundle, { exportedAt: '2026-09-21T00:10:00.000Z' })).toBe(fixture())
  })

  it('wraps the bundle in a versioned envelope', () => {
    const parsed = parseExperimentExport(exportExperimentJson(bundle))
    expect(parsed.format).toBe(EXPERIMENT_EXPORT_FORMAT)
    expect(parsed.schemaVersion).toBe(EXPERIMENT_EXPORT_SCHEMA_VERSION)
    expect(parsed.exportedAt).toBeNull() // not supplied
    expect(parsed.experiment.id).toBe('exp-json-1')
  })

  it('roundtrips a bundle losslessly (export -> import)', () => {
    expect(importExperimentBundle(exportExperimentJson(bundle))).toEqual(bundle)
  })

  it('preserves the re-analysis view across a roundtrip', () => {
    const reimported = importExperimentBundle(exportExperimentJson(bundle))
    expect(recordsToExperiment(reimported)).toEqual(recordsToExperiment(bundle))
  })

  it('emits valid, pretty-printed JSON ending in a newline', () => {
    const json = exportExperimentJson(bundle)
    expect(() => JSON.parse(json)).not.toThrow()
    expect(json.endsWith('\n')).toBe(true)
    expect(json).toContain('\n  "format"') // 2-space indentation
  })

  describe('import validation', () => {
    it('rejects invalid JSON', () => {
      expect(() => importExperimentBundle('{not json')).toThrow(/not valid JSON/)
    })

    it('rejects an unknown format tag', () => {
      const wrong = JSON.stringify({ format: 'something-else', schemaVersion: 1, experiment: {}, runs: [], samples: [] })
      expect(() => importExperimentBundle(wrong)).toThrow(/unknown format/)
    })

    it('rejects an unsupported schema version', () => {
      const future = exportExperimentJson(bundle).replace('"schemaVersion": 1', '"schemaVersion": 999')
      expect(() => importExperimentBundle(future)).toThrow(/Unsupported experiment export schemaVersion/)
    })

    it('rejects a malformed payload shape', () => {
      const bad = JSON.stringify({ format: EXPERIMENT_EXPORT_FORMAT, schemaVersion: 1, experiment: {}, runs: 'nope', samples: [] })
      expect(() => importExperimentBundle(bad)).toThrow(/runs must be an array/)
    })
  })
})

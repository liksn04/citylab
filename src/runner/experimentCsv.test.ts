import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { runExperiment } from '../simulation/runExperiment'
import { BALANCED_4X4_V1 } from '../simulation/scenarios'
import { experimentToCsv, runsToCsv, samplesToCsv } from './experimentCsv'
import {
  experimentToRecords,
  recordsToExperiment,
  type PersistedExperiment,
  type RuntimeMeta,
} from './experimentPersistence'

/**
 * M3.6 (D-013) — CSV export. The golden fixtures lock the exact spreadsheet-
 * readable output (like the m2/m3 fixtures) so a change in columns/escaping/
 * formatting surfaces as a diff. Also checks structure, escaping and that the
 * cumulative final sample agrees with the aggregate summary.
 */
const META: RuntimeMeta = {
  experimentId: 'exp-csv-1',
  name: 'CSV export sample',
  startedAt: '2026-09-21T00:00:00.000Z',
  createdAt: '2026-09-21T00:05:00.000Z',
}

function fixture(name: string): string {
  return readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')
}

function buildPersisted(): PersistedExperiment {
  const result = runExperiment(BALANCED_4X4_V1, [41021], ['fixed', 'maxpressure'], 600)
  return recordsToExperiment(experimentToRecords(result, META))
}

describe('M3.6 — experimentToCsv', () => {
  const persisted = buildPersisted()
  const { runsCsv, samplesCsv } = experimentToCsv(persisted)

  it('reproduces the saved runs fixture exactly', () => {
    expect(runsCsv).toBe(fixture('m3-runs-v1.csv'))
  })

  it('reproduces the saved samples fixture exactly', () => {
    expect(samplesCsv).toBe(fixture('m3-samples-v1.csv'))
  })

  it('emits the documented headers (D-013)', () => {
    expect(runsCsv.split('\r\n')[0]).toBe(
      'experimentId,experimentName,scenarioId,scenarioVersion,controllerId,seed,configHash,metricVersion,simulationDurationSec,runId,ticks,simTimeSec,generated,admitted,completed,active,backlog,avgWaitingTimeSec,p95WaitingTimeSec,throughput,maxQueue,signalSwitches',
    )
    expect(samplesCsv.split('\r\n')[0]).toBe(
      'experimentId,runId,controllerId,seed,simTimeSec,activeVehicles,completedVehicles,avgWaitSec,throughputPerHour,maxQueue',
    )
  })

  it('uses CRLF terminators including a trailing one', () => {
    expect(runsCsv.endsWith('\r\n')).toBe(true)
    expect(runsCsv).toContain('\r\n')
  })

  it('writes one runs row per run and one samples row per (run, sample)', () => {
    const runRows = runsCsv.split('\r\n').filter(Boolean)
    const sampleRows = samplesCsv.split('\r\n').filter(Boolean)
    expect(runRows).toHaveLength(1 + persisted.runs.length) // header + 2 runs
    const sampleCount = persisted.runs.reduce((n, r) => n + r.samples.length, 0)
    expect(sampleRows).toHaveLength(1 + sampleCount) // header + 3 per run
  })

  it('keeps full-precision numbers so the aggregate is recoverable from the export', () => {
    const fixedRun = persisted.runs.find((r) => r.provenance.controllerId === 'fixed-v1')!
    expect(runsCsv).toContain(String(fixedRun.summary.avgWaitingTimeSec))
    // The final cumulative sample equals the aggregate avg wait (same definition).
    const finalSample = fixedRun.samples[fixedRun.samples.length - 1]!
    expect(finalSample.avgWaitSec).toBe(fixedRun.summary.avgWaitingTimeSec)
  })

  it('escapes commas and quotes per RFC 4180', () => {
    const tricky: PersistedExperiment = {
      ...persisted,
      experiment: { ...persisted.experiment, name: 'Rush, "peak" run' },
    }
    const firstDataRow = runsToCsv(tricky).split('\r\n')[1]!
    expect(firstDataRow).toContain('"Rush, ""peak"" run"')
  })

  it('produces an empty samples body (header only) when a run has no samples', () => {
    const noSamples = recordsToExperiment(experimentToRecords(runExperiment(BALANCED_4X4_V1, [41021]), META))
    expect(samplesToCsv(noSamples)).toBe(
      'experimentId,runId,controllerId,seed,simTimeSec,activeVehicles,completedVehicles,avgWaitSec,throughputPerHour,maxQueue\r\n',
    )
  })
})

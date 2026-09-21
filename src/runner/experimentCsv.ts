import type { PersistedExperiment, PersistedRun } from './experimentPersistence'

/**
 * CSV export (M3.6, D-013). Turns a PersistedExperiment into two spreadsheet-
 * readable tidy tables: a runs table (one row per run, provenance + aggregate
 * summary) and a samples table (one row per (run, sample), raw time series with
 * run identity denormalized so a pivot needs no join). Pure serialization — no
 * metric is recomputed and no simulation state is touched.
 *
 * Output is RFC 4180: a header row, fields containing a comma/quote/newline are
 * double-quoted with inner quotes doubled, rows end with CRLF, and numbers are
 * emitted at full JS precision so a re-import is lossless.
 */

export interface CsvExport {
  runsCsv: string
  samplesCsv: string
}

const RUN_COLUMNS = [
  'experimentId',
  'experimentName',
  'scenarioId',
  'scenarioVersion',
  'controllerId',
  'seed',
  'configHash',
  'metricVersion',
  'simulationDurationSec',
  'runId',
  'ticks',
  'simTimeSec',
  'generated',
  'admitted',
  'completed',
  'active',
  'backlog',
  'avgWaitingTimeSec',
  'p95WaitingTimeSec',
  'throughput',
  'maxQueue',
  'signalSwitches',
] as const

const SAMPLE_COLUMNS = [
  'experimentId',
  'runId',
  'controllerId',
  'seed',
  'simTimeSec',
  'activeVehicles',
  'completedVehicles',
  'avgWaitSec',
  'throughputPerHour',
  'maxQueue',
] as const

const ROW_TERMINATOR = '\r\n'

/** RFC 4180 field: quote when it contains a comma, quote or newline; double inner quotes. */
function escapeField(value: string | number): string {
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(header: readonly string[], rows: readonly (string | number)[][]): string {
  const lines = [header.join(','), ...rows.map((row) => row.map(escapeField).join(','))]
  return lines.join(ROW_TERMINATOR) + ROW_TERMINATOR
}

function runRow(experiment: PersistedExperiment['experiment'], run: PersistedRun): (string | number)[] {
  const { provenance: p, summary: s } = run
  return [
    experiment.id,
    experiment.name,
    p.scenarioId,
    p.scenarioVersion,
    p.controllerId,
    p.seed,
    p.configHash,
    p.metricVersion,
    p.simulationDurationSec,
    run.runId,
    s.ticks,
    s.simTimeSec,
    s.generated,
    s.admitted,
    s.completed,
    s.active,
    s.backlog,
    s.avgWaitingTimeSec,
    s.p95WaitingTimeSec,
    s.throughput,
    s.maxQueue,
    s.signalSwitches,
  ]
}

/** Runs table: one row per run (provenance + aggregate summary). */
export function runsToCsv(experiment: PersistedExperiment): string {
  return toCsv(RUN_COLUMNS, experiment.runs.map((run) => runRow(experiment.experiment, run)))
}

/** Samples table: one row per (run, sample), run identity denormalized. */
export function samplesToCsv(experiment: PersistedExperiment): string {
  const rows: (string | number)[][] = []
  for (const run of experiment.runs) {
    for (const sample of run.samples) {
      rows.push([
        experiment.experiment.id,
        run.runId,
        run.provenance.controllerId,
        run.provenance.seed,
        sample.simTimeSec,
        sample.activeVehicles,
        sample.completedVehicles,
        sample.avgWaitSec,
        sample.throughputPerHour,
        sample.maxQueue,
      ])
    }
  }
  return toCsv(SAMPLE_COLUMNS, rows)
}

/** Both tidy tables for a persisted experiment. */
export function experimentToCsv(experiment: PersistedExperiment): CsvExport {
  return { runsCsv: runsToCsv(experiment), samplesCsv: samplesToCsv(experiment) }
}

import type { MetricSample } from '../analytics/metricSamples'
import { runScenario } from './compareControllers'
import { buildRunProvenance, type RunProvenance } from './provenance'
import { runScenarioSampled } from './sampledRun'
import type { Scenario } from './scenarios'
import type { ControllerKind, RunSummary } from './TrafficEngine'

/**
 * Seed-set experiment runner (M3.3). Runs a scenario across a set of seeds,
 * evaluating each controller under identical demand within a seed (common
 * random numbers, D-006), and pairs every run with its deterministic
 * RunProvenance (M3.2, D-010). This is the fair-comparison unit M3 automates.
 *
 * Pure domain: it reuses `runScenario` and builds provenance without touching
 * `RunSummary` or the golden/m2 fixtures. It makes no claim about which
 * controller wins — results are recorded as measured (R2). Persistence and
 * export are M3.5–M3.7; runtime provenance fields (runId/startedAt) are added
 * there, not here (D-010).
 */

export interface SeedRun {
  seed: number
  controllerKind: ControllerKind
  provenance: RunProvenance
  summary: RunSummary
  /** Raw metric-sample time series (M3.4); present only when sampling was requested. */
  samples?: MetricSample[]
}

export interface ExperimentResult {
  scenarioId: string
  scenarioVersion: string
  /** The seed set every controller was evaluated over (comparison axis). */
  seeds: readonly number[]
  controllers: readonly ControllerKind[]
  /** One run per (seed, controller), grouped seed-major then controller order. */
  runs: SeedRun[]
}

/**
 * Run `kinds` over `scenario` for each seed in `seeds`. For a given seed every
 * controller sees the same generated demand (D-006); across seeds the demand
 * instance changes, so the seed set forms the comparison distribution.
 *
 * When `sampleIntervalSec` is given, each run also carries a raw metric-sample
 * time series (M3.4). Omitting it keeps the aggregate-only shape and the summary
 * byte-identical to the unsampled path (sampling is a read-only observer).
 */
export function runExperiment(
  scenario: Scenario,
  seeds: readonly number[],
  kinds: readonly ControllerKind[] = ['fixed', 'maxpressure'],
  sampleIntervalSec?: number,
): ExperimentResult {
  const runs: SeedRun[] = []
  for (const seed of seeds) {
    const seeded: Scenario = { ...scenario, seed }
    for (const controllerKind of kinds) {
      const provenance = buildRunProvenance(seeded, controllerKind)
      if (sampleIntervalSec === undefined) {
        runs.push({ seed, controllerKind, provenance, summary: runScenario(seeded, controllerKind) })
      } else {
        const { summary, samples } = runScenarioSampled(seeded, controllerKind, sampleIntervalSec)
        runs.push({ seed, controllerKind, provenance, summary, samples })
      }
    }
  }
  return {
    scenarioId: scenario.id,
    scenarioVersion: scenario.scenarioVersion,
    seeds,
    controllers: kinds,
    runs,
  }
}

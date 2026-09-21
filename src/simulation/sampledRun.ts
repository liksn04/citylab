import type { MetricSample } from '../analytics/metricSamples'
import { DEFAULT_SAMPLE_INTERVAL_SEC, TICK_SEC } from './constants'
import type { Scenario } from './scenarios'
import { TrafficEngine, type ControllerKind, type RunSummary } from './TrafficEngine'

/**
 * Sampled run (M3.4, D-011): the aggregate `RunSummary` plus a raw per-sample
 * time series. Stepping one tick at a time is the same tick sequence as a bulk
 * `runScenario`, so the returned summary is byte-identical to the unsampled path
 * — sampling is a read-only observer and never perturbs the simulation.
 */
export interface SampledRun {
  summary: RunSummary
  samples: MetricSample[]
}

/**
 * Run one controller over a scenario, recording a `MetricSample` every
 * `sampleIntervalSec` (which must be a whole multiple of TICK_SEC so samples
 * land on exact ticks). The final tick always yields a sample when the duration
 * is a multiple of the interval.
 */
export function runScenarioSampled(
  scenario: Scenario,
  controllerKind: ControllerKind,
  sampleIntervalSec: number = DEFAULT_SAMPLE_INTERVAL_SEC,
): SampledRun {
  if (sampleIntervalSec <= 0) throw new Error('sampleIntervalSec must be positive')
  const everyTicks = sampleIntervalSec / TICK_SEC
  if (!Number.isInteger(everyTicks)) {
    throw new Error(`sampleIntervalSec (${sampleIntervalSec}) must be a whole multiple of TICK_SEC (${TICK_SEC})`)
  }

  const engine = new TrafficEngine({ ...scenario, controllerKind })
  const totalTicks = Math.round(scenario.durationSec / TICK_SEC)
  const samples: MetricSample[] = []
  for (let t = 1; t <= totalTicks; t += 1) {
    engine.runTicks(1)
    if (t % everyTicks === 0) samples.push(engine.sample())
  }
  return { summary: engine.summary(), samples }
}

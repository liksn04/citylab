import { TICK_SEC } from './constants'
import type { Scenario } from './scenarios'
import { TrafficEngine, type ControllerKind, type RunSummary } from './TrafficEngine'

/**
 * Fixed vs Max Pressure smoke comparison (M2.5/M2.6). Runs one or more
 * controllers over a scenario's demand window and returns their run summaries
 * side by side. Both controllers see the same seed/demand within a scenario
 * (common random numbers, D-006). This makes no claim about which controller
 * wins — results are recorded as measured (M2 exit criteria, R2). The richer
 * experiment runner and persistence are M3.
 */

export interface ControllerRun {
  controllerKind: ControllerKind
  summary: RunSummary
}

export interface ScenarioComparison {
  scenarioId: string
  seed: number
  vehiclesPerHour: number
  durationSec: number
  runs: ControllerRun[]
}

/** Run a single controller over a scenario's full demand window. */
export function runScenario(scenario: Scenario, controllerKind: ControllerKind): RunSummary {
  const engine = new TrafficEngine({ ...scenario, controllerKind })
  engine.runTicks(Math.round(scenario.durationSec / TICK_SEC))
  return engine.summary()
}

/** Compare controllers on one scenario under identical demand. */
export function compareControllers(
  scenario: Scenario,
  kinds: readonly ControllerKind[] = ['fixed', 'maxpressure'],
): ScenarioComparison {
  return {
    scenarioId: scenario.id,
    seed: scenario.seed,
    vehiclesPerHour: scenario.vehiclesPerHour,
    durationSec: scenario.durationSec,
    runs: kinds.map((controllerKind) => ({ controllerKind, summary: runScenario(scenario, controllerKind) })),
  }
}

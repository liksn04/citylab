import { METRIC_VERSION } from './constants'
import { hashRunConfig } from './runConfig'
import type { Scenario } from './scenarios'
import type { ControllerKind } from './TrafficEngine'

/**
 * Run provenance (M3.1/M3.2, D-010) — the deterministic identity of a run,
 * kept as a separate wrapper so `RunSummary`, `METRIC_VERSION` and the golden /
 * m2-comparison fixtures stay byte-identical. This is the reproducible subset of
 * DATA_CONTRACTS "Provenance — M3"; the non-deterministic runtime fields
 * (runId, startedAt, codeVersion/commit) are assigned by the persistence /
 * run-coordinator layer (M3.5), not by the deterministic core.
 */
export interface RunProvenance {
  scenarioId: string
  scenarioVersion: string
  controllerId: string
  seed: number
  simulationDurationSec: number
  configHash: string
  metricVersion: string
}

/** Stable controller identity per kind (recorded in provenance and PROGRESS logs). */
export const CONTROLLER_IDS: Record<ControllerKind, string> = {
  fixed: 'fixed-v1',
  maxpressure: 'maxpressure-v1',
  dqn: 'dqn-v1',
}

/**
 * Derive the deterministic provenance for running `controllerKind` on
 * `scenario`. Pure and side-effect free: it does not run the simulation, only
 * describes the conditions the run would execute under.
 */
export function buildRunProvenance(scenario: Scenario, controllerKind: ControllerKind): RunProvenance {
  return {
    scenarioId: scenario.id,
    scenarioVersion: scenario.scenarioVersion,
    controllerId: CONTROLLER_IDS[controllerKind],
    seed: scenario.seed,
    simulationDurationSec: scenario.durationSec,
    configHash: hashRunConfig({ ...scenario, controllerKind }),
    metricVersion: METRIC_VERSION,
  }
}

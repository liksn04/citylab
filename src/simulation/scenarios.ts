import type { EngineConfig } from './TrafficEngine'

/** A named, versioned experiment scenario. `controllerId` records the baseline it was locked against. */
export type Scenario = EngineConfig & { id: string; controllerId: string }

/**
 * Balanced 4×4 reference scenario (M1 golden baseline, D-006 common random
 * numbers). The Fixed golden fixture is locked against this exact config; the
 * same config drives the Max Pressure comparison so both controllers see
 * identical demand.
 */
export const BALANCED_4X4_V1: Scenario = {
  id: 'balanced-4x4-v1',
  controllerId: 'fixed-v1',
  rows: 4,
  cols: 4,
  seed: 41021,
  vehiclesPerHour: 1200,
  durationSec: 1800,
}

/**
 * Rush 4×4 scenario (M2.6): the same uniform-OD model under a heavier arrival
 * rate (2×), stressing both controllers with more congestion. Distinct seed so
 * it is a genuinely different demand instance; both controllers still share this
 * seed within the scenario (D-006).
 */
export const RUSH_4X4_V1: Scenario = {
  id: 'rush-4x4-v1',
  controllerId: 'fixed-v1',
  rows: 4,
  cols: 4,
  seed: 73019,
  vehiclesPerHour: 2400,
  durationSec: 1800,
}

/** Every named scenario, for batch comparison and (later, M3) the experiment runner. */
export const SCENARIOS: readonly Scenario[] = [BALANCED_4X4_V1, RUSH_4X4_V1]

/**
 * Raw metric-sample read model (M3.4, D-011). A `MetricSample` is a snapshot of
 * the run's live aggregate signals at one instant, taken at a fixed cadence so a
 * run can be inspected/exported as a time series rather than only as a single
 * aggregate `RunSummary`. Meanings reuse the M1 metric definitions applied at an
 * instant, so this introduces no new metric semantics (metricVersion unchanged).
 *
 * Per docs/ARCHITECTURE.md metric read models live in analytics/; the engine
 * produces samples read-only and never recomputes these fields elsewhere.
 */
export interface MetricSample {
  /** Simulation time of this sample (seconds). Samples self-describe their cadence. */
  simTimeSec: number
  /** Vehicles in the network at this instant. */
  activeVehicles: number
  /** Cumulative arrivals (ARRIVED) up to this instant. */
  completedVehicles: number
  /** Mean waiting time over completed trips so far (M1 definition). */
  avgWaitSec: number
  /** Cumulative throughput expressed as an hourly rate. */
  throughputPerHour: number
  /**
   * Instantaneous largest single-edge queue at this tick (Q2). Distinct from
   * RunSummary.maxQueue, which is the run-wide maximum — so for any run
   * RunSummary.maxQueue >= max(sample.maxQueue).
   */
  maxQueue: number
}

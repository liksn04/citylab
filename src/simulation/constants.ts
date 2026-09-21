/**
 * Simulation constants — the single source of truth for every numeric value in
 * the deterministic traffic core. `docs/DATA_CONTRACTS.md` describes the meaning
 * of each value; this file owns the actual numbers. Nothing outside this module
 * may hard-code these quantities.
 */

/** Fixed integration timestep (seconds). The simulator advances only in whole ticks. */
export const TICK_SEC = 0.5

/** Uniform physical length of every directed street segment (meters). */
export const EDGE_LENGTH_M = 100

/** Free-flow speed on an unobstructed edge (meters/second). */
export const FREE_FLOW_SPEED_MPS = 12

/** Minimum center-to-center gap enforced by car-following (meters). */
export const VEHICLE_GAP_M = 6

/**
 * A stopped vehicle within this distance of the stop line counts toward the
 * approach edge's queue (meters).
 */
export const QUEUE_ZONE_M = 30

/**
 * Forward displacement in a single tick at or below this counts as "stopped",
 * and therefore as waiting time (meters).
 */
export const MOVING_EPSILON_M = 0.05

/** Number of ticks a vehicle occupies an intersection while crossing. */
export const CROSS_TICKS = 1

/** Fixed yellow duration inserted on every phase switch (seconds). Environment-owned (D-008). */
export const YELLOW_SEC = 3

/**
 * Minimum green duration an adaptive controller must serve before the environment
 * honours a SWITCH intent (seconds). Bounds the switching rate of Max Pressure so
 * it cannot oscillate every tick (D-008/D-009). Must be a whole multiple of TICK_SEC.
 */
export const MIN_GREEN_SEC = 5

/** Green duration of the fixed-time baseline controller (seconds). */
export const FIXED_GREEN_SEC = 20

/**
 * Metric definition version. Bump this whenever the meaning of any aggregate
 * metric changes so historical runs are not silently reinterpreted (see R7).
 */
export const METRIC_VERSION = 'm1-metrics-v1'

/**
 * Default cadence for raw metric-sample time series (seconds, D-011). Reporting
 * cadence, not physics — must be a whole multiple of TICK_SEC so samples land on
 * exact ticks. Sampling is read-only and never affects the simulation.
 */
export const DEFAULT_SAMPLE_INTERVAL_SEC = 30

/** Distance a free-flowing vehicle covers in one tick (meters). Derived. */
export const FREE_FLOW_STEP_M = FREE_FLOW_SPEED_MPS * TICK_SEC

/** Maximum number of vehicles that physically fit on one edge at jam spacing. Derived. */
export const EDGE_CAPACITY = Math.floor(EDGE_LENGTH_M / VEHICLE_GAP_M)

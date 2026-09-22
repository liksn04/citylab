import { FIXED_GREEN_SEC, METRIC_VERSION, MIN_GREEN_SEC, TICK_SEC, YELLOW_SEC } from './constants'
import type { ControllerKind, EngineConfig } from './TrafficEngine'

/**
 * Run configuration provenance & hashing (M3.2, D-010).
 *
 * `RunConfig` is the canonical set of inputs that make a run reproducible —
 * exactly the set DATA_CONTRACTS Q5 promises determinism over: seed, grid,
 * demand, effective signal timing, tick, and metric version. Two runs share a
 * `configHash` iff they would produce the same simulation trajectory (within one
 * JS runtime, R8). The hash is a pure, synchronous, deterministic function so
 * `simulation/` stays free of React / Dexie / async Web Crypto (ARCHITECTURE).
 */
export interface RunConfig {
  tickSec: number
  rows: number
  cols: number
  seed: number
  vehiclesPerHour: number
  durationSec: number
  controllerKind: ControllerKind
  /** Fixed-time green duration; `null` for adaptive controllers (no fixed green). */
  greenSec: number | null
  yellowSec: number
  /** Min-green the environment enforces before honouring a SWITCH (0 for fixed). */
  minGreenSec: number
  metricVersion: string
}

/**
 * Reduce an `EngineConfig` to its canonical, hash-relevant `RunConfig`.
 *
 * Effective signal timing is resolved per controller so that "omit a default"
 * and "state the default explicitly" collapse to the same config (D-010):
 * - fixed: greenSec = override ?? FIXED_GREEN_SEC, yellowSec = override ?? YELLOW_SEC,
 *   minGreenSec = 0 (the env must not interfere with the fixed timer).
 * - maxpressure / dqn: greenSec = null (adaptive), yellowSec = YELLOW_SEC,
 *   minGreenSec = MIN_GREEN_SEC. Fixed-time timing overrides are ignored, exactly
 *   as TrafficEngine ignores them for adaptive controllers. The learned model's
 *   weights are NOT part of the config hash (non-deterministic/backend-dependent,
 *   R8; run identity is the conditions, not the trained parameters — D-021).
 */
export function canonicalizeRunConfig(config: EngineConfig): RunConfig {
  const controllerKind: ControllerKind = config.controllerKind ?? 'fixed'
  const isAdaptive = controllerKind === 'maxpressure' || controllerKind === 'dqn'
  return {
    tickSec: TICK_SEC,
    rows: config.rows,
    cols: config.cols,
    seed: config.seed,
    vehiclesPerHour: config.vehiclesPerHour,
    durationSec: config.durationSec,
    controllerKind,
    greenSec: isAdaptive ? null : config.controller?.greenSec ?? FIXED_GREEN_SEC,
    yellowSec: isAdaptive ? YELLOW_SEC : config.controller?.yellowSec ?? YELLOW_SEC,
    minGreenSec: isAdaptive ? MIN_GREEN_SEC : 0,
    metricVersion: METRIC_VERSION,
  }
}

/**
 * Deterministic JSON with recursively sorted object keys. Author key order and
 * whitespace never affect the output, so the same config always serializes the
 * same way (D-010, alternative (b)). `undefined` object values are dropped.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const obj = value as Record<string, unknown>
  const parts: string[] = []
  for (const key of Object.keys(obj).sort()) {
    const v = obj[key]
    if (v === undefined) continue
    parts.push(JSON.stringify(key) + ':' + stableStringify(v))
  }
  return '{' + parts.join(',') + '}'
}

/**
 * Deterministic 64-bit string hash (two independent 32-bit lanes → 16 hex
 * chars). Not cryptographic — reproducibility is only promised within one JS
 * runtime (DATA_CONTRACTS Q5, R8), so config identity needs distribution, not
 * collision resistance.
 */
export function hashString(input: string): string {
  let h1 = 0xdeadbeef ^ input.length
  let h2 = 0x41c6ce57 ^ input.length
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x2c1b3c6d)
    h2 = Math.imul(h2 ^ c, 0x297a2d39)
  }
  h1 ^= h1 >>> 15
  h1 = Math.imul(h1, 0x735a2d97)
  h1 ^= h1 >>> 15
  h2 ^= h2 >>> 15
  h2 = Math.imul(h2, 0xcaf649a9)
  h2 ^= h2 >>> 15
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0')
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0')
  return hex1 + hex2
}

/** Stable hash of a run's canonical config. Same config → same hash (D-010). */
export function hashRunConfig(config: EngineConfig): string {
  return 'm3-' + hashString(stableStringify(canonicalizeRunConfig(config)))
}

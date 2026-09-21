import { describe, expect, it } from 'vitest'
import { FIXED_GREEN_SEC, METRIC_VERSION, MIN_GREEN_SEC, TICK_SEC, YELLOW_SEC } from './constants'
import { canonicalizeRunConfig, hashRunConfig, hashString, stableStringify } from './runConfig'
import type { EngineConfig } from './TrafficEngine'

/**
 * M3.2 (D-010) — run config canonicalization + deterministic hashing. Contract:
 * the same run config always hashes the same regardless of author key order or
 * whether defaults are omitted vs stated; any field that changes the simulation
 * trajectory changes the hash.
 */

const FIXED_BASE: EngineConfig = { rows: 4, cols: 4, seed: 41021, vehiclesPerHour: 1200, durationSec: 1800 }

describe('stableStringify', () => {
  it('is independent of object key order', () => {
    expect(stableStringify({ a: 1, b: 2, c: 3 })).toBe(stableStringify({ c: 3, b: 2, a: 1 }))
  })

  it('sorts nested keys and preserves array order', () => {
    expect(stableStringify({ z: { b: 2, a: 1 }, list: [3, 1, 2] })).toBe('{"list":[3,1,2],"z":{"a":1,"b":2}}')
  })

  it('serializes null distinctly from strings', () => {
    expect(stableStringify({ x: null })).toBe('{"x":null}')
  })
})

describe('hashString', () => {
  it('is deterministic and formatted as 16 hex chars', () => {
    const h = hashString('neural-city-lab')
    expect(h).toBe(hashString('neural-city-lab'))
    expect(h).toMatch(/^[0-9a-f]{16}$/)
  })

  it('separates inputs that differ by a single character', () => {
    expect(hashString('scenario-a')).not.toBe(hashString('scenario-b'))
  })
})

describe('canonicalizeRunConfig', () => {
  it('fills fixed-time defaults from constants', () => {
    expect(canonicalizeRunConfig(FIXED_BASE)).toEqual({
      tickSec: TICK_SEC,
      rows: 4,
      cols: 4,
      seed: 41021,
      vehiclesPerHour: 1200,
      durationSec: 1800,
      controllerKind: 'fixed',
      greenSec: FIXED_GREEN_SEC,
      yellowSec: YELLOW_SEC,
      minGreenSec: 0,
      metricVersion: METRIC_VERSION,
    })
  })

  it('treats maxpressure timing as constant-driven (green N/A, env min-green)', () => {
    const c = canonicalizeRunConfig({ ...FIXED_BASE, controllerKind: 'maxpressure' })
    expect(c.greenSec).toBeNull()
    expect(c.yellowSec).toBe(YELLOW_SEC)
    expect(c.minGreenSec).toBe(MIN_GREEN_SEC)
  })
})

describe('hashRunConfig', () => {
  it('is prefixed and deterministic', () => {
    const h = hashRunConfig(FIXED_BASE)
    expect(h).toMatch(/^m3-[0-9a-f]{16}$/)
    expect(h).toBe(hashRunConfig(FIXED_BASE))
  })

  it('gives the same hash whether a default is omitted or stated explicitly', () => {
    const omitted = hashRunConfig(FIXED_BASE)
    const explicit = hashRunConfig({ ...FIXED_BASE, controllerKind: 'fixed', controller: { greenSec: FIXED_GREEN_SEC, yellowSec: YELLOW_SEC } })
    expect(explicit).toBe(omitted)
  })

  it('is independent of the order fields were written in', () => {
    const a: EngineConfig = { rows: 4, cols: 4, seed: 41021, vehiclesPerHour: 1200, durationSec: 1800 }
    const b: EngineConfig = { durationSec: 1800, vehiclesPerHour: 1200, seed: 41021, cols: 4, rows: 4 }
    expect(hashRunConfig(a)).toBe(hashRunConfig(b))
  })

  it('ignores fixed-time timing overrides for maxpressure (they do not affect the run)', () => {
    const plain = hashRunConfig({ ...FIXED_BASE, controllerKind: 'maxpressure' })
    const withIgnored = hashRunConfig({ ...FIXED_BASE, controllerKind: 'maxpressure', controller: { greenSec: 999, yellowSec: 999 } })
    expect(withIgnored).toBe(plain)
  })

  it('changes when any trajectory-affecting field changes', () => {
    const base = hashRunConfig(FIXED_BASE)
    expect(hashRunConfig({ ...FIXED_BASE, seed: 41022 })).not.toBe(base)
    expect(hashRunConfig({ ...FIXED_BASE, vehiclesPerHour: 1201 })).not.toBe(base)
    expect(hashRunConfig({ ...FIXED_BASE, durationSec: 1801 })).not.toBe(base)
    expect(hashRunConfig({ ...FIXED_BASE, rows: 5 })).not.toBe(base)
    expect(hashRunConfig({ ...FIXED_BASE, cols: 5 })).not.toBe(base)
    expect(hashRunConfig({ ...FIXED_BASE, controllerKind: 'maxpressure' })).not.toBe(base)
    expect(hashRunConfig({ ...FIXED_BASE, controller: { greenSec: FIXED_GREEN_SEC + 1, yellowSec: YELLOW_SEC } })).not.toBe(base)
  })
})

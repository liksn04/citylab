import { describe, expect, it } from 'vitest'
import {
  OBSERVATION_FEATURES,
  OBSERVATION_SIZE,
  PHASE_TIME_OBS_SCALE,
  PRESSURE_OBS_SCALE,
  encodeObservation,
} from './observation'
import type { ObservationInput } from '../controllers/Controller'

/** A green NS observation with everything neutral; override per test. */
function obs(partial: Partial<ObservationInput>): ObservationInput {
  return {
    id: 'I-1-1',
    phase: 'NS',
    activeAxis: 'NS',
    phaseElapsedSec: 0,
    minGreenSatisfied: false,
    pressure: { NS: 0, EW: 0 },
    ...partial,
  }
}

describe('observation schema (D-015)', () => {
  it('fixes the feature order and vector length the shared network depends on', () => {
    expect(OBSERVATION_FEATURES).toEqual([
      'pressureCurrent',
      'pressureOther',
      'phaseProgress',
      'minGreenSatisfied',
    ])
    expect(OBSERVATION_SIZE).toBe(4)
  })

  it('derives scales from the simulation single-source-of-truth constants', () => {
    // EDGE_CAPACITY = floor(100 / 6) = 16 ; FIXED_GREEN_SEC = 20 (constants.ts).
    expect(PRESSURE_OBS_SCALE).toBe(16)
    expect(PHASE_TIME_OBS_SCALE).toBe(20)
  })

  it('encodes a fully-neutral green observation as the zero vector', () => {
    const v = encodeObservation(obs({}))
    expect(v).toHaveLength(OBSERVATION_SIZE)
    expect(v).toEqual([0, 0, 0, 0])
  })
})

describe('encodeObservation — current/other relative framing', () => {
  it('maps pressure[current]/pressure[other] by the active (green) axis', () => {
    const v = encodeObservation(obs({ activeAxis: 'NS', pressure: { NS: 8, EW: -4 } }))
    expect(v[0]).toBeCloseTo(Math.tanh(8 / PRESSURE_OBS_SCALE), 12) // current = NS
    expect(v[1]).toBeCloseTo(Math.tanh(-4 / PRESSURE_OBS_SCALE), 12) // other = EW
  })

  it('is phase-symmetric: swapping the green axis and its pressures gives the same vector', () => {
    const nsGreen = encodeObservation(
      obs({ phase: 'NS', activeAxis: 'NS', pressure: { NS: 7, EW: -3 } }),
    )
    const ewGreen = encodeObservation(
      obs({ phase: 'EW', activeAxis: 'EW', pressure: { NS: -3, EW: 7 } }),
    )
    // Same "current-heavy vs other-light" situation → identical shared encoding.
    expect(ewGreen).toEqual(nsGreen)
  })

  it('preserves the sign of lane pressure', () => {
    const v = encodeObservation(obs({ pressure: { NS: 5, EW: -5 } }))
    expect(v[0]).toBeGreaterThan(0)
    expect(v[1]).toBeLessThan(0)
    // Symmetric magnitude of pressure → symmetric feature magnitude.
    expect(v[0]).toBeCloseTo(-v[1]!, 12)
  })
})

describe('encodeObservation — normalization bounds', () => {
  it('squashes pressure through tanh: |scale| of pressure → tanh(1)', () => {
    const v = encodeObservation(obs({ pressure: { NS: PRESSURE_OBS_SCALE, EW: -PRESSURE_OBS_SCALE } }))
    expect(v[0]).toBeCloseTo(Math.tanh(1), 12)
    expect(v[1]).toBeCloseTo(-Math.tanh(1), 12)
  })

  it('keeps pressure features within [−1, 1] and finite at extreme magnitudes (tanh saturates to ±1)', () => {
    const v = encodeObservation(obs({ pressure: { NS: 1e6, EW: -1e6 } }))
    // tanh saturates to exactly ±1 in float64 at large magnitude — bounded, never overflowing.
    expect(v[0]).toBeGreaterThan(0.999)
    expect(v[0]).toBeLessThanOrEqual(1)
    expect(v[1]).toBeLessThan(-0.999)
    expect(v[1]).toBeGreaterThanOrEqual(-1)
    expect(v.every(Number.isFinite)).toBe(true)
  })

  it('normalizes phaseProgress to [0, 1] and clamps beyond one nominal green', () => {
    expect(encodeObservation(obs({ phaseElapsedSec: 0 }))[2]).toBe(0)
    expect(encodeObservation(obs({ phaseElapsedSec: PHASE_TIME_OBS_SCALE / 2 }))[2]).toBeCloseTo(0.5, 12)
    expect(encodeObservation(obs({ phaseElapsedSec: PHASE_TIME_OBS_SCALE }))[2]).toBe(1)
    expect(encodeObservation(obs({ phaseElapsedSec: PHASE_TIME_OBS_SCALE * 3 }))[2]).toBe(1) // clamped high
    expect(encodeObservation(obs({ phaseElapsedSec: -5 }))[2]).toBe(0) // clamped low
  })

  it('encodes minGreenSatisfied as a 0/1 flag', () => {
    expect(encodeObservation(obs({ minGreenSatisfied: true }))[3]).toBe(1)
    expect(encodeObservation(obs({ minGreenSatisfied: false }))[3]).toBe(0)
  })

  it('produces an all-finite vector even when every feature is at an extreme', () => {
    const v = encodeObservation(
      obs({ pressure: { NS: 1e9, EW: -1e9 }, phaseElapsedSec: 1e9, minGreenSatisfied: true }),
    )
    expect(v).toHaveLength(OBSERVATION_SIZE)
    expect(v.every(Number.isFinite)).toBe(true)
    expect(v[2]).toBe(1)
    expect(v[3]).toBe(1)
  })
})

describe('encodeObservation — purity & preconditions', () => {
  it('is deterministic and does not mutate its input', () => {
    const input = obs({ pressure: { NS: 5, EW: 2 }, phaseElapsedSec: 4, minGreenSatisfied: true })
    const before = structuredClone(input)
    const a = encodeObservation(input)
    const b = encodeObservation(input)
    expect(a).toEqual(b)
    expect(input).toEqual(before)
  })

  it('throws on a YELLOW observation — the agent is never consulted during yellow (D-008)', () => {
    expect(() => encodeObservation(obs({ phase: 'YELLOW', activeAxis: null }))).toThrow(/green/)
  })
})

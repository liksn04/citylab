import { describe, expect, it } from 'vitest'
import { generateDemand, indexBySpawnTick, type DemandConfig } from './demand'

const base: DemandConfig = { rows: 4, cols: 4, vehiclesPerHour: 900, durationSec: 120, seed: 41021 }

describe('generateDemand', () => {
  it('produces an identical trip sequence for the same seed + config', () => {
    const a = generateDemand(base)
    const b = generateDemand(base)
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThan(0)
  })

  it('keeps arrival timing but changes OD pairs for a different seed', () => {
    const a = generateDemand(base)
    const b = generateDemand({ ...base, seed: 7 })
    // Same rate -> same count and same spawn ticks (common random numbers).
    expect(b.length).toBe(a.length)
    expect(b.map((t) => t.spawnTick)).toEqual(a.map((t) => t.spawnTick))
    // But the OD assignment differs somewhere.
    const odA = a.map((t) => `${t.originId}->${t.destId}`)
    const odB = b.map((t) => `${t.originId}->${t.destId}`)
    expect(odB).not.toEqual(odA)
  })

  it('matches the expected arrival count from the rate', () => {
    const trips = generateDemand(base)
    // 900 veh/h * 120 s = 30 vehicles exactly with a fractional accumulator.
    expect(trips.length).toBe(30)
  })

  it('never routes a vehicle from a node to itself', () => {
    const trips = generateDemand({ ...base, vehiclesPerHour: 5000, durationSec: 300 })
    for (const t of trips) expect(t.originId).not.toBe(t.destId)
  })

  it('only uses valid in-grid node ids and monotonic ids/ticks', () => {
    const trips = generateDemand(base)
    const valid = new Set<string>()
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) valid.add(`I-${r}-${c}`)
    let prevTick = -1
    trips.forEach((t, i) => {
      expect(valid.has(t.originId)).toBe(true)
      expect(valid.has(t.destId)).toBe(true)
      expect(t.id).toBe(`V-${i + 1}`)
      expect(t.spawnTick).toBeGreaterThanOrEqual(prevTick)
      prevTick = t.spawnTick
    })
  })

  it('snapshots the first few trips for the balanced seed', () => {
    const trips = generateDemand(base).slice(0, 3)
    // Golden snapshot: guards against silent changes to the demand model.
    expect(trips).toMatchInlineSnapshot(`
      [
        {
          "destId": "I-2-1",
          "id": "V-1",
          "originId": "I-1-2",
          "spawnTick": 7,
        },
        {
          "destId": "I-1-2",
          "id": "V-2",
          "originId": "I-3-3",
          "spawnTick": 15,
        },
        {
          "destId": "I-0-0",
          "id": "V-3",
          "originId": "I-1-2",
          "spawnTick": 23,
        },
      ]
    `)
  })

  it('groups trips by spawn tick', () => {
    const trips = generateDemand(base)
    const byTick = indexBySpawnTick(trips)
    let regrouped = 0
    for (const bucket of byTick.values()) regrouped += bucket.length
    expect(regrouped).toBe(trips.length)
  })

  it('produces no demand for a zero-length window', () => {
    expect(generateDemand({ ...base, durationSec: 0 })).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { TICK_SEC } from './constants'
import { findRoute } from './router'
import { TrafficEngine, type EngineConfig } from './TrafficEngine'

const scenario: EngineConfig = {
  rows: 4,
  cols: 4,
  seed: 41021,
  vehiclesPerHour: 1200,
  durationSec: 60,
}

describe('TrafficEngine integration', () => {
  it('is deterministic — identical summary and snapshot for the same config', () => {
    const a = new TrafficEngine(scenario)
    const b = new TrafficEngine(scenario)
    a.runTicks(600)
    b.runTicks(600)
    expect(a.summary()).toEqual(b.summary())
    expect(a.snapshot()).toEqual(b.snapshot())
  })

  it('render dt granularity never changes simulation state', () => {
    const stepped = new TrafficEngine(scenario)
    const ticked = new TrafficEngine(scenario)
    // Feed 30s as jagged frame dts vs. exact whole ticks.
    let fed = 0
    while (fed < 30) {
      stepped.step(0.017)
      fed += 0.017
    }
    // Match the number of whole ticks the accumulator actually ran.
    ticked.runTicks(stepped.tickIndex)
    expect(stepped.summary()).toEqual(ticked.summary())
  })

  it('conserves vehicles: admitted == active + completed at every checkpoint', () => {
    const e = new TrafficEngine(scenario)
    for (let i = 0; i < 400; i += 1) {
      e.runTicks(1)
      if (i % 37 === 0) expect(e.conservationHolds()).toBe(true)
    }
    expect(e.conservationHolds()).toBe(true)
  })

  it('leaks nothing: with drain time everything generated completes', () => {
    const e = new TrafficEngine(scenario)
    e.runTicks(4000) // 60s demand window + generous drain
    const s = e.summary()
    expect(s.backlog).toBe(0) // every generated trip was admitted
    expect(s.active).toBe(0) // every admitted vehicle left the network
    expect(s.admitted).toBe(s.completed)
    expect(s.completed).toBe(s.generated)
    expect(s.throughput).toBe(s.completed)
  })

  it('produces only in-grid, legal vehicle positions while running', () => {
    const e = new TrafficEngine(scenario)
    e.runTicks(300)
    const snap = e.snapshot()
    for (const v of snap.vehicles) {
      expect(v.progress).toBeGreaterThanOrEqual(0)
      expect(v.progress).toBeLessThanOrEqual(1)
      expect(v.fromRow).toBeGreaterThanOrEqual(0)
      expect(v.fromRow).toBeLessThan(4)
      expect(Math.abs(v.fromRow - v.toRow) + Math.abs(v.fromCol - v.toCol)).toBe(1)
    }
  })

  it('a lone vehicle obeys the free-flow timing law travelTicks = 18k + waitTicks', () => {
    // vehiclesPerHour * durationSec / 3600 = 1 -> exactly one trip.
    const solo = new TrafficEngine({ rows: 4, cols: 4, seed: 41021, vehiclesPerHour: 1800, durationSec: 2 })
    solo.runTicks(3000)
    const records = solo.completedTripRecords()
    expect(records).toHaveLength(1)
    const trip = records[0]!
    const k = findRoute(solo.graph, trip.originId, trip.destId).length
    const waitTicks = Math.round(trip.waitSec / TICK_SEC)
    expect(trip.travelTicks).toBe(18 * k + waitTicks)
    expect(trip.waitSec % TICK_SEC).toBeCloseTo(0, 10)
  })

  it('records signal switches and a non-negative max queue', () => {
    const e = new TrafficEngine(scenario)
    e.runTicks(600)
    const s = e.summary()
    expect(s.signalSwitches).toBeGreaterThan(0)
    expect(s.maxQueue).toBeGreaterThanOrEqual(0)
    expect(s.metricVersion).toBe('m1-metrics-v1')
  })

  it('locks a golden run summary (guards silent metric/model drift)', () => {
    const e = new TrafficEngine(scenario)
    e.runTicks(4000)
    expect(e.summary()).toMatchInlineSnapshot(`
      {
        "active": 0,
        "admitted": 19,
        "avgWaitingTimeSec": 20.526315789473685,
        "backlog": 0,
        "completed": 19,
        "generated": 19,
        "maxQueue": 3,
        "metricVersion": "m1-metrics-v1",
        "p95WaitingTimeSec": 44.5,
        "seed": 41021,
        "signalSwitches": 1392,
        "simTimeSec": 2000,
        "throughput": 19,
        "ticks": 4000,
      }
    `)
  })
})

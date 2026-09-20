import { describe, expect, it } from 'vitest'
import { CROSS_TICKS, EDGE_LENGTH_M, FREE_FLOW_STEP_M, TICK_SEC } from './constants'
import { buildRoadGraph } from './roadGraph'
import { findRoute } from './router'
import { createVehicle, currentEdge, stepVehicle, type Vehicle } from './vehicle'

const g = buildRoadGraph(4, 4)
// Two-edge route: intersection I-0-1 in the middle, I-0-2 is the destination.
const route = findRoute(g, 'I-0-0', 'I-0-2')

function make(overrides: Partial<Vehicle> = {}): Vehicle {
  return { ...createVehicle('V-1', route, 0), ...overrides }
}

const noLeaderGo = { leaderPos: null, entryPermitted: true }
const noLeaderStop = { leaderPos: null, entryPermitted: false }

describe('stepVehicle lifecycle', () => {
  it('SPAWNED becomes MOVING at the edge start without moving or waiting', () => {
    const r = stepVehicle(make({ status: 'SPAWNED' }), noLeaderStop, 0)
    expect(r.vehicle.status).toBe('MOVING')
    expect(r.vehicle.posOnEdge).toBe(0)
    expect(r.vehicle.waitSec).toBe(0)
  })

  it('MOVING advances one free-flow step with no waiting', () => {
    const r = stepVehicle(make({ status: 'MOVING', posOnEdge: 10 }), noLeaderStop, 1)
    expect(r.vehicle.posOnEdge).toBeCloseTo(10 + FREE_FLOW_STEP_M, 10)
    expect(r.vehicle.status).toBe('MOVING')
    expect(r.vehicle.waitSec).toBe(0)
  })

  it('car-following blocks the vehicle and accrues waiting time', () => {
    // Leader just 4 m ahead (< gap of 6) — cannot advance.
    const r = stepVehicle(make({ status: 'MOVING', posOnEdge: 10 }), { leaderPos: 14, entryPermitted: true }, 1)
    expect(r.vehicle.posOnEdge).toBe(10)
    expect(r.vehicle.status).toBe('QUEUED')
    expect(r.vehicle.waitSec).toBeCloseTo(TICK_SEC, 10)
  })

  it('car-following that still allows real progress does not count as waiting', () => {
    const r = stepVehicle(make({ status: 'MOVING', posOnEdge: 10 }), { leaderPos: 17, entryPermitted: true }, 1)
    expect(r.vehicle.posOnEdge).toBeCloseTo(11, 10) // leaderPos - gap
    expect(r.vehicle.status).toBe('MOVING')
    expect(r.vehicle.waitSec).toBe(0)
  })

  it('begins CROSSING at the stop line when entry is permitted', () => {
    const r = stepVehicle(make({ status: 'MOVING', posOnEdge: 95 }), noLeaderGo, 5)
    expect(r.vehicle.status).toBe('CROSSING')
    expect(r.vehicle.posOnEdge).toBe(EDGE_LENGTH_M)
    expect(r.vehicle.crossTicksLeft).toBe(CROSS_TICKS)
    expect(r.startedCrossing).toBe(true)
    expect(r.vehicle.waitSec).toBe(0)
  })

  it('holds at the stop line on red — moving on arrival, waiting once stopped', () => {
    // Tick where it reaches the line: it moved this tick, so it is not yet waiting.
    const arriving = stepVehicle(make({ status: 'MOVING', posOnEdge: 95 }), noLeaderStop, 5)
    expect(arriving.vehicle.posOnEdge).toBe(EDGE_LENGTH_M)
    expect(arriving.vehicle.status).toBe('MOVING')
    expect(arriving.vehicle.waitSec).toBe(0)
    // Next tick, still red, no displacement -> QUEUED + waiting.
    const stuck = stepVehicle(arriving.vehicle, noLeaderStop, 6)
    expect(stuck.vehicle.status).toBe('QUEUED')
    expect(stuck.vehicle.waitSec).toBeCloseTo(TICK_SEC, 10)
    expect(stuck.startedCrossing).toBe(false)
  })

  it('completes CROSSING onto the next edge after CROSS_TICKS', () => {
    let v = make({ status: 'CROSSING', posOnEdge: EDGE_LENGTH_M, edgeIndex: 0, crossTicksLeft: CROSS_TICKS })
    for (let i = 0; i < CROSS_TICKS; i += 1) v = stepVehicle(v, noLeaderStop, 10 + i).vehicle
    expect(v.status).toBe('MOVING')
    expect(v.edgeIndex).toBe(1)
    expect(v.posOnEdge).toBe(0)
    expect(currentEdge(v)!.id).toBe(route[1]!.id)
  })

  it('ARRIVES at the stop line of the final edge and records the tick', () => {
    const r = stepVehicle(make({ status: 'MOVING', posOnEdge: 96, edgeIndex: 1 }), noLeaderStop, 42)
    expect(r.arrived).toBe(true)
    expect(r.vehicle.status).toBe('ARRIVED')
    expect(r.vehicle.arrivedTick).toBe(42)
  })

  it('treats ARRIVED as terminal', () => {
    const arrived = make({ status: 'ARRIVED', posOnEdge: EDGE_LENGTH_M, edgeIndex: 1, arrivedTick: 42 })
    const r = stepVehicle(arrived, noLeaderGo, 43)
    expect(r.vehicle).toBe(arrived)
    expect(r.arrived).toBe(false)
  })

  it('never begins crossing during the same tick it arrives if final edge (arrival wins)', () => {
    const r = stepVehicle(make({ status: 'MOVING', posOnEdge: 99, edgeIndex: 1 }), noLeaderGo, 7)
    expect(r.vehicle.status).toBe('ARRIVED')
    expect(r.startedCrossing).toBe(false)
  })
})

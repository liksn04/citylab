import { describe, expect, it } from 'vitest'
import { buildRoadGraph } from '../simulation/roadGraph'
import { findRoute } from '../simulation/router'
import { createVehicle, type Vehicle } from '../simulation/vehicle'
import { avgWaitingTimeSec, isQueued, maxQueueSnapshot, p95WaitingTimeSec, queueLengthsByEdge } from './metrics'

const g = buildRoadGraph(4, 4)
const routeA = findRoute(g, 'I-0-0', 'I-0-2') // edges A0, A1
const routeB = findRoute(g, 'I-1-0', 'I-1-2') // a different first edge

function veh(route: Vehicle['route'], over: Partial<Vehicle>): Vehicle {
  return { ...createVehicle('V', route, 0), ...over }
}

describe('queue membership', () => {
  it('counts only stopped vehicles inside the queue zone', () => {
    // In zone (>= 100 - 30 = 70) and QUEUED -> counts.
    expect(isQueued(veh(routeA, { status: 'QUEUED', posOnEdge: 100 }))).toBe(true)
    expect(isQueued(veh(routeA, { status: 'QUEUED', posOnEdge: 70 }))).toBe(true)
    // Stopped but outside the zone -> excluded.
    expect(isQueued(veh(routeA, { status: 'QUEUED', posOnEdge: 69 }))).toBe(false)
    // Moving / crossing -> never queued even at the line.
    expect(isQueued(veh(routeA, { status: 'MOVING', posOnEdge: 100 }))).toBe(false)
    expect(isQueued(veh(routeA, { status: 'CROSSING', posOnEdge: 100 }))).toBe(false)
  })

  it('tallies queue length per approach edge', () => {
    const vehicles = [
      veh(routeA, { status: 'QUEUED', posOnEdge: 100 }),
      veh(routeA, { status: 'QUEUED', posOnEdge: 94 }),
      veh(routeA, { status: 'QUEUED', posOnEdge: 50 }), // out of zone
      veh(routeA, { status: 'MOVING', posOnEdge: 95 }), // moving
      veh(routeB, { status: 'QUEUED', posOnEdge: 88 }),
    ]
    const counts = queueLengthsByEdge(vehicles)
    expect(counts.get(routeA[0]!.id)).toBe(2)
    expect(counts.get(routeB[0]!.id)).toBe(1)
    expect(maxQueueSnapshot(vehicles)).toBe(2)
  })

  it('reports zero queue for an empty population', () => {
    expect(maxQueueSnapshot([])).toBe(0)
  })
})

describe('waiting-time aggregates', () => {
  it('averages completed-trip waits', () => {
    expect(avgWaitingTimeSec([10, 20, 30])).toBe(20)
    expect(avgWaitingTimeSec([])).toBe(0)
  })

  it('computes the nearest-rank p95', () => {
    const oneToHundred = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(p95WaitingTimeSec(oneToHundred)).toBe(95)
    const oneToTwenty = Array.from({ length: 20 }, (_, i) => i + 1)
    expect(p95WaitingTimeSec(oneToTwenty)).toBe(19) // ceil(0.95*20)=19th value
    expect(p95WaitingTimeSec([42])).toBe(42)
    expect(p95WaitingTimeSec([])).toBe(0)
  })

  it('surfaces tail starvation that the mean hides (R2)', () => {
    const waits = [...Array(90).fill(0), ...Array(10).fill(100)]
    expect(avgWaitingTimeSec(waits)).toBe(10)
    expect(p95WaitingTimeSec(waits)).toBe(100)
  })
})

import {
  CROSS_TICKS,
  EDGE_LENGTH_M,
  FREE_FLOW_STEP_M,
  MOVING_EPSILON_M,
  TICK_SEC,
  VEHICLE_GAP_M,
} from './constants'
import type { RoadEdge } from './types'

export type VehicleStatus = 'SPAWNED' | 'MOVING' | 'QUEUED' | 'CROSSING' | 'ARRIVED'

export interface Vehicle {
  id: string
  route: RoadEdge[]
  /** Index of the current edge within the route. */
  edgeIndex: number
  /** Distance travelled along the current edge (meters), in [0, EDGE_LENGTH_M]. */
  posOnEdge: number
  status: VehicleStatus
  /** Accumulated waiting time (seconds). */
  waitSec: number
  /** Ticks remaining while occupying an intersection (CROSSING only). */
  crossTicksLeft: number
  spawnTick: number
  arrivedTick: number | null
}

export interface VehicleStepContext {
  /** Position (meters) of the nearest leader ahead on the current edge, or null if none. */
  leaderPos: number | null
  /** Whether the vehicle may begin crossing the downstream intersection this tick. */
  entryPermitted: boolean
}

export interface VehicleStepResult {
  vehicle: Vehicle
  /** The vehicle reached its destination on this tick. */
  arrived: boolean
  /** The vehicle began occupying an intersection on this tick (capacity accounting). */
  startedCrossing: boolean
}

export function createVehicle(id: string, route: RoadEdge[], spawnTick: number): Vehicle {
  return {
    id,
    route,
    edgeIndex: 0,
    posOnEdge: 0,
    status: 'SPAWNED',
    waitSec: 0,
    crossTicksLeft: 0,
    spawnTick,
    arrivedTick: null,
  }
}

/** The edge a vehicle is currently travelling, or null once ARRIVED with no edge. */
export function currentEdge(v: Vehicle): RoadEdge | null {
  return v.route[v.edgeIndex] ?? null
}

function isFinalEdge(v: Vehicle): boolean {
  return v.edgeIndex >= v.route.length - 1
}

/**
 * Advance a single vehicle by one tick given its local context. Pure: it reads
 * the vehicle and context and returns a new vehicle plus lifecycle events. The
 * engine supplies the context (leader gap, crossing permission) and owns
 * cross-vehicle concerns like intersection capacity reservation.
 *
 * See docs/DATA_CONTRACTS.md for the lifecycle and the waiting-time rule.
 */
export function stepVehicle(v: Vehicle, ctx: VehicleStepContext, tick: number): VehicleStepResult {
  if (v.status === 'ARRIVED') {
    return { vehicle: v, arrived: false, startedCrossing: false }
  }

  // Momentary SPAWNED state: placed at the start of the first edge, moves next tick.
  if (v.status === 'SPAWNED') {
    return {
      vehicle: { ...v, status: 'MOVING', posOnEdge: 0 },
      arrived: false,
      startedCrossing: false,
    }
  }

  // Occupying an intersection: count down, then land on the next edge.
  if (v.status === 'CROSSING') {
    const left = v.crossTicksLeft - 1
    if (left <= 0) {
      return {
        vehicle: { ...v, status: 'MOVING', edgeIndex: v.edgeIndex + 1, posOnEdge: 0, crossTicksLeft: 0 },
        arrived: false,
        startedCrossing: false,
      }
    }
    return { vehicle: { ...v, crossTicksLeft: left }, arrived: false, startedCrossing: false }
  }

  // MOVING or QUEUED: apply free flow limited by car-following and the stop line.
  const oldPos = v.posOnEdge
  const carFollowingMax =
    ctx.leaderPos == null ? EDGE_LENGTH_M : Math.min(EDGE_LENGTH_M, ctx.leaderPos - VEHICLE_GAP_M)
  let target = Math.min(oldPos + FREE_FLOW_STEP_M, carFollowingMax)
  if (target < oldPos) target = oldPos // never reverse

  const reachesStopLine = target >= EDGE_LENGTH_M - MOVING_EPSILON_M

  if (reachesStopLine) {
    if (isFinalEdge(v)) {
      return {
        vehicle: { ...v, posOnEdge: EDGE_LENGTH_M, status: 'ARRIVED', arrivedTick: tick },
        arrived: true,
        startedCrossing: false,
      }
    }
    if (ctx.entryPermitted) {
      return {
        vehicle: { ...v, posOnEdge: EDGE_LENGTH_M, status: 'CROSSING', crossTicksLeft: CROSS_TICKS },
        arrived: false,
        startedCrossing: true,
      }
    }
    // Blocked at the stop line by a red/yellow signal or a full downstream edge.
    target = EDGE_LENGTH_M
  }

  const displacement = target - oldPos
  const moving = displacement >= MOVING_EPSILON_M
  return {
    vehicle: {
      ...v,
      posOnEdge: target,
      status: moving ? 'MOVING' : 'QUEUED',
      waitSec: moving ? v.waitSec : v.waitSec + TICK_SEC,
    },
    arrived: false,
    startedCrossing: false,
  }
}

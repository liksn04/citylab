import type { Controller, ObservationInput } from '../controllers/Controller'
import { FixedTimeController, type FixedControllerConfig } from '../controllers/FixedTimeController'
import { MaxPressureController } from '../controllers/MaxPressureController'
import type { MetricSample } from '../analytics/metricSamples'
import { avgWaitingTimeSec, maxQueueSnapshot, p95WaitingTimeSec, queueLengthsByEdge } from '../analytics/metrics'
import { METRIC_VERSION, MIN_GREEN_SEC, TICK_SEC, VEHICLE_GAP_M, YELLOW_SEC } from './constants'
import { generateDemand, type Trip } from './demand'
import { buildGrid } from './grid'
import { buildApproachIndex, computePressure, type ApproachMovement } from './pressure'
import { buildRoadGraph } from './roadGraph'
import { findRoute } from './router'
import { signalAllowsEntry } from './signals'
import { applySignalIntent, buildObservationInput, type EnvSignalConfig } from './signalMachine'
import { createFixedStepAccumulator } from './time'
import type { IntersectionState, RoadGraph } from './types'
import { createVehicle, currentEdge, stepVehicle, type Vehicle, type VehicleStatus } from './vehicle'

export type ControllerKind = 'fixed' | 'maxpressure'

export interface EngineConfig {
  rows: number
  cols: number
  seed: number
  vehiclesPerHour: number
  /** Length of the demand window (seconds). Vehicles stop spawning after this. */
  durationSec: number
  /** Fixed-time timing overrides (greenSec/yellowSec). Ignored for adaptive controllers. */
  controller?: FixedControllerConfig
  /** Which signal controller drives the run. Defaults to the fixed-time baseline. */
  controllerKind?: ControllerKind
}

export interface CompletedTrip {
  id: string
  originId: string
  destId: string
  spawnTick: number
  arrivedTick: number
  waitSec: number
  travelTicks: number
}

export interface EngineVehicleView {
  id: string
  edgeId: string
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
  axis: 'NS' | 'EW'
  /** Progress along the current edge, 0..1. */
  progress: number
  status: VehicleStatus
}

export interface EngineSnapshot {
  rows: number
  cols: number
  tick: number
  simTimeSec: number
  intersections: IntersectionState[]
  vehicles: EngineVehicleView[]
}

export interface RunSummary {
  metricVersion: string
  seed: number
  ticks: number
  simTimeSec: number
  generated: number
  admitted: number
  completed: number
  active: number
  backlog: number
  avgWaitingTimeSec: number
  p95WaitingTimeSec: number
  throughput: number
  maxQueue: number
  signalSwitches: number
}

export interface LiveMetrics {
  simTimeSec: number
  activeVehicles: number
  completedVehicles: number
  avgWaitSec: number
  throughputPerHour: number
}

/**
 * Deterministic fixed-tick traffic engine (M1). Integrates the road graph,
 * seeded demand, router, vehicle state machine, fixed signals, and metrics.
 * All state advances only in whole ticks; render dt never affects simulation
 * state (docs/DATA_CONTRACTS.md — Time).
 */
export class TrafficEngine {
  readonly graph: RoadGraph
  private readonly config: EngineConfig
  private readonly controller: Controller
  private readonly envSignalConfig: EnvSignalConfig
  private readonly approachIndex: Map<string, ApproachMovement[]>
  private readonly accumulator = createFixedStepAccumulator(TICK_SEC)
  private readonly trips: Trip[]
  private readonly routeCache = new Map<string, ReturnType<typeof findRoute>>()

  private intersections: IntersectionState[]
  private intersectionById = new Map<string, IntersectionState>()
  private vehicles: Vehicle[] = []
  private backlog: Trip[] = []
  private nextTripIndex = 0

  private currentTick = 0
  private admitted = 0
  private completedWaits: number[] = []
  private completedTrips: CompletedTrip[] = []
  private signalSwitches = 0
  private maxQueue = 0

  constructor(config: EngineConfig) {
    this.config = config
    this.graph = buildRoadGraph(config.rows, config.cols)
    this.approachIndex = buildApproachIndex(this.graph)
    if (config.controllerKind === 'maxpressure') {
      this.controller = new MaxPressureController()
      this.envSignalConfig = { minGreenSec: MIN_GREEN_SEC, yellowSec: YELLOW_SEC }
    } else {
      this.controller = new FixedTimeController({ greenSec: config.controller?.greenSec })
      // Fixed self-limits via its own green timer; env min-green must not interfere.
      this.envSignalConfig = { minGreenSec: 0, yellowSec: config.controller?.yellowSec ?? YELLOW_SEC }
    }
    this.intersections = buildGrid(config.rows, config.cols)
    for (const node of this.intersections) this.intersectionById.set(node.id, node)
    this.trips = generateDemand({
      rows: config.rows,
      cols: config.cols,
      vehiclesPerHour: config.vehiclesPerHour,
      durationSec: config.durationSec,
      seed: config.seed,
    })
  }

  /** Render-facing entry point: advance whole ticks contained in dt, carrying remainder. */
  step(dtSec: number): void {
    const ticks = this.accumulator.advance(dtSec)
    for (let i = 0; i < ticks; i += 1) this.tick()
  }

  /** Advance exactly `count` whole ticks (used by headless runs and tests). */
  runTicks(count: number): void {
    for (let i = 0; i < count; i += 1) this.tick()
  }

  get tickIndex(): number {
    return this.currentTick
  }

  private route(originId: string, destId: string) {
    const key = `${originId}->${destId}`
    let cached = this.routeCache.get(key)
    if (!cached) {
      cached = findRoute(this.graph, originId, destId)
      this.routeCache.set(key, cached)
    }
    return cached
  }

  /** Minimum occupied position per edge. A CROSSING vehicle reserves the entrance (pos 0) of its next edge. */
  private occupancyMinByEdge(): Map<string, number> {
    const min = new Map<string, number>()
    for (const v of this.vehicles) {
      let edgeId: string
      let pos: number
      if (v.status === 'ARRIVED') continue
      if (v.status === 'CROSSING') {
        const next = v.route[v.edgeIndex + 1]
        if (!next) continue
        edgeId = next.id
        pos = 0
      } else {
        const edge = currentEdge(v)
        if (!edge) continue
        edgeId = edge.id
        pos = v.posOnEdge
      }
      const existing = min.get(edgeId)
      if (existing === undefined || pos < existing) min.set(edgeId, pos)
    }
    return min
  }

  private hasEntranceRoom(occupancy: Map<string, number>, edgeId: string): boolean {
    const min = occupancy.get(edgeId)
    return min === undefined || min >= VEHICLE_GAP_M
  }

  private tick(): void {
    // 1. Advance signals through the controller. The controller only emits a
    //    HOLD/SWITCH intent from an observation (base timing + lane pressure); the
    //    environment enforces min-green + yellow and counts switches (D-008/D-009).
    //    Pressure reads start-of-tick queues, before vehicles move this tick.
    const queueByEdge = queueLengthsByEdge(this.vehicles)
    const pressureMap = computePressure(this.approachIndex, queueByEdge)
    this.intersections = this.intersections.map((node) => {
      const base = buildObservationInput(node, TICK_SEC, this.envSignalConfig)
      const input: ObservationInput = { ...base, pressure: pressureMap.get(node.id) ?? { NS: 0, EW: 0 } }
      const intent = node.phase === 'YELLOW' ? 'HOLD' : this.controller.decide(this.controller.observe(input))
      const { state, didSwitch } = applySignalIntent(node, TICK_SEC, intent, this.envSignalConfig)
      if (didSwitch) this.signalSwitches += 1
      return state
    })
    this.intersectionById = new Map(this.intersections.map((n) => [n.id, n]))

    // 2. Move due trips into the spawn backlog (preserves generation order).
    while (this.nextTripIndex < this.trips.length && this.trips[this.nextTripIndex]!.spawnTick <= this.currentTick) {
      this.backlog.push(this.trips[this.nextTripIndex]!)
      this.nextTripIndex += 1
    }

    // 3. Step vehicles, leader-first per edge, using a start-of-tick capacity snapshot.
    const capacity = this.occupancyMinByEdge()
    const reserved = new Set<string>()
    const groups = new Map<string, Vehicle[]>()
    for (const v of this.vehicles) {
      const edge = currentEdge(v)
      if (!edge) continue
      const bucket = groups.get(edge.id)
      if (bucket) bucket.push(v)
      else groups.set(edge.id, [v])
    }

    const survivors: Vehicle[] = []
    for (const edge of this.graph.edges) {
      const grp = groups.get(edge.id)
      if (!grp) continue
      grp.sort((a, b) => (b.posOnEdge - a.posOnEdge) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      let leaderPos: number | null = null
      const intersection = this.intersectionById.get(edge.to)
      for (const v of grp) {
        let entryPermitted = false
        const nextEdge = v.route[v.edgeIndex + 1]
        if (nextEdge && intersection) {
          const greenOk = signalAllowsEntry(intersection.phase, edge.axis)
          const roomOk = !reserved.has(nextEdge.id) && this.hasEntranceRoom(capacity, nextEdge.id)
          entryPermitted = greenOk && roomOk
        }
        const result = stepVehicle(v, { leaderPos, entryPermitted }, this.currentTick)
        if (result.startedCrossing && nextEdge) reserved.add(nextEdge.id)
        leaderPos = result.vehicle.posOnEdge
        if (result.arrived) {
          const trip = result.vehicle
          this.completedWaits.push(trip.waitSec)
          this.completedTrips.push({
            id: trip.id,
            originId: trip.route[0]!.from,
            destId: trip.route[trip.route.length - 1]!.to,
            spawnTick: trip.spawnTick,
            arrivedTick: trip.arrivedTick ?? this.currentTick,
            waitSec: trip.waitSec,
            travelTicks: (trip.arrivedTick ?? this.currentTick) - trip.spawnTick,
          })
        } else {
          survivors.push(result.vehicle)
        }
      }
    }
    this.vehicles = survivors

    // 4. Admit spawns onto edges with entrance room (post-movement occupancy).
    const admitOccupancy = this.occupancyMinByEdge()
    const stillWaiting: Trip[] = []
    for (const trip of this.backlog) {
      const route = this.route(trip.originId, trip.destId)
      const firstEdge = route[0]
      if (!firstEdge) continue // origin == dest (never produced by demand)
      if (this.hasEntranceRoom(admitOccupancy, firstEdge.id)) {
        this.vehicles.push(createVehicle(trip.id, route, this.currentTick))
        admitOccupancy.set(firstEdge.id, 0)
        this.admitted += 1
      } else {
        stillWaiting.push(trip)
      }
    }
    this.backlog = stillWaiting

    // 5. Sample the run-wide max queue.
    const q = maxQueueSnapshot(this.vehicles)
    if (q > this.maxQueue) this.maxQueue = q

    this.currentTick += 1
  }

  snapshot(): EngineSnapshot {
    const vehicles: EngineVehicleView[] = []
    for (const v of this.vehicles) {
      const edge = currentEdge(v)
      if (!edge) continue
      const from = this.graph.nodeById.get(edge.from)!
      const to = this.graph.nodeById.get(edge.to)!
      vehicles.push({
        id: v.id,
        edgeId: edge.id,
        fromRow: from.row,
        fromCol: from.col,
        toRow: to.row,
        toCol: to.col,
        axis: edge.axis,
        progress: v.status === 'CROSSING' ? 1 : v.posOnEdge / 100,
        status: v.status,
      })
    }
    return {
      rows: this.config.rows,
      cols: this.config.cols,
      tick: this.currentTick,
      simTimeSec: this.currentTick * TICK_SEC,
      intersections: this.intersections,
      vehicles,
    }
  }

  metrics(): LiveMetrics {
    const completed = this.completedWaits.length
    const simTimeSec = this.currentTick * TICK_SEC
    const hours = simTimeSec / 3600
    return {
      simTimeSec,
      activeVehicles: this.vehicles.length,
      completedVehicles: completed,
      avgWaitSec: avgWaitingTimeSec(this.completedWaits),
      throughputPerHour: hours > 0 ? completed / hours : 0,
    }
  }

  /**
   * Read-only raw metric sample of the current instant (M3.4, D-011). Reuses the
   * live aggregates plus the instantaneous max single-edge queue. Never mutates
   * state or the tick path — collecting samples cannot change simulation output.
   */
  sample(): MetricSample {
    const live = this.metrics()
    return {
      simTimeSec: live.simTimeSec,
      activeVehicles: live.activeVehicles,
      completedVehicles: live.completedVehicles,
      avgWaitSec: live.avgWaitSec,
      throughputPerHour: live.throughputPerHour,
      maxQueue: maxQueueSnapshot(this.vehicles),
    }
  }

  summary(): RunSummary {
    return {
      metricVersion: METRIC_VERSION,
      seed: this.config.seed,
      ticks: this.currentTick,
      simTimeSec: this.currentTick * TICK_SEC,
      generated: this.nextTripIndex,
      admitted: this.admitted,
      completed: this.completedWaits.length,
      active: this.vehicles.length,
      backlog: this.backlog.length,
      avgWaitingTimeSec: avgWaitingTimeSec(this.completedWaits),
      p95WaitingTimeSec: p95WaitingTimeSec(this.completedWaits),
      throughput: this.completedWaits.length,
      maxQueue: this.maxQueue,
      signalSwitches: this.signalSwitches,
    }
  }

  completedTripRecords(): readonly CompletedTrip[] {
    return this.completedTrips
  }

  /** Conservation invariant: every admitted vehicle is either active or completed. */
  conservationHolds(): boolean {
    return this.admitted === this.vehicles.length + this.completedWaits.length
  }
}

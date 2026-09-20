import { stepFixedSignal } from '../controllers/FixedTimeController'
import { buildGrid } from './grid'
import { createSeededRandom, type RandomSource } from './seededRandom'
import type { Axis, CitySnapshot, Point, PreviewVehicle, SimulationMetrics } from './types'

interface PreviewConfig {
  rows: number
  cols: number
  seed: number
}

export class PreviewTrafficEngine {
  private readonly rows: number
  private readonly cols: number
  private readonly rng: RandomSource
  private intersections
  private vehicles: PreviewVehicle[] = []
  private simTimeSec = 0
  private spawnAccumulator = 0
  private completedVehicles = 0
  private completedWaitSec = 0
  private nextVehicleId = 1

  constructor(config: PreviewConfig) {
    this.rows = config.rows
    this.cols = config.cols
    this.rng = createSeededRandom(config.seed)
    this.intersections = buildGrid(config.rows, config.cols)
  }

  step(dt: number) {
    const capped = Math.max(0, Math.min(dt, 1))
    this.simTimeSec += capped
    this.spawnAccumulator += capped

    this.intersections = this.intersections.map((intersection) => ({
      ...intersection,
      ...stepFixedSignal(intersection, capped),
    }))

    while (this.spawnAccumulator >= 0.8 && this.vehicles.length < 90) {
      this.spawnAccumulator -= 0.8
      this.spawnVehicle()
    }

    const survivors: PreviewVehicle[] = []
    for (const vehicle of this.vehicles) {
      const signalAllows = this.previewSignalAllows(vehicle)
      const shouldWait = !signalAllows && this.isNearCentralCrossing(vehicle)
      const next = { ...vehicle }
      if (shouldWait) {
        next.waitSec += capped
      } else {
        next.normalizedPosition += next.direction * next.speed * capped
      }

      if (next.normalizedPosition < -0.06 || next.normalizedPosition > 1.06) {
        this.completedVehicles += 1
        this.completedWaitSec += next.waitSec
      } else {
        survivors.push(next)
      }
    }
    this.vehicles = survivors
  }

  snapshot(): CitySnapshot {
    return {
      rows: this.rows,
      cols: this.cols,
      simTimeSec: this.simTimeSec,
      intersections: this.intersections,
      vehicles: this.vehicles,
    }
  }

  metrics(): SimulationMetrics {
    const completed = this.completedVehicles
    const avgWaitSec = completed > 0 ? this.completedWaitSec / completed : 0
    const hours = this.simTimeSec / 3600
    return {
      simTimeSec: this.simTimeSec,
      activeVehicles: this.vehicles.length,
      completedVehicles: completed,
      avgWaitSec,
      throughputPerHour: hours > 0 ? completed / hours : 0,
    }
  }

  pickIntersection(point: Point, width: number, height: number): string | null {
    const pad = Math.min(width, height) * 0.12
    const usableW = width - pad * 2
    const usableH = height - pad * 2
    const col = Math.round(((point.x - pad) / usableW) * (this.cols - 1))
    const row = Math.round(((point.y - pad) / usableH) * (this.rows - 1))
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null
    const x = pad + (col / (this.cols - 1)) * usableW
    const y = pad + (row / (this.rows - 1)) * usableH
    if (Math.hypot(point.x - x, point.y - y) > 28) return null
    return `I-${row}-${col}`
  }

  private spawnVehicle() {
    const axis: Axis = this.rng.next() < 0.5 ? 'NS' : 'EW'
    const lane = this.rng.int(0, axis === 'NS' ? this.cols : this.rows)
    const direction: 1 | -1 = this.rng.next() < 0.5 ? 1 : -1
    this.vehicles.push({
      id: `V-${this.nextVehicleId++}`,
      axis,
      lane,
      direction,
      normalizedPosition: direction === 1 ? -0.04 : 1.04,
      speed: 0.055 + this.rng.next() * 0.018,
      waitSec: 0,
    })
  }

  private isNearCentralCrossing(vehicle: PreviewVehicle) {
    const p = vehicle.normalizedPosition
    return p > 0.42 && p < 0.58
  }

  private previewSignalAllows(vehicle: PreviewVehicle) {
    const centerRow = Math.floor((this.rows - 1) / 2)
    const centerCol = Math.floor((this.cols - 1) / 2)
    const intersection = this.intersections.find((node) => node.row === centerRow && node.col === centerCol)
    return Boolean(intersection && intersection.phase === vehicle.axis)
  }
}

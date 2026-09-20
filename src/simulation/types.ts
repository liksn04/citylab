export type Axis = 'NS' | 'EW'
export type SignalPhase = Axis | 'YELLOW'

export interface Point { x: number; y: number }

export interface IntersectionState {
  id: string
  row: number
  col: number
  phase: SignalPhase
  targetPhase: Axis
  phaseElapsedSec: number
}

export interface PreviewVehicle {
  id: string
  axis: Axis
  lane: number
  direction: 1 | -1
  normalizedPosition: number
  speed: number
  waitSec: number
}

export interface CitySnapshot {
  rows: number
  cols: number
  simTimeSec: number
  intersections: IntersectionState[]
  vehicles: PreviewVehicle[]
}

export interface SimulationMetrics {
  simTimeSec: number
  activeVehicles: number
  completedVehicles: number
  avgWaitSec: number
  throughputPerHour: number
}

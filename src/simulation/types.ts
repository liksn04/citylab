export type Axis = 'NS' | 'EW'
export type SignalPhase = Axis | 'YELLOW'

export interface Point { x: number; y: number }

// --- Production road graph (M1.2) ---

/** Travel heading of a directed edge. N/S run on the NS axis, E/W on the EW axis. */
export type Heading = 'N' | 'S' | 'E' | 'W'

export interface RoadNode {
  id: string
  row: number
  col: number
}

export interface RoadEdge {
  id: string
  from: string
  to: string
  axis: Axis
  heading: Heading
}

export interface RoadGraph {
  rows: number
  cols: number
  nodes: RoadNode[]
  edges: RoadEdge[]
  nodeById: Map<string, RoadNode>
  edgeById: Map<string, RoadEdge>
  /** Outgoing edges per node, in canonical heading order (N, E, S, W). */
  outgoing: Map<string, RoadEdge[]>
}

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

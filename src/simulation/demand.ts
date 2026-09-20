import { TICK_SEC } from './constants'
import { nodeId } from './roadGraph'
import { createSeededRandom } from './seededRandom'

export interface Trip {
  id: string
  /** Whole tick index at which the vehicle enters the network. */
  spawnTick: number
  originId: string
  destId: string
}

export interface DemandConfig {
  rows: number
  cols: number
  /** Network-wide arrival rate. */
  vehiclesPerHour: number
  /** Length of the demand window (seconds). */
  durationSec: number
  seed: number
}

/**
 * Deterministic origin/destination demand.
 *
 * Arrival *timing* is rate-driven (a fractional-credit accumulator), so two runs
 * with the same rate spawn at the same ticks regardless of seed — this is what
 * lets different controllers be compared under identical demand (D-006). The
 * *OD pair* of each trip is drawn from the seeded PRNG, so the same seed always
 * yields the same OD sequence. Origin and destination are always distinct nodes.
 */
export function generateDemand(config: DemandConfig): Trip[] {
  const { rows, cols, vehiclesPerHour, durationSec, seed } = config
  if (rows < 2 || cols < 2) throw new Error('Demand grid must be at least 2×2')
  if (vehiclesPerHour < 0) throw new Error('vehiclesPerHour must be non-negative')
  if (durationSec < 0) throw new Error('durationSec must be non-negative')

  const nodeIds: string[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) nodeIds.push(nodeId(row, col))
  }

  const rng = createSeededRandom(seed)
  const totalTicks = Math.floor(durationSec / TICK_SEC)
  const arrivalsPerTick = (vehiclesPerHour * TICK_SEC) / 3600

  const trips: Trip[] = []
  let credit = 0
  let nextId = 1

  for (let tick = 0; tick < totalTicks; tick += 1) {
    credit += arrivalsPerTick
    while (credit >= 1) {
      credit -= 1
      const originIndex = rng.int(0, nodeIds.length)
      // Draw a distinct destination. Map the [0, N-1) pick around the origin so
      // it is uniform over the other nodes and never equals the origin.
      let destIndex = rng.int(0, nodeIds.length - 1)
      if (destIndex >= originIndex) destIndex += 1
      trips.push({
        id: `V-${nextId}`,
        spawnTick: tick,
        originId: nodeIds[originIndex]!,
        destId: nodeIds[destIndex]!,
      })
      nextId += 1
    }
  }

  return trips
}

/** Group trips by their spawn tick for tick-driven consumption by the engine. */
export function indexBySpawnTick(trips: readonly Trip[]): Map<number, Trip[]> {
  const byTick = new Map<number, Trip[]>()
  for (const trip of trips) {
    const bucket = byTick.get(trip.spawnTick)
    if (bucket) bucket.push(trip)
    else byTick.set(trip.spawnTick, [trip])
  }
  return byTick
}

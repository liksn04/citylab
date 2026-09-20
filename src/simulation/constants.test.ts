import { describe, expect, it } from 'vitest'
import {
  CROSS_TICKS,
  EDGE_CAPACITY,
  EDGE_LENGTH_M,
  FREE_FLOW_STEP_M,
  MOVING_EPSILON_M,
  QUEUE_ZONE_M,
  TICK_SEC,
  VEHICLE_GAP_M,
} from './constants'

describe('simulation constants', () => {
  it('uses a positive fixed timestep', () => {
    expect(TICK_SEC).toBeGreaterThan(0)
  })

  it('keeps a free-flow tick step well inside one edge', () => {
    expect(FREE_FLOW_STEP_M).toBeGreaterThan(0)
    expect(FREE_FLOW_STEP_M).toBeLessThan(EDGE_LENGTH_M)
  })

  it('treats "stopped" as strictly slower than free flow', () => {
    // Epsilon must be small enough that a free-flowing vehicle never reads as waiting.
    expect(MOVING_EPSILON_M).toBeGreaterThan(0)
    expect(MOVING_EPSILON_M).toBeLessThan(FREE_FLOW_STEP_M)
  })

  it('keeps queue zone and car-following gap inside an edge', () => {
    expect(VEHICLE_GAP_M).toBeGreaterThan(0)
    expect(VEHICLE_GAP_M).toBeLessThan(EDGE_LENGTH_M)
    expect(QUEUE_ZONE_M).toBeGreaterThan(VEHICLE_GAP_M)
    expect(QUEUE_ZONE_M).toBeLessThan(EDGE_LENGTH_M)
  })

  it('derives a plausible edge capacity', () => {
    expect(EDGE_CAPACITY).toBe(Math.floor(EDGE_LENGTH_M / VEHICLE_GAP_M))
    expect(EDGE_CAPACITY).toBeGreaterThan(1)
  })

  it('crosses an intersection in a whole number of ticks', () => {
    expect(Number.isInteger(CROSS_TICKS)).toBe(true)
    expect(CROSS_TICKS).toBeGreaterThanOrEqual(1)
  })
})

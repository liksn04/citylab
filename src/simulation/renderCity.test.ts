import { describe, expect, it } from 'vitest'
import { cityLayout, pickIntersection, renderCity } from './renderCity'
import { TrafficEngine } from './TrafficEngine'

/** Minimal recording stand-in for CanvasRenderingContext2D (jsdom has no real 2D backend). */
function fakeContext() {
  const calls: Record<string, number> = {}
  const record = (name: string) => () => {
    calls[name] = (calls[name] ?? 0) + 1
  }
  const ctx = {
    calls,
    clearRect: record('clearRect'),
    fillRect: record('fillRect'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    stroke: record('stroke'),
    setLineDash: record('setLineDash'),
    save: record('save'),
    translate: record('translate'),
    rotate: record('rotate'),
    restore: record('restore'),
    fillText: record('fillText'),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    font: '',
  }
  return ctx
}

describe('renderCity smoke', () => {
  it('renders a live engine snapshot without throwing and issues draw calls', () => {
    const engine = new TrafficEngine({ rows: 4, cols: 4, seed: 41021, vehiclesPerHour: 1200, durationSec: 60 })
    engine.runTicks(120) // enough for vehicles to be on the network
    const snap = engine.snapshot()
    expect(snap.vehicles.length).toBeGreaterThan(0)

    const ctx = fakeContext()
    expect(() => renderCity(ctx as unknown as CanvasRenderingContext2D, 800, 600, snap)).not.toThrow()

    // Background + intersections + vehicles all draw rectangles; roads stroke.
    expect(ctx.calls.clearRect).toBe(1)
    expect(ctx.calls.fillRect).toBeGreaterThan(snap.intersections.length)
    expect(ctx.calls.stroke).toBeGreaterThan(0)
    // Each vehicle is drawn inside a save/restore pair.
    expect(ctx.calls.save).toBe(snap.vehicles.length)
    expect(ctx.calls.restore).toBe(snap.vehicles.length)
  })

  it('renders an empty network (no vehicles) without error', () => {
    const engine = new TrafficEngine({ rows: 4, cols: 4, seed: 1, vehiclesPerHour: 0, durationSec: 10 })
    const ctx = fakeContext()
    expect(() => renderCity(ctx as unknown as CanvasRenderingContext2D, 400, 400, engine.snapshot())).not.toThrow()
    expect(ctx.calls.save).toBeUndefined()
  })
})

describe('pickIntersection geometry', () => {
  it('maps a click on an intersection centre to its id', () => {
    const { xFor, yFor } = cityLayout(800, 600, 4, 4)
    expect(pickIntersection({ x: xFor(2), y: yFor(1) }, 800, 600, 4, 4)).toBe('I-1-2')
    expect(pickIntersection({ x: xFor(0), y: yFor(0) }, 800, 600, 4, 4)).toBe('I-0-0')
  })

  it('returns null when the click is far from any intersection', () => {
    const { xFor, yFor } = cityLayout(800, 600, 4, 4)
    // Midway between two intersections (> 28px from either centre).
    const midX = (xFor(0) + xFor(1)) / 2
    expect(pickIntersection({ x: midX, y: yFor(0) }, 800, 600, 4, 4)).toBeNull()
    expect(pickIntersection({ x: -50, y: -50 }, 800, 600, 4, 4)).toBeNull()
  })
})

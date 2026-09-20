import { describe, expect, it } from 'vitest'
import { createFixedStepAccumulator, secondsToTicks, ticksToSeconds } from './time'

describe('createFixedStepAccumulator', () => {
  it('yields one tick per TICK_SEC of elapsed time', () => {
    const acc = createFixedStepAccumulator(0.5)
    expect(acc.advance(0.5)).toBe(1)
    expect(acc.advance(1.0)).toBe(2)
  })

  it('carries the sub-tick remainder instead of dropping it', () => {
    const acc = createFixedStepAccumulator(0.5)
    expect(acc.advance(0.3)).toBe(0)
    expect(acc.remainderSec()).toBeCloseTo(0.3, 10)
    expect(acc.advance(0.3)).toBe(1) // 0.3 + 0.3 = 0.6 -> one tick, 0.1 carried
    expect(acc.remainderSec()).toBeCloseTo(0.1, 10)
  })

  it('is frame-rate independent: many small dts equal one big dt', () => {
    const coarse = createFixedStepAccumulator(0.5)
    const fine = createFixedStepAccumulator(0.5)
    const coarseTicks = coarse.advance(5)
    let fineTicks = 0
    for (let i = 0; i < 50; i += 1) fineTicks += fine.advance(0.1)
    expect(fineTicks).toBe(coarseTicks)
    expect(fineTicks).toBe(10)
  })

  it('never advances on non-positive or non-finite dt', () => {
    const acc = createFixedStepAccumulator(0.5)
    expect(acc.advance(0)).toBe(0)
    expect(acc.advance(-2)).toBe(0)
    expect(acc.advance(Number.NaN)).toBe(0)
    expect(acc.advance(Number.POSITIVE_INFINITY)).toBe(0)
    expect(acc.remainderSec()).toBe(0)
  })

  it('rejects a non-positive tick size', () => {
    expect(() => createFixedStepAccumulator(0)).toThrow()
  })
})

describe('tick <-> second helpers', () => {
  it('floors seconds into whole ticks', () => {
    expect(secondsToTicks(1800, 0.5)).toBe(3600)
    expect(secondsToTicks(0.9, 0.5)).toBe(1)
  })

  it('round-trips whole ticks back to seconds', () => {
    expect(ticksToSeconds(3600, 0.5)).toBe(1800)
  })
})

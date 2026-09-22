import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EPSILON_SCHEDULE,
  epsilonAt,
  epsilonGreedyAction,
  greedyAction,
  type EpsilonSchedule,
} from './epsilon'
import { ACTION_SIZE } from './action'
import { createSeededRandom } from '../simulation/seededRandom'

const schedule: EpsilonSchedule = { start: 1, end: 0.1, decaySteps: 100 }

describe('epsilonAt (M4.5) — linear anneal', () => {
  it('starts at `start` and clamps a non-positive step to `start`', () => {
    expect(epsilonAt(0, schedule)).toBe(1)
    expect(epsilonAt(-5, schedule)).toBe(1)
  })

  it('reaches `end` at decaySteps and stays there beyond', () => {
    expect(epsilonAt(100, schedule)).toBeCloseTo(0.1, 12)
    expect(epsilonAt(250, schedule)).toBeCloseTo(0.1, 12)
  })

  it('is the midpoint halfway through the anneal', () => {
    expect(epsilonAt(50, schedule)).toBeCloseTo(0.55, 12) // (1 + 0.1) / 2
  })

  it('is monotonically non-increasing', () => {
    let prev = epsilonAt(0, schedule)
    for (let step = 1; step <= 150; step += 1) {
      const e = epsilonAt(step, schedule)
      expect(e).toBeLessThanOrEqual(prev + 1e-12)
      prev = e
    }
  })

  it('falls back to `start` for a non-positive decaySteps', () => {
    expect(epsilonAt(10, { start: 0.8, end: 0.1, decaySteps: 0 })).toBe(0.8)
  })

  it('exposes a sane default schedule', () => {
    expect(DEFAULT_EPSILON_SCHEDULE.start).toBeGreaterThan(DEFAULT_EPSILON_SCHEDULE.end)
    expect(DEFAULT_EPSILON_SCHEDULE.decaySteps).toBeGreaterThan(0)
  })
})

describe('greedyAction', () => {
  it('returns the argmax index', () => {
    expect(greedyAction([0.2, 0.9])).toBe(1)
    expect(greedyAction([0.9, 0.2])).toBe(0)
  })

  it('breaks ties toward the lowest index', () => {
    expect(greedyAction([1, 1])).toBe(0)
    expect(greedyAction([3, 3, 3])).toBe(0)
  })

  it('throws on an empty Q-row', () => {
    expect(() => greedyAction([])).toThrow(/non-empty/)
  })
})

describe('epsilonGreedyAction', () => {
  it('always exploits the greedy action when epsilon is 0', () => {
    const rng = createSeededRandom(42)
    for (let i = 0; i < 25; i += 1) {
      expect(epsilonGreedyAction([0.1, 0.9], 0, rng)).toBe(1)
    }
  })

  it('always explores when epsilon is 1, and stays within the action space', () => {
    const rng = createSeededRandom(42)
    for (let i = 0; i < 25; i += 1) {
      const a = epsilonGreedyAction([5, -5], 1, rng) // greedy would be 0; exploration may differ
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(ACTION_SIZE)
    }
  })

  it('is deterministic for a given seed', () => {
    const run = () => {
      const rng = createSeededRandom(7)
      return Array.from({ length: 12 }, () => epsilonGreedyAction([0.3, 0.7], 0.5, rng))
    }
    expect(run()).toEqual(run())
  })
})

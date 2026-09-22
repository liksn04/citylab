import { beforeAll, describe, expect, it } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { epsilonGreedyPolicy, greedyPolicy } from './dqnPolicy'
import { buildQNetwork, predictQValues } from './qNetwork'
import { greedyAction, type EpsilonSchedule } from './epsilon'
import { ACTION_SIZE } from './action'
import { createSeededRandom } from '../simulation/seededRandom'

beforeAll(async () => {
  await tf.ready()
})

const OBS = [0.3, -0.2, 0.5, 1]

describe('greedyPolicy (M4.9)', () => {
  it('returns the argmax action of the model for an observation', () => {
    const model = buildQNetwork()
    const expected = greedyAction(predictQValues(model, [OBS])[0]!)
    expect(greedyPolicy(model)(OBS)).toBe(expected)
    model.dispose()
  })
})

describe('epsilonGreedyPolicy (M4.9)', () => {
  it('reduces to greedy when the schedule pins epsilon to 0', () => {
    const model = buildQNetwork()
    const zero: EpsilonSchedule = { start: 0, end: 0, decaySteps: 1 }
    const policy = epsilonGreedyPolicy(model, zero, createSeededRandom(1))
    const expected = greedyAction(predictQValues(model, [OBS])[0]!)
    for (let i = 0; i < 10; i += 1) expect(policy(OBS)).toBe(expected)
    model.dispose()
  })

  it('always returns an in-range action and is deterministic for a seed', () => {
    const model = buildQNetwork()
    const sched: EpsilonSchedule = { start: 1, end: 0, decaySteps: 20 }
    const run = () => {
      const p = epsilonGreedyPolicy(model, sched, createSeededRandom(42))
      return Array.from({ length: 12 }, () => p(OBS))
    }
    const a = run()
    for (const action of a) {
      expect(action).toBeGreaterThanOrEqual(0)
      expect(action).toBeLessThan(ACTION_SIZE)
    }
    expect(run()).toEqual(a) // same model + seed → same action sequence
    model.dispose()
  })
})

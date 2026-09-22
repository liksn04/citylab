import { beforeAll, describe, expect, it } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { DqnTrainer, DEFAULT_DQN_HYPERPARAMS } from './dqnUpdate'
import { DqnModel } from './qNetwork'
import type { Transition } from './replayBuffer'

beforeAll(async () => {
  await tf.ready()
})

/** A small fixed batch with varied observations, actions, and rewards. */
function fixedBatch(): Transition[] {
  return [
    { obs: [0, 0, 0, 0], action: 0, reward: -3, nextObs: [0.1, 0, 0, 0], done: false },
    { obs: [0.5, -0.5, 0.2, 1], action: 1, reward: -1, nextObs: [0.4, -0.3, 0.5, 1], done: false },
    { obs: [-1, 1, 0.9, 0], action: 0, reward: -5, nextObs: [-0.8, 0.7, 1, 0], done: false },
    { obs: [0.2, 0.2, 0, 1], action: 1, reward: 0, nextObs: [0, 0, 0, 0], done: true },
  ]
}

describe('DqnTrainer.trainStep (M4.6, D-019)', () => {
  it('returns a finite scalar loss', () => {
    const model = new DqnModel()
    const trainer = new DqnTrainer(model)
    const loss = trainer.trainStep(fixedBatch())
    expect(Number.isFinite(loss)).toBe(true)
    expect(loss).toBeGreaterThanOrEqual(0) // Huber loss is non-negative
    trainer.dispose()
    model.dispose()
  })

  it('handles terminal (done) transitions where the target is reward-only', () => {
    const model = new DqnModel()
    const trainer = new DqnTrainer(model)
    const loss = trainer.trainStep([
      { obs: [0, 0, 0, 0], action: 0, reward: -2, nextObs: [0, 0, 0, 0], done: true },
    ])
    expect(Number.isFinite(loss)).toBe(true)
    trainer.dispose()
    model.dispose()
  })

  it('reduces loss on a fixed batch over repeated steps (the update actually learns)', () => {
    const model = new DqnModel()
    const trainer = new DqnTrainer(model)
    const batch = fixedBatch()
    const initial = trainer.trainStep(batch)
    let final = initial
    for (let i = 0; i < 150; i += 1) final = trainer.trainStep(batch)
    expect(final).toBeLessThan(initial) // regression toward a fixed target descends
    expect(Number.isFinite(final)).toBe(true)
    trainer.dispose()
    model.dispose()
  })

  it('throws on an empty batch', () => {
    const model = new DqnModel()
    const trainer = new DqnTrainer(model)
    expect(() => trainer.trainStep([])).toThrow(/non-empty/)
    trainer.dispose()
    model.dispose()
  })

  it('exposes tunable default hyperparameters', () => {
    expect(DEFAULT_DQN_HYPERPARAMS.gamma).toBeGreaterThan(0)
    expect(DEFAULT_DQN_HYPERPARAMS.gamma).toBeLessThanOrEqual(1)
    expect(DEFAULT_DQN_HYPERPARAMS.learningRate).toBeGreaterThan(0)
  })
})

describe('DqnTrainer — tensor discipline (M4 leak criterion)', () => {
  it('leaves tf.memory().numTensors unchanged across build, many steps, and dispose', () => {
    const before = tf.memory().numTensors
    const model = new DqnModel()
    const trainer = new DqnTrainer(model)
    const batch = fixedBatch()
    for (let i = 0; i < 10; i += 1) trainer.trainStep(batch)
    trainer.dispose()
    model.dispose()
    expect(tf.memory().numTensors).toBe(before)
  })
})

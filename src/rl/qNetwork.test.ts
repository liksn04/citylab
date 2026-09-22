import { beforeAll, describe, expect, it } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { DqnModel, DQN_HIDDEN_UNITS, buildQNetwork } from './qNetwork'
import { OBSERVATION_SIZE } from './observation'
import { ACTION_SIZE } from './action'

beforeAll(async () => {
  await tf.ready()
})

describe('buildQNetwork (M4.4, D-018)', () => {
  it('wires OBSERVATION_SIZE -> hidden -> ACTION_SIZE with the expected weight shapes', () => {
    const hidden = 8
    const net = buildQNetwork(hidden)
    // Dense1 kernel/bias, Dense2 kernel/bias.
    const shapes = net.getWeights().map((w) => w.shape)
    expect(shapes).toEqual([
      [OBSERVATION_SIZE, hidden],
      [hidden],
      [hidden, ACTION_SIZE],
      [ACTION_SIZE],
    ])
    net.dispose()
  })

  it('defaults the hidden layer to DQN_HIDDEN_UNITS', () => {
    expect(DQN_HIDDEN_UNITS).toBeGreaterThan(0)
    const net = buildQNetwork()
    expect(net.getWeights()[0]!.shape).toEqual([OBSERVATION_SIZE, DQN_HIDDEN_UNITS])
    net.dispose()
  })
})

describe('DqnModel — prediction shape', () => {
  it('returns one Q-row of length ACTION_SIZE per observation, all finite', () => {
    const model = new DqnModel()
    const q = model.predictQ([
      [0, 0, 0, 0],
      [0.5, -0.5, 0.3, 1],
      [-1, 1, 0, 0],
    ])
    expect(q).toHaveLength(3)
    for (const row of q) {
      expect(row).toHaveLength(ACTION_SIZE)
      expect(row.every(Number.isFinite)).toBe(true)
    }
    model.dispose()
  })

  it('returns an empty batch without touching tensors', () => {
    const model = new DqnModel()
    expect(model.predictQ([])).toEqual([])
    model.dispose()
  })
})

describe('DqnModel — target network', () => {
  it('starts with target equal to online (constructor syncs)', () => {
    const model = new DqnModel()
    const obs = [[0.1, 0.2, 0.3, 1]]
    expect(model.predictTargetQ(obs)).toEqual(model.predictQ(obs))
    model.dispose()
  })

  it('syncTarget copies online weights into a stale target', () => {
    const model = new DqnModel()
    const obs = [[0.5, -0.5, 0.3, 0]]

    // Perturb online so target becomes stale (setWeights copies values in).
    const bumped = model.online.getWeights().map((w) => tf.tidy(() => w.add(tf.onesLike(w))))
    model.online.setWeights(bumped)
    bumped.forEach((t) => t.dispose())

    const onlineQ = model.predictQ(obs)
    expect(model.predictTargetQ(obs)).not.toEqual(onlineQ) // stale
    model.syncTarget()
    expect(model.predictTargetQ(obs)).toEqual(onlineQ) // now matches
    model.dispose()
  })
})

describe('DqnModel — tensor discipline (M4 leak criterion)', () => {
  it('leaves tf.memory().numTensors unchanged across build, predict, sync, and dispose', () => {
    const before = tf.memory().numTensors
    const model = new DqnModel()
    model.predictQ([
      [0, 0, 0, 0],
      [1, -1, 0.5, 1],
    ])
    model.predictTargetQ([[0.2, 0.2, 0.2, 0]])
    model.syncTarget()
    model.dispose()
    expect(tf.memory().numTensors).toBe(before)
  })
})

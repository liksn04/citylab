import { beforeAll, describe, expect, it } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { loadQNetwork, serializeQNetwork } from './modelStorage'
import { buildQNetwork, predictQValues } from './qNetwork'
import { OBSERVATION_SIZE } from './observation'
import { ACTION_SIZE } from './action'

beforeAll(async () => {
  await tf.ready()
})

const OBS = [
  [0.1, 0.2, 0.3, 1],
  [-1, 1, 0, 0],
  [0.5, -0.5, 0.9, 0],
]

describe('model save/load (M4.8)', () => {
  it('round-trips a network with bit-identical predictions (parity)', async () => {
    const original = buildQNetwork()
    const before = predictQValues(original, OBS)
    const artifacts = await serializeQNetwork(original)
    const restored = await loadQNetwork(artifacts)
    const after = predictQValues(restored, OBS)
    expect(after).toEqual(before)
    original.dispose()
    restored.dispose()
  })

  it('produces portable artifacts (topology + weights)', async () => {
    const model = buildQNetwork()
    const artifacts = await serializeQNetwork(model)
    expect(artifacts.modelTopology).toBeDefined()
    expect(artifacts.weightSpecs).toBeDefined()
    expect(artifacts.weightData).toBeDefined()
    model.dispose()
  })

  it('restores the same architecture (weight shapes)', async () => {
    const model = buildQNetwork(8)
    const restored = await loadQNetwork(await serializeQNetwork(model))
    expect(restored.getWeights().map((w) => w.shape)).toEqual([
      [OBSERVATION_SIZE, 8],
      [8],
      [8, ACTION_SIZE],
      [ACTION_SIZE],
    ])
    model.dispose()
    restored.dispose()
  })

  it('does not leak tensors across serialize, load, predict, and dispose', async () => {
    const before = tf.memory().numTensors
    const model = buildQNetwork()
    const restored = await loadQNetwork(await serializeQNetwork(model))
    predictQValues(restored, OBS)
    model.dispose()
    restored.dispose()
    expect(tf.memory().numTensors).toBe(before)
  })
})

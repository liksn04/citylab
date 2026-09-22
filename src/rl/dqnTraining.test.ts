import { beforeAll, describe, expect, it } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { evaluateDqn, trainDqn, type TrainConfig } from './dqnTraining'
import { DqnModel } from './qNetwork'
import { METRIC_VERSION } from '../simulation/constants'
import type { Scenario } from '../simulation/scenarios'

beforeAll(async () => {
  await tf.ready()
})

/** Small, fast 4x4 scenario for machinery tests (not a benchmark). */
const SMALL: Scenario = {
  id: 'test-small-4x4',
  scenarioVersion: 'v1',
  controllerId: 'fixed-v1',
  rows: 4,
  cols: 4,
  seed: 11,
  vehiclesPerHour: 600,
  durationSec: 20,
}

describe('evaluateDqn (M4.9, D-021)', () => {
  it('runs the DQN through the engine and returns a valid summary', () => {
    const model = new DqnModel()
    const summary = evaluateDqn(model, SMALL)
    expect(summary.metricVersion).toBe(METRIC_VERSION)
    expect(summary.seed).toBe(SMALL.seed)
    expect(Number.isFinite(summary.avgWaitingTimeSec)).toBe(true)
    expect(summary.completed).toBeGreaterThanOrEqual(0)
    model.dispose()
  })

  it('is deterministic for a fixed model and seed', () => {
    const model = new DqnModel()
    expect(evaluateDqn(model, SMALL)).toEqual(evaluateDqn(model, SMALL))
    model.dispose()
  })
})

describe('trainDqn (M4.9, D-021)', () => {
  const config: TrainConfig = {
    scenario: SMALL,
    trainSeeds: [1, 2],
    episodes: 2,
    trainStepsPerEpisode: 5,
    bufferCapacity: 500,
    batchSize: 8,
    minBufferToTrain: 8,
    targetSyncInterval: 5,
    learnerSeed: 7,
    epsilon: { start: 1, end: 0.1, decaySteps: 100 },
  }

  it('collects decision-point transitions and produces finite losses', () => {
    const result = trainDqn(config)
    expect(result.transitions).toBeGreaterThan(0)
    expect(result.losses.length).toBeGreaterThan(0)
    expect(result.losses.every(Number.isFinite)).toBe(true)
    result.model.dispose()
    result.trainer.dispose()
  })

  it('leaves no leaked tensors once the trained model and trainer are disposed', () => {
    const before = tf.memory().numTensors
    const result = trainDqn(config)
    result.model.dispose()
    result.trainer.dispose()
    expect(tf.memory().numTensors).toBe(before)
  })

  it('produces a model usable for evaluation on a separate eval seed', () => {
    const result = trainDqn(config)
    const evalScenario: Scenario = { ...SMALL, id: 'test-small-4x4-eval', seed: 999 } // eval seed != train seeds
    const summary = evaluateDqn(result.model, evalScenario)
    expect(summary.metricVersion).toBe(METRIC_VERSION)
    expect(Number.isFinite(summary.avgWaitingTimeSec)).toBe(true)
    result.model.dispose()
    result.trainer.dispose()
  })
})

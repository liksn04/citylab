import { beforeAll, describe, expect, it } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { evaluateDqnVsFixed, trainDqn, type TrainConfig } from './dqnTraining'
import { METRIC_VERSION } from '../simulation/constants'
import type { Scenario } from '../simulation/scenarios'

beforeAll(async () => {
  await tf.ready()
})

/**
 * M4.10 exercises the repeated-seed DQN-vs-Fixed comparison harness. It asserts
 * the machinery (train → evaluate both controllers on disjoint eval seeds →
 * valid, common-random-numbers-aligned summaries), NOT that the DQN wins — the
 * measured improvement/regression trade-off is recorded in docs/PROGRESS.md from
 * a full run (training weight init is stochastic, R8, so exact numbers are not
 * pinned as a fixture).
 */
const SMALL: Scenario = {
  id: 'test-baseline-4x4',
  scenarioVersion: 'v1',
  controllerId: 'fixed-v1',
  rows: 4,
  cols: 4,
  seed: 41021,
  vehiclesPerHour: 900,
  durationSec: 60,
}

describe('evaluateDqnVsFixed (M4.10)', () => {
  it('reports DQN and Fixed side by side over disjoint eval seeds under common random numbers', () => {
    const trainSeeds = [41021, 41022, 41023]
    const evalSeeds = [51001, 51002]
    // eval seeds must be disjoint from train seeds (TEST_STRATEGY).
    expect(evalSeeds.some((s) => trainSeeds.includes(s))).toBe(false)

    const config: TrainConfig = {
      scenario: SMALL,
      trainSeeds,
      episodes: 3,
      trainStepsPerEpisode: 20,
      bufferCapacity: 5000,
      batchSize: 16,
      minBufferToTrain: 32,
      targetSyncInterval: 20,
      learnerSeed: 7,
      epsilon: { start: 1, end: 0.1, decaySteps: 5000 },
    }
    const result = trainDqn(config)
    const comparison = evaluateDqnVsFixed(result.model, SMALL, evalSeeds)
    result.model.dispose()
    result.trainer.dispose()

    expect(comparison).toHaveLength(evalSeeds.length)
    for (const { seed, dqn, fixed } of comparison) {
      expect(dqn.seed).toBe(seed)
      expect(fixed.seed).toBe(seed)
      expect(dqn.metricVersion).toBe(METRIC_VERSION)
      expect(fixed.metricVersion).toBe(METRIC_VERSION)
      expect(Number.isFinite(dqn.avgWaitingTimeSec)).toBe(true)
      expect(Number.isFinite(fixed.avgWaitingTimeSec)).toBe(true)
      // Both controllers saw the same demand for this seed (common random numbers).
      expect(dqn.generated).toBe(fixed.generated)
    }
  }, 120000)
})

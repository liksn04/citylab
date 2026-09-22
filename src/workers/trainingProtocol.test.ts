import { beforeAll, describe, expect, it } from 'vitest'
import * as tf from '@tensorflow/tfjs'
import { TrainingSession, type TrainingConfig } from './trainingProtocol'
import { epsilonAt, type EpsilonSchedule } from '../rl/epsilon'
import type { Transition } from '../rl/replayBuffer'

beforeAll(async () => {
  await tf.ready()
})

const EPS: EpsilonSchedule = { start: 1, end: 0, decaySteps: 10 }

function config(overrides: Partial<TrainingConfig> = {}): TrainingConfig {
  return {
    bufferCapacity: 100,
    batchSize: 2,
    minBufferToTrain: 4,
    targetSyncInterval: 2,
    epsilon: EPS,
    seed: 1,
    ...overrides,
  }
}

function tx(i: number): Transition {
  return { obs: [i, 0, 0, 0], action: i % 2, reward: -i, nextObs: [i + 1, 0, 0, 0], done: false }
}

const batch = (n: number): Transition[] => Array.from({ length: n }, (_, i) => tx(i))

describe('TrainingSession protocol (M4.7, D-020)', () => {
  it('errors when a command arrives before init', () => {
    const s = new TrainingSession()
    expect(s.handle({ type: 'train', steps: 1 })).toEqual([{ type: 'error', message: expect.stringContaining('init') }])
  })

  it('acknowledges init with ready', () => {
    const s = new TrainingSession()
    expect(s.handle({ type: 'init', config: config() })).toEqual([{ type: 'ready' }])
    s.dispose()
  })

  it('skips training while the buffer is below minBufferToTrain', () => {
    const s = new TrainingSession()
    s.handle({ type: 'init', config: config({ minBufferToTrain: 4 }) })
    s.handle({ type: 'push', transitions: batch(2) }) // only 2 < 4
    const out = s.handle({ type: 'train', steps: 3 })
    expect(out).toEqual([{ type: 'skipped', reason: expect.any(String), bufferSize: 2 }])
    s.dispose()
  })

  it('emits one finite-loss progress message per step with deterministic step/epsilon', () => {
    const s = new TrainingSession()
    s.handle({ type: 'init', config: config() })
    s.handle({ type: 'push', transitions: batch(6) })
    const out = s.handle({ type: 'train', steps: 3 })
    expect(out).toHaveLength(3)
    out.forEach((msg, i) => {
      expect(msg.type).toBe('progress')
      if (msg.type === 'progress') {
        expect(msg.step).toBe(i + 1)
        expect(Number.isFinite(msg.loss)).toBe(true)
        expect(msg.bufferSize).toBe(6)
        expect(msg.epsilon).toBeCloseTo(epsilonAt(i + 1, EPS), 12) // 0.9, 0.8, 0.7
      }
    })
    s.dispose()
  })

  it('trains across a target-sync boundary without error', () => {
    const s = new TrainingSession()
    s.handle({ type: 'init', config: config({ targetSyncInterval: 2 }) })
    s.handle({ type: 'push', transitions: batch(8) })
    const out = s.handle({ type: 'train', steps: 5 }) // syncs at steps 2 and 4
    expect(out).toHaveLength(5)
    expect(out.every((m) => m.type === 'progress')).toBe(true)
    s.dispose()
  })

  it('rejects a non-positive train step count', () => {
    const s = new TrainingSession()
    s.handle({ type: 'init', config: config() })
    s.handle({ type: 'push', transitions: batch(6) })
    expect(s.handle({ type: 'train', steps: 0 })[0]!.type).toBe('error')
    s.dispose()
  })

  it('stops and clears the session (further commands error)', () => {
    const s = new TrainingSession()
    s.handle({ type: 'init', config: config() })
    expect(s.handle({ type: 'stop' })).toEqual([{ type: 'stopped' }])
    expect(s.handle({ type: 'train', steps: 1 })[0]!.type).toBe('error')
  })
})

describe('TrainingSession — tensor discipline (M4 leak criterion)', () => {
  it('leaves tf.memory().numTensors unchanged across a full init/push/train/stop lifecycle', () => {
    const before = tf.memory().numTensors
    const s = new TrainingSession()
    s.handle({ type: 'init', config: config() })
    s.handle({ type: 'push', transitions: batch(8) })
    s.handle({ type: 'train', steps: 6 })
    s.handle({ type: 'stop' })
    expect(tf.memory().numTensors).toBe(before)
  })
})

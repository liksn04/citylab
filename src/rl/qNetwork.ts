import * as tf from '@tensorflow/tfjs'
import { ACTION_SIZE } from './action'
import { OBSERVATION_SIZE } from './observation'

/**
 * Shared-DQN Q-network (M4.4, D-018). A small MLP that maps an encoded
 * observation (length OBSERVATION_SIZE, D-015) to a Q-value per action
 * (ACTION_SIZE, D-016). One network is shared across every intersection (D-002);
 * per-intersection observations are fed as batch rows.
 *
 * Tensor discipline: every forward pass runs inside `tf.tidy` and returns plain
 * JS arrays, and `dispose()` frees both networks — so `tf.memory().numTensors`
 * is unchanged across build/predict/sync/dispose (M4 tensor-leak criterion).
 * No optimizer/loss/training here — that is the update step (M4.6).
 */

/**
 * Hidden units of the single-layer Q-network (D-018). Set to 64 — the value that
 * produced a clean Fixed-beating policy in the M4.10 tuning (D-019 note).
 */
export const DQN_HIDDEN_UNITS = 64

/** Build one Q-network: OBSERVATION_SIZE -> Dense(hidden, relu) -> Dense(ACTION_SIZE, linear). */
export function buildQNetwork(hiddenUnits = DQN_HIDDEN_UNITS): tf.Sequential {
  const model = tf.sequential()
  model.add(tf.layers.dense({ inputShape: [OBSERVATION_SIZE], units: hiddenUnits, activation: 'relu' }))
  model.add(tf.layers.dense({ units: ACTION_SIZE, activation: 'linear' }))
  return model
}

/**
 * Q-values for a batch of observations from any Q-network (online, target, or a
 * loaded model). Returns rows of length ACTION_SIZE as plain arrays; leak-free
 * (tf.tidy + arraySync). An empty batch returns [].
 */
export function predictQValues(model: tf.LayersModel, observations: number[][]): number[][] {
  if (observations.length === 0) return []
  return tf.tidy(() => {
    const input = tf.tensor2d(observations, [observations.length, OBSERVATION_SIZE])
    const q = model.predict(input) as tf.Tensor
    return q.arraySync() as number[][]
  })
}

/**
 * Owns the online network and its periodically-synced target clone (D-018). The
 * target stabilizes DQN bootstrap targets; `syncTarget()` copies online weights
 * into it. Predictions return plain arrays; call `dispose()` to free both.
 */
export class DqnModel {
  readonly online: tf.Sequential
  readonly target: tf.Sequential

  constructor(hiddenUnits = DQN_HIDDEN_UNITS) {
    this.online = buildQNetwork(hiddenUnits)
    this.target = buildQNetwork(hiddenUnits)
    this.syncTarget() // start with target == online
  }

  /** Copy the online network's weights into the target network. */
  syncTarget(): void {
    // getWeights() returns the online model's live weight tensors (not clones);
    // setWeights copies their values into the target's variables — no leak.
    this.target.setWeights(this.online.getWeights())
  }

  /** Online Q-values for a batch of observations → rows of length ACTION_SIZE. */
  predictQ(observations: number[][]): number[][] {
    return predictQValues(this.online, observations)
  }

  /** Target Q-values for a batch of observations → rows of length ACTION_SIZE. */
  predictTargetQ(observations: number[][]): number[][] {
    return predictQValues(this.target, observations)
  }

  /** Free both networks' tensors. After this the model must not be used. */
  dispose(): void {
    this.online.dispose()
    this.target.dispose()
  }
}

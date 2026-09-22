import * as tf from '@tensorflow/tfjs'
import { ACTION_SIZE } from './action'
import { OBSERVATION_SIZE } from './observation'
import type { DqnModel } from './qNetwork'
import type { Transition } from './replayBuffer'

/**
 * DQN update step (M4.6, D-019). One Adam gradient step on the online network for
 * a replay minibatch, using the target network to form bootstrap targets:
 *
 *   y    = reward + γ · maxₐ' Q_target(nextObs) · (1 − done)   (no gradient)
 *   loss = Huber( y, Q_online(obs)[action] )
 *
 * Only the taken action's Q contributes to the loss (one-hot mask). Tensor
 * discipline keeps `tf.memory().numTensors` flat across steps: intermediates run
 * in `tf.tidy`, the returned loss scalar is read then disposed, batch tensors are
 * disposed at the end, and `dispose()` frees the optimizer's Adam accumulators.
 *
 * This is a single step over a given batch — batch size, target-sync cadence, and
 * the epsilon schedule belong to the training loop (M4.7/M4.9), not here.
 */

export interface DqnHyperparams {
  /** Discount factor. */
  gamma: number
  /** Adam learning rate. */
  learningRate: number
}

/**
 * Default training hyperparameters (D-019). gamma is 0.99 — the M4.10 tuning
 * showed the longer horizon removes the myopic over-switching that regressed
 * throughput at gamma 0.95, yielding a clean win over Fixed.
 */
export const DEFAULT_DQN_HYPERPARAMS: DqnHyperparams = { gamma: 0.99, learningRate: 1e-3 }

export class DqnTrainer {
  readonly model: DqnModel
  readonly gamma: number
  private readonly optimizer: tf.Optimizer

  constructor(model: DqnModel, params: DqnHyperparams = DEFAULT_DQN_HYPERPARAMS) {
    this.model = model
    this.gamma = params.gamma
    this.optimizer = tf.train.adam(params.learningRate)
  }

  /**
   * Run one gradient step on `batch` and return the scalar loss. Throws on an
   * empty batch. Disposes every tensor it allocates (leak-free).
   */
  trainStep(batch: readonly Transition[]): number {
    if (batch.length === 0) throw new Error('DqnTrainer.trainStep requires a non-empty batch')
    const b = batch.length

    const obs = tf.tensor2d(batch.map((t) => t.obs), [b, OBSERVATION_SIZE])
    const nextObs = tf.tensor2d(batch.map((t) => t.nextObs), [b, OBSERVATION_SIZE])
    const actions = tf.tensor1d(batch.map((t) => t.action), 'int32')
    const rewards = tf.tensor1d(batch.map((t) => t.reward))
    const notDone = tf.tensor1d(batch.map((t) => (t.done ? 0 : 1)))

    // Bootstrap target from the (fixed) target network — no gradient tracked.
    const y = tf.tidy(() => {
      const qNext = this.model.target.predict(nextObs) as tf.Tensor // [b, ACTION_SIZE]
      const maxNext = qNext.max(1) // [b]
      return rewards.add(maxNext.mul(this.gamma).mul(notDone)) // [b]
    })

    const lossFn = () =>
      tf.tidy(() => {
        const qAll = this.model.online.apply(obs, { training: true }) as tf.Tensor // [b, ACTION_SIZE]
        const mask = tf.oneHot(actions, ACTION_SIZE) // [b, ACTION_SIZE]
        const qTaken = qAll.mul(mask).sum(1) // [b]
        return tf.losses.huberLoss(y, qTaken) as tf.Scalar
      })

    const lossScalar = this.optimizer.minimize(lossFn, true)!
    const loss = lossScalar.dataSync()[0]!
    lossScalar.dispose()
    obs.dispose()
    nextObs.dispose()
    actions.dispose()
    rewards.dispose()
    notDone.dispose()
    y.dispose()
    return loss
  }

  /** Free the optimizer's Adam accumulator variables. Does not dispose the model. */
  dispose(): void {
    this.optimizer.dispose()
  }
}

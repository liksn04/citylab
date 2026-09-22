import { createSeededRandom, type RandomSource } from '../simulation/seededRandom'
import { DEFAULT_EPSILON_SCHEDULE, epsilonAt, type EpsilonSchedule } from '../rl/epsilon'
import { DqnModel } from '../rl/qNetwork'
import { DqnTrainer, type DqnHyperparams } from '../rl/dqnUpdate'
import { ReplayBuffer, type Transition } from '../rl/replayBuffer'

/**
 * Training worker protocol (M4.7, D-020). A pure `TrainingSession` owns the RL
 * pieces (model, replay buffer, trainer, epsilon schedule, seeded RNG) and
 * processes command messages into response messages. It has no dependency on
 * `self`/`postMessage`/Worker APIs, so it is tested in node with tfjs. The thin
 * worker glue (`trainingWorker.ts`) only wires messages to `handle()`.
 *
 * Transitions come from the main thread via `push`; wiring a TrafficEngine +
 * DqnController inside the worker to generate them is M4.9 (eval runner).
 */

export interface TrainingConfig {
  /** Q-network hidden units (defaults to DQN_HIDDEN_UNITS). */
  hiddenUnits?: number
  /** Replay buffer capacity. */
  bufferCapacity: number
  /** Minibatch size per training step. */
  batchSize: number
  /** Do not train until the buffer holds at least this many transitions. */
  minBufferToTrain: number
  /** Steps between target-network syncs. */
  targetSyncInterval: number
  /** DQN discount/learning-rate overrides (D-019 defaults otherwise). */
  hyperparams?: DqnHyperparams
  /** Exploration schedule (D-015/M4.5 default otherwise). */
  epsilon?: EpsilonSchedule
  /** Seed for the deterministic minibatch-sampling RNG. */
  seed: number
}

export type TrainingCommand =
  | { type: 'init'; config: TrainingConfig }
  | { type: 'push'; transitions: Transition[] }
  | { type: 'train'; steps: number }
  | { type: 'stop' }

export type TrainingResponse =
  | { type: 'ready' }
  | { type: 'progress'; step: number; loss: number; epsilon: number; bufferSize: number }
  | { type: 'skipped'; reason: string; bufferSize: number }
  | { type: 'stopped' }
  | { type: 'error'; message: string }

interface SessionState {
  model: DqnModel
  trainer: DqnTrainer
  buffer: ReplayBuffer
  rng: RandomSource
  epsilon: EpsilonSchedule
  batchSize: number
  minBufferToTrain: number
  targetSyncInterval: number
  step: number
}

export class TrainingSession {
  private state: SessionState | null = null

  /** Process one command, returning the response messages to post back. */
  handle(command: TrainingCommand): TrainingResponse[] {
    try {
      switch (command.type) {
        case 'init':
          return this.init(command.config)
        case 'push':
          return this.push(command.transitions)
        case 'train':
          return this.train(command.steps)
        case 'stop':
          return this.stop()
      }
    } catch (err) {
      return [{ type: 'error', message: err instanceof Error ? err.message : String(err) }]
    }
  }

  /** Dispose all tensors/optimizer state. Safe to call repeatedly. */
  dispose(): void {
    if (this.state) {
      this.state.trainer.dispose()
      this.state.model.dispose()
      this.state = null
    }
  }

  private init(config: TrainingConfig): TrainingResponse[] {
    this.dispose() // replace any prior session cleanly
    const model = new DqnModel(config.hiddenUnits)
    this.state = {
      model,
      trainer: new DqnTrainer(model, config.hyperparams),
      buffer: new ReplayBuffer(config.bufferCapacity),
      rng: createSeededRandom(config.seed),
      epsilon: config.epsilon ?? DEFAULT_EPSILON_SCHEDULE,
      batchSize: config.batchSize,
      minBufferToTrain: config.minBufferToTrain,
      targetSyncInterval: config.targetSyncInterval,
      step: 0,
    }
    return [{ type: 'ready' }]
  }

  private push(transitions: Transition[]): TrainingResponse[] {
    const s = this.requireState()
    for (const t of transitions) s.buffer.push(t)
    return []
  }

  private train(steps: number): TrainingResponse[] {
    const s = this.requireState()
    if (!Number.isInteger(steps) || steps <= 0) {
      throw new Error(`train steps must be a positive integer; got ${steps}`)
    }
    const out: TrainingResponse[] = []
    for (let i = 0; i < steps; i += 1) {
      if (s.buffer.size < s.minBufferToTrain) {
        out.push({ type: 'skipped', reason: 'buffer below minBufferToTrain', bufferSize: s.buffer.size })
        break
      }
      const loss = s.trainer.trainStep(s.buffer.sample(s.batchSize, s.rng))
      s.step += 1
      if (s.step % s.targetSyncInterval === 0) s.model.syncTarget()
      out.push({
        type: 'progress',
        step: s.step,
        loss,
        epsilon: epsilonAt(s.step, s.epsilon),
        bufferSize: s.buffer.size,
      })
    }
    return out
  }

  private stop(): TrainingResponse[] {
    this.dispose()
    return [{ type: 'stopped' }]
  }

  private requireState(): SessionState {
    if (!this.state) throw new Error('training session not initialized; send an "init" command first')
    return this.state
  }
}

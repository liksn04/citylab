import { TICK_SEC } from '../simulation/constants'
import { buildApproachIndex } from '../simulation/pressure'
import { buildRoadGraph } from '../simulation/roadGraph'
import { createSeededRandom } from '../simulation/seededRandom'
import type { Scenario } from '../simulation/scenarios'
import { TrafficEngine, type RunSummary } from '../simulation/TrafficEngine'
import { DqnController } from './DqnController'
import { epsilonGreedyPolicy, greedyPolicy } from './dqnPolicy'
import { DEFAULT_EPSILON_SCHEDULE, type EpsilonSchedule } from './epsilon'
import { DqnModel } from './qNetwork'
import { DqnTrainer, type DqnHyperparams } from './dqnUpdate'
import { ReplayBuffer } from './replayBuffer'
import { TransitionCollector } from './transitionBuilder'

/**
 * Engine-driven DQN evaluation and training (M4.9, D-021). Evaluation runs the
 * shared network greedily in the TrafficEngine and returns the standard
 * RunSummary — deterministic for a fixed model + scenario. Training rolls out
 * episodes over a *train* seed set, captures decision-point transitions via the
 * engine's read-only hook, and learns from a replay buffer. Evaluation uses a
 * separate eval seed set (TEST_STRATEGY): a single lucky seed is never treated as
 * improvement.
 *
 * The engine never imports rl: the DqnController is injected and the hook only
 * observes (ARCHITECTURE, D-021).
 */

const ticksFor = (scenario: Scenario) => Math.round(scenario.durationSec / TICK_SEC)

/** Evaluate a trained network on a scenario with a greedy policy (epsilon 0). */
export function evaluateDqn(model: DqnModel, scenario: Scenario): RunSummary {
  const engine = new TrafficEngine({
    ...scenario,
    controllerKind: 'dqn',
    injectedController: new DqnController(greedyPolicy(model.online)),
  })
  engine.runTicks(ticksFor(scenario))
  return engine.summary()
}

export interface TrainConfig {
  /** Base training scenario; each episode overrides its seed from `trainSeeds`. */
  scenario: Scenario
  /** Seeds cycled across episodes (the train seed set — kept apart from eval seeds). */
  trainSeeds: readonly number[]
  episodes: number
  /** Gradient steps to run after each episode's transitions are collected. */
  trainStepsPerEpisode: number
  bufferCapacity: number
  batchSize: number
  minBufferToTrain: number
  targetSyncInterval: number
  hiddenUnits?: number
  hyperparams?: DqnHyperparams
  epsilon?: EpsilonSchedule
  /** Seed for replay sampling and exploration (kept off the scenario seeds). */
  learnerSeed: number
}

export interface TrainResult {
  model: DqnModel
  trainer: DqnTrainer
  /** Loss per gradient step, in order. */
  losses: number[]
  /** Total transitions collected across all episodes. */
  transitions: number
}

/**
 * Train a shared DQN by rolling out episodes and learning from replay. The caller
 * owns disposal: call `result.model.dispose()` and `result.trainer.dispose()`.
 */
export function trainDqn(config: TrainConfig): TrainResult {
  const model = new DqnModel(config.hiddenUnits)
  const trainer = new DqnTrainer(model, config.hyperparams)
  const buffer = new ReplayBuffer(config.bufferCapacity)
  const schedule = config.epsilon ?? DEFAULT_EPSILON_SCHEDULE
  const sampleRng = createSeededRandom(config.learnerSeed)
  const exploreRng = createSeededRandom((config.learnerSeed ^ 0x9e3779b9) >>> 0)
  const approachIndex = buildApproachIndex(buildRoadGraph(config.scenario.rows, config.scenario.cols))

  // One epsilon-greedy controller reused across episodes so exploration decays
  // over the whole run (the policy holds its own step counter).
  const controller = new DqnController(epsilonGreedyPolicy(model.online, schedule, exploreRng))

  const losses: number[] = []
  let transitions = 0
  let trainStep = 0

  for (let ep = 0; ep < config.episodes; ep += 1) {
    const seed = config.trainSeeds[ep % config.trainSeeds.length]!
    const collector = new TransitionCollector(approachIndex)
    const engine = new TrafficEngine({
      ...config.scenario,
      seed,
      controllerKind: 'dqn',
      injectedController: controller,
      onDecisionTick: (info) => collector.onTick(info),
    })
    engine.runTicks(ticksFor(config.scenario))
    collector.finish()
    for (const t of collector.drain()) {
      buffer.push(t)
      transitions += 1
    }

    for (let i = 0; i < config.trainStepsPerEpisode; i += 1) {
      if (buffer.size < config.minBufferToTrain) break
      losses.push(trainer.trainStep(buffer.sample(config.batchSize, sampleRng)))
      trainStep += 1
      if (trainStep % config.targetSyncInterval === 0) model.syncTarget()
    }
  }

  return { model, trainer, losses, transitions }
}

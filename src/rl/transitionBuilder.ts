import type { ApproachMovement } from '../simulation/pressure'
import type { DecisionTickInfo } from '../simulation/TrafficEngine'
import { intentToAction } from './action'
import { encodeObservation } from './observation'
import { queueReward } from './reward'
import type { Transition } from './replayBuffer'

/**
 * Decision-point transition collector (M4.9, D-021). Consumes the engine's
 * read-only per-tick decision info and emits DQN transitions whose `obs → nextObs`
 * link a per-intersection green decision to that intersection's *next* green
 * decision, with reward = the per-intersection queue reward (D-017) accumulated
 * over the interval in between (yellow ticks included). Pure — it never touches
 * the engine or tensors; the training loop feeds it and drains the transitions.
 */

interface Pending {
  obs: number[]
  action: number
  acc: number
}

export class TransitionCollector {
  private readonly approachIndex: ReadonlyMap<string, readonly ApproachMovement[]>
  private readonly pending = new Map<string, Pending>()
  private readonly out: Transition[] = []

  constructor(approachIndex: ReadonlyMap<string, readonly ApproachMovement[]>) {
    this.approachIndex = approachIndex
  }

  /** Consume one tick: accrue reward into open pendings, then complete + open decisions. */
  onTick(info: DecisionTickInfo): void {
    // 1) Credit this tick's per-intersection reward to every open decision.
    for (const [id, p] of this.pending) {
      const movements = this.approachIndex.get(id)
      if (movements) p.acc += queueReward(movements, info.queueByEdge)
    }
    // 2) For each intersection deciding now: close its previous decision (s, a, r, s'),
    //    then open a fresh one starting a new reward accumulation.
    for (const d of info.decisions) {
      const obs = encodeObservation(d.observation)
      const prev = this.pending.get(d.intersectionId)
      if (prev) {
        this.out.push({ obs: prev.obs, action: prev.action, reward: prev.acc, nextObs: obs, done: false })
      }
      this.pending.set(d.intersectionId, { obs, action: intentToAction(d.intent), acc: 0 })
    }
  }

  /** Close every open decision as a terminal transition (episode end). */
  finish(): void {
    for (const p of this.pending.values()) {
      this.out.push({ obs: p.obs, action: p.action, reward: p.acc, nextObs: p.obs, done: true })
    }
    this.pending.clear()
  }

  /** Take and clear the collected transitions. */
  drain(): Transition[] {
    return this.out.splice(0, this.out.length)
  }
}

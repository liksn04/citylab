import type { RandomSource } from '../simulation/seededRandom'

/**
 * One stored experience for the shared DQN (M4.3, D-017). `obs`/`nextObs` are
 * encoded observations (length `OBSERVATION_SIZE`, D-015), `action` is an index in
 * `[0, ACTION_SIZE)` (D-016), `reward` is the per-intersection reward (D-017), and
 * `done` marks a terminal transition (episode end).
 */
export interface Transition {
  obs: number[]
  action: number
  reward: number
  nextObs: number[]
  done: boolean
}

/**
 * Fixed-capacity ring replay buffer (M4.3). Pushing past capacity overwrites the
 * oldest transition. `sample` draws a minibatch uniformly with replacement using
 * the project's seeded `RandomSource`, so sampling is deterministic and testable
 * (no `Math.random`). No tensors or training here — this only stores and samples.
 */
export class ReplayBuffer {
  readonly capacity: number
  private readonly items: Transition[] = []
  private head = 0

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error(`ReplayBuffer capacity must be a positive integer; got ${capacity}`)
    }
    this.capacity = capacity
  }

  /** Number of stored transitions (0..capacity). */
  get size(): number {
    return this.items.length
  }

  /** True once the buffer holds `capacity` transitions and overwrites the oldest. */
  get isFull(): boolean {
    return this.items.length === this.capacity
  }

  /** Append a transition, overwriting the oldest when at capacity. */
  push(t: Transition): void {
    if (this.items.length < this.capacity) {
      this.items.push(t)
    } else {
      this.items[this.head] = t
    }
    this.head = (this.head + 1) % this.capacity
  }

  /**
   * Draw `batchSize` transitions uniformly with replacement via `rng.int`.
   * Deterministic for a given RNG state. Throws when empty or on a non-positive
   * batch size.
   */
  sample(batchSize: number, rng: RandomSource): Transition[] {
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      throw new Error(`sample batchSize must be a positive integer; got ${batchSize}`)
    }
    if (this.items.length === 0) {
      throw new Error('Cannot sample from an empty ReplayBuffer')
    }
    const batch: Transition[] = []
    for (let i = 0; i < batchSize; i += 1) {
      batch.push(this.items[rng.int(0, this.items.length)]!)
    }
    return batch
  }
}

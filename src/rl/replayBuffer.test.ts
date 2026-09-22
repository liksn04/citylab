import { describe, expect, it } from 'vitest'
import { ReplayBuffer, type Transition } from './replayBuffer'
import { createSeededRandom } from '../simulation/seededRandom'

/** A distinct transition tagged by `i` in obs[0] and reward −i for identification. */
function tx(i: number): Transition {
  return { obs: [i, 0, 0, 0], action: i % 2, reward: -i, nextObs: [i + 1, 0, 0, 0], done: false }
}

describe('ReplayBuffer — construction & capacity', () => {
  it('rejects a non-positive or non-integer capacity', () => {
    expect(() => new ReplayBuffer(0)).toThrow(/capacity/)
    expect(() => new ReplayBuffer(-3)).toThrow(/capacity/)
    expect(() => new ReplayBuffer(2.5)).toThrow(/capacity/)
  })

  it('grows size up to capacity and reports isFull', () => {
    const buf = new ReplayBuffer(3)
    expect(buf.size).toBe(0)
    expect(buf.isFull).toBe(false)
    buf.push(tx(0))
    buf.push(tx(1))
    expect(buf.size).toBe(2)
    expect(buf.isFull).toBe(false)
    buf.push(tx(2))
    expect(buf.size).toBe(3)
    expect(buf.isFull).toBe(true)
    buf.push(tx(3)) // over capacity — size stays at capacity
    expect(buf.size).toBe(3)
  })
})

describe('ReplayBuffer — ring overwrite (D-017)', () => {
  it('evicts the oldest transitions once past capacity', () => {
    const buf = new ReplayBuffer(3)
    for (let i = 0; i < 5; i += 1) buf.push(tx(i)) // tx0,tx1 evicted; tx2,tx3,tx4 remain
    const rng = createSeededRandom(123)
    const seen = new Set<number>()
    for (const t of buf.sample(300, rng)) seen.add(t.obs[0]!)
    // Only the last `capacity` transitions can ever be sampled.
    expect([...seen].sort((a, b) => a - b)).toEqual([2, 3, 4])
    expect(seen.has(0)).toBe(false)
    expect(seen.has(1)).toBe(false)
  })
})

describe('ReplayBuffer — sampling', () => {
  it('samples uniformly with replacement (batch may exceed size) and only returns stored transitions', () => {
    const buf = new ReplayBuffer(10)
    for (let i = 0; i < 3; i += 1) buf.push(tx(i))
    const batch = buf.sample(10, createSeededRandom(7))
    expect(batch).toHaveLength(10) // with replacement → can exceed size
    for (const t of batch) expect([0, 1, 2]).toContain(t.obs[0])
  })

  it('is deterministic for a given seed', () => {
    const build = () => {
      const buf = new ReplayBuffer(50)
      for (let i = 0; i < 20; i += 1) buf.push(tx(i))
      return buf
    }
    const a = build().sample(8, createSeededRandom(999))
    const b = build().sample(8, createSeededRandom(999))
    expect(a.map((t) => t.obs[0])).toEqual(b.map((t) => t.obs[0]))
  })

  it('throws on an empty buffer or a non-positive batch size', () => {
    const empty = new ReplayBuffer(4)
    expect(() => empty.sample(2, createSeededRandom(1))).toThrow(/empty/)
    const buf = new ReplayBuffer(4)
    buf.push(tx(0))
    expect(() => buf.sample(0, createSeededRandom(1))).toThrow(/batchSize/)
    expect(() => buf.sample(-1, createSeededRandom(1))).toThrow(/batchSize/)
  })
})

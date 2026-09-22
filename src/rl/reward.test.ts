import { describe, expect, it } from 'vitest'
import { computeQueueRewards, queueReward } from './reward'
import { buildApproachIndex } from '../simulation/pressure'
import { buildRoadGraph, edgeId, nodeId } from '../simulation/roadGraph'

const graph = buildRoadGraph(4, 4)
const index = buildApproachIndex(graph)

// Edge id helper for readability in fixtures.
const e = (fromR: number, fromC: number, toR: number, toC: number) =>
  edgeId(nodeId(fromR, fromC), nodeId(toR, toC))

describe('queueReward (D-017: negative sum of approach queues)', () => {
  it('is zero on an empty network', () => {
    expect(queueReward(index.get('I-1-1')!, new Map())).toBe(0)
  })

  it('sums only the approach queues entering the intersection (ignores outgoing edges)', () => {
    const queueByEdge = new Map<string, number>([
      // Four approaches into I-1-1:
      [e(0, 1, 1, 1), 5], // from north
      [e(2, 1, 1, 1), 3], // from south
      [e(1, 0, 1, 1), 4], // from west
      [e(1, 2, 1, 1), 2], // from east
      // An OUTGOING edge from I-1-1 (a continuation) — must NOT be counted:
      [e(1, 1, 2, 1), 9],
    ])
    expect(queueReward(index.get('I-1-1')!, queueByEdge)).toBe(-(5 + 3 + 4 + 2))
  })

  it('counts only the two approaches at a boundary corner', () => {
    const queueByEdge = new Map<string, number>([
      [e(0, 1, 0, 0), 6], // EW approach into corner I-0-0
      [e(1, 0, 0, 0), 2], // NS approach into corner I-0-0
      [e(0, 0, 0, 1), 5], // OUTGOING from I-0-0 — excluded
    ])
    expect(queueReward(index.get('I-0-0')!, queueByEdge)).toBe(-8)
  })

  it('is never positive (queues are non-negative)', () => {
    const queueByEdge = new Map<string, number>([
      [e(0, 1, 1, 1), 7],
      [e(1, 2, 1, 1), 1],
    ])
    expect(queueReward(index.get('I-1-1')!, queueByEdge)).toBeLessThanOrEqual(0)
  })

  it('is deterministic for the same inputs', () => {
    const q = new Map<string, number>([[e(0, 1, 1, 1), 5]])
    expect(queueReward(index.get('I-1-1')!, q)).toBe(queueReward(index.get('I-1-1')!, q))
  })
})

describe('computeQueueRewards', () => {
  it('produces a reward for every intersection, zero on an empty network', () => {
    const all = computeQueueRewards(index, new Map())
    expect(all.size).toBe(16)
    for (const r of all.values()) expect(r).toBe(0)
  })

  it('matches per-intersection queueReward', () => {
    const queueByEdge = new Map<string, number>([
      [e(0, 1, 1, 1), 5],
      [e(1, 0, 1, 1), 4],
    ])
    const all = computeQueueRewards(index, queueByEdge)
    expect(all.get('I-1-1')).toBe(queueReward(index.get('I-1-1')!, queueByEdge))
    expect(all.get('I-1-1')).toBe(-9)
  })
})

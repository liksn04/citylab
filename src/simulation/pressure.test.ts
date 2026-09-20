import { describe, expect, it } from 'vitest'
import { buildApproachIndex, computePressure, pressureByAxis } from './pressure'
import { buildRoadGraph, edgeId, nodeId } from './roadGraph'

const graph = buildRoadGraph(4, 4)
const index = buildApproachIndex(graph)

// Edge id helper for readability in fixtures.
const e = (fromR: number, fromC: number, toR: number, toC: number) =>
  edgeId(nodeId(fromR, fromC), nodeId(toR, toC))

describe('buildApproachIndex', () => {
  it('gives an interior intersection four approaches, each with a straight continuation', () => {
    const movements = index.get('I-1-1')!
    expect(movements).toHaveLength(4)
    expect(movements.every((m) => m.continuationId !== null)).toBe(true)
    expect(movements.filter((m) => m.axis === 'NS')).toHaveLength(2)
    expect(movements.filter((m) => m.axis === 'EW')).toHaveLength(2)
  })

  it('maps a southbound approach to the southbound continuation (same heading)', () => {
    const movements = index.get('I-1-1')!
    const southApproach = movements.find((m) => m.approachId === e(0, 1, 1, 1))!
    expect(southApproach.axis).toBe('NS')
    expect(southApproach.continuationId).toBe(e(1, 1, 2, 1)) // continues south out of I-1-1
  })

  it('leaves boundary approaches without a straight continuation', () => {
    // Corner I-0-0 is entered from the east (heading W) and south (heading N);
    // neither heading has an outgoing edge (grid edge), so continuation is null.
    const movements = index.get('I-0-0')!
    expect(movements).toHaveLength(2)
    expect(movements.every((m) => m.continuationId === null)).toBe(true)
  })
})

describe('pressureByAxis (D-009: upstream queue − downstream continuation queue)', () => {
  it('is zero on an empty network', () => {
    expect(pressureByAxis(index.get('I-1-1')!, new Map())).toEqual({ NS: 0, EW: 0 })
  })

  it('computes hand-checked pressure at an interior intersection', () => {
    // Queues around I-1-1:
    //   NS approaches:  E-I-0-1-I-1-1 = 5,  E-I-2-1-I-1-1 = 3
    //   NS continuations: E-I-1-1-I-2-1 = 2,  E-I-1-1-I-0-1 = 1
    //   EW approach:    E-I-1-0-I-1-1 = 4   (its continuation E-I-1-1-I-1-2 = 0)
    const queueByEdge = new Map<string, number>([
      [e(0, 1, 1, 1), 5],
      [e(2, 1, 1, 1), 3],
      [e(1, 1, 2, 1), 2],
      [e(1, 1, 0, 1), 1],
      [e(1, 0, 1, 1), 4],
    ])
    // NS: (5 − 2) + (3 − 1) = 5 ;  EW: (4 − 0) + (0 − 0) = 4
    expect(pressureByAxis(index.get('I-1-1')!, queueByEdge)).toEqual({ NS: 5, EW: 4 })
  })

  it('counts full upstream queue at a boundary approach (downstream 0)', () => {
    const queueByEdge = new Map<string, number>([
      [e(0, 1, 0, 0), 6], // EW approach into corner I-0-0 (heading W), no continuation
      [e(1, 0, 0, 0), 2], // NS approach into corner I-0-0 (heading N), no continuation
    ])
    expect(pressureByAxis(index.get('I-0-0')!, queueByEdge)).toEqual({ NS: 2, EW: 6 })
  })

  it('can go negative when downstream is more congested than upstream', () => {
    const queueByEdge = new Map<string, number>([
      [e(0, 1, 1, 1), 1], // NS upstream
      [e(1, 1, 2, 1), 4], // its NS continuation, jammed
    ])
    expect(pressureByAxis(index.get('I-1-1')!, queueByEdge).NS).toBe(-3)
  })

  it('is deterministic for the same inputs', () => {
    const q = new Map<string, number>([[e(0, 1, 1, 1), 5]])
    expect(pressureByAxis(index.get('I-1-1')!, q)).toEqual(pressureByAxis(index.get('I-1-1')!, q))
  })
})

describe('computePressure', () => {
  it('produces an entry for every intersection', () => {
    const all = computePressure(index, new Map())
    expect(all.size).toBe(16)
    for (const p of all.values()) expect(p).toEqual({ NS: 0, EW: 0 })
  })
})

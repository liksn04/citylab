import { describe, expect, it } from 'vitest'
import { buildRoadGraph } from './roadGraph'
import { findRoute, isLegalRoute } from './router'

const g = buildRoadGraph(4, 4)

function manhattan(a: string, b: string): number {
  const [ar, ac] = a.slice(2).split('-').map(Number)
  const [br, bc] = b.slice(2).split('-').map(Number)
  return Math.abs(ar! - br!) + Math.abs(ac! - bc!)
}

// 12+ origin/destination fixtures spanning straight lines, L-shapes, and reversals.
const OD_PAIRS: Array<[string, string]> = [
  ['I-0-0', 'I-0-3'],
  ['I-0-0', 'I-3-0'],
  ['I-0-0', 'I-3-3'],
  ['I-3-3', 'I-0-0'],
  ['I-0-3', 'I-3-0'],
  ['I-3-0', 'I-0-3'],
  ['I-1-1', 'I-2-2'],
  ['I-2-2', 'I-1-1'],
  ['I-0-1', 'I-2-3'],
  ['I-3-1', 'I-1-0'],
  ['I-1-3', 'I-2-0'],
  ['I-2-0', 'I-0-2'],
  ['I-0-0', 'I-0-1'],
  ['I-1-2', 'I-1-2'],
]

describe('findRoute', () => {
  it('returns a shortest (minimum-edge) route for every fixture', () => {
    for (const [o, d] of OD_PAIRS) {
      const route = findRoute(g, o, d)
      expect(route.length).toBe(manhattan(o, d))
    }
  })

  it('produces only legal, contiguous, in-graph routes', () => {
    for (const [o, d] of OD_PAIRS) {
      const route = findRoute(g, o, d)
      expect(isLegalRoute(g, o, d, route)).toBe(true)
    }
  })

  it('is deterministic — same OD gives the same route', () => {
    for (const [o, d] of OD_PAIRS) {
      expect(findRoute(g, o, d).map((e) => e.id)).toEqual(findRoute(g, o, d).map((e) => e.id))
    }
  })

  it('resolves straight-line routes to their unique shortest path', () => {
    expect(findRoute(g, 'I-0-0', 'I-0-3').map((e) => e.id)).toEqual([
      'E-I-0-0-I-0-1',
      'E-I-0-1-I-0-2',
      'E-I-0-2-I-0-3',
    ])
    expect(findRoute(g, 'I-0-0', 'I-3-0').map((e) => e.id)).toEqual([
      'E-I-0-0-I-1-0',
      'E-I-1-0-I-2-0',
      'E-I-2-0-I-3-0',
    ])
  })

  it('breaks diagonal ties toward the canonical order (N, E, S, W)', () => {
    // From I-0-0 heading to I-1-1, E is tried before S, so the first hop is East.
    const route = findRoute(g, 'I-0-0', 'I-1-1')
    expect(route).toHaveLength(2)
    expect(route[0]!.id).toBe('E-I-0-0-I-0-1')
    expect(route[1]!.id).toBe('E-I-0-1-I-1-1')
  })

  it('snapshots concrete routes for the full fixture set', () => {
    const routes = OD_PAIRS.map(([o, d]) => `${o}->${d}: ${findRoute(g, o, d).map((e) => e.id).join(' | ') || '(none)'}`)
    expect(routes).toMatchInlineSnapshot(`
      [
        "I-0-0->I-0-3: E-I-0-0-I-0-1 | E-I-0-1-I-0-2 | E-I-0-2-I-0-3",
        "I-0-0->I-3-0: E-I-0-0-I-1-0 | E-I-1-0-I-2-0 | E-I-2-0-I-3-0",
        "I-0-0->I-3-3: E-I-0-0-I-0-1 | E-I-0-1-I-0-2 | E-I-0-2-I-0-3 | E-I-0-3-I-1-3 | E-I-1-3-I-2-3 | E-I-2-3-I-3-3",
        "I-3-3->I-0-0: E-I-3-3-I-2-3 | E-I-2-3-I-1-3 | E-I-1-3-I-0-3 | E-I-0-3-I-0-2 | E-I-0-2-I-0-1 | E-I-0-1-I-0-0",
        "I-0-3->I-3-0: E-I-0-3-I-1-3 | E-I-1-3-I-2-3 | E-I-2-3-I-3-3 | E-I-3-3-I-3-2 | E-I-3-2-I-3-1 | E-I-3-1-I-3-0",
        "I-3-0->I-0-3: E-I-3-0-I-2-0 | E-I-2-0-I-1-0 | E-I-1-0-I-0-0 | E-I-0-0-I-0-1 | E-I-0-1-I-0-2 | E-I-0-2-I-0-3",
        "I-1-1->I-2-2: E-I-1-1-I-1-2 | E-I-1-2-I-2-2",
        "I-2-2->I-1-1: E-I-2-2-I-1-2 | E-I-1-2-I-1-1",
        "I-0-1->I-2-3: E-I-0-1-I-0-2 | E-I-0-2-I-0-3 | E-I-0-3-I-1-3 | E-I-1-3-I-2-3",
        "I-3-1->I-1-0: E-I-3-1-I-2-1 | E-I-2-1-I-1-1 | E-I-1-1-I-1-0",
        "I-1-3->I-2-0: E-I-1-3-I-2-3 | E-I-2-3-I-2-2 | E-I-2-2-I-2-1 | E-I-2-1-I-2-0",
        "I-2-0->I-0-2: E-I-2-0-I-1-0 | E-I-1-0-I-0-0 | E-I-0-0-I-0-1 | E-I-0-1-I-0-2",
        "I-0-0->I-0-1: E-I-0-0-I-0-1",
        "I-1-2->I-1-2: (none)",
      ]
    `)
  })

  it('returns an empty route when origin equals destination', () => {
    expect(findRoute(g, 'I-1-2', 'I-1-2')).toEqual([])
  })

  it('rejects unknown nodes', () => {
    expect(() => findRoute(g, 'I-9-9', 'I-0-0')).toThrow()
    expect(() => findRoute(g, 'I-0-0', 'I-9-9')).toThrow()
  })
})

describe('isLegalRoute', () => {
  it('rejects a route that starts at the wrong node', () => {
    const route = findRoute(g, 'I-0-0', 'I-0-3')
    expect(isLegalRoute(g, 'I-1-0', 'I-0-3', route)).toBe(false)
  })

  it('rejects a discontiguous (teleporting) route', () => {
    const good = findRoute(g, 'I-0-0', 'I-0-3')
    const broken = [good[0]!, good[2]!] // skips the middle edge
    expect(isLegalRoute(g, 'I-0-0', 'I-0-3', broken)).toBe(false)
  })
})

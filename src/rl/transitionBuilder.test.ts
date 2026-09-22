import { describe, expect, it } from 'vitest'
import { TransitionCollector } from './transitionBuilder'
import { encodeObservation } from './observation'
import { buildApproachIndex } from '../simulation/pressure'
import { buildRoadGraph, edgeId, nodeId } from '../simulation/roadGraph'
import type { ObservationInput } from '../controllers/Controller'
import type { DecisionTickInfo } from '../simulation/TrafficEngine'

const index = buildApproachIndex(buildRoadGraph(4, 4))
const e = (fromR: number, fromC: number, toR: number, toC: number) =>
  edgeId(nodeId(fromR, fromC), nodeId(toR, toC))

function obs(pressureNS: number): ObservationInput {
  return {
    id: 'I-1-1',
    phase: 'NS',
    activeAxis: 'NS',
    phaseElapsedSec: 0,
    minGreenSatisfied: true,
    pressure: { NS: pressureNS, EW: 0 },
  }
}

/** One approach into I-1-1 carrying `q` queued vehicles → queueReward(I-1-1) = -q. */
function tick(t: number, q: number, decisions: DecisionTickInfo['decisions']): DecisionTickInfo {
  return { tick: t, queueByEdge: new Map([[e(0, 1, 1, 1), q]]), decisions }
}

describe('TransitionCollector (M4.9, D-021)', () => {
  it('links a decision to the next decision with reward accumulated in between', () => {
    const c = new TransitionCollector(index)
    const obsA = obs(2)
    const obsB = obs(6)
    c.onTick(tick(0, 9, [{ intersectionId: 'I-1-1', observation: obsA, intent: 'HOLD' }])) // opens A (tick 0 not credited to A)
    c.onTick(tick(1, 3, [])) // A.acc += -3
    c.onTick(tick(2, 5, [{ intersectionId: 'I-1-1', observation: obsB, intent: 'SWITCH' }])) // A.acc += -5, close A, open B
    c.finish() // close B (terminal)

    const out = c.drain()
    expect(out).toHaveLength(2)

    const [first, second] = out
    // A: reward = ticks 1 and 2 = -(3) + -(5) = -8 ; nextObs = encode(B) ; not done.
    expect(first).toEqual({
      obs: encodeObservation(obsA),
      action: 0, // HOLD
      reward: -8,
      nextObs: encodeObservation(obsB),
      done: false,
    })
    // B: terminal, no further ticks accrued → reward 0, nextObs = its own obs.
    expect(second).toEqual({
      obs: encodeObservation(obsB),
      action: 1, // SWITCH
      reward: 0,
      nextObs: encodeObservation(obsB),
      done: true,
    })
  })

  it('does not credit the decision tick itself to the newly opened decision', () => {
    const c = new TransitionCollector(index)
    c.onTick(tick(0, 100, [{ intersectionId: 'I-1-1', observation: obs(1), intent: 'HOLD' }])) // q=100 must NOT hit this decision
    c.onTick(tick(1, 4, [{ intersectionId: 'I-1-1', observation: obs(2), intent: 'HOLD' }])) // closes first with reward from tick 1 only
    const [first] = c.drain()
    expect(first!.reward).toBe(-4) // tick 0's q=100 was never credited to the first decision
  })

  it('drain empties the buffer', () => {
    const c = new TransitionCollector(index)
    c.onTick(tick(0, 0, [{ intersectionId: 'I-1-1', observation: obs(1), intent: 'HOLD' }]))
    c.finish()
    expect(c.drain()).toHaveLength(1)
    expect(c.drain()).toHaveLength(0)
  })

  it('handles multiple intersections independently', () => {
    const c = new TransitionCollector(index)
    const d = (id: string, intent: 'HOLD' | 'SWITCH') => ({ intersectionId: id, observation: { ...obs(1), id }, intent })
    c.onTick({ tick: 0, queueByEdge: new Map(), decisions: [d('I-1-1', 'HOLD'), d('I-2-2', 'SWITCH')] })
    c.onTick({ tick: 1, queueByEdge: new Map(), decisions: [d('I-1-1', 'SWITCH'), d('I-2-2', 'HOLD')] })
    const out = c.drain()
    // One completed transition per intersection (the first decision of each, closed at tick 1).
    expect(out).toHaveLength(2)
    expect(new Set(out.map((t) => t.action))).toEqual(new Set([0, 1]))
  })
})

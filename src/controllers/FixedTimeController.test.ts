import { describe, expect, it } from 'vitest'
import { stepFixedSignal } from './FixedTimeController'

describe('stepFixedSignal', () => {
  it('holds a green phase before greenSec', () => {
    const next = stepFixedSignal({ phase: 'NS', targetPhase: 'NS', phaseElapsedSec: 0 }, 10)
    expect(next.phase).toBe('NS')
  })

  it('enters yellow before switching axis', () => {
    const yellow = stepFixedSignal({ phase: 'NS', targetPhase: 'NS', phaseElapsedSec: 19 }, 1.5)
    expect(yellow.phase).toBe('YELLOW')
    expect(yellow.targetPhase).toBe('EW')
    const switched = stepFixedSignal(yellow, 3)
    expect(switched.phase).toBe('EW')
  })
})

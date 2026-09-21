import { describe, expect, it } from 'vitest'
import { ACTIONS, ACTION_SIZE, actionToIntent, intentToAction } from './action'

describe('action space (D-016)', () => {
  it('pins the two MVP actions in a fixed index order', () => {
    expect(ACTIONS).toEqual(['HOLD', 'SWITCH'])
    expect(ACTION_SIZE).toBe(2)
  })

  it('maps each action index to its signal intent', () => {
    expect(actionToIntent(0)).toBe('HOLD')
    expect(actionToIntent(1)).toBe('SWITCH')
  })

  it('throws on an out-of-range or non-integer action index', () => {
    expect(() => actionToIntent(-1)).toThrow(/out of range/)
    expect(() => actionToIntent(ACTION_SIZE)).toThrow(/out of range/)
    expect(() => actionToIntent(0.5)).toThrow(/out of range/)
  })

  it('round-trips intent <-> action index in both directions', () => {
    expect(intentToAction('HOLD')).toBe(0)
    expect(intentToAction('SWITCH')).toBe(1)
    for (let i = 0; i < ACTION_SIZE; i += 1) {
      expect(intentToAction(actionToIntent(i))).toBe(i)
    }
    expect(actionToIntent(intentToAction('HOLD'))).toBe('HOLD')
    expect(actionToIntent(intentToAction('SWITCH'))).toBe('SWITCH')
  })
})

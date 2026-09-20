import { describe, expect, it } from 'vitest'
import { createSeededRandom } from './seededRandom'

describe('createSeededRandom', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createSeededRandom(41021)
    const b = createSeededRandom(41021)
    expect(Array.from({ length: 10 }, () => a.next())).toEqual(Array.from({ length: 10 }, () => b.next()))
  })

  it('changes sequence for a different seed', () => {
    const a = createSeededRandom(1)
    const b = createSeededRandom(2)
    expect(a.next()).not.toBe(b.next())
  })
})

export interface RandomSource {
  next(): number
  int(minInclusive: number, maxExclusive: number): number
  pick<T>(items: readonly T[]): T
}

export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0
  const next = () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int(minInclusive, maxExclusive) {
      return Math.floor(next() * (maxExclusive - minInclusive)) + minInclusive
    },
    pick<T>(items: readonly T[]) {
      if (items.length === 0) throw new Error('Cannot pick from an empty list')
      return items[Math.floor(next() * items.length)]!
    },
  }
}

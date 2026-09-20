import { describe, expect, it } from 'vitest'
import { buildGrid } from './grid'

describe('buildGrid', () => {
  it('creates one intersection per grid cell', () => {
    const grid = buildGrid(4, 4)
    expect(grid).toHaveLength(16)
    expect(grid[0]?.id).toBe('I-0-0')
    expect(grid[15]?.id).toBe('I-3-3')
  })

  it('rejects degenerate grids', () => {
    expect(() => buildGrid(1, 4)).toThrow()
  })
})

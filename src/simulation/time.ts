import { TICK_SEC } from './constants'

/**
 * Fixed-step accumulator. It decouples wall-clock / render dt from simulation
 * time: caller feeds arbitrary dt (seconds); this yields the number of whole
 * ticks to run and carries the sub-tick remainder to the next call. This is the
 * mechanism that makes a run reproducible regardless of frame rate
 * (see docs/DATA_CONTRACTS.md — Time).
 */
export interface FixedStepAccumulator {
  /** Add elapsed seconds and return how many whole ticks are now due. */
  advance(dtSec: number): number
  /** Seconds carried over below one tick (0 <= remainder < TICK_SEC). */
  remainderSec(): number
}

export function createFixedStepAccumulator(tickSec: number = TICK_SEC): FixedStepAccumulator {
  if (!(tickSec > 0)) throw new Error('tickSec must be positive')
  let carry = 0
  return {
    advance(dtSec: number): number {
      // Negative or non-finite dt never advances simulation time.
      if (!Number.isFinite(dtSec) || dtSec <= 0) return 0
      carry += dtSec
      let ticks = 0
      while (carry >= tickSec) {
        carry -= tickSec
        ticks += 1
      }
      return ticks
    },
    remainderSec() {
      return carry
    },
  }
}

/** Whole ticks that fit in a duration (floored). */
export function secondsToTicks(seconds: number, tickSec: number = TICK_SEC): number {
  return Math.floor(seconds / tickSec)
}

/** Seconds represented by a whole number of ticks. */
export function ticksToSeconds(ticks: number, tickSec: number = TICK_SEC): number {
  return ticks * tickSec
}

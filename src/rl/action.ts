import type { SignalIntent } from '../controllers/Controller'

/**
 * Shared-DQN discrete action space (M4.2, D-016). The MVP action set is exactly
 * the environment's control lever, `HOLD | SWITCH` (D-002), pinned to a fixed
 * index order so a Q-output head and the replay buffer share one stable contract:
 * index 0 = HOLD the current green, index 1 = SWITCH away from it.
 *
 * The environment still enforces min-green + yellow (`applySignalIntent`); an
 * action only ever expresses HOLD|SWITCH, never a colour (D-008).
 */
export const ACTIONS = ['HOLD', 'SWITCH'] as const satisfies readonly SignalIntent[]

/** Number of discrete actions the shared network scores. */
export const ACTION_SIZE = ACTIONS.length

/** Map an action index to its signal intent. Throws on an out-of-range index. */
export function actionToIntent(action: number): SignalIntent {
  if (!Number.isInteger(action) || action < 0 || action >= ACTION_SIZE) {
    throw new Error(`action index out of range [0, ${ACTION_SIZE}): ${action}`)
  }
  return ACTIONS[action]!
}

/** Map a signal intent back to its action index (for storing baseline transitions). */
export function intentToAction(intent: SignalIntent): number {
  return intent === 'HOLD' ? 0 : 1
}

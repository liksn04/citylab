# RL module (M4 active)

Milestone **M4 — Shared DQN Training** is active, so this directory is unlocked.

Architecture lock (D-002, MILESTONES M4): a **shared** policy network with a
**per-intersection observation** (never one model per intersection), action set
`HOLD | SWITCH` only, and safety phase transitions enforced by the environment
(`applySignalIntent`) — the agent never picks yellow.

Landed:

- `observation.ts` — M4.1 observation encoder/normalizer (D-015). Pure; no training.
- `action.ts` + `DqnController.ts` — M4.2 action space + action adapter with an
  injectable `Policy` seam (D-016). Pure; no tensors/training; safety stays
  environment-owned.
- `reward.ts` + `replayBuffer.ts` — M4.3 per-intersection reward (D-017) and a
  seeded, deterministic ring replay buffer. Pure; no tensors/training.
- `qNetwork.ts` — M4.4 shared online + target Q-network (TensorFlow.js, D-018).
  Shape + target sync + tensor-leak-free (tf.tidy/dispose). No update step yet.
- `epsilon.ts` — M4.5 epsilon-greedy exploration: linear `epsilonAt(step)`
  schedule + `greedyAction`/`epsilonGreedyAction` (seeded, deterministic). Pure.

Still gated to later M4 slices (do not pull forward): DQN update step, Web Worker
training protocol, model save/load, and evaluation with train/eval seed
separation. Keep min-green and yellow environment-owned via `signalMachine`.

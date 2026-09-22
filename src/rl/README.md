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
- `dqnUpdate.ts` — M4.6 DQN update step (TensorFlow.js, D-019): DqnTrainer
  trainStep(batch) — Huber loss on the online Q of the taken action vs a
  target-net bootstrap, one Adam step. Leak-free (tf.tidy/dispose).
- `modelStorage.ts` — M4.8 serialize/load a Q-network to portable in-memory
  tf.io artifacts with bit-identical prediction parity. (`predictQValues` in
  qNetwork.ts predicts from any loaded model.)
- `transitionBuilder.ts` — M4.9 decision-point TransitionCollector (D-021): turns
  the engine's read-only per-tick decision hook into DQN transitions with reward
  accumulated between an intersection's consecutive green decisions. Pure.
- `dqnPolicy.ts` — M4.9 greedy (eval) and epsilon-greedy (train) policies over a
  Q-network for the DqnController seam.
- `dqnTraining.ts` — M4.9 evaluateDqn (greedy engine run → RunSummary,
  deterministic) and trainDqn (episode rollout + replay learning, train/eval seed
  separation). The engine takes an injected DqnController; it never imports rl.

Still gated: repeated-seed evaluation vs the Fixed baseline (M4.10). Keep
min-green and yellow environment-owned via `signalMachine`.

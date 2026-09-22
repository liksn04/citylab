# Worker module (M4 active)

Training worker for the shared DQN (ARCHITECTURE main↔worker boundary).

Landed:

- `trainingProtocol.ts` — M4.7 pure `TrainingSession` + message types (D-020).
  Owns model/buffer/trainer/epsilon/RNG and turns `init|push|train|stop` commands
  into `ready|progress|skipped|stopped|error` responses. No `self`/Worker APIs, so
  it is tested in node (message integration test); leak-free.
- `trainingWorker.ts` — thin dedicated-worker glue wiring `onmessage`→`handle`→
  `postMessage`. Not unit-tested (I/O boundary); not yet wired into the app.

Still gated to later M4 slices: model save/load (M4.8), engine wiring
(`controllerKind='dqn'`) + evaluation runner with train/eval seed separation
(M4.9), and repeated-seed evaluation vs the Fixed baseline (M4.10). The worker
does not yet run a TrafficEngine to generate transitions — that connects in M4.9.

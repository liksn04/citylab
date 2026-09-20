# Progress Log

## 2026-09-20 — Starter package

### Completed
- M0 project scaffold created.
- Dark analytical glass workspace implemented.
- Seeded preview traffic engine added.
- Fixed-time controller primitive added.
- Design tokens and anti-slop rules documented.
- Machine-readable milestone status added.
- Unit tests added for RNG, grid, fixed controller.

### Known limitations
- Current preview engine is intentionally not yet the final M1 vehicle model.
- Demand, routing, queue semantics need explicit fixture-driven tests.
- Persistence schema exists but experiment runner is locked until M3.
- TensorFlow.js dependency is installed for future M4 but no learning code is allowed yet.

### Next exact actions
1. Update `docs/DATA_CONTRACTS.md` with final waiting/queue/crossing semantics.
2. Add `src/simulation/demand.ts` with deterministic OD demand fixtures.
3. Add route fixture tests for at least 12 origin/destination pairs.
4. Refactor `PreviewTrafficEngine` into production `TrafficEngine` only after those contracts pass.

### Active milestone
M1 — Deterministic Traffic Core.

### Verification performed for starter packaging
- `node scripts/check-session.mjs` → PASS
- `node scripts/check-tokens.mjs` → PASS
- Global TypeScript compile of simulation/controller core → PASS
- 6000 × 0.1s deterministic preview run repeated twice → identical metrics
- governance script syntax checks → PASS
- JSON parse check → PASS
- Full `npm run build` / Vitest not executed in packaging environment because project dependencies are not installed there; run `npm install && npm run check` after extraction.

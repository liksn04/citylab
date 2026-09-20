# Progress Log

## 2026-09-20 — M1 Deterministic Traffic Core (complete)

### Session objective
M1을 완주한다: AI 없이 재현 가능한 traffic simulator를 만들고 Canvas가 실제 engine state를 표현하도록 한다.

### Completed
- Repo를 GitHub `liksn04/citylab`에 연결(main 초기 커밋 push). M1 작업은 `m1-deterministic-core` 브랜치.
- `docs/DATA_CONTRACTS.md` 확정: 5개 필수 질문 답, mesoscopic 모델, lifecycle, metric 의미.
- `src/simulation/constants.ts` + `time.ts`: 고정 timestep, named constants 단일 출처, frame-rate 독립 accumulator.
- `src/simulation/roadGraph.ts`: directed 4×4 그래프(16 node / 48 directed edge), canonical N,E,S,W 순서.
- `src/simulation/demand.ts`: rate 기반 timing + seed 기반 distinct OD (common random numbers).
- `src/simulation/router.ts`: BFS 최단경로 + illegal-edge guard, 14 OD fixture.
- `src/simulation/vehicle.ts`: SPAWNED→MOVING→QUEUED→CROSSING→MOVING→ARRIVED 상태기계, car-following, waiting 누적.
- `src/simulation/signals.ts`: 환경이 강제하는 진입 gate (red/yellow 진입 금지), switch 카운트.
- `src/analytics/metrics.ts`: queue 분류 + avg/p95 waiting time (nearest-rank).
- `src/simulation/TrafficEngine.ts`: 위 모듈을 통합한 결정론적 고정-tick 엔진 + snapshot/metrics/summary.
- Canvas/renderer가 production 엔진 snapshot을 렌더 (preview 엔진 제거). 브라우저에서 실제 동작 육안 확인.
- Fixed golden baseline 저장: `src/simulation/__fixtures__/fixed-baseline-balanced-4x4-v1.json`.

### M1 Exit Criteria — evidence
- [x] 같은 seed+config → 동일 차량 sequence — `demand.test.ts`, `goldenRun.test.ts` (hash equality)
- [x] 같은 seed+config → 동일 route sequence — `router.test.ts` (determinism + locked snapshot)
- [x] illegal edge 통과 없음 — `router.ts isLegalRoute` + `TrafficEngine.test.ts` legal-positions
- [x] red/yellow에서 진입 없음 — `signals.test.ts` (full-cycle invariant), vehicle SM entryPermitted
- [x] queue 정의 == 구현 — `metrics.test.ts` (zone 경계 69 vs 70) + DATA_CONTRACTS Q2
- [x] waiting time 정의 == 구현 — `vehicle.test.ts` + 손계산 free-flow 법칙 travelTicks=18k+waitTicks
- [x] 30분 NaN/무한루프/leak 없음 — `goldenRun.test.ts` (finite + conservation + drain no-leak)
- [x] Fixed baseline fixture 저장 — `__fixtures__/fixed-baseline-balanced-4x4-v1.json` + equality test

### Golden baseline (balanced-4x4-v1, seed 41021, 1800s, fixed-v1)
generated 599 / admitted 599 / completed 585 / active 14 / backlog 0 · avgWait 12.45s · p95 37.5s · maxQueue 5 · switches 1248.

### Tests actually run
- `npm run check` → PASS (session ✓, tokens ✓, 83 tests ✓, build ✓)

### Known limitations
- 회전 진입은 approach edge axis로만 판정(교차로 내부 충돌/보호좌회전 없음) — MVP 의도.
- 도착은 마지막 edge 정지선 도달로 정의(목적지 신호 불필요).
- Spillback은 edge 진입구 capacity로만 모델(부분 감속 없이 정지/자유주행 이분).

### Next exact actions
1. M2.1 `src/controllers/` Controller interface(observe/decide) — Fixed는 동작/테스트 유지.
2. M2.2 lane pressure 계산 + hand fixtures.
3. M2.3/2.4 MaxPressure 결정 + min-green/yellow 환경 강제(HOLD/SWITCH intent).

### Active milestone
M2 — Adaptive Baseline: Max Pressure (M1 done).

---

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

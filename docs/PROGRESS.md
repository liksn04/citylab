# Progress Log

## 2026-09-20 — M2.3/M2.4 MaxPressure controller + engine rewired to Controller path

### Session objective
M2.3: MaxPressureController를 구현하고 TrafficEngine을 Controller 경로로 재배선한다. Fixed golden baseline은 byte-identical로 보존한다(drift 시 재배선 revert).

### Pre-code contract check (Phase C)
- 아키텍처 변경(engine 신호 구동을 Controller+applySignalIntent로 전환) — 이미 D-008에 근거. pressure 결정 신호는 D-009.
- 보고 metric/`metricVersion`/RunSummary 형태 변경 없음(golden fixture 형태 보존).

### Completed
- `src/controllers/MaxPressureController.ts`: `Controller` 구현. decide()는 반대 axis pressure가 현재보다 **strictly 클 때만** SWITCH(동률/열세 HOLD, 결정론적 HOLD-first tie-break). 색 미지정, min-green/yellow는 환경(`applySignalIntent`)이 강제.
- `src/controllers/Controller.ts`: 관측을 base `IntersectionObservation` + `ObservationInput`(base + `pressure: AxisPressure`)로 분리. `observe(input: ObservationInput)`.
- `src/simulation/constants.ts`: `YELLOW_SEC=3`, `MIN_GREEN_SEC=5`, `FIXED_GREEN_SEC=20` 단일 출처화. FixedTimeController DEFAULT가 상수 참조.
- `src/simulation/TrafficEngine.ts`: tick 1단계를 controller 구동으로 재배선 — `queueLengthsByEdge`(start-of-tick) → `computePressure` → `buildObservationInput`+pressure → `controller.decide` → `applySignalIntent`(switch 카운트). `controllerKind?: 'fixed'|'maxpressure'`(default fixed). Fixed는 env min-green=0으로 자기 timer가 유일한 스위치 결정 → legacy와 동등.
- `src/simulation/scenarios.ts`: `BALANCED_4X4_V1`를 비-테스트 모듈로 추출(goldenRun.test import 부작용 제거). goldenRun/maxPressureRun 둘 다 여기서 import.
- 테스트: MaxPressure decide/min-green gating; engine-level MaxPressure run(결정성, 유한성, conservation, drain no-leak, Fixed와 상이함=adaptive).

### Golden baseline guard (핵심)
- `goldenRun.test.ts`(saved fixture equality 포함) **PASS** — 재배선 후에도 Fixed 결과 byte-identical. Fixed<->legacy 동등성(M2.1) + golden fixture 동등성으로 이중 확인.

### 실제 run 결과 (balanced-4x4-v1, seed 41021, 1800s) — 있는 그대로 기록 (R2, 우월 가정 안 함)
| controller | avgWait | p95 | maxQueue | throughput | switches | completed/generated |
|---|---:|---:|---:|---:|---:|---:|
| fixed-v1 | 12.45s | 37.5s | 5 | 585 | 1248 | 585/599 |
| maxpressure-v1 | 3.15s | 11.0s | 3 | 593 | 514 | 593/599 |
이 scenario에서는 MaxPressure가 모든 지표에서 개선(대기·p95·큐↓, throughput↑, 스위치↓). 다른 scenario(rush)에서 반드시 우월하다는 보장은 아니며 M2.5/M2.6에서 그대로 기록한다.

### UI 스모크
- vite preview 렌더 확인: 4×4 city / fixed baseline 정상, console error 없음, 차량/신호/metric 표시 정상(엔진 재배선이 Fixed 렌더를 바꾸지 않음).

### M2 Exit Criteria 진전
- [x] controller interface가 Fixed/MaxPressure 양쪽 지원 — 둘 다 engine에서 구동.
- [x] decision interval/min-green 계약 테스트 — applySignalIntent + MaxPressure min-green gating.
- [x] MaxPressure deterministic — 동일 seed 반복 summary 동일.
- [x] MaxPressure가 항상 우월하다고 가정하지 않고 결과 기록 — 위 표 + no-superiority 테스트.
- [ ] balanced/rush 두 scenario에서 결과 저장 — balanced는 확인, **rush scenario 정의/저장은 M2.5/M2.6 남음**.

### Tests actually run
- `npm run check` → PASS (18 files, 118 tests; tokens ✓, session ✓, build ✓)
- vite preview → console error 0, 렌더 정상

### Known issue
- `docs/MILESTONES.md` drift(M1 ACTIVE/M2 LOCKED) 및 UI 상단 "M1 active" 카피 stale. source of truth는 `project-status.json`. 범위 밖이라 미수정.

### Next exact actions
1. M2.5/M2.6: `src/simulation/scenarios.ts`에 rush scenario(예: 비대칭 demand/higher vehiclesPerHour) 추가. Fixed vs MaxPressure summary를 balanced/rush 각각 저장(fixture 또는 export)하고 결과를 있는 그대로 기록.
2. rush에서 MaxPressure가 열세인 경우도 숨기지 않고 기록(R2). 필요 시 p95/starvation 관점 확인.
3. (선택) M3 준비: RunSummary/provenance에 controllerId·scenarioVersion 포함 여부는 M3에서 결정(지금 summary 형태는 golden 때문에 유지).

### Active milestone
M2 — Adaptive Baseline: Max Pressure.

---

## 2026-09-20 — M2.2 Lane pressure computation

### Session objective
M2.2: MaxPressure용 lane pressure(upstream queue − downstream continuation queue)를 순수 함수로 구현하고 hand fixture로 검증한다. 신호 튜닝/결정은 하지 않는다.

### Pre-code contract check (Phase C)
- pressure는 제어 결정 신호(decision-semantics) → 코딩 전에 `docs/DECISIONS.md`에 **D-009** 기록(핵심 제약 준수). `docs/DATA_CONTRACTS.md`에 "Control signals — M2" 요약 추가.
- 보고 metric/`metricVersion` 변경 없음.

### Completed
- `src/simulation/pressure.ts`:
  - `buildApproachIndex(graph)` — 교차로별 approach edge(e.to==I)와 같은 heading 직진 continuation(경계면 null) 사전계산.
  - `pressureByAxis(movements, queueByEdge)` — axis별 `Σ(queue(approach) − queue(continuation))`.
  - `computePressure(index, queueByEdge)` — 전 교차로 pressure map.
  - queue는 M1 Q2 정의(`queueLengthsByEdge`) 재사용 전제(caller가 vehicle→queueByEdge 변환); 모듈은 vehicle/analytics 의존 없이 순수(레이어 사이클 회피).
- `src/simulation/pressure.test.ts`: 손계산 fixture(interior I-1-1: NS=5, EW=4), 경계(corner I-0-0: continuation null→upstream만), 음수 pressure, 결정성, 전 16개 교차로 커버.

### M2 Exit Criteria 진전
- lane pressure 신호 확정·검증(D-009). MaxPressure decision(deterministic tie-break)과 balanced/rush 결과 저장은 M2.3~M2.6.

### Tests actually run
- `npm run check` → PASS (16 files, 107 tests; 이전 98 + 신규 9; tokens ✓, session ✓, build ✓)

### Known issue
- `docs/MILESTONES.md` drift(M1 ACTIVE/M2 LOCKED) 여전. source of truth는 `project-status.json`. 범위 밖이라 미수정.

### Next exact actions
1. M2.3 `src/controllers/MaxPressureController.ts`: `Controller` 구현. observe()가 base 관측 + axis pressure를 담은 관측(예: `MaxPressureObservation extends IntersectionObservation { pressure: AxisPressure }`)을 만들고, decide()는 반대 axis pressure가 현재 axis보다 **strictly 클 때만** SWITCH(동률/열세는 HOLD; deterministic tie-break = HOLD 우선). min-green/yellow는 `applySignalIntent`가 강제.
2. M2.3 `TrafficEngine`을 `Controller` 경로로 재배선: 매 tick per-intersection에서 `queueLengthsByEdge(vehicles)` → `computePressure` → `buildObservationInput`+pressure → `controller.decide` → `applySignalIntent`. Fixed는 `FixedTimeController`로 구동. `goldenRun.test.ts` fixture 동등성으로 회귀 가드(drift 시 재배선 revert).
3. M2.4 min-green 계약 테스트 확장(엔진 레벨에서 min-green 위반 switch 무시 확인).
4. M2.5/M2.6 balanced/rush scenario에서 Fixed vs MaxPressure summary 저장, 우월 여부는 그대로 기록(R2, D-006).

### Active milestone
M2 — Adaptive Baseline: Max Pressure.

---

## 2026-09-20 — M2.1 Controller interface + environment signal-safety machine

### Session objective
M2.1: `observe()`/`decide()` `Controller` 인터페이스(HOLD/SWITCH intent)를 도입하고 Fixed가 이를 만족하게 하며,
환경 강제 신호 안전 기계(min-green + yellow)를 추가한다. Fixed 동작이 legacy와 동일함을 증명해 golden baseline을 보존한다.

### Pre-code contract check (Phase C)
- 아키텍처 변경(신호 구동 방식) → `docs/DECISIONS.md`에 **D-008** 기록 후 코딩(핵심 제약 준수).
- metric 의미 변경 없음 → `metricVersion` 유지, DATA_CONTRACTS 변경 없음.

### Completed
- `src/controllers/Controller.ts`: `Controller` 인터페이스 + `SignalIntent`('HOLD'|'SWITCH') + `SignalObservationInput`/`IntersectionObservation`.
- `src/controllers/FixedTimeController.ts`: `FixedTimeController` 클래스(인터페이스 구현) 추가. 기존 순수 함수 `stepFixedSignal`는 **변경 없음**.
- `src/simulation/signalMachine.ts`: 환경 강제 전이 `applySignalIntent`(min-green 이전 SWITCH 무시, 모든 switch는 full yellow 통과, yellow 동안 controller 미호출) + `buildObservationInput` seam(M2.3에서 engine이 재사용).
- 테스트: FixedTimeController decide/observe/결정성; applySignalIntent 안전 계약; buildObservationInput; **Fixed↔legacy equivalence**(green20/yellow3, green10/yellow2 tick-aligned에서 phase sequence 동일).

### Scope discipline
- `TrafficEngine`와 `stepFixedSignal` 미변경 → golden baseline byte-identical(재배선은 MaxPressure가 engine을 통과하는 M2.3에서 goldenRun 동등성 가드와 함께 수행).
- pressure 계산(M2.2)과 MaxPressure decision(M2.3) **미구현**(locked 준수).

### M2 Exit Criteria 진전
- [x] controller interface가 Fixed/MaxPressure 양쪽을 지원 — Fixed 구현 완료; MaxPressure는 같은 계약으로 M2.3에서 구현.
- [x] decision interval과 min-green 계약 테스트 — `signalMachine.test.ts`(min-green 이전 SWITCH 무시, yellow 강제).
- 나머지(MaxPressure deterministic, balanced/rush 결과 저장, 우월 가정 금지)는 M2.2~M2.6에서.

### Tests actually run
- `npm run test` → PASS (15 files, 98 tests; 이전 83 + 신규 15)
- `npm run build` → PASS (tsc -b + vite build)
- `npm run tokens:check` → PASS
- `npm run session:check` → PASS (active M2)

### Known issue
- `docs/MILESTONES.md`가 여전히 M1 ACTIVE / M2 LOCKED로 표기(문서 drift). `project-status.json`이 source of truth(M1 done/M2 active). 이번 세션 범위 밖이라 미수정 — 별도 문서 동기화 필요.

### Next exact actions
1. M2.2 `src/controllers/` MaxPressure용 lane pressure(upstream demand − downstream capacity) 계산 + hand fixtures. observation 확장(approach queue/pressure by axis)을 `SignalObservationInput`/전용 Observation에 추가. 신호 튜닝은 아직 하지 않음.
2. M2.3/M2.4 MaxPressureController.decide(결정론적 tie-break) + `applySignalIntent`로 min-green/yellow 환경 강제. HOLD/SWITCH intent만 방출.
3. M2.3에서 `TrafficEngine`을 `Controller` 경로로 재배선(Fixed는 `FixedTimeController`로 구동), `goldenRun.test.ts` fixture 동등성으로 회귀 가드. drift 시 재배선 revert하고 인터페이스만 유지.
4. balanced/rush 두 scenario에서 Fixed vs MaxPressure smoke 결과 저장(M2.5/M2.6), 우월 여부는 그대로 기록(R2, D-006).

### Active milestone
M2 — Adaptive Baseline: Max Pressure.

---

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

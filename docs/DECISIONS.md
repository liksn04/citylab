# Decision Log

## D-001 — Browser-first custom simulator for MVP
**Status:** accepted

MVP는 자체 경량 simulator를 사용한다. SUMO/CityFlow는 post-MVP validation target이다.

**Reason:** 브라우저에서 즉시 실행하고 학습/분석 경험에 집중하기 위해서다. 연구급 microscopic fidelity를 재구현하려는 목적이 아니다.

## D-002 — Shared DQN, not one model per intersection
**Status:** accepted, activates M4

4×4 MVP에서 하나의 policy network를 공유한다. 교차로별 상태는 같은 observation schema로 정규화한다.

## D-003 — Glass is a structural material
**Status:** accepted

Glass는 top bar, inspector, command surfaces처럼 계층을 분리하는 곳에만 사용한다. 모든 카드에 blur를 적용하지 않는다.

## D-004 — Dark-first MVP
**Status:** accepted

MVP는 dark theme 하나만 완성한다. incomplete light theme를 동시에 유지하지 않는다. 단, semantic token 이름은 향후 theme 확장이 가능하게 한다.

## D-005 — No decorative gradient
**Status:** accepted

UI 배경과 주요 surface에 보라-파랑/오로라 gradient를 쓰지 않는다. gradient는 데이터 자체가 연속 스케일일 때만 시각화 내부에서 허용한다.

## D-006 — Controller comparison requires common random numbers
**Status:** accepted

Fixed, MaxPressure, DQN 비교는 같은 seed set과 demand config를 사용한다. 이것이 실험 비교의 기본 단위다.

## D-009 — Max Pressure lane-pressure definition (M2.2)
**Status:** accepted (M2)

교차로 `I`, axis `a ∈ {NS, EW}`에 대한 pressure는

> `pressure(I, a) = Σ_{approach edge e, e.to==I, e.axis==a} ( queue(e) − queue(straightContinuation(e)) )`

로 정의한다. `queue(x)`는 M1 queue 정의(Q2: `QUEUE_ZONE_M` 내 정지·`QUEUED` 차량, `analytics/metrics.queueLengthsByEdge`)를
그대로 사용한다. `straightContinuation(e)`는 `I`에서 approach와 **같은 heading**으로 나가는 outgoing edge다. 경계
approach(직진 진출 edge 없음)는 downstream을 0으로 본다(upstream queue만 기여). 이는 고전 Max Pressure
`w(phase) = Σ (x_upstream − x_downstream)`의 **직진 근사**(좌/우회전 movement을 분리 모델링하지 않음)이며 경량
mesoscopic 범위(D-001)에 맞춘 것이다.

**Reason:** 그래프 topology와 기존 queue 분류기만으로 결정론적으로 계산되고, routing과 무관하게 hand fixture로
검증 가능하다. controller가 "보는" pressure의 queue 의미가 analytics가 보고하는 queue 의미와 동일하게 유지된다.

**Alternatives considered:**
- (a) per-vehicle route-aware downstream(각 차량의 실제 다음 edge를 downstream으로) — pressure가 개별 route에 결합되어 fixture가 어렵고 4×4에서 이득이 미미해 보류.
- (b) 실현 queue 대신 demand-rate 기반 upstream — 반응성이 낮고 demand 모델 접근이 필요해 기각.

**Determinism/metric impact:** 보고 metric과 `metricVersion` 변경 없음(pressure는 보고 aggregate가 아니라 제어
신호). M2.2는 pressure 계산만 하며 신호 튜닝/결정은 하지 않는다(MaxPressure decision은 M2.3). pressure 정의를
바꾸면 이 항목을 갱신한다.

## D-008 — Controller interface with environment-enforced phase safety
**Status:** accepted (M2)

M2는 신호 제어 정책을 하나의 계약으로 추상화한다. `Controller` 인터페이스는 `observe(input)`와
`decide(observation) → 'HOLD' | 'SWITCH'` 두 메서드를 가진다. Controller는 신호 색을 직접 지정하지
않는다. min-green과 yellow transition은 **환경**이 강제한다(`applySignalIntent`): green phase는 min-green을
만족하기 전에는 SWITCH intent를 무시하고, 모든 switch는 고정 `yellowSec` yellow를 통과하며, yellow 동안에는
controller를 호출하지 않는다.

기존 순수 함수 `stepFixedSignal`은 **변경하지 않고 유지**한다(단위 테스트와 M1 golden baseline 보존).
FixedTimeController는 같은 인터페이스로 재표현하되, green 경과가 `greenSec`에 도달하면 SWITCH를 내도록 한다.
tick 정렬(모든 duration이 `TICK_SEC`의 정수배) 구성에서 `FixedTimeController + applySignalIntent`의 phase
sequence가 `stepFixedSignal`과 정확히 일치함을 equivalence 테스트로 고정한다.

**Reason:** Fixed/MaxPressure(그리고 M4의 shared DQN)가 하나의 결정 계약을 공유해야 common random numbers
비교(D-006)와 M4 action 모델(HOLD|SWITCH, D-002)이 성립한다. 안전 불변식은 agent에 위임하지 않고 환경이
강제해야 한다(DATA_CONTRACTS Q4).

**Alternatives considered:**
- (a) 각 controller가 phase transition을 직접 소유 — 안전 로직 중복, agent가 yellow/min-green을 우회할 위험으로 기각.
- (b) `stepFixedSignal`에 timing+safety 결합을 유지하고 MaxPressure만 특수 처리 — 공유 계약 부재로 M4 재사용 차단, 기각.

**Determinism/metric impact:** Fixed에 대한 영향 없음. golden fixture(`fixed-baseline-balanced-4x4-v1.json`)와
`metricVersion`은 변경하지 않는다(모든 Fixed threshold가 tick 정수배라 switch 시 remainder가 0 → fresh-phase
reset이 legacy carryover와 동일). 본 세션에서는 `TrafficEngine`을 재배선하지 않고 legacy `stepFixedSignal`
경로를 유지하며, engine을 Controller 경로로 전환하는 작업은 MaxPressure를 engine에 통과시키는 슬라이스(M2.3)에서
goldenRun 동등성 가드와 함께 수행한다.

## D-007 — M1 mesoscopic model and metric definitions finalized
**Status:** accepted (M1)

M1 simulator는 고정 timestep(`TICK_SEC`) 위의 경량 mesoscopic 모델로 확정한다: directed grid, edge 위 연속 위치, 최소 간격 car-following, 정지선 게이팅, 1-tick intersection crossing, yellow 진입 금지. Waiting은 "tick 전진량 < `MOVING_EPSILON_M`일 때만 누적"으로, queue는 "정지선 근접 구간(`QUEUE_ZONE_M`) 내 정지 차량"으로 정의한다. 모든 숫자는 `src/simulation/constants.ts`가 단일 출처이고, metric 의미는 `metricVersion = m1-metrics-v1`로 고정한다.

**Reason:** 재현성과 명시적 의미가 목표다(D-001). 이 정의를 바꾸면 데이터 의미가 바뀌므로 `metricVersion`을 올리고 golden fixture(`__fixtures__/fixed-baseline-balanced-4x4-v1.json`)를 함께 갱신해야 한다(R7).

**Alternatives considered:** microscopic 가속/차선변경 모델(과도한 복잡도, MVP 목적 밖), 순수 큐 기반 셀 전송 모델(시각적 차량 이동 표현이 약함). 두 대안 모두 post-MVP SUMO 교차검증 단계로 미룬다.

## D-010 — Run provenance schema, config canonicalization & hashing (M3.1/M3.2)
**Status:** accepted (M3)

M3는 공정한 비교(D-006)를 자동화하려면 각 run이 **어떤 조건에서 나왔는지**를 스스로 기술해야 한다.
이를 위해 두 계층을 도입한다.

**(1) 재현에 영향을 주는 정규 run config — `RunConfig` (`src/simulation/runConfig.ts`).**
DATA_CONTRACTS Q5가 정의한 "동일 seed가 결과를 동일하게 만드는 입력 집합"을 그대로 필드로 고정한다:
`{ tickSec, rows, cols, seed, vehiclesPerHour, durationSec, controllerKind, controllerGreenSec?, controllerYellowSec?, metricVersion }`.
`canonicalizeRunConfig(engineConfig)`는 `EngineConfig`에서 이 필드만 뽑아 정규 형태로 만든다(생략된 timing은
해당 controller의 constants 기본값으로 **명시적으로 채워** 넣어, "기본값을 생략" vs "기본값을 명시"가 같은 config가
되게 한다). `hashRunConfig`는 이 정규 config를 **키 정렬된 stable JSON 문자열**(재귀적 key sort)로 직렬화한 뒤
결정론적 순수 해시(FNV-1a 계열 64-bit 2-lane → 16자리 hex, `m3` prefix)를 적용한다.
→ **같은 config는 항상 같은 hash, 작성 시 key 순서와 무관**; 어떤 필드라도 다르면 hash가 갈린다.

**(2) run 정체성 provenance — `RunProvenance` (`src/simulation/provenance.ts`).**
DATA_CONTRACTS "Provenance — M3"의 결정론적 부분을 담는다:
`{ scenarioId, scenarioVersion, controllerId, seed, simulationDurationSec, configHash, metricVersion }`.
`controllerId`는 controllerKind에서 파생(`fixed→fixed-v1`, `maxpressure→maxpressure-v1`).
`scenarioVersion`은 scenario에 **추가 필드로** 명시(예: `v1`)하되 기존 `id`(예: `balanced-4x4-v1`)는 바꾸지 않는다.

**runtime 필드(runId, startedAt, codeVersion/commit)는 결정론적 core가 아니라 persistence/run-coordinator
계층(M3.5)이 저장 시점에 부여한다.** 결정론적 core는 재현 가능한 provenance만 만든다(R8: 결정론 시뮬레이션과
비결정 런타임 메타데이터 분리 표기).

**Reason:** configHash로 "같은 조건인지"를 O(1)로 판정할 수 있어야 seed-set 비교(M3.3)와 export 후 재분석
(M3 exit criteria)이 성립한다. 순수·동기 해시를 쓰는 이유는 (a) `simulation/`이 React/Dexie/Web Crypto async에
의존하지 않아야 하고(ARCHITECTURE dependency direction), (b) 재현성 보장 범위가 "동일 JS 런타임 내"(DATA_CONTRACTS
Q5, R8)라 암호학적 강도가 필요 없기 때문이다. provenance를 **별도 래퍼**로 둔 이유는 `summary()` 형태와
`metricVersion`, golden/m2 fixture를 byte-identical로 보존하기 위해서다(핵심 제약).

**Alternatives considered:**
- (a) `RunSummary`에 provenance 필드를 직접 추가 — golden/m2 fixture와 `summary()` 형태가 깨져 기각(래퍼로 분리).
- (b) `JSON.stringify` 그대로 해시 — key 순서/공백에 취약해 "같은 config 다른 hash" 위험. stable stringify로 대체.
- (c) Web Crypto SHA-256(async) — `simulation/`이 async·브라우저 API에 결합되고 순수 테스트가 어려워짐. 재현
  범위상 불필요해 기각.
- (d) 외부 hash 라이브러리 추가 — 의존성 증가 대비 이득 없음. 12줄 내 순수 함수로 충분.

**Determinism/metric impact:** 보고 metric·`metricVersion`·golden/m2 fixture **변경 없음**(provenance는 순수
파생 메타데이터, 시뮬레이션 궤적에 영향 없음). config canonicalization/hash 알고리즘이나 `RunConfig` 필드 집합을
바꾸면 이전 configHash와 불일치하므로 이 항목을 갱신하고 저장된 provenance를 재생성해야 한다.

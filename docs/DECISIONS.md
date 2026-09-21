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

## D-011 — Raw metric-sample time series vs aggregate summary (M3.4)
**Status:** accepted (M3)

M3는 aggregate 요약(`RunSummary`)과 **raw per-sample 시계열**을 명확히 구분한다(M3 exit criteria: "raw
samples와 aggregate 구분"). raw sample은 run 동안 고정 cadence로 찍는 live aggregate 신호의 스냅샷이다:

```ts
interface MetricSample {
  simTimeSec: number          // 이 샘플 시각
  activeVehicles: number      // 이 시각의 네트워크 내 차량 수
  completedVehicles: number   // 지금까지 도착(ARRIVED) 누계
  avgWaitSec: number          // 완료 trip 평균 대기 (누계, M1 정의 재사용)
  throughputPerHour: number   // 누계 throughput의 시간율
  maxQueue: number            // 이 시각의 순간 최대 단일-edge queue (Q2 정의)
}
```

- **cadence**는 `TICK_SEC`의 정수배(기본 `DEFAULT_SAMPLE_INTERVAL_SEC`)여야 하며, 샘플은 `simTimeSec`로
  자기기술한다(별도 cadence 필드 불필요). 정수배가 아니면 러너가 예외를 던진다(결정론적 격자 유지).
- **maxQueue 의미 구분:** sample의 `maxQueue`는 **그 tick의 순간값**(`maxQueueSnapshot`)이고,
  `RunSummary.maxQueue`는 **run 전체 tick의 최댓값**(aggregate)이다. 따라서 항상
  `RunSummary.maxQueue ≥ max(sample.maxQueue)`. 두 값의 의미가 다르므로 혼용하지 않는다.
- **비침습(non-invasive):** 샘플링은 read-only다. `TrafficEngine.sample()`은 현재 상태에서 파생값만 읽고
  tick 로직/상태를 바꾸지 않으며, `summary()` 형태와 tick 경로에 영향이 없다. 샘플을 수집하는 러너
  (`runScenarioSampled`)는 `runScenario`(M2 fixture가 잠근 경로)와 **분리**된 신규 경로다.

**Reason:** 평균만 보면 놓치는 tail/시간적 혼잡(R2)을 시계열로 관찰·export하려면 aggregate와 별개의 raw
표현이 필요하다. 재사용 가능한 read model이어야 persistence(M3.5)와 export(M3.6/3.7)가 같은 스키마를 쓴다.
샘플은 기존 metric 정의(avgWait/throughput/queue)를 **순간에 적용**한 것이므로 새 metric 의미가 아니다 →
`metricVersion`은 그대로 `m1-metrics-v1`.

**Alternatives considered:**
- (a) tick마다 전체 샘플 저장 — 3600 tick × run 수만큼 데이터 폭증, 분석 이득 대비 과다. 고정 cadence로 대체.
- (b) sample의 maxQueue를 running-max로 — aggregate와 중복되고 시간적 혼잡 변화를 못 보여줘 기각(순간값 채택).
- (c) 엔진 tick 안에 샘플 push를 심음 — tick 경로/결정성/golden에 위험. read-only `sample()` + 러너 수집으로 분리.

**Determinism/metric impact:** `metricVersion`·`summary()`·golden/m2 fixture **변경 없음**(샘플링은 read-only
파생). sample 스키마/필드나 cadence 기본값을 바꾸면 이 항목을 갱신한다. 저장 시 runtime 필드는 provenance와
동일하게 persistence 계층이 부여한다(D-010).

## D-012 — Experiment persistence: RunStore port + coordinator, Dexie v2 (M3.5)
**Status:** accepted (M3)

M3.5는 `ExperimentResult`(provenance + aggregate summary + raw samples)를 저장/로드한다. ARCHITECTURE
의존 방향(`persistence ← run coordinator → simulation`, `simulation → Dexie` 금지)을 지키기 위해 3계층으로 나눈다.

**(1) persistence port + 어댑터 (`src/persistence/db.ts`).**
- 레코드만 아는 `RunStore` 인터페이스(port): `saveExperiment(bundle)`, `getExperiment(id)`,
  `listExperiments()`, `getRuns(experimentId)`, `getSamples(runId)`, `loadBundle(experimentId)`.
- `DexieRunStore`(실 IndexedDB 어댑터)와 `InMemoryRunStore`(Map 기반, 테스트/폴백)가 이 port를 구현한다.
- 스키마를 `RunProvenance` 전체 + sample을 담도록 확장한다(**Dexie `version(2)`**): `RunRecord`에
  `scenarioVersion`, `controllerId`, `simulationDurationSec`, runtime `startedAt`, `codeVersion|null`를 추가하고
  (`controllerType` → `controllerId`), `MetricSampleRecord`를 `MetricSample` 전체 필드(activeVehicles·
  completedVehicles·throughputPerHour 포함, `throughput`→`throughputPerHour`)로 맞춘다.

**(2) coordinator (`src/runner/experimentPersistence.ts`).**
persistence와 simulation을 잇는 유일한 지점. `experimentToRecords(result, meta)`(순수 매핑)와
`recordsToExperiment(bundle)`(역매핑), `saveExperiment(store, result, meta)`/`loadExperiment(store, id)`.
**simulation은 persistence/coordinator를 import하지 않는다**(금지된 `simulation → Dexie` 방지). coordinator만
양쪽을 type-import 한다.

**(3) runtime provenance 필드는 coordinator가 부여(D-010).** 결정론적 core는 `RunProvenance`(재현 부분)만
만들고, `runId`, `startedAt`, `codeVersion`, `persistedAt(createdAt)`은 coordinator가 `meta`로 주입한다.
테스트 결정성을 위해 `runId`는 기본적으로 `<experimentId>--<controllerId>--seed<seed>`로 파생(주입 가능).

**reload-after-refresh 검증:** node 테스트 환경엔 IndexedDB가 없으므로 **`fake-indexeddb`(devDependency)**를
쓴다. 저장 → 같은 db 이름으로 새 Dexie 인스턴스 오픈(=새로고침) → 동일 bundle 재조회로 durability를 증명한다.
InMemoryRunStore로는 coordinator 매핑/roundtrip을 DB 없이 검증한다(TEST_STRATEGY: persistence round trip, M3).

**Reason:** port/adapter로 나누면 (a) simulation이 Dexie를 모른 채로 유지되고, (b) coordinator 매핑을 DB 없이
순수 검증하며, (c) 실제 IndexedDB durability는 fake-indexeddb로 재현 검증할 수 있다. 저장 스키마가 provenance
전체를 담아야 export(M3.6/3.7)와 재분석이 가능하다.

**Alternatives considered:**
- (a) simulation이 Dexie 직접 호출 — ARCHITECTURE 위반, 테스트 난이도↑. 기각.
- (b) port 없이 DexieRunStore 직접 사용 — DB 없는 순수 매핑 테스트 불가, node에서 검증 곤란. port로 분리.
- (c) 요약만 저장하고 samples 제외 — "raw samples와 aggregate 구분"(M3 exit criteria)·export 재분석 불충족. 기각.

**Determinism/metric impact:** `metricVersion`·`summary()`·simulation 궤적 **변경 없음**(순수 저장/로드).
**migration 정책은 M6.6 소관** — 현재 배포/저장 데이터가 없어 `version(2)` 정의는 스키마 확정일 뿐이며, 버전 간
migration 테스트는 M6에서 추가한다. 스키마를 다시 바꾸면 이 항목과 Dexie version을 함께 올린다.

## D-013 — CSV export schema (M3.6)
**Status:** accepted (M3)

M3.6은 `PersistedExperiment`를 스프레드시트에서 바로 읽고 재분석할 수 있는 **tidy CSV 두 개**로 내보낸다
(`src/runner/experimentCsv.ts`, 순수 함수 `experimentToCsv → { runsCsv, samplesCsv }`).

- **runs table** — run당 1행(aggregate). 열: `experimentId, experimentName, scenarioId, scenarioVersion,
  controllerId, seed, configHash, metricVersion, simulationDurationSec, runId,` 그리고 `RunSummary` 전체
  (`ticks, simTimeSec, generated, admitted, completed, active, backlog, avgWaitingTimeSec, p95WaitingTimeSec,
  throughput, maxQueue, signalSwitches`).
- **samples table** — (run, sample)당 1행(raw 시계열). 열: `experimentId, runId, controllerId, seed, simTimeSec,
  activeVehicles, completedVehicles, avgWaitSec, throughputPerHour, maxQueue`. run 정체성(runId/controllerId/seed)을
  **비정규화**해 join 없이 pivot 가능하게 한다.
- **형식:** RFC 4180 준수 — 첫 행은 헤더, 콤마/따옴표/개행 포함 필드는 큰따옴표로 감싸고 내부 따옴표는 두 배(`""`),
  줄 종결자는 `\r\n`. 숫자는 JS 기본 표현(전체 정밀도)으로 그대로 출력해 손실이 없게 한다(재분석 가능).
- **입력 보강:** 상관(correlation)을 위해 `PersistedRun`에 `runId`(저장된 `RunRecord.id`)를 추가하고
  `recordsToExperiment`가 채운다. provenance/summary/samples 의미는 불변.

**Reason:** aggregate 비교와 시계열 분석은 스프레드시트 워크플로에서 서로 다른 표 형태를 원한다. 두 tidy 표 +
비정규화 run 정체성은 pivot/필터/차트를 join 없이 가능케 한다. full-precision 숫자와 RFC 4180 escaping은 왕복
손실을 막는다(M3 exit: export 후 재분석 가능).

**Alternatives considered:**
- (a) 단일 CSV에 summary/provenance를 헤더 블록으로 얹고 아래에 samples — 다중 섹션은 스프레드시트가 한 표로 못
  읽어 기각. 두 표로 분리.
- (b) wide 포맷(샘플 metric을 열로 펼침) — 가변 열/희소성으로 재분석이 어려워 tidy(long) 채택.
- (c) 로케일 종속 숫자 포맷/반올림 — 왕복 손실 위험으로 기각(JS 기본 표현 유지).

**Determinism/metric impact:** `metricVersion`·`summary()`·simulation 궤적 **변경 없음**(순수 직렬화). CSV
열 집합/순서/escaping을 바꾸면 이 항목과 golden CSV fixture(`src/runner/__fixtures__/m3-*-v1.csv`)를 함께 갱신한다.

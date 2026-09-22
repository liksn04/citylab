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

## D-014 — JSON export/import envelope (M3.7)
**Status:** accepted (M3)

M3.7은 실험을 **버전 태그가 붙은 JSON 봉투(envelope)**로 내보내고 다시 들여온다
(`src/runner/experimentJson.ts`). 페이로드는 storage-faithful한 `ExperimentBundle`(experiment record + runs +
samples)이라 import 후 `RunStore.saveExperiment`로 무손실 복원되고, `recordsToExperiment`로 재분석 뷰를 얻는다.

```ts
const EXPERIMENT_EXPORT_FORMAT = 'neural-city-lab/experiment'
const EXPERIMENT_EXPORT_SCHEMA_VERSION = 1
interface ExperimentExport {
  format: 'neural-city-lab/experiment'  // 상호운용 판별 태그
  schemaVersion: number                 // export 스키마 버전(현재 1)
  exportedAt: string | null             // 선택 메타데이터(주입 가능; 결정성 위해 테스트에서 고정)
  experiment: ExperimentRecord
  runs: RunRecord[]
  samples: MetricSampleRecord[]
}
```

- `exportExperimentJson(bundle, meta?)` → 봉투를 pretty JSON 문자열로.
- `parseExperimentExport(json)` → `JSON.parse` + **검증**(`format` 일치, `schemaVersion` 지원, experiment는
  object·runs/samples는 array). 실패 시 원인을 담은 명확한 `Error`.
- `importExperimentBundle(json)` → 검증 후 `ExperimentBundle` 반환(그대로 저장 가능).

**Reason:** CSV(D-013)는 스프레드시트 분석용이지만 실험 전체를 무손실로 이동/재저장하려면 구조를 보존하는
JSON이 필요하다. `format`/`schemaVersion` 태그는 이후 스키마 진화 시 잘못된/구버전 파일을 import 단계에서
거부할 수 있게 한다(M3 exit: export 후 재분석 가능한 스키마). 봉투 payload를 `ExperimentBundle`로 둔 이유는
`experimentToRecords`/`recordsToExperiment`(D-012)와 정합해 저장·재분석 양쪽에 바로 연결되기 때문이다.

**Alternatives considered:**
- (a) 태그 없는 순수 JSON(bundle 그대로) — 버전/포맷 검증 불가로 향후 스키마 드리프트에 취약. 봉투로 감쌈.
- (b) payload를 `PersistedExperiment`(분석 뷰)로 — runId/runtime 필드가 빠져 재저장이 비무손실. bundle 채택.
- (c) import 시 자유 통과(검증 없음) — 손상/구버전 파일을 조용히 수용. format+version+shape 검증 추가.

**Determinism/metric impact:** `metricVersion`·`summary()`·simulation 궤적 **변경 없음**(순수 직렬화/역직렬화).
`schemaVersion`이나 봉투 필드를 바꾸면 이 항목·`EXPERIMENT_EXPORT_SCHEMA_VERSION`·golden fixture
(`src/runner/__fixtures__/m3-export-v1.json`)를 함께 갱신하고, 구버전 import 경로(migration/거부)를 정의한다.

## D-015 — Shared-DQN observation encoding (M4.1)
**Status:** accepted (M4)

M4는 shared policy network + per-intersection observation을 쓴다(D-002). 그 observation을 만드는 계층으로
**순수 encoder**(`src/rl/observation.ts`)를 도입한다. encoder는 환경이 **매 green 결정 tick마다 이미 controller에게
넘기는** per-intersection `ObservationInput`(base timing + lane pressure, M2.3/D-008)을 입력으로 받는다. 이 슬라이스는
엔진에 새 observation seam을 추가하지 않는다 — 기존 `ObservationInput`을 그대로 소비한다(scope 최소화).

**(1) current/other 상대 프레이밍.** action이 대칭 2-phase(NS/EW) 신호에 대한 `HOLD | SWITCH`(D-002)이고 하나의
network를 모든 교차로·phase가 **공유**하므로, observation을 절대 NS/EW가 아니라 **현재 green axis 기준 상대값**으로
인코딩한다. 고정 순서 feature(`OBSERVATION_FEATURES`):

1. `pressureCurrent = tanh(pressure[current] / PRESSURE_OBS_SCALE)`
2. `pressureOther   = tanh(pressure[other]   / PRESSURE_OBS_SCALE)`
3. `phaseProgress   = clamp01(phaseElapsedSec / PHASE_TIME_OBS_SCALE)`
4. `minGreenSatisfied = input.minGreenSatisfied ? 1 : 0`

→ 벡터 길이 `OBSERVATION_SIZE = 4`. `current`는 `input.activeAxis`, `other`는 그 반대 axis.

**(2) 정규화.** lane pressure는 부호 있는 무한정값(up−down, D-009)이라 `tanh`로 [−1,1]에 부드럽게 squash한다
(부호 보존, 임의 크기에서도 ±1로 포화만 하고 NaN/Inf 없음 → shared net 입력이 항상 유계). 스케일은 magic number가 아니라
**단일 출처(`src/simulation/constants.ts`)에서 파생한 named constant**다: `PRESSURE_OBS_SCALE = EDGE_CAPACITY`
(approach 하나가 꽉 찬 정도 ≈ tanh 후 0.76), `PHASE_TIME_OBS_SCALE = FIXED_GREEN_SEC`(nominal green 1개 = 1.0).
`phaseProgress`는 [0,1]로 clamp한다.

**(3) green 전용 precondition.** encoder는 green observation(`activeAxis ≠ null`)에서만 정의된다 — 환경이 controller를
호출하는 바로 그 순간이다(yellow 동안 controller 미호출, D-008). YELLOW observation은 **예외를 던진다**. 그래야 잘못
넘어온 yellow 상태가 조용히 틀린 current/other 프레임으로 인코딩되지 않는다. 결정(따라서 이후 저장될 transition)은
green에서만 일어나므로 손실이 없다.

**Reason:** 대칭 2-phase 신호에서 shared network는 observation이 phase-대칭일 때 훨씬 잘 일반화한다 — "현재 axis가 더
혼잡 vs 반대 axis가 더 혼잡"이라는 같은 상황이 NS green이든 EW green이든 **동일하게** 인코딩되어야 `HOLD|SWITCH`
결정에 바로 쓰인다. 이는 MaxPressure 결정 신호(현재 vs 반대 pressure 비교, D-009)와 같은 프레임이라 observation이
학습-free baseline과 직접 비교 가능하고 inspector에서 읽힌다(M5.6). 스케일을 sim constants에서 파생하면 단일 출처를
유지하고 하드코딩 숫자를 피한다(핵심 제약). tanh+clamp는 혼잡도와 무관하게 유계·유한 입력을 보장한다.

**Alternatives considered:**
- (a) 절대 NS/EW pressure + active-axis one-hot(5-dim) — network가 phase 대칭성을 스스로 학습해야 해 파라미터·샘플이
  더 든다(우리가 구조로 넣을 수 있는 성질). 상대 인코딩이 부족하면 되돌릴 fallback으로 남김.
- (b) pressure의 min-max/z-score 정규화 — 데이터셋 통계(비결정·데이터 의존)가 필요하고 미관측 극단에서 overflow.
  tanh는 무상태·total이라 채택.
- (c) 차분 pressure 외에 axis별 raw queue 크기(load)도 포함 — 엔진 `ObservationInput` seam 확장이 필요해 보류.
  M4.10 evaluation에서 pressure-only가 약하면 ADR bump로 확장(관측/모델 fixture 동반).
- (d) yellow에서 예외 대신 중립 벡터 반환 — 정의가 모호한 프레임으로 조용히 학습할 위험. 예외로 대체.

**Determinism/metric impact:** 보고 metric·`metricVersion`·`summary()`·golden/m2 fixture **변경 없음** — observation은
집계 metric이 아니라 RL 제어-입력 표현이다(pressure/D-009도 `metricVersion` 무관인 것과 동일). encoder는 순수·결정론적.
feature 집합/순서/스케일이나 tanh·clamp 방식을 바꾸면 앞으로 모든 model이 보는 입력이 달라지므로 이 결정(및 관측/모델
fixture)을 함께 갱신한다. 의존 방향은 합법 유지: `rl → controller contract`(`ObservationInput` 타입 import) + `rl`이
`simulation/constants`를 읽음 — 금지된 `simulation → rl` 간선 없음(ARCHITECTURE).

## D-016 — Shared-DQN action adapter & injectable policy seam (M4.2)
**Status:** accepted (M4)

M4는 학습하는 정책을 **기존 `Controller` 계약**(D-008)으로 구동해 Fixed/MaxPressure와 common random numbers 비교
(D-006)를 가능케 한다. 그러려면 (1) 이산 action 공간과 SignalIntent 매핑, (2) network를 나중에 끼울 수 있는 seam이
필요하다. 이 슬라이스는 어댑터·seam·매핑만 만들고 **학습/텐서/모델은 만들지 않는다**(잠금 유지).

**(1) action 공간 (`src/rl/action.ts`).** MVP action은 `HOLD | SWITCH` 둘(D-002). 이를 **고정 순서 이산 인덱스**로 둔다:
`ACTIONS = ['HOLD', 'SWITCH']`(index 0 = HOLD, 1 = SWITCH), `ACTION_SIZE = 2`. `actionToIntent(i)`는 인덱스를
`SignalIntent`로(범위 밖은 예외), `intentToAction(intent)`는 역매핑(baseline transition을 저장할 때 쓰임). 이 순서는
Q-output 헤드·replay buffer가 의존하므로 바꾸면 이 결정과 모델/버퍼 fixture를 함께 갱신한다.

**(2) 주입식 policy seam + 어댑터 컨트롤러 (`src/rl/DqnController.ts`).** `Policy = (observation: number[]) => number`는
인코딩된 관측(M4.1, 길이 `OBSERVATION_SIZE`)을 받아 action 인덱스를 돌려주는 **주입식** 함수다. `DqnController`는
`Controller<ObservationInput>`을 구현하고 `observe`는 full input을 통과, `decide`는 `encodeObservation` → `policy` →
`actionToIntent` 순으로 HOLD|SWITCH intent만 방출한다. 학습 전에는 결정론적 stub(예: 항상 HOLD, 또는 테스트 정책)을
주입하고, 이후 슬라이스(M4.6/M4.8)에서 TensorFlow.js 모델 기반 policy를 주입한다 — **이 파일엔 텐서/학습이 없다**.

**(3) 안전은 환경 소유 유지.** `decide`가 yellow(`activeAxis===null`)에 호출되면 `encodeObservation`(green 전용)에
YELLOW를 먹이지 않도록 HOLD로 가드한다(환경도 yellow엔 controller 미호출). min-green·yellow 강제는 전적으로
`applySignalIntent`가 소유한다 — 정책이 매 tick SWITCH를 원해도 환경이 min-green 전에는 무시하고 모든 switch를 full
yellow로 통과시킨다(D-008). 즉 **agent는 색/yellow를 직접 정할 수 없다**.

**이 슬라이스는 엔진 실행 경로에 배선하지 않는다.** `TrafficEngine`의 `controllerKind`에 `'dqn'`을 추가하거나
provenance/runConfig를 확장하는 것은 **실제 policy가 필요한** evaluation 슬라이스(M4.9/M4.10)로 미룬다(scope 최소화,
그때 D-010 provenance와 함께 처리).

**Reason:** 어댑터를 `Controller`로 두면 학습 정책이 baseline과 같은 환경·같은 안전 계약·같은 비교 축(D-006)을 쓴다.
policy를 주입식 함수로 분리하면 (a) 학습 코드 없이 어댑터를 순수하게 테스트하고, (b) 안전이 환경 소유임을 정책과 무관하게
증명하며, (c) 이후 TFJS 모델을 텐서 걱정 없이 끼울 seam이 생긴다. 이산 인덱스↔intent 매핑을 명시하면 replay buffer와
Q-output이 안정된 계약 위에 놓인다.

**Alternatives considered:**
- (a) `DqnController`가 모델을 직접 소유(생성자에서 TFJS 로드) — 학습/텐서가 어댑터에 결합돼 순수 테스트 불가, 잠금 위반.
  policy 주입으로 분리.
- (b) action을 SignalIntent 문자열로 바로 표현(인덱스 없음) — Q-output(수치 헤드)·replay 저장과 어긋남. 인덱스 채택.
- (c) 컨트롤러가 min-green/yellow를 자체 처리 — 안전을 agent에 위임하게 되어 D-008 위반. 환경 소유 유지.
- (d) 지금 엔진 `controllerKind='dqn'`까지 배선 — 실제 policy·provenance 확장이 필요해 M4.9로 미룸.

**Determinism/metric impact:** 보고 metric·`metricVersion`·`summary()`·golden/m2 fixture **변경 없음**(엔진 실행 경로
무배선, 순수 어댑터). 주어진 결정론적 policy에 대해 `decide`는 결정론적. action 순서/매핑을 바꾸면 이 결정과 이후 모델·
버퍼 fixture를 함께 갱신한다. 의존 방향 합법: `rl → controller contract` + `rl` 내부(action↔observation) — `simulation
→ rl` 간선 없음(ARCHITECTURE).

## D-017 — Shared-DQN reward: negative local approach-queue (M4.3)
**Status:** accepted (M4)

M4 학습의 목표(무엇이 "더 나은" 신호 제어인가)를 정의하는 reward다. **보상은 데이터 의미**를 바꾸므로 코딩 전에 결정으로
남긴다(핵심 제약). shared network + per-intersection observation/action(D-002)에 맞춰 **per-intersection local reward**를
쓴다:

> `reward(I, step) = −Σ_{approach edge e, e.to == I} queue(e)`

`queue(e)`는 M1 Q2 정의(`analytics/metrics.queueLengthsByEdge`)를 그대로 쓴다 — 그 교차로로 들어오는 모든 approach
edge의 정지 대기 차량 수 합의 **음수**다. 값은 항상 ≤ 0이며, 대기 차량이 적을수록(혼잡이 덜할수록) 0에 가깝다. 구현은
`src/rl/reward.ts`의 순수 함수 `queueReward(movements, queueByEdge)`(교차로 하나) + `computeQueueRewards(index,
queueByEdge)`(전 교차로, `computePressure`와 대칭)로, 매 tick 이미 계산되는 approach index + per-edge queue map을
재사용한다.

**Reason (음의 대기/큐 채택 — 사용자 선택):** MVP 주지표(avg/p95 대기·maxQueue)와 직접 정렬된다 — 대기 차량 수를 줄이는
것이 곧 누적 대기시간·큐를 줄이는 것이다. queued 차량은 Q2 정의상 정지선 근처에 멈춰 대기 중이라 "대기"와 "큐"가 같은
신호로 수렴한다. per-intersection local reward는 각 교차로의 action에 credit을 직접 부여해 credit assignment가 명확하고
per-intersection observation(D-015)과 대칭이다. 순수·결정론적이라 fixture로 검증 가능하며 pressure/observation과 같은
부품(approach index, queueByEdge)을 재사용한다.

**Alternatives considered:**
- (a) 전역(network-wide) 총 큐의 음수 — 한 교차로 action이 전체 보상에 희석돼 credit assignment가 흐려짐. local 채택.
- (b) throughput(+완료 차량) 기반 — 포화 전 신호가 약하고 대기 tail(R2)을 직접 벌하지 않음. 대기/큐가 MVP 지표에 더 부합.
- (c) 매 tick 대기시간 증가분(−Σ 이번 tick 대기 차량 × TICK_SEC) — 큐 수와 강한 상관이나 엔진에 per-tick 대기 증가분
  노출 seam이 필요. 같은 취지를 스냅샷 큐 합으로 근사(추가 seam 불필요)해 채택.
- (d) −pressure(up−down 차분) — 균형 잡힌 대혼잡이 0이 되어 절대 혼잡도를 못 벌함. 절대 큐 채택.

**Determinism/metric impact:** 보고 metric·`metricVersion`·`summary()`·golden/m2 fixture **변경 없음**(reward는 학습
신호이지 집계 metric이 아님 — observation/pressure와 같은 범주). reward 정의(로컬 vs 전역, 큐 vs 대기증가분, 스케일)를
바꾸면 학습 의미가 바뀌므로 이 결정과 이후 학습/평가 결과를 함께 갱신한다. reward **스케일링/클리핑**은 학습
하이퍼파라미터(M4.6) 소관이며 정의(raw 음의 큐)와 분리한다. 의존: `rl → simulation`(queue map/approach index 재사용),
금지된 `simulation → rl` 없음.

## D-018 — Shared-DQN Q-network: online + target, tensor discipline (M4.4)
**Status:** accepted (M4)

M4.4는 TensorFlow.js로 **shared** Q-network를 만든다(D-002). 구조는 소규모 MLP:

> 입력 `OBSERVATION_SIZE`(4, D-015) → Dense(`DQN_HIDDEN_UNITS`=32, relu) → Dense(`ACTION_SIZE`(2, D-016), linear)

하나의 network를 모든 교차로가 공유하며(관측을 배치 행으로 넣음), 출력은 각 action의 Q값이다. **target network**는
online의 주기적 복제로, `syncTarget()`가 online 가중치를 target에 복사한다(DQN target 안정화 — bootstrapping 진동
완화). 구현은 `src/rl/qNetwork.ts`: `buildQNetwork(hidden?)`, `DqnModel`(online+target 소유, `syncTarget`,
`predictQ`/`predictTargetQ`, `dispose`).

**텐서 수명 관리(핵심).** 모든 forward는 `tf.tidy`로 감싸 중간 텐서를 즉시 해제하고, `predict*`는 `arraySync`로 JS
배열만 반환한다(텐서 밖으로 새지 않음). `dispose()`가 online+target 가중치를 모두 해제한다 → `tf.memory().numTensors`가
생성·예측·sync·dispose 전후로 동일(테스트로 강제). 이것이 M4 exit "tensor leak 검사"의 토대다.

**하이퍼파라미터.** `DQN_HIDDEN_UNITS = 32`(4→2 소규모 문제의 합리적 시작값, 튜닝 가능). optimizer/learning rate/γ/
loss는 update step(M4.6) 소관이라 여기서 만들지 않는다. 이 슬라이스는 구조 + target sync + predict + dispose만 하고,
엔진/worker 배선(M4.6/M4.7/M4.9)은 하지 않는다.

**Reason:** online/target 분리는 표준 DQN 안정화 기법이고, 단일 shared network는 D-002다. `tidy`/`dispose`로 텐서
수명을 처음부터 명시 관리하면 이후 학습 루프가 leak 없이 확장된다. 하이퍼파라미터를 named 상수로 두어 하드코딩을 피한다.

**Alternatives considered:**
- (a) 교차로마다 network — D-002 위반(파라미터 폭증·일반화 저하). shared 채택.
- (b) target network 없이 online만 부트스트랩 — target 진동/발산 위험. target 채택.
- (c) 더 깊고 넓은 net — 4→2 문제에 과다(학습 느림·leak 표면적↑). 1-hidden(32)으로 시작, 필요 시 튜닝.
- (d) 지금 optimizer/loss까지 — M4.6 소관이라 분리(shape·leak만 이 슬라이스).

**Determinism/metric impact:** 보고 metric·`metricVersion`·`summary()`·golden/m2 fixture **변경 없음**(엔진 무배선).
**network 가중치 초기화는 확률적·backend 의존(cpu/webgl)** — 결정론 시뮬레이션과 확률적 학습을 분리 표기하고(R8),
backend는 eval에서 기록한다(R5). 따라서 network 초기화는 seed 고정 대상이 아니며 재현성은 eval seed 분리(M4.9)로 확보.
구조/`DQN_HIDDEN_UNITS`를 바꾸면 이 결정과 이후 모델 저장·로드 fixture(M4.8)를 함께 갱신한다. 의존: `rl → simulation`
상수(`OBSERVATION_SIZE`/`ACTION_SIZE` 파생) + `@tensorflow/tfjs` — 금지된 `simulation → rl` 없음.

## D-019 — DQN update step: target, loss, hyperparameters (M4.6)
**Status:** accepted (M4)

M4.6은 표준 DQN 1-스텝 gradient 업데이트를 구현한다(`src/rl/dqnUpdate.ts`, `DqnTrainer`). replay 미니배치
(D-017 `Transition[]`)에 대해:

> `y = reward + γ · maxₐ' Q_target(nextObs) · (1 − done)` (target net, **gradient 없음**)
> `loss = Huber( y, Q_online(obs)[action] )`, `Adam(learningRate)`로 online 파라미터 1스텝

- **Double/vanilla:** 기본 vanilla DQN(target net의 max). Double DQN은 후속 튜닝 여지로 남김.
- **loss = Huber(δ=1)** — DQN 표준(이상치에 MSE보다 강건). 선택 action의 Q만 대상으로(one-hot 마스크 → `Σ(Q⊙mask)`),
  나머지 action Q에는 gradient가 흐르지 않는다.
- **하이퍼파라미터(named, `DEFAULT_DQN_HYPERPARAMS`)**: `γ = 0.95`, `learningRate = 1e-3`(Adam). reward는 D-017 raw
  음의 큐를 **스케일링 없이** 사용(스케일/클리핑은 필요 시 후속). **batch size**와 **target sync 주기**는 이 스텝이 아니라
  학습 루프(M4.7/M4.9)의 하이퍼파라미터다 — `trainStep(batch)`는 주어진 배치와 현재 target으로 한 스텝만 수행한다.
- **텐서 규율:** target y는 `tf.tidy`로(중간 텐서 즉시 해제), 손실은 `optimizer.minimize(fn, true)`의 반환 scalar만 읽고
  dispose, 입력/타깃 텐서는 스텝 끝에 dispose, Adam accumulator는 `DqnTrainer.dispose()`(=`optimizer.dispose()`)로 해제.
  → `tf.memory().numTensors`가 생성·다수 스텝·dispose 전후 동일(M4 leak 기준).

**Reason:** target net + Huber + Adam은 검증된 DQN 조합으로 소규모 문제에서 안정적이다. 선택 action만 loss에 넣는 것은
DQN의 표준(관측된 action의 Q만 학습). 하이퍼파라미터를 named 상수로 두어 하드코딩을 피하고, 단일 업데이트 스텝을 학습
루프와 분리해 순수하게(배치 in → loss out) 테스트한다.

**Alternatives considered:**
- (a) MSE loss — Huber보다 이상치에 민감(큰 TD-error에서 폭주 위험). Huber 채택(δ=1).
- (b) Double DQN(online argmax + target 평가) — 과대추정 완화하나 지금은 복잡도↑. vanilla로 시작, 후속 여지.
- (c) 업데이트 스텝이 target sync/epsilon/batch까지 소유 — 학습 루프(M4.7/M4.9) 책임과 뒤섞임. 스텝은 배치 1스텝만.
- (d) reward 스케일링/정규화를 여기서 — 정의(D-017)와 분리. 필요 확인 후 후속(스케일도 결정 항목).

**Determinism/metric impact:** 보고 metric·`metricVersion`·`summary()`·golden/m2 fixture **변경 없음**(엔진 무배선).
학습은 확률적(가중치 초기화·SGD, R8)이라 결정론 대상이 아니며, 재현성은 eval seed 분리(M4.9)로 확보한다. γ·lr·loss·
reward 스케일을 바꾸면 이 결정과 학습/평가 결과를 함께 갱신한다. 의존: `rl → simulation`(RandomSource/상수) +
`@tensorflow/tfjs` — 금지된 `simulation → rl` 없음.

## D-020 — Training worker protocol: pure session + thin glue (M4.7)
**Status:** accepted (M4)

M4.7은 ARCHITECTURE의 main↔worker 경계(학습을 별도 스레드로)를 처음 구현한다. 렌더링/상호작용은 main에, TFJS 학습
batch path는 worker에 두어 학습이 UI 스레드를 장시간 block하지 않게 한다(M4 exit "학습 루프 non-blocking", R3).

**pure session vs thin glue 분리(핵심).** Web Worker/`self`/`postMessage`는 node(vitest)에서 실행 불가하므로
protocol을 두 계층으로 나눈다:
- `src/workers/trainingProtocol.ts` — **순수** 메시지 타입 + `TrainingSession` 클래스. RL 부품(DqnModel/ReplayBuffer/
  DqnTrainer/epsilon schedule/seeded RNG, D-015~D-019)을 소유하고 `handle(command): TrainingResponse[]`로 명령을
  처리한다. `self`/DOM/Worker API에 의존하지 않아 node에서 tfjs와 함께 그대로 테스트된다(message integration test).
- `src/workers/trainingWorker.ts` — **얇은 glue**. `const ctx = self as unknown as DedicatedWorkerGlobalScope`로
  캐스팅해 `ctx.onmessage`→`session.handle`→`ctx.postMessage`만 잇는다(로직 없음). DOM+WebWorker lib 혼재로 인한
  `self` 타이핑 모호성을 캐스팅으로 피한다. 테스트 대상 아님(경계), tsc만 통과. 아직 앱/엔진에 배선하지 않는다.

**메시지 스키마.** command(main→worker): `init(config)` / `push(transitions)` / `train(steps)` / `stop`.
response(worker→main): `ready` / `progress(step, loss, epsilon, bufferSize)` / `skipped(reason, bufferSize)` /
`stopped` / `error(message)`. `train`은 스텝을 **청크로** 돌며 스텝마다 progress를 방출(간헐 yield로 non-blocking),
`targetSyncInterval`마다 target 동기화, buffer가 `minBufferToTrain` 미만이면 `skipped`. seeded RNG로 minibatch 샘플링
결정론(가중치 학습 자체는 확률적, R8).

**transition 출처.** 이 슬라이스에서 session은 `push`로 받은 transition으로 학습만 한다. **엔진(TrafficEngine +
DqnController)을 worker 안에서 돌려 transition을 생성하는 배선은 M4.9(eval runner)** 소관이다(scope 최소화). 즉 M4.7은
"학습 batch를 스레드 밖에서 청크 실행하고 진행/loss를 보고하는 프로토콜"을 확정한다.

**Reason:** 순수 session으로 분리하면 (a) Worker 없이 node에서 protocol 전체를 통합 테스트하고, (b) glue는 자명해
테스트 불필요하며, (c) M4.9가 이 session에 엔진 transition을 연결만 하면 된다. 청크 train + progress 보고는 UI가
학습 중에도 반응하도록 하는 non-blocking 계약의 근거다.

**Alternatives considered:**
- (a) worker 파일에서 직접 로직 구현(순수 분리 없음) — node 테스트 불가, message 통합 검증 곤란. 분리 채택.
- (b) 지금 worker 안에서 TrafficEngine까지 돌림 — 엔진 배선(controllerKind 'dqn')·provenance는 M4.9 소관, 여기로
  당기면 슬라이스 비대. push/train 프로토콜로 분리.
- (c) `Comlink` 등 RPC 라이브러리 — 의존성 증가 대비 이득 미미. 단순 postMessage 프로토콜로 충분.
- (d) `self`를 DOM/WebWorker 유니온 그대로 사용 — `postMessage` 시그니처 충돌(Window.postMessage는 targetOrigin
  요구). `DedicatedWorkerGlobalScope` 캐스팅으로 회피.

**Determinism/metric impact:** 보고 metric·`metricVersion`·`summary()`·golden/m2 fixture **변경 없음**(엔진 무배선,
순수 학습 조율). minibatch 샘플링은 seed 결정론이나 network 학습은 확률적(R8) — 재현성은 eval seed 분리(M4.9). 메시지
스키마를 바꾸면 이 결정과 glue/consumer(M4.9)를 함께 갱신한다. 의존: `workers → rl → {simulation, tfjs}` — 금지된
`simulation → {rl, workers}` 없음(ARCHITECTURE).

## D-021 — DQN engine wiring, decision hook & training-transition semantics (M4.9)
**Status:** accepted (M4)

M4.9는 DQN을 `TrafficEngine`에서 실제로 구동하고(평가), 학습 transition을 생성한다. 세 부분을 결정한다.

**(1) 엔진 배선 — controller 주입(simulation→rl 금지 준수).** `ControllerKind`에 `'dqn'`을 추가한다. 단, 엔진은
`rl/DqnController`를 **import하지 않는다**(금지된 `simulation → rl`). 대신 `EngineConfig.injectedController?: Controller`
(controllers/ 계약 타입)를 받아, `controllerKind==='dqn'`이면 주입된 controller를 쓰고 env 안전 설정은 adaptive와 동일
(`minGreenSec=MIN_GREEN_SEC, yellowSec=YELLOW_SEC`)로 둔다. 주입 없이 'dqn'이면 예외. DQN controller(및 policy=모델)
조립은 rl/runner 계층이 하고 엔진엔 계약만 넘긴다.

**(2) read-only 결정 hook(golden 보존).** `EngineConfig.onDecisionTick?: (info) => void`를 추가한다. tick의 신호
단계에서 이미 계산되는 값만 넘긴다: `{ tick, queueByEdge, decisions: [{ intersectionId, observation: ObservationInput,
intent }] }`. **green(결정) 교차로만** 포함(yellow는 agent 결정 아님). hook은 순수 관찰이라 simulation 궤적/`summary()`에
영향이 없고, **미제공 시 완전 무변화** → Fixed golden byte-identical(M3.4 샘플링과 동일 원칙). 넘기는 타입은 모두
controllers/simulation 것 → 엔진에 rl 의존 없음.

**(3) decision-point semi-MDP transition(사용자 승인 "권장 설계").** agent 결정은 green 시점에만 일어나므로 transition의
`obs→nextObs`는 연속 tick이 아니라 **같은 교차로의 다음 green 결정**으로 잇는다. 보상은 그 간격(yellow 포함) 동안의
**per-intersection queue reward(D-017) 누적**이다. 순수 `TransitionCollector`(`src/rl/transitionBuilder.ts`)가 매 tick
`queueByEdge`로 각 pending 결정의 보상을 누적하고, 교차로 I가 다음 결정을 하면 직전 pending을 `{obs, action, reward=누적,
nextObs=새 obs, done:false}`로 완료·push한 뒤 새 pending을 연다. episode 끝에서 남은 pending은 `done:true`로 완료
(nextObs=마지막 obs). 보상 구간은 결정 tick t에 대해 (t, t'] (다음 결정 t'까지, t'의 큐 상태 = a_t의 결과를 포함) — 결정
tick 자신의 큐는 직전 action의 결과라 직전 pending에 credit. action은 `intentToAction`(D-016).

**(4) provenance/runConfig 확장.** `CONTROLLER_IDS.dqn = 'dqn-v1'`. `canonicalizeRunConfig`는 'dqn'을 adaptive로
취급(maxpressure와 동일: greenSec=null, yellowSec=YELLOW_SEC, minGreenSec=MIN_GREEN_SEC) → dqn run도 configHash/
provenance를 가진다(D-010). 모델 가중치는 configHash에 넣지 않는다(비결정·backend 의존, R8; run 정체성은 조건이지
학습된 파라미터가 아님).

**(5) train/eval seed 분리(TEST_STRATEGY).** 학습은 train seed set, 평가는 **분리된 eval seed set**에서 **greedy(ε=0)**로
한다. 단일 seed 호성적을 성능으로 취급하지 않는다. eval은 고정 모델·고정 seed에서 결정론적(`evaluateDqn(model, scenario)`
반복 시 동일 summary).

**Reason:** controller 주입은 유일하게 `simulation→rl`을 피하면서 DQN을 엔진에 태우는 방법이다. read-only hook은 golden을
지키며 transition 원자료를 준다. decision-point 누적 보상은 HOLD|SWITCH가 green에서만 일어나고 yellow가 강제되는 본
환경의 올바른 credit 구조다(R1: 잘못된 credit은 학습 버그). 모델을 configHash에서 제외하는 것은 R8(결정론 조건 vs 확률적
학습 분리).

**Alternatives considered:**
- (a) 엔진이 DqnController를 직접 생성 — `simulation→rl` 위반. 주입으로 회피.
- (b) 연속 tick one-step transition(yellow tick에 dummy action) — env 강제 yellow를 agent action으로 오인, credit 왜곡.
  decision-point 채택.
- (c) 보상 미누적(다음 결정 시점 순간값만) — 긴 phase의 중간 혼잡을 놓침. 누적 채택(간단·정확 절충).
- (d) 엔진 tick 내부에 transition push를 심음 — 결정성/golden 위험. read-only hook + 외부 순수 collector로 분리.
- (e) configHash에 모델 해시 포함 — 비결정·backend 의존이라 재현 조건 해시 오염. 제외.

**Determinism/metric impact:** 보고 metric·`metricVersion`·`summary()`·golden/m2 fixture **변경 없음**(hook 미제공 시
엔진 무변화; goldenRun 테스트로 가드). 학습은 확률적(R8) — 재현성은 eval seed 분리로. transition 의미(누적 구간/보상)를
바꾸면 이 결정과 학습/평가 결과를 함께 갱신한다. 의존: `rl/runner → {simulation, controllers, tfjs}`, `simulation`은
controllers 계약만(주입) — 금지된 `simulation → rl` 없음(ARCHITECTURE).

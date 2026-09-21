# Data Contracts

이 문서의 정의가 코드보다 우선한다. M1에서 확정한 항목은 `FINAL (M1)` 로 표시한다.
숫자 상수는 이 문서가 아니라 `src/simulation/constants.ts`의 named constant가 단일 출처이며,
아래 표의 값은 그 상수와 반드시 일치해야 한다(테스트로 강제).

## Time

- Simulation clock: seconds, `number`
- Core integration tick: **고정 timestep** `TICK_SEC` (FINAL). 시뮬레이터는 오직 whole tick 단위로만 전진한다.
- Rendering timestep과 simulation timestep은 분리. **렌더 프레임 dt는 시뮬레이션 상태에 절대 영향을 주지 않는다.**
  엔진의 `step(dt)`는 dt를 accumulator에 더하고 `TICK_SEC`가 쌓일 때마다 정확히 한 tick씩 `tick()`을 실행하며,
  남은 sub-tick 시간은 버리지 않고 다음 호출로 이월한다. 이것이 seed 재현성의 근거다.

## Simulation model (FINAL, M1)

경량 mesoscopic 모델이다. 연구급 microscopic fidelity가 목표가 아니다(D-001).

### 그래프

- 도시는 `rows × cols` 교차로(node)의 격자다. node id `I-<row>-<col>`.
- 인접한 두 교차로 사이에는 **방향이 있는 두 개의 edge**(양방향 각 1개)가 있다. edge id `E-<fromId>-<toId>`.
- 각 edge의 물리 길이는 `EDGE_LENGTH_M`로 균일하다.
- edge의 **축(axis)**은 그 edge가 남북으로 놓였으면 `NS`, 동서면 `EW`.

### 차량 이동

- 차량은 route(방향 edge의 순서열)를 따라 이동한다. edge 위 위치 `posOnEdge ∈ [0, EDGE_LENGTH_M]`.
- 자유주행 시 한 tick에 `FREE_FLOW_SPEED_MPS × TICK_SEC` 만큼 전진한다.
- **Car-following:** 같은 edge에서 앞 차량과의 중심 간격이 `VEHICLE_GAP_M` 미만이 되도록 전진할 수 없다.
  같은 edge의 차량은 매 tick 선두(높은 pos)부터 처리하여 결정성을 보장한다.
- **Stop line:** edge의 downstream 끝(`posOnEdge = EDGE_LENGTH_M`)에 정지선이 있다.
- **Intersection 진입 허가 조건 (교차로가 route의 중간 node일 때):**
  1. 차량이 정지선에 도달했고,
  2. 진입 교차로의 신호 phase가 그 차량 **approach edge의 axis**와 같고(= green),
  3. downstream(다음 route edge)에 `posOnEdge = 0` 기준 `VEHICLE_GAP_M` 이상의 공간이 있다(capacity/spillback).
- **회전:** 방향 전환은 route를 따라 일어난다. 진입 허가는 **approach edge의 axis**로만 판정한다(진출 edge와 무관).
- **도착:** route의 **마지막 edge** 정지선(`posOnEdge = EDGE_LENGTH_M`) 도달 = 목적지 도착. 도착에는 신호가 필요 없다.

## Intersection

```ts
id: string
row: number
col: number
phase: 'NS' | 'EW' | 'YELLOW'
targetPhase: 'NS' | 'EW'
phaseElapsedSec: number
```

## Vehicle lifecycle (FINAL, M1)

```text
SPAWNED → MOVING → QUEUED → CROSSING → MOVING → … → ARRIVED
                     ▲__________________________|   (반복 가능)
```

- `SPAWNED`: 생성 tick. 그 tick 종료 시 origin에서 나가는 첫 edge의 `posOnEdge = 0`에 배치되어 `MOVING`이 된다.
- `MOVING`: 이번 tick에 `MOVING_EPSILON_M` 이상 전진했다.
- `QUEUED`: 정지선/혼잡/신호 때문에 이번 tick 전진량 `< MOVING_EPSILON_M`이며 아직 진입 허가가 없다.
- `CROSSING`: 진입이 허가되어 교차로를 점유하는 상태. 정확히 `CROSS_TICKS` tick 동안 지속된다.
- `ARRIVED`: 마지막 edge 정지선 도달. 이후 population에서 제거되고 completed로 집계된다.

## 필수 질문 5개에 대한 확정 답 (FINAL, M1)

1. **Waiting time은 언제부터 증가하는가?**
   `MOVING` 또는 `QUEUED` 상태에서 **이번 tick 전진량이 `MOVING_EPSILON_M` 미만**이면 `waitSec += TICK_SEC`.
   즉 red/yellow 신호, downstream capacity 부족, car-following으로 인해 정지한 시간만 누적한다.
   단순히 저속으로 계속 전진하는 것은 waiting이 아니다. `SPAWNED`/`CROSSING`/`ARRIVED` 중에는 누적하지 않는다.

2. **Queue는 어떤 차량을 포함하는가?**
   특정 approach edge에서, `posOnEdge ≥ EDGE_LENGTH_M − QUEUE_ZONE_M`(정지선 근접 구간) 이고,
   이번 tick 전진량이 `MOVING_EPSILON_M` 미만이며(정지), 진입 허가가 없는(`CROSSING` 아님) 차량.
   `maxQueue`는 run 전체의 sampled tick에서 모든 edge별 queue length의 최댓값.

3. **Intersection crossing은 어느 tick에 완료되는가?**
   tick `T`에 진입 허가를 받은 차량은 `T`에 `CROSSING`으로 전이하여 `CROSS_TICKS` tick 동안 교차로를 점유한다.
   crossing은 tick `T + CROSS_TICKS − 1` 종료 시 완료되고, tick `T + CROSS_TICKS`의 시작 시점에
   다음 edge `posOnEdge = 0`에서 `MOVING`이 된다. 기본값 `CROSS_TICKS = 1`.

4. **Yellow phase 동안 진입을 허용하는가?**
   **허용하지 않는다.** YELLOW 동안에는 어떤 차량도 새로 `CROSSING`을 시작할 수 없다(환경이 강제).
   이미 `CROSSING` 중인 차량은 crossing을 정상 완료한다. Controller는 색을 직접 지정하지 않고
   HOLD/SWITCH intent만 내며, min-green과 yellow transition은 환경이 강제한다.

5. **동일 seed가 어떤 데이터까지 동일하게 만들어야 하는가?**
   동일한 `{seed, scenario config(rows/cols/duration/demand params/controller config), metricVersion, TICK_SEC}`이면:
   - 생성 차량 sequence(id, spawn tick, OD)가 동일하다.
   - 각 차량의 route(edge 순서열)가 동일하다.
   - tick별 전체 궤적이 동일하며, 따라서 모든 aggregate metric이 동일하다.
   재현성은 **동일 JS 런타임 내**에서 보장한다(R8: 결정론적 시뮬레이션과 확률적 학습을 분리 표기).
   `TICK_SEC`/`metricVersion`/controller가 다르면 동일성은 보장 대상이 아니다.

## Metrics (FINAL 정의, M1)

집계는 `analytics/`에서만 수행한다. UI/컴포넌트에서 metric을 재계산하지 않는다.
`metricVersion` 문자열로 정의 버전을 고정한다(R7).

### avgWaitingTimeSec
**completed(ARRIVED) vehicle 기준** trip 총 waiting time의 평균. active vehicle과 혼용하지 않는다.

### p95WaitingTimeSec
completed trip waiting time의 95 percentile(nearest-rank, completed가 0이면 0).

### throughput
simulation window 안에 destination에 도착(ARRIVED)한 vehicle count.

### maxQueue
모든 sampled tick, 모든 approach edge의 queue length 중 최댓값.

### signalSwitches
yellow transition을 유발한 controller phase-change request count(교차로 합산).

## Control signals — M2

제어 신호는 보고 metric이 아니라 controller 결정에 쓰이는 파생값이다(`metricVersion`과 무관).

### lane pressure (D-009)
교차로·axis별 pressure = `Σ_{axis approach e} ( queue(e) − queue(straightContinuation(e)) )`.
`queue`는 Q2 정의(`analytics/metrics.queueLengthsByEdge`)를 재사용하고, `straightContinuation`은 approach와
같은 heading의 진출 edge(경계면 없음→downstream 0)다. 계산은 `src/simulation/pressure.ts`(그래프 topology +
per-edge queue map)에서 순수 함수로 하며 vehicle 내부/route와 무관하다. MaxPressure decision(어느 axis를 서빙할지)은
M2.3에서 이 신호를 사용한다.

## Provenance — M3

모든 run은 최소 다음을 저장한다.

- runId
- scenarioId + scenarioVersion
- controllerType + controllerConfig
- seed
- simulationDurationSec
- metricVersion
- codeVersion/commit when available
- startedAt

결정론적 core는 재현 가능한 부분(`scenarioId`, `scenarioVersion`, `controllerId`, `seed`,
`simulationDurationSec`, `configHash`, `metricVersion`)만 만든다(`buildRunProvenance`, D-010). runtime 필드
(`runId`, `startedAt`, `codeVersion/commit`)는 persistence/run-coordinator 계층(M3.5)이 저장 시점에 부여한다.
`configHash`는 canonical run config(아래 Q5 입력 집합)의 결정론적 해시다.

## Metric samples — M3 (D-011)

aggregate 요약(`RunSummary`)과 별개로, run은 고정 cadence의 **raw per-sample 시계열**을 남길 수 있다. sample은
그 시각의 live aggregate 신호 스냅샷이다: `{ simTimeSec, activeVehicles, completedVehicles, avgWaitSec,
throughputPerHour, maxQueue }`. 정의는 `src/analytics/metricSamples.ts`가 소유하고, 기존 metric 정의를
**순간에 적용**한 것이므로 새 metric 의미가 아니다(`metricVersion` 불변).

- cadence는 `TICK_SEC`의 정수배(기본 `DEFAULT_SAMPLE_INTERVAL_SEC`)이며 sample이 `simTimeSec`로 자기기술한다.
- sample의 `maxQueue`는 **그 tick의 순간 최대 단일-edge queue**(Q2), `RunSummary.maxQueue`는 **run 전체
  최댓값**이다 → 항상 `RunSummary.maxQueue ≥ max(sample.maxQueue)`. 두 값을 혼용하지 않는다.
- 샘플링은 read-only(`TrafficEngine.sample()`)이며 tick 로직·`summary()`·결정성에 영향이 없다.

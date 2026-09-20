# Data Contracts

이 문서의 정의가 코드보다 우선한다. M1에서 확정할 항목에는 `DRAFT` 표시가 있다.

## Time

- Simulation clock: seconds, `number`
- Core integration tick: 고정 timestep
- Rendering timestep과 simulation timestep은 분리

## Intersection

```ts
id: string
row: number
col: number
phase: 'NS' | 'EW' | 'YELLOW'
phaseElapsedSec: number
```

## Vehicle lifecycle — DRAFT

```text
spawned → moving → queued → crossing → moving → completed
```

### Waiting time — DRAFT

후보 정의: 차량이 red/yellow 또는 downstream capacity 때문에 stop line 근처에서 속도 0으로 제한된 simulation time만 누적한다. 단순히 저속이라는 이유만으로 waiting으로 계산하지 않는다.

M1.4 전에 fixture로 확정해야 한다.

### Queue membership — DRAFT

후보 정의: intersection 접근 edge의 stop line으로부터 일정 normalized distance 이내이며 crossing 권한이 없어 정지한 vehicle.

정확한 threshold는 코드 숫자가 아니라 named constant + test fixture로 둔다.

## Signal safety

- Controller action은 직접 색을 지정하지 않는다.
- action은 target phase 또는 HOLD/SWITCH intent를 낸다.
- environment가 minimum green과 yellow transition을 강제한다.
- Yellow 동안 신규 intersection 진입은 MVP에서 금지하는 방향으로 M1에서 확정.

## Metrics

### avgWaitingTimeSec
completed 또는 active vehicle population에 대한 의미를 혼용하지 않는다. Experiment summary에서는 **completed vehicles 기준 trip waiting time 평균**을 기본으로 한다.

### p95WaitingTimeSec
completed trip waiting time의 95 percentile.

### throughput
simulation window 안에 destination에 도착한 vehicle count.

### maxQueue
모든 sampled intersection/direction queue length 중 최대값.

### signalSwitches
yellow transition을 유발한 controller phase-change request count.

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

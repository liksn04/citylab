# Milestones — Scope Lock

이 문서는 프로젝트가 옆길로 새지 않게 하는 가장 중요한 문서다.

---

## M0 — Foundation & Visual Contract — DONE

### Goal
실행 가능한 프로젝트, 디자인 시스템, 세션 인계 구조를 확정한다.

### Delivered
- React + TypeScript + Vite 셸
- 4×4 도시 Canvas preview
- Fixed signal preview
- deterministic RNG primitive
- UI state store
- Dexie schema skeleton
- token 기반 glass workspace
- AI agent workflow 문서와 machine-readable status

### Exit Criteria
- [x] 프로젝트가 설치 후 `npm run dev`로 시작 가능하도록 구성
- [x] 모든 핵심 visual value가 token으로 정의
- [x] 세션 시작/종료 절차 존재
- [x] milestone lock이 `project-status.json`에 표현

---

## M1 — Deterministic Traffic Core — DONE

### Goal
AI가 전혀 없어도 신뢰할 수 있고 재현 가능한 traffic simulator를 만든다.

### Allowed
- seed/PRNG
- grid graph
- origin/destination demand
- route calculation
- vehicle lifecycle
- fixed signal controller
- queue/wait/travel metrics
- simulator unit tests
- canvas가 실제 engine state를 정확히 표현하도록 수정

### Explicitly out of scope
- MaxPressure
- DQN
- TensorFlow.js training
- Web Worker training
- model save/load
- analytics comparison screen

### Required contracts before coding
1. Vehicle waiting time은 어떤 순간부터 증가하는가?
2. Queue는 어떤 차량을 포함하는가?
3. Intersection crossing은 어느 tick에 완료되는가?
4. Yellow phase 동안 진입을 허용하는가?
5. 동일 seed가 어떤 데이터까지 동일하게 만들어야 하는가?

답은 `docs/DATA_CONTRACTS.md`에 먼저 기록한다.

### Tasks
- M1.1 Seeded demand fixtures
- M1.2 Directed grid road graph
- M1.3 Deterministic shortest-path routing
- M1.4 Vehicle state machine
- M1.5 Fixed signal phase state machine
- M1.6 Queue/wait/throughput metrics
- M1.7 30 simulated minutes stability run
- M1.8 deterministic snapshot tests

### Exit Criteria
- [x] 같은 seed + config → 동일 생성 차량 sequence
- [x] 같은 seed + config → 동일 route sequence
- [x] 차량이 illegal edge를 통과하지 않음
- [x] red signal에서 intersection 진입 없음
- [x] queue metric 정의와 구현이 일치
- [x] waiting time metric 정의와 구현이 일치
- [x] 30 simulated minutes에 NaN/무한 루프/vehicle leak 없음
- [x] Fixed baseline 결과 fixture가 저장됨

### Gate to M2
위 8개를 모두 만족하고 `npm run check` 통과.

---

## M2 — Adaptive Baseline: Max Pressure — DONE

### Goal
학습 없는 adaptive controller를 만들어 “AI가 아니어도 개선 가능한 기준선”을 확보한다.

### Allowed
- pressure definition
- min green/yellow safety constraints
- controller interface generalization
- Fixed vs MaxPressure smoke comparison

### Out of scope
- DQN
- hyperparameter tuning
- UI dashboard 확장

### Exit Criteria
- [x] controller interface가 Fixed/MaxPressure 양쪽을 지원
- [x] decision interval과 min-green 계약 테스트
- [x] MaxPressure가 deterministic
- [x] balanced/rush 두 scenario에서 결과 저장 가능
- [x] MaxPressure가 항상 우월하다고 가정하지 않고 결과를 그대로 기록

---

## M3 — Experiment Runner & Data Provenance — DONE

### Goal
공정한 비교를 자동화한다.

### Allowed
- scenario schema
- seed sets
- run metadata
- batch experiment runner
- IndexedDB persistence
- CSV/JSON export

### Exit Criteria
- [x] Fixed/MaxPressure 동일 seed set 비교
- [x] run마다 config hash 저장
- [x] metric definition version 저장
- [x] raw samples와 aggregate 구분
- [x] export 후 재분석 가능한 스키마

---

## M4 — Shared DQN Training — ACTIVE

### Goal
실제로 학습하는 shared policy를 붙인다.

### Allowed
- TensorFlow.js
- Web Worker
- replay buffer
- target network
- epsilon-greedy
- model save/load
- training metrics

### Architecture lock
- 초기 DQN은 교차로마다 모델을 복제하지 않는다.
- **Shared network + per-intersection observation**을 기본으로 한다.
- action은 MVP에서 `HOLD | SWITCH` 두 개.
- safety phase transition은 환경이 강제하고 agent가 직접 yellow를 선택하지 않는다.

### Exit Criteria
- [ ] 학습 루프가 main UI thread를 장시간 block하지 않음
- [ ] tensor leak 검사
- [ ] seed가 evaluation에서 고정됨
- [ ] training seed와 evaluation seed 분리
- [ ] model snapshot 저장/로드
- [ ] 최소 한 제공 scenario에서 Fixed baseline 대비 반복 evaluation 개선 확인
- [ ] 실패 scenario도 숨기지 않고 기록

---

## M5 — Analytics & Neural Inspection — LOCKED

### Goal
결과를 “보기 좋게”가 아니라 정확하게 읽을 수 있게 한다.

### Primary views
1. Avg waiting time over episodes
2. P95 waiting time
3. Throughput
4. Max queue
5. Congestion heatmap
6. Controller comparison
7. Network input/activation/Q output inspection

### Rules
- 모든 시각화는 실제 데이터에서 생성.
- 동일한 scale로 비교.
- tooltip만 있어야 알 수 있는 핵심값 금지.
- 색 하나만으로 상태를 전달하지 않음.

### Exit Criteria
- [ ] run provenance를 화면에서 확인 가능
- [ ] raw/export와 chart 값 일치
- [ ] keyboard/touch selection path
- [ ] reduced motion 대응
- [ ] reduced transparency fallback

---

## M6 — MVP Hardening & Release — LOCKED

### Goal
실험실을 다른 사람이 열어도 망가지지 않는 수준으로 만든다.

### Allowed
- responsive layout
- onboarding
- empty/error states
- performance profiling
- browser compatibility
- reproducibility report
- docs polish

### Exit Criteria
- [ ] Chrome/Edge/Safari 최신 버전 smoke test
- [ ] 4×4 기본 scenario에서 60fps에 가까운 interactive rendering 목표
- [ ] MAX training mode는 render throttling/off 지원
- [ ] 저장 데이터 migration 정책
- [ ] README reproducible demo steps
- [ ] MVP acceptance checklist 완료

---

## Post-MVP backlog — 현재 구현 금지

- SUMO/SUMO-RL adapter
- CityFlow validation
- 10×10+ 도시
- 실제 road network
- MARL communication
- PPO
- GNN
- 사고/도로 폐쇄
- 보행자/대중교통
- 계정/클라우드 sync

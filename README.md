# Neural City Lab

브라우저에서 교통 시뮬레이션, 강화학습, 비교 실험, 데이터 분석을 한 흐름으로 다루는 실험형 프로젝트입니다.

이 저장소는 현재 **M5 — Analytics & Neural Inspection**을 진행 중입니다. M0–M4가 완료되어 있습니다: 실행 가능한 앱 셸과 디자인 토큰, 결정적(seed 기반) 경량 mesoscopic traffic core, Fixed / MaxPressure 컨트롤러, experiment runner·provenance·persistence·CSV/JSON export, 그리고 shared DQN core(TensorFlow.js Q-network·replay·target·epsilon-greedy·학습/평가 유틸리티·model 직렬화)까지 구현·검증되어 있습니다. Analytics UI는 지금 활성 마일스톤이며 아직 구현 전입니다.

## 시작

요구 사항: Node.js 20.19+ 또는 22.12+.

```bash
npm install
npm run dev
```

검증:

```bash
npm run check
```

## 반드시 먼저 읽을 파일

AI 에이전트든 사람이든 작업 시작 전에 아래 순서로 읽습니다.

1. `AI_START_HERE.md`
2. `project-status.json`
3. `docs/PROJECT_CHARTER.md`
4. `docs/MILESTONES.md`
5. `docs/PROGRESS.md`
6. `docs/DECISIONS.md`
7. `docs/DESIGN_SYSTEM.md`
8. `docs/DATA_CONTRACTS.md`
9. `docs/AI_AGENT_GUIDE.md`
10. `docs/WORK_BREAKDOWN.md`

## 현재 상태

- 현재 활성 마일스톤: **M5 — Analytics & Neural Inspection**
- M0–M4는 완료됨: deterministic traffic core, Fixed / MaxPressure baseline, experiment runner / provenance / persistence / export, shared DQN core 학습·평가(observation·action·reward 계약, online+target Q-network, replay buffer, epsilon-greedy, DQN update step, training worker protocol, model 직렬화/로드).
- Shared DQN은 M4 아키텍처 lock을 따른다: shared network + per-intersection observation, action `HOLD|SWITCH`, safety는 환경이 강제(min-green/yellow). `trainDqn()`/`evaluateDqn()`은 현재 headless 학습·평가 유틸리티이며 live React 학습 UI에는 아직 배선되지 않았다.
- Analytics UI(컨트롤러 비교·시계열·congestion heatmap·neural inspection)는 지금 활성 마일스톤(M5)이며, 모든 시각화는 실제 수집 run 데이터만 사용한다(하드코딩 금지).

`npm run session:open`은 현재 마일스톤과 허용 작업을 출력합니다.

## 제품 원칙

- 먼저 올바른 시뮬레이터, 그 다음 AI.
- 모든 비교 실험은 동일 seed와 동일 교통 수요를 사용.
- UI는 데이터와 도시를 주인공으로 두고, 글래스 효과는 계층 구분에만 사용.
- 그라디언트/글로우/블롭 등 의미 없는 장식은 금지.
- “좋아 보이는 AI 데모”보다 재현 가능한 실험을 우선.

## 구조

```text
src/
  app/             앱 셸
  components/      UI 컴포넌트
  simulation/      도시/차량/라우팅/시간 진행
  controllers/     Fixed, Pressure, DQN 제어기
  analytics/       측정과 집계
  rl/              shared DQN core (observation·action·reward, Q-network, replay, 학습/평가)
  workers/         training worker protocol (M4.7)
  persistence/     IndexedDB / Dexie
  styles/          디자인 토큰과 전역 스타일

docs/
  MILESTONES.md     범위 잠금의 기준 문서
  PROGRESS.md       세션 진행 기록
  DECISIONS.md      결정 로그
  DESIGN_SYSTEM.md  시각/상호작용 규칙
```

## 참고 연구

핵심 조사와 링크는 `docs/RESEARCH.md`에 정리했습니다.

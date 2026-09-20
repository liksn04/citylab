# Neural City Lab

브라우저에서 교통 시뮬레이션, 강화학습, 비교 실험, 데이터 분석을 한 흐름으로 다루는 실험형 프로젝트입니다.

이 스타터는 **Milestone 0 완료 상태**입니다. 실행 가능한 앱 셸, 4×4 도시 캔버스, 결정적(seed 기반) 고정 신호 시뮬레이션, 상태 저장 구조, 디자인 토큰, 테스트 구조, AI 에이전트 운영 규칙이 포함되어 있습니다.

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

- 현재 활성 마일스톤: **M1 — Deterministic Traffic Core**
- M0는 완료됨.
- DQN, TensorFlow.js 학습, Web Worker 학습 루프는 **M4 이전 구현 금지**.
- Analytics는 M5 이전 “실험 결과를 꾸며서 보여주는 것”을 금지하고, 실제 수집 데이터만 사용.

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
  rl/              M4에서 활성화
  workers/         M4에서 활성화
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

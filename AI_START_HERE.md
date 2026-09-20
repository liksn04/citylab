# AI START HERE

이 파일은 모든 AI 코딩 세션의 진입점입니다.

## 세션 시작 절차 — 생략 금지

아래를 순서대로 읽은 뒤에만 코드를 수정합니다.

1. `project-status.json`
2. `docs/PROJECT_CHARTER.md`
3. `docs/MILESTONES.md`
4. `docs/PROGRESS.md`
5. `docs/DECISIONS.md`
6. `docs/RISK_REGISTER.md`
7. `docs/DESIGN_SYSTEM.md`
8. `docs/AI_AGENT_GUIDE.md`
9. `docs/WORK_BREAKDOWN.md`
10. 현재 마일스톤이 참조하는 세부 문서

그 다음 실행:

```bash
npm run session:open
```

## 핵심 제약

- `project-status.json.activeMilestone`보다 앞선 기능을 구현하지 않는다.
- “나중에 필요할 것 같아서” 기능을 미리 넣지 않는다.
- 현재 마일스톤의 **Exit Criteria가 모두 충족되기 전 다음 마일스톤으로 넘어가지 않는다.**
- Exit Criteria를 충족했다고 판단하면 테스트/빌드 결과를 기록하고 `docs/PROGRESS.md`와 `project-status.json`을 함께 갱신한다.
- 아키텍처 변경은 `docs/DECISIONS.md`에 이유와 대안을 남기기 전에는 하지 않는다.
- 보상 함수나 실험 지표를 바꾸는 것은 일반 리팩터링이 아니다. 데이터 의미가 바뀌므로 ADR 또는 Decision 항목이 필요하다.
- 숫자 결과를 임의로 UI에 하드코딩하지 않는다. 모든 분석 값은 실제 simulation run에서 생성되어야 한다.

## 금지되는 지름길

- M1 전에 DQN 구현
- M2 전에 MaxPressure 구현
- M4 전에 TensorFlow.js 학습 코드 구현
- M5 전에 화려한 analytics dashboard 확장
- M6 전에 실제 지도/SUMO/클라우드 계정 기능 추가
- AI가 “더 멋져 보인다”는 이유만으로 디자인 토큰을 우회
- 기본 UI에 보라-파랑 그라디언트, 발광 테두리, floating blob, 의미 없는 particle, 과도한 pill 사용

## 세션 종료 절차

1. 현재 마일스톤 기준으로 완료/미완료를 분리한다.
2. `npm run test`와 `npm run build`를 실행한다.
3. `docs/PROGRESS.md`에 수행 내용, 실패, 다음 정확한 작업을 기록한다.
4. 새로운 결정이 있으면 `docs/DECISIONS.md`에 기록한다.
5. `project-status.json`의 `lastSession`과 gate 상태를 갱신한다.
6. `npm run session:close`를 실행해 누락 여부를 확인한다.

다음 세션이 추측하지 않도록 “다음 행동”은 파일/함수 단위로 구체적으로 남긴다.

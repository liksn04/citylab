# AI Agent Session Guide

이 문서는 자동 코딩 에이전트가 매 세션 같은 방식으로 프로젝트를 이어가기 위한 실행 절차다.

## Phase A — Reconstruct context

코드를 검색하기 전에 다음을 수행한다.

1. `project-status.json`에서 `activeMilestone` 확인.
2. `docs/PROGRESS.md`의 가장 최근 세션 확인.
3. `docs/MILESTONES.md`에서 활성 milestone의 Goal / Allowed / Out of scope / Exit Criteria 확인.
4. `docs/DECISIONS.md`에서 이미 확정된 선택을 확인.
5. UI 변경이면 `docs/DESIGN_SYSTEM.md` + `design-tokens.json` 확인.
6. 데이터 의미 변경이면 `docs/DATA_CONTRACTS.md` 확인.

그 뒤 아래 명령을 실행한다.

```bash
npm run session:open
npm run session:check
npm run tokens:check
```

## Phase B — Define a session objective

세션 목표는 하나의 문장으로 작성한다.

좋음:
> M1.2 directed grid graph를 구현하고 4×4 edge fixtures를 통과시킨다.

나쁨:
> 교통 시스템이랑 AI 부분을 전반적으로 개선한다.

한 세션에 여러 milestone을 걸치지 않는다.

## Phase C — Pre-code contract check

다음 중 하나라도 해당하면 코딩보다 문서를 먼저 수정한다.

- metric 의미를 바꿈 → `DATA_CONTRACTS.md`
- architecture dependency를 바꿈 → `DECISIONS.md`
- 새로운 visual primitive를 도입 → `design-tokens.json` + `DESIGN_TOKENS.md`
- milestone 범위를 바꿈 → 사용자 승인 없이는 금지

## Phase D — Implement smallest testable slice

순서:

1. failing/contract test
2. implementation
3. unit test
4. integration smoke if relevant
5. UI connection last

Simulation domain 로직을 React 컴포넌트 안에서 구현하지 않는다.

## Phase E — Evaluate against milestone, not aesthetics

현재 작업이 다음 질문에 답하는지 확인한다.

- 어떤 exit criterion을 진전시켰는가?
- 동일 seed로 재현되는가?
- UI에 나타나는 숫자는 실제 engine state인가?
- 다음 milestone 기능을 몰래 당겨오지 않았는가?

## Phase F — End-of-session handoff

실제로 실행:

```bash
npm run test
npm run build
npm run session:close
```

그 후 `PROGRESS.md`에 다음 포맷으로 추가:

```text
Completed:
- ...

Tests actually run:
- npm run test → PASS/FAIL
- npm run build → PASS/FAIL

Known issue:
- ...

Next exact actions:
1. path/function/action
2. ...
```

## Milestone advancement protocol

에이전트가 스스로 “대충 끝났다”고 다음 milestone으로 가지 않는다.

1. 모든 Exit Criteria 각각에 test/evidence가 존재해야 한다.
2. `npm run check`가 통과해야 한다.
3. `PROGRESS.md`에 gate evidence를 남긴다.
4. `project-status.json`에서 현재 milestone을 `done`, 다음을 `active`로 바꾼다.
5. 변경 이유와 날짜를 기록한다.

## Emergency exception

현재 milestone 밖 수정이 필요한 유일한 경우:

- 빌드가 완전히 깨졌고 수정이 현재 범위 밖 파일에 아주 국소적으로 필요
- security issue
- data corruption risk

이 경우에도 기능을 추가하지 말고 최소 수정 후 `DECISIONS.md`에 이유를 남긴다.

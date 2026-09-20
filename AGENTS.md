# Agent Operating Contract

모든 자동 코딩 에이전트는 이 저장소에서 아래 계약을 따른다.

## 1. Source of truth

우선순위:

1. `project-status.json`
2. `docs/MILESTONES.md`
3. `docs/PROJECT_CHARTER.md`
4. `docs/DECISIONS.md`
5. `docs/DESIGN_SYSTEM.md`
6. 코드

코드가 문서와 다르면 코드가 정답이라고 가정하지 않는다. 불일치를 `PROGRESS.md`에 기록하고 현재 마일스톤 범위 내에서 정리한다.

## 2. One milestone at a time

현재 milestone의 `Allowed`만 수행한다. `Explicitly out of scope` 항목은 사용자 요청 없이 건드리지 않는다.

현재 milestone의 exit criteria가 모두 `true`가 아니면 `activeMilestone`을 변경하지 않는다.

## 3. Small vertical changes

한 세션에서 권장 크기:

- 핵심 동작 1개 또는
- 테스트 가능한 하위 기능 1~3개 또는
- 문서/토큰 정합성 작업 1개

대규모 재작성보다 작은 변경과 검증을 우선한다.

## 4. Evidence before claims

“성능이 좋아졌다”, “정체가 줄었다”는 표현은 다음이 있을 때만 허용:

- 동일 scenario
- 동일 seed set
- 동일 simulation duration
- baseline과 candidate 결과 저장
- metric definition이 동일

## 5. Design guardrail

`docs/DESIGN_SYSTEM.md`와 `src/styles/tokens.css`가 시각적 source of truth다.

새 색/blur/radius/shadow/spacing 값을 즉석에서 추가하지 않는다. 필요한 경우 먼저 token을 추가하고 이유를 기록한다.

## 6. Session handoff

세션 종료 전 다음 정보를 남긴다.

- 변경 파일
- 통과 테스트
- 아직 깨진 것
- 다음 1~3개 정확한 작업
- 현재 milestone에서 남은 exit criteria

## 7. Never fabricate completion

실행하지 않은 테스트를 통과했다고 쓰지 않는다. 브라우저에서 직접 확인하지 않은 시각 동작은 “코드상 구현”으로 표현하고 “검증 완료”로 표시하지 않는다.

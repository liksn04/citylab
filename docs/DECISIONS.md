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

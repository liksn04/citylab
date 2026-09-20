# Project Charter

## Product statement

Neural City Lab은 교통 신호 제어를 소재로 **반복 학습과 신경망을 직접 관찰하고, 같은 조건에서 baseline과 AI를 비교하고, 결과 데이터를 분석하는 브라우저 기반 실험실**이다.

## MVP outcome

4×4 가상 도시에서 다음 세 controller를 같은 traffic demand와 seed로 비교할 수 있어야 한다.

1. Fixed Time
2. Max Pressure
3. Shared DQN

사용자는 학습 전후를 시각적으로 관찰하고, 평균 대기시간·P95 대기시간·throughput·max queue·signal switches를 실제 run 데이터로 비교한다.

## Non-goals for MVP

- 실제 도시 교통 정확도 재현
- 실제 정책 의사결정용 도구
- 교통사고 물리
- 보행자/버스/긴급차량
- OpenStreetMap
- SUMO 브라우저 내 실행
- 사용자 계정/클라우드 동기화
- LLM 챗봇
- “AI가 왜 생각했는지”를 해석한다고 주장하는 기능

## Product success criteria

- seed 기반 재현성이 확보되어야 한다.
- 같은 실험 조건에서 controller 비교가 가능해야 한다.
- 학습과 렌더링이 UI를 장시간 멈추게 하지 않아야 한다.
- 사용자가 raw run data를 내보낼 수 있어야 한다.
- 디자인은 분석 워크스페이스로 읽혀야 하며 AI SaaS 랜딩페이지처럼 보여서는 안 된다.

## Technical thesis

MVP의 교통 엔진은 연구급 simulator가 아니라 의미가 명시된 경량 simulator다. 정확한 traffic engineering 검증이 필요한 단계에서는 자체 엔진을 더 복잡하게 만들기보다 SUMO/SUMO-RL adapter로 교차 검증한다.

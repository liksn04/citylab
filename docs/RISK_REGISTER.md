# Risk Register

| ID | Risk | Probability | Impact | Mitigation | Trigger |
|---|---|---:|---:|---|---|
| R1 | 시뮬레이터 버그를 RL 문제로 오인 | High | High | M1에서 AI 완전 금지, fixtures 우선 | reward가 이상하거나 학습 불안정 |
| R2 | 평균값만 개선하고 일부 차량 starvation | Medium | High | P95/max wait를 필수 metric으로 지정 | avg 감소, P95 증가 |
| R3 | 렌더링이 학습 성능을 잡아먹음 | High | Medium | M4 Web Worker, MAX render off | training FPS 급락 |
| R4 | 글래스 남용으로 가독성 저하 | Medium | Medium | surface role별 token, opaque fallback | 텍스트 대비 미달 |
| R5 | 브라우저별 TFJS backend 차이 | Medium | Medium | backend 기록, eval 재현성 표시 | 결과 편차 큼 |
| R6 | scope creep: 실제 지도/SUMO 조기 도입 | High | High | milestone lock | M1~M5 중 관련 PR 발생 |
| R7 | metric 정의가 중간에 변함 | Medium | High | metricVersion 저장 | 이전 run과 숫자 불일치 |
| R8 | seed는 같지만 floating/runtime 차이로 학습 결과 차이 | Medium | Medium | deterministic simulation과 stochastic training을 분리 표기 | 동일 seed DQN 결과 편차 |

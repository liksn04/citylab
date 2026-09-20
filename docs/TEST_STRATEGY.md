# Test Strategy

## Pyramid

### Unit — highest priority
- PRNG determinism
- graph generation
- route correctness
- signal state machine
- queue classification
- metric aggregation
- replay buffer (M4)

### Integration
- complete simulation run with fixed seed
- controller + environment interaction
- persistence round trip (M3)
- training worker message protocol (M4)

### Visual/manual
- Canvas labels and hit targets
- glass fallback
- reduced motion/transparency
- responsive inspector

## Golden fixtures

M1 종료 전 다음 fixture를 저장한다.

```text
scenario: balanced-4x4-v1
seed: 41021
sim time: 1800 sec
controller: fixed-v1
```

Golden output은 코드의 정답을 영원히 고정하는 용도가 아니라, metric 의미가 의도치 않게 바뀌는 것을 감지하는 용도다. 의도적으로 변경하면 decision log와 fixture version을 함께 변경한다.

## RL evaluation discipline

M4부터 training seed set과 evaluation seed set을 분리한다. 단일 seed에서 잘 나온 결과를 성능 개선으로 취급하지 않는다.

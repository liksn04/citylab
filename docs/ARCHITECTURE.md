# Architecture

## Runtime boundaries

```text
Main thread
  React shell
  Canvas renderer
  interaction + controls
  lightweight derived UI state
        │
        │ structured messages (M4)
        ▼
Training Worker
  traffic simulation batch mode
  replay buffer
  TensorFlow.js DQN
  training metrics
```

M0/M1에서는 simulator가 main thread에 있지만 API 경계는 class 단위로 유지한다. M4에서 batch training path를 worker로 옮긴다.

## Modules

### `simulation/`
순수 도메인 로직. React import 금지.

### `controllers/`
환경과 controller 사이의 작은 interface. controller가 renderer나 persistence를 직접 호출하지 않는다.

### `analytics/`
raw simulation events/summary를 metric으로 변환. UI 컴포넌트에서 metric 정의를 다시 구현하지 않는다.

### `persistence/`
run 저장. simulator가 Dexie를 직접 호출하지 않는다.

### `rl/`
M4 전에는 placeholder만 유지.

## Dependency direction

```text
UI → application/state → simulation/controllers
UI → analytics read models
persistence ← run coordinator → simulation
rl → controller contract
```

금지:

```text
simulation → React
simulation → Dexie
controller → Canvas
analytics → UI state mutation
```

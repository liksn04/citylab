# Research Notes

조사 시점: 2026-09-20.

## Traffic RL references

### SUMO-RL
https://github.com/LucasAlegre/sumo-rl

- SUMO traffic signal control용 RL 환경.
- Gymnasium/PettingZoo 지원.
- observation은 phase, min-green, lane density, queue 등을 포함.
- 4×4 multi-agent 예제가 존재.

프로젝트에 적용: M1/M2의 observation/phase 계약을 이와 비교하되, MVP는 자체 simulator를 유지.

### CityFlow
https://github.com/cityflow-project/CityFlow

- 대규모 multi-agent traffic scenario용 microscopic simulator.
- vehicle 단위 시뮬레이션과 road network/flow 정의.

프로젝트에 적용: post-MVP 성능/구조 참고.

## Browser ML

### TensorFlow.js Web Worker tutorial
https://www.tensorflow.org/js/tutorials/training/web_worker

장시간 학습을 main thread에서 분리하는 공식 예제. M4에서 training worker 구조의 근거.

### TensorFlow.js platform guide
https://www.tensorflow.org/js/guide/platform_environment

- WebGL backend의 비동기 `data()` 사용 권장.
- tensor `dispose()` / `tf.tidy()` 필요.
- small model에서는 backend 특성이 다를 수 있음.

프로젝트에 적용: M4에서 backend와 tensor count를 diagnostics에 기록.

## Browser persistence

### Dexie React tutorial
https://dexie.org/docs/Tutorial/React

하나의 Dexie instance와 명시적 schema를 사용하는 패턴. M3 persistence에 적용.

## Visual material / accessibility

### Apple Human Interface Guidelines — Materials
https://developer.apple.com/design/human-interface-guidelines/materials

핵심 해석: material을 content 전체에 남발하지 않고 navigation/control 등 기능적 계층 분리에 제한. 프로젝트의 glass rule에 반영.

### MDN — backdrop-filter
https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter

2024년 이후 최신 브라우저에서 baseline 범위가 넓어졌지만 fallback은 유지.

### MDN — prefers-reduced-transparency
https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency

지원 범위가 제한적이므로 progressive enhancement로 사용하고 `.reduce-transparency` 수동 클래스도 제공 가능하게 설계.

### W3C WCAG 2.2
https://www.w3.org/TR/WCAG22/

- normal text 4.5:1
- meaningful UI/graphics 3:1

## Toolchain versions researched

2026-09-20 npm registry 기준 starter package에 고정한 주요 버전:

- React 19.3.0
- Vite 8.3.0
- @vitejs/plugin-react 6.1.1
- TypeScript 7.0.2
- Zustand 5.0.15
- Dexie 4.4.6
- TensorFlow.js 4.22.0
- Vitest 5.0.1

Vite 8 공식 문서상 Node.js 20.19+ 또는 22.12+ 필요.

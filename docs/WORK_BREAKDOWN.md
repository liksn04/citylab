# Work Breakdown Structure

각 ID는 세션 목표와 PR 제목에 그대로 사용할 수 있다.

## M1 — Deterministic Traffic Core

| ID | Deliverable | Depends | Proof |
|---|---|---|---|
| M1.1 | simulation constants + time semantics | M0 | unit tests |
| M1.2 | directed 4×4 graph | M1.1 | node/edge fixtures |
| M1.3 | seeded OD demand generator | M1.2 | same-seed sequence snapshot |
| M1.4 | deterministic router | M1.2 | 12+ OD route fixtures |
| M1.5 | vehicle lifecycle state machine | M1.3/4 | transition tests |
| M1.6 | fixed signal safety state machine | M1.1 | red/yellow entry tests |
| M1.7 | queue + waiting semantics | M1.5/6 | metric fixtures |
| M1.8 | throughput/trip summary | M1.7 | hand-calculated run fixture |
| M1.9 | Canvas driven by production engine | M1.5 | manual selection/render smoke |
| M1.10 | 30-minute deterministic golden run | all | repeated hash equality |

## M2 — Adaptive Baseline

| ID | Deliverable | Proof |
|---|---|---|
| M2.1 | controller interface | Fixed remains passing |
| M2.2 | lane pressure computation | hand fixtures |
| M2.3 | MaxPressure decision | deterministic tests |
| M2.4 | min-green constraint | attempted illegal switch ignored |
| M2.5 | balanced scenario smoke | saved run result |
| M2.6 | rush scenario smoke | saved run result |

## M3 — Experiment Runner & Provenance

| ID | Deliverable | Proof |
|---|---|---|
| M3.1 | versioned scenario schema | JSON fixtures |
| M3.2 | run config canonicalization/hash | same config same hash |
| M3.3 | seed-set runner | identical demand across controllers |
| M3.4 | metric sample schema | DB roundtrip |
| M3.5 | experiment/run persistence | reload after refresh |
| M3.6 | CSV export | spreadsheet-readable fixture |
| M3.7 | JSON export/import metadata | roundtrip |

## M4 — Shared DQN

| ID | Deliverable | Proof |
|---|---|---|
| M4.1 | observation encoder/normalizer | boundary tests |
| M4.2 | action adapter HOLD/SWITCH | safety tests remain environment-owned |
| M4.3 | replay buffer | sampling tests |
| M4.4 | online + target network | shape test |
| M4.5 | epsilon schedule | deterministic schedule test |
| M4.6 | DQN update step | loss finite, tensors disposed |
| M4.7 | training worker protocol | message integration test |
| M4.8 | model persistence | save/load prediction parity |
| M4.9 | evaluation runner | train/eval seed separation |
| M4.10 | baseline evaluation | repeated seed report |

## M5 — Analytics

| ID | Deliverable | Proof |
|---|---|---|
| M5.1 | comparison data model | no chart-specific metric recomputation |
| M5.2 | wait/throughput small multiples | raw values match export |
| M5.3 | P95/max starvation view | known fixture visible |
| M5.4 | congestion heatmap | direct labels / accessible fallback |
| M5.5 | run provenance inspector | scenario/seed/config visible |
| M5.6 | neural input/Q inspector | explicitly labeled as activation/output, not explanation |
| M5.7 | keyboard/touch chart inspection | manual QA |

## M6 — Hardening

| ID | Deliverable | Proof |
|---|---|---|
| M6.1 | desktop responsive polish | 1280/1440/1920 smoke |
| M6.2 | narrow/mobile read path | 390×844 smoke |
| M6.3 | reduced motion | OS setting/manual QA |
| M6.4 | reduced transparency fallback | class/media QA |
| M6.5 | performance instrumentation | frame/training measurements |
| M6.6 | persistence migration test | previous schema fixture |
| M6.7 | reproducible demo recipe | clean-browser run |
| M6.8 | release checklist | MVP_ACCEPTANCE all checked |

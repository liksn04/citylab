# UI Specification

## 1. Desktop shell

Primary target: 1280–1920px desktop browser.

```text
┌──────────────── Top command bar ────────────────┐
│ Brand      Simulation Training Analytics Lab    │
│                                  Run  1× 5× 20× │
├──────────────────────────────────┬───────────────┤
│                                  │               │
│           CITY CANVAS            │   INSPECTOR   │
│                                  │               │
│   road / cars / signals          │ local state   │
│   dominant evidence surface      │ controller    │
│                                  │ provenance    │
├──────────────────────────────────┴───────────────┤
│ Core metric strip + seed/controller provenance  │
└──────────────────────────────────────────────────┘
```

### Dominance rule
City canvas must be visually and spatially dominant. Inspector is subordinate. Header and metric strip must not become a card dashboard.

## 2. Top bar

Glass level: `thin`.

Contains only:
- project identity
- workspace view switch
- simulation run/pause
- speed

Do not add:
- user avatar/account before post-MVP
- global AI chat input
- decorative status or marketing copy

## 3. City canvas

Opaque content plane, **not glass**.

Must encode:
- roads
- intersections
- signal state
- vehicles
- selected intersection

Later layers:
- queue overlay
- congestion heatmap
- flow overlay

Only one analytical overlay should be dominant at once.

## 4. Inspector

Glass level: `regular`.

M1:
- selected intersection
- fixed controller state
- local queue/wait state when implemented

M4:
- normalized observation
- action Q values
- action selected

Do not label neural activation as “reasoning” or “thought”.

## 5. Metric strip

Flat/opaque surface. Persistent small set:
- active vehicles
- completed/throughput
- avg wait
- active seed + controller provenance

P95 and max queue belong to Analytics once M5 is active; they may appear in experiment detail, not as decorative top-level KPI cards.

## 6. Training view — M4

One dominant training curve and one network/worker diagnostic region.

No equal-weight grid of 12 charts. Default visible:
- episode/step
- reward or objective metric
- loss
- epsilon
- backend/tensor memory diagnostic

## 7. Analytics view — M5

Reading order:
1. experiment question/config
2. controller comparison
3. distribution/fairness (P95/max)
4. spatial congestion heatmap
5. provenance + raw export

Charts must retain useful labels in static screenshot.

## 8. Narrow viewport

Order:
1. command bar
2. city canvas
3. selection summary
4. inspector
5. metric strip

Controls must not stack before the evidence surface.

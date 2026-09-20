# Starter Package Manifest

## Governance
- `AI_START_HERE.md` — mandatory agent entry
- `AGENTS.md` — repository agent contract
- `project-status.json` — machine-readable active milestone/gates
- `docs/MILESTONES.md` — scope lock
- `docs/WORK_BREAKDOWN.md` — task IDs and proof requirements
- `docs/AI_AGENT_GUIDE.md` — per-session protocol
- `docs/PROGRESS.md` — latest handoff
- `docs/DECISIONS.md` — architectural/product decisions

## Design
- `design-tokens.json` — machine-readable tokens
- `src/styles/tokens.css` — runtime tokens
- `docs/DESIGN_SYSTEM.md` — material/anti-slop rules
- `docs/DESIGN_TOKENS.md` — token semantics
- `docs/UI_SPEC.md` — screen composition
- `docs/DESIGN_REVIEW_CHECKLIST.md` — QA

## Domain starter
- `src/simulation/seededRandom.ts`
- `src/simulation/grid.ts`
- `src/controllers/FixedTimeController.ts`
- `src/simulation/PreviewTrafficEngine.ts` — preview only, replace during M1
- `src/simulation/renderCity.ts`

## App starter
- `src/app/App.tsx`
- `src/components/TopBar.tsx`
- `src/components/CityCanvas.tsx`
- `src/components/Inspector.tsx`
- `src/components/MetricStrip.tsx`
- `src/store/appStore.ts`

## Persistence skeleton
- `src/persistence/db.ts`

## Quality gates
- `scripts/check-session.mjs`
- `scripts/check-tokens.mjs`
- `scripts/session-open.mjs`
- `scripts/session-close.mjs`
- unit tests for RNG/grid/fixed controller

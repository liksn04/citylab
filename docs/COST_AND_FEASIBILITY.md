# Cost & Feasibility

## MVP feasibility

High. The planned MVP does not require cloud GPU or a backend service.

### Local/browser responsibilities
- traffic simulation
- Canvas rendering
- TensorFlow.js DQN (M4)
- IndexedDB storage
- CSV/JSON export

## Expected infrastructure cost

### Local-only development
- hosting: 0
- database: 0
- GPU: 0

### Public static deployment
A static host free tier can serve the built app because training and storage are browser-local.

### When cost appears
Cost becomes relevant only if post-MVP adds:
- account sync
- cloud experiment storage
- server-side batch training
- centralized telemetry
- SUMO workers offered as a hosted service

## Development risk, not money, is the main cost

Highest-risk work:
1. simulation semantics and metric correctness
2. RL stability and reward design
3. browser performance when simulation + training run together
4. fair experimental evaluation

This is why M1–M3 intentionally happen before DQN.

## Approximate human/vibe-coding effort

- M0: starter package — complete
- M1: 8–16 focused hours
- M2: 4–8 hours
- M3: 6–12 hours
- M4: 12–24 hours, highly variable due RL debugging
- M5: 8–16 hours
- M6: 6–12 hours

Total MVP order of magnitude: ~45–90 focused hours depending on debugging and polish.

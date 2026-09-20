# Design Review Checklist

Run this checklist for every material UI change.

## Hierarchy
- [ ] Is the city/data still the first thing the eye sees?
- [ ] Is one surface dominant rather than many equal cards?
- [ ] Are controls beside the evidence they affect?

## Glass
- [ ] Is glass used because a layer floats over/alongside content?
- [ ] Could this surface be opaque without losing hierarchy? If yes, prefer opaque.
- [ ] No nested glass-on-glass unless transient overlay requires it.

## Anti-slop
- [ ] No purple-blue decorative gradient.
- [ ] No floating blurred blob.
- [ ] No ambient glow.
- [ ] No random sparkle/particle.
- [ ] No excessive pill controls.
- [ ] No giant marketing headline inside the product workspace.
- [ ] No generic equal-card KPI grid.

## Data integrity
- [ ] Every number shown comes from current simulation/experiment state.
- [ ] No fake chart data used in production components.
- [ ] Critical values are not hidden only in tooltip.
- [ ] Color is not the only channel for critical state.

## Accessibility
- [ ] Body text contrast >= 4.5:1 in intended surface state.
- [ ] Meaningful UI/graphics >= 3:1 where applicable.
- [ ] Focus state visible.
- [ ] Reduced motion path exists.
- [ ] Opaque fallback exists for glass.

## Motion
- [ ] Animation explains movement/state change.
- [ ] No decorative perpetual motion.

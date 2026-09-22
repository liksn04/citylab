import { describe, expect, it } from 'vitest'
import { METRIC_VERSION } from './constants'
import saved from './__fixtures__/m3-provenance-v1.json'
import { buildRunProvenance, CONTROLLER_IDS, type RunProvenance } from './provenance'
import { BALANCED_4X4_V1, RUSH_4X4_V1, SCENARIOS } from './scenarios'
import type { ControllerKind } from './TrafficEngine'

/**
 * M3.1/M3.2 (D-010) — run provenance wrapper. The saved fixture locks the
 * schema and the configHash values so a change in the canonical config set or
 * the hash algorithm surfaces as a diff (like metricVersion, R7). Provenance is
 * a separate wrapper — it must never require touching RunSummary.
 */
const savedProvenance = saved as unknown as RunProvenance[]

describe('M3.1/M3.2 — run provenance', () => {
  it('reproduces the saved provenance fixture exactly (schema + configHash locked)', () => {
    const kinds: ControllerKind[] = ['fixed', 'maxpressure']
    const regenerated = SCENARIOS.flatMap((s) => kinds.map((k) => buildRunProvenance(s, k)))
    expect(regenerated).toEqual(savedProvenance)
  })

  it('records the deterministic identity fields for a fixed run', () => {
    expect(buildRunProvenance(BALANCED_4X4_V1, 'fixed')).toEqual({
      scenarioId: 'balanced-4x4-v1',
      scenarioVersion: 'v1',
      controllerId: 'fixed-v1',
      seed: 41021,
      simulationDurationSec: 1800,
      configHash: expect.stringMatching(/^m3-[0-9a-f]{16}$/),
      metricVersion: METRIC_VERSION,
    })
  })

  it('maps controllerKind to a stable controllerId', () => {
    expect(CONTROLLER_IDS).toEqual({ fixed: 'fixed-v1', maxpressure: 'maxpressure-v1', dqn: 'dqn-v1' })
    expect(buildRunProvenance(BALANCED_4X4_V1, 'maxpressure').controllerId).toBe('maxpressure-v1')
  })

  it('shares seed/scenario across controllers but distinguishes them by configHash (D-006)', () => {
    const fixed = buildRunProvenance(BALANCED_4X4_V1, 'fixed')
    const maxp = buildRunProvenance(BALANCED_4X4_V1, 'maxpressure')
    expect(maxp.seed).toBe(fixed.seed)
    expect(maxp.scenarioId).toBe(fixed.scenarioId)
    expect(maxp.configHash).not.toBe(fixed.configHash)
  })

  it('gives different scenarios different config hashes', () => {
    expect(buildRunProvenance(BALANCED_4X4_V1, 'fixed').configHash).not.toBe(
      buildRunProvenance(RUSH_4X4_V1, 'fixed').configHash,
    )
  })
})

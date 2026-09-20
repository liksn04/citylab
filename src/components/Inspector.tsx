import { useAppStore } from '../store/appStore'

export function Inspector() {
  const selected = useAppStore((s) => s.selectedIntersectionId)
  const metrics = useAppStore((s) => s.metrics)

  return (
    <aside className="inspector glass-regular" aria-label="Intersection inspector">
      <div className="panel-kicker">Inspector</div>
      <div className="panel-title-row">
        <h2>{selected ? `Intersection ${selected}` : 'No intersection selected'}</h2>
        <span className="status-chip">Fixed</span>
      </div>

      <p className="muted-copy">
        Canvas에서 교차로를 선택하면 local state가 이 영역에 연결됩니다. M1에서는 queue와 signal state를 실제 engine contract에 맞게 완성합니다.
      </p>

      <div className="inspector-grid">
        <Metric label="Vehicles" value={metrics.activeVehicles.toString()} />
        <Metric label="Completed" value={metrics.completedVehicles.toString()} />
        <Metric label="Avg wait" value={`${metrics.avgWaitSec.toFixed(1)} s`} />
        <Metric label="Sim time" value={`${metrics.simTimeSec.toFixed(0)} s`} />
      </div>

      <div className="contract-callout">
        <span>Milestone lock</span>
        <strong>DQN is intentionally unavailable.</strong>
        <p>Deterministic traffic core must pass M1 exit criteria first.</p>
      </div>
    </aside>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

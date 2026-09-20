import { useAppStore } from '../store/appStore'

export function MetricStrip() {
  const m = useAppStore((s) => s.metrics)
  return (
    <footer className="metric-strip" aria-label="Simulation metrics">
      <StripMetric label="Active vehicles" value={m.activeVehicles.toString()} />
      <StripMetric label="Completed" value={m.completedVehicles.toString()} />
      <StripMetric label="Average wait" value={`${m.avgWaitSec.toFixed(1)} s`} />
      <StripMetric label="Throughput" value={`${m.throughputPerHour.toFixed(0)} veh/h`} />
      <div className="metric-provenance">seed 41021 · preview-fixed-v0</div>
    </footer>
  )
}

function StripMetric({ label, value }: { label: string; value: string }) {
  return <div className="strip-metric"><span>{label}</span><strong>{value}</strong></div>
}

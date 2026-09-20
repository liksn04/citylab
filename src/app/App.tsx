import { CityCanvas } from '../components/CityCanvas'
import { Inspector } from '../components/Inspector'
import { MetricStrip } from '../components/MetricStrip'
import { TopBar } from '../components/TopBar'
import { useAppStore } from '../store/appStore'

export function App() {
  const activeView = useAppStore((s) => s.activeView)

  return (
    <div className="app-shell">
      <TopBar />
      <main className="workspace" aria-label="Neural City workspace">
        <section className="city-stage" aria-label="Traffic simulation">
          <div className="stage-heading">
            <div>
              <div className="eyebrow">{activeView.toUpperCase()}</div>
              <h1>4×4 city / fixed baseline</h1>
            </div>
            <div className="stage-note">M1 active · learning locked</div>
          </div>
          <CityCanvas />
        </section>
        <Inspector />
      </main>
      <MetricStrip />
    </div>
  )
}

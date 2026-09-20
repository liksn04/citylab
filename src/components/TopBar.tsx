import { useAppStore, type AppView } from '../store/appStore'

const views: AppView[] = ['simulation', 'training', 'analytics', 'lab']

export function TopBar() {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const running = useAppStore((s) => s.running)
  const toggleRunning = useAppStore((s) => s.toggleRunning)
  const speed = useAppStore((s) => s.speed)
  const setSpeed = useAppStore((s) => s.setSpeed)

  return (
    <header className="topbar glass-thin">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">NC</div>
        <div>
          <strong>Neural City Lab</strong>
          <span>traffic learning workspace</span>
        </div>
      </div>

      <nav className="view-tabs" aria-label="Workspace views">
        {views.map((view) => {
          const locked = view !== 'simulation'
          return (
            <button
              key={view}
              className={activeView === view ? 'tab is-active' : 'tab'}
              onClick={() => !locked && setActiveView(view)}
              disabled={locked}
              title={locked ? 'Locked by milestone plan' : undefined}
            >
              {view}
            </button>
          )
        })}
      </nav>

      <div className="run-controls" aria-label="Simulation controls">
        <button className="control-button" onClick={toggleRunning}>{running ? 'Pause' : 'Run'}</button>
        <div className="segmented" aria-label="Simulation speed">
          {[1, 5, 20].map((value) => (
            <button key={value} className={speed === value ? 'is-active' : ''} onClick={() => setSpeed(value)}>
              {value}×
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

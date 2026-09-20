import { useEffect, useRef } from 'react'
import { TrafficEngine } from '../simulation/TrafficEngine'
import { pickIntersection, renderCity } from '../simulation/renderCity'
import { useAppStore } from '../store/appStore'

const ROWS = 4
const COLS = 4

export function CityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef(
    new TrafficEngine({ rows: ROWS, cols: COLS, seed: 41021, vehiclesPerHour: 1200, durationSec: 3600 }),
  )
  const running = useAppStore((s) => s.running)
  const speed = useAppStore((s) => s.speed)
  const setMetrics = useAppStore((s) => s.setMetrics)
  const setSelectedIntersectionId = useAppStore((s) => s.setSelectedIntersectionId)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    let previous = performance.now()
    let metricAccumulator = 0
    let raf = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const loop = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05)
      previous = now
      if (running) engineRef.current.step(dt * speed)
      renderCity(ctx, canvas.clientWidth, canvas.clientHeight, engineRef.current.snapshot())
      metricAccumulator += dt
      if (metricAccumulator > 0.2 || frame === 0) {
        setMetrics(engineRef.current.metrics())
        metricAccumulator = 0
      }
      frame += 1
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [running, speed, setMetrics])

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    setSelectedIntersectionId(pickIntersection(point, rect.width, rect.height, ROWS, COLS))
  }

  return (
    <div className="canvas-frame">
      <canvas ref={canvasRef} className="city-canvas" onPointerDown={onPointerDown} aria-label="4 by 4 traffic city simulation" />
      <div className="canvas-legend" aria-hidden="true">
        <span><i className="legend-dot is-green" /> green axis</span>
        <span><i className="legend-dot is-amber" /> transition</span>
        <span><i className="legend-dot is-red" /> stop</span>
      </div>
    </div>
  )
}

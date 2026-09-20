import type { EngineSnapshot } from './TrafficEngine'
import type { Point } from './types'

const COLORS = {
  background: '#0b1016',
  road: '#202b36',
  laneDash: '#313d49',
  intersection: '#0d131a',
  green: '#62d6c8',
  amber: '#efb45d',
  red: '#f06f72',
  vehicle: '#c8d2dc',
  vehicleQueued: '#efb45d',
  vehicleHead: '#80b7f4',
  label: '#65717e',
}

export interface CityLayout {
  pad: number
  usableW: number
  usableH: number
  xFor: (col: number) => number
  yFor: (row: number) => number
}

export function cityLayout(width: number, height: number, rows: number, cols: number): CityLayout {
  const pad = Math.min(width, height) * 0.12
  const usableW = width - pad * 2
  const usableH = height - pad * 2
  const xFor = (col: number) => pad + (cols > 1 ? col / (cols - 1) : 0.5) * usableW
  const yFor = (row: number) => pad + (rows > 1 ? row / (rows - 1) : 0.5) * usableH
  return { pad, usableW, usableH, xFor, yFor }
}

/** Map a canvas point to the nearest intersection id, or null when none is close enough. */
export function pickIntersection(point: Point, width: number, height: number, rows: number, cols: number): string | null {
  const { pad, usableW, usableH, xFor, yFor } = cityLayout(width, height, rows, cols)
  if (usableW <= 0 || usableH <= 0) return null
  const col = Math.round(((point.x - pad) / usableW) * (cols - 1))
  const row = Math.round(((point.y - pad) / usableH) * (rows - 1))
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null
  if (Math.hypot(point.x - xFor(col), point.y - yFor(row)) > 28) return null
  return `I-${row}-${col}`
}

/** Draw the current engine state. Pure with respect to the snapshot — no simulation happens here. */
export function renderCity(ctx: CanvasRenderingContext2D, width: number, height: number, snapshot: EngineSnapshot) {
  const { rows, cols } = snapshot
  const { xFor, yFor } = cityLayout(width, height, rows, cols)

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, width, height)

  // Road bed.
  ctx.lineCap = 'round'
  ctx.strokeStyle = COLORS.road
  ctx.lineWidth = 20
  for (let row = 0; row < rows; row += 1) {
    ctx.beginPath(); ctx.moveTo(xFor(0), yFor(row)); ctx.lineTo(xFor(cols - 1), yFor(row)); ctx.stroke()
  }
  for (let col = 0; col < cols; col += 1) {
    ctx.beginPath(); ctx.moveTo(xFor(col), yFor(0)); ctx.lineTo(xFor(col), yFor(rows - 1)); ctx.stroke()
  }

  // Lane centreline.
  ctx.strokeStyle = COLORS.laneDash
  ctx.lineWidth = 1
  ctx.setLineDash([4, 6])
  for (let row = 0; row < rows; row += 1) {
    ctx.beginPath(); ctx.moveTo(xFor(0), yFor(row)); ctx.lineTo(xFor(cols - 1), yFor(row)); ctx.stroke()
  }
  for (let col = 0; col < cols; col += 1) {
    ctx.beginPath(); ctx.moveTo(xFor(col), yFor(0)); ctx.lineTo(xFor(col), yFor(rows - 1)); ctx.stroke()
  }
  ctx.setLineDash([])

  // Intersections + signal heads.
  for (const node of snapshot.intersections) {
    const x = xFor(node.col)
    const y = yFor(node.row)
    ctx.fillStyle = COLORS.intersection
    ctx.fillRect(x - 13, y - 13, 26, 26)
    const nsColor = node.phase === 'NS' ? COLORS.green : node.phase === 'YELLOW' ? COLORS.amber : COLORS.red
    const ewColor = node.phase === 'EW' ? COLORS.green : node.phase === 'YELLOW' ? COLORS.amber : COLORS.red
    ctx.fillStyle = nsColor
    ctx.fillRect(x - 10, y - 14, 5, 7) // NS head (vertical bar, top)
    ctx.fillStyle = ewColor
    ctx.fillRect(x + 7, y - 3, 7, 5) // EW head (horizontal bar, right)
  }

  // Vehicles along their current directed edge, offset to the right-hand lane.
  for (const v of snapshot.vehicles) {
    const x0 = xFor(v.fromCol)
    const y0 = yFor(v.fromRow)
    const x1 = xFor(v.toCol)
    const y1 = yFor(v.toRow)
    const dx = x1 - x0
    const dy = y1 - y0
    const len = Math.hypot(dx, dy) || 1
    const nx = dy / len // right-hand normal (screen y is down)
    const ny = -dx / len
    const offset = 5
    const x = x0 + dx * v.progress + nx * offset
    const y = y0 + dy * v.progress + ny * offset

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.atan2(dy, dx))
    ctx.fillStyle = v.status === 'QUEUED' ? COLORS.vehicleQueued : COLORS.vehicle
    ctx.fillRect(-5, -2.5, 10, 5)
    ctx.fillStyle = COLORS.vehicleHead
    ctx.fillRect(1, -1.5, 3, 3) // nose points in travel direction
    ctx.restore()
  }

  // Clock.
  ctx.fillStyle = COLORS.label
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(`t=${snapshot.simTimeSec.toFixed(1)}s`, 16, height - 16)
}

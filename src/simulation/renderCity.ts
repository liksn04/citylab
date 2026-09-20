import type { CitySnapshot } from './types'

export function renderCity(ctx: CanvasRenderingContext2D, width: number, height: number, snapshot: CitySnapshot) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#0b1016'
  ctx.fillRect(0, 0, width, height)

  const pad = Math.min(width, height) * 0.12
  const usableW = width - pad * 2
  const usableH = height - pad * 2
  const xFor = (col: number) => pad + (col / (snapshot.cols - 1)) * usableW
  const yFor = (row: number) => pad + (row / (snapshot.rows - 1)) * usableH

  ctx.lineCap = 'round'
  ctx.strokeStyle = '#202b36'
  ctx.lineWidth = 20
  for (let row = 0; row < snapshot.rows; row += 1) {
    ctx.beginPath(); ctx.moveTo(xFor(0), yFor(row)); ctx.lineTo(xFor(snapshot.cols - 1), yFor(row)); ctx.stroke()
  }
  for (let col = 0; col < snapshot.cols; col += 1) {
    ctx.beginPath(); ctx.moveTo(xFor(col), yFor(0)); ctx.lineTo(xFor(col), yFor(snapshot.rows - 1)); ctx.stroke()
  }

  ctx.strokeStyle = '#313d49'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 6])
  for (let row = 0; row < snapshot.rows; row += 1) {
    ctx.beginPath(); ctx.moveTo(xFor(0), yFor(row)); ctx.lineTo(xFor(snapshot.cols - 1), yFor(row)); ctx.stroke()
  }
  for (let col = 0; col < snapshot.cols; col += 1) {
    ctx.beginPath(); ctx.moveTo(xFor(col), yFor(0)); ctx.lineTo(xFor(col), yFor(snapshot.rows - 1)); ctx.stroke()
  }
  ctx.setLineDash([])

  for (const node of snapshot.intersections) {
    const x = xFor(node.col)
    const y = yFor(node.row)
    ctx.fillStyle = '#0d131a'
    ctx.fillRect(x - 13, y - 13, 26, 26)
    const green = node.phase === 'YELLOW' ? '#efb45d' : '#62d6c8'
    const red = '#f06f72'
    ctx.fillStyle = node.phase === 'NS' ? green : red
    ctx.fillRect(x - 10, y - 14, 5, 7)
    ctx.fillStyle = node.phase === 'EW' ? green : node.phase === 'YELLOW' ? '#efb45d' : red
    ctx.fillRect(x + 7, y - 3, 7, 5)
  }

  for (const vehicle of snapshot.vehicles) {
    let x: number
    let y: number
    if (vehicle.axis === 'EW') {
      x = pad + vehicle.normalizedPosition * usableW
      y = yFor(vehicle.lane) + (vehicle.direction === 1 ? -5 : 5)
    } else {
      x = xFor(vehicle.lane) + (vehicle.direction === 1 ? 5 : -5)
      y = pad + vehicle.normalizedPosition * usableH
    }
    ctx.save()
    ctx.translate(x, y)
    if (vehicle.axis === 'NS') ctx.rotate(Math.PI / 2)
    ctx.fillStyle = '#c8d2dc'
    ctx.fillRect(-5, -2.5, 10, 5)
    ctx.fillStyle = '#80b7f4'
    ctx.fillRect(vehicle.direction === 1 ? 1 : -4, -1.5, 3, 3)
    ctx.restore()
  }

  ctx.fillStyle = '#65717e'
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(`t=${snapshot.simTimeSec.toFixed(1)}s`, 16, height - 16)
}

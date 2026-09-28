import * as THREE from 'three'

const cache = new Map()

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Warm paper texture with subtle grain + ruled resume lines */
export function paperTexture() {
  const key = 'paper'
  if (cache.has(key)) return cache.get(key)
  const c = makeCanvas(512, 720)
  const x = c.getContext('2d')

  const g = x.createLinearGradient(0, 0, 512, 720)
  g.addColorStop(0, '#FBF9F4')
  g.addColorStop(0.55, '#F5F1E8')
  g.addColorStop(1, '#EDE7DB')
  x.fillStyle = g
  x.fillRect(0, 0, 512, 720)

  // faint grain
  x.globalAlpha = 0.05
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = Math.random() > 0.5 ? '#8a7f6a' : '#ffffff'
    x.fillRect(Math.random() * 512, Math.random() * 720, 1, 1)
  }
  x.globalAlpha = 1

  // name block
  x.fillStyle = '#12332E'
  x.fillRect(52, 64, 210, 22)
  x.fillStyle = 'rgba(18,51,46,0.55)'
  x.fillRect(52, 96, 130, 10)

  // rule lines (resume body)
  x.fillStyle = 'rgba(18,51,46,0.16)'
  for (let row = 0; row < 7; row++) {
    const y = 170 + row * 34
    const widths = [300, 250, 330, 210, 280, 240, 300]
    x.fillRect(52, y, widths[row], 7)
  }
  // section headers
  x.fillStyle = 'rgba(232,93,63,0.85)'
  x.fillRect(52, 140, 70, 8)
  x.fillRect(52, 428, 96, 8)
  // skill chips
  x.fillStyle = 'rgba(127,169,155,0.35)'
  const chips = [[52, 468, 84], [146, 468, 96], [252, 468, 72], [52, 500, 110], [172, 500, 88]]
  chips.forEach(([cx, cy, w]) => {
    x.beginPath()
    x.roundRect(cx, cy, w, 20, 10)
    x.fill()
  })
  // bottom bars
  x.fillStyle = 'rgba(18,51,46,0.13)'
  for (let row = 0; row < 3; row++) x.fillRect(52, 560 + row * 30, 340 - row * 60, 6)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

/** Faint infinite grid on transparent background */
export function gridTexture() {
  const key = 'grid'
  if (cache.has(key)) return cache.get(key)
  const c = makeCanvas(256, 256)
  const x = c.getContext('2d')
  x.clearRect(0, 0, 256, 256)
  x.strokeStyle = 'rgba(127,169,155,0.55)'
  x.lineWidth = 1
  x.strokeRect(0.5, 0.5, 255, 255)
  x.strokeStyle = 'rgba(127,169,155,0.22)'
  x.beginPath()
  x.moveTo(128, 0); x.lineTo(128, 256)
  x.moveTo(0, 128); x.lineTo(256, 128)
  x.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(24, 24)
  cache.set(key, tex)
  return tex
}

/** Soft round particle sprite */
export function particleTexture() {
  const key = 'dot'
  if (cache.has(key)) return cache.get(key)
  const c = makeCanvas(64, 64)
  const x = c.getContext('2d')
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.6)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  cache.set(key, tex)
  return tex
}

/** Radial glow sprite for bloom-ish accents */
export function glowTexture() {
  const key = 'glow'
  if (cache.has(key)) return cache.get(key)
  const c = makeCanvas(256, 256)
  const x = c.getContext('2d')
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(c)
  cache.set(key, tex)
  return tex
}

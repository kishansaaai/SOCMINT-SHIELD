export interface Building {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  row: string;
  neon: boolean;
  neonColor: string;
  windowDensity: number;
  landmark?: string;
}

export function generateBuildings(seed: number = 42): Building[] {
  const rng = (() => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff } })()
  const buildings: Building[] = []

  // Near row
  for (let i = 0; i < 18; i++) {
    const x = -14 + i * 1.7 + (rng() - 0.5) * 0.6
    buildings.push({
      x, y: 0, z: -2.5 + (rng() - 0.5) * 1.2,
      w: 0.35 + rng() * 0.55, h: 1.6 + rng() * 3.2, d: 0.35 + rng() * 0.55,
      row: 'near', neon: rng() > 0.55,
      neonColor: ['#00ffff','#ff6600','#8b00ff','#ff006e'][Math.floor(rng()*4)],
      windowDensity: 0.3 + rng() * 0.5,
    })
  }

  // Mid row
  for (let i = 0; i < 28; i++) {
    const x = -15 + i * 1.12 + (rng() - 0.5) * 0.4
    buildings.push({
      x, y: 0, z: -8 + (rng() - 0.5) * 2,
      w: 0.25 + rng() * 0.45, h: 0.9 + rng() * 5.5, d: 0.25 + rng() * 0.45,
      row: 'mid', neon: rng() > 0.45,
      neonColor: ['#00ffff','#ff6600','#8b00ff','#ff006e'][Math.floor(rng()*4)],
      windowDensity: 0.25 + rng() * 0.5,
    })
  }

  // Far row
  for (let i = 0; i < 45; i++) {
    const x = -16 + i * 0.74 + (rng() - 0.5) * 0.3
    buildings.push({
      x, y: 0, z: -14 + (rng() - 0.5) * 3,
      w: 0.15 + rng() * 0.35, h: 0.5 + rng() * 4, d: 0.15 + rng() * 0.35,
      row: 'far', neon: rng() > 0.6,
      neonColor: ['#00ffff','#ff6600'][Math.floor(rng()*2)],
      windowDensity: 0.2 + rng() * 0.3,
    })
  }

  // Landmark: Bengaluru Cyber Tower
  buildings.push({ x:2, y:0, z:-4, w:0.5, h:9, d:0.5, row:'landmark', neon:true, neonColor:'#00ffff', windowDensity:0.7, landmark:'cyber_tower' })
  // Wide corp buildings
  buildings.push({ x:-4, y:0, z:-3.5, w:1.6, h:3.5, d:0.8, row:'near', neon:true, neonColor:'#8b00ff', windowDensity:0.6 })
  buildings.push({ x:7,  y:0, z:-3.5, w:1.4, h:3.2, d:0.7, row:'near', neon:true, neonColor:'#ff006e', windowDensity:0.6 })

  return buildings
}

export function makeWindowTexture(density: number = 0.4, seed: number = 0): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#05051a'
  ctx.fillRect(0, 0, 64, 128)
  const cols = 8, rows = 16
  const cw = 64/cols, ch = 128/rows
  let s = seed + 1
  const r = () => { s = (s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (r() < density) {
        const colors = ['#fffbe0','#e0f0ff','#00ffff88','#fff8e0','#d0e8ff']
        ctx.fillStyle = colors[Math.floor(r()*colors.length)]
        ctx.fillRect(col*cw+1, row*ch+1, cw-2, ch-2)
      }
    }
  }
  return canvas
}


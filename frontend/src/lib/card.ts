// Result cards for sharing (1080×1350): paper, a double-rule frame, the crest, the result in type,
// a small Stella Nova mark in the corner. Flat paper and ink. Exported as JPEG for Telegram.

import { heraldryLib } from '../heraldry/store'
import { renderBlazon, type Blazon } from '../heraldry/render'

const PAPER = '#EFE6D2'
const INK = '#2A2117'
const MUTED = '#6E604B'
const GILT = '#8C6A1F'
const NOVA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none" stroke="${INK}"><path d="M64 8 L69 59 L120 64 L69 69 L64 120 L59 69 L8 64 L59 59 Z" stroke-width="2.4"/><path d="M64 30 L67 61 L98 64 L67 67 L64 98 L61 67 L30 64 L61 61 Z" stroke-width="1.5" transform="rotate(45 64 64)"/><circle cx="64" cy="64" r="3.4" fill="${INK}" stroke="none"/></svg>`

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 4): number {
  const words = text.split(' ')
  let line = ''
  let lines = 0
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y)
      y += lh
      line = w
      if (++lines >= maxLines - 1) break
    } else line = test
  }
  if (line) ctx.fillText(line, x, y)
  return y + lh
}

export async function houseCard(opts: { appName: string; house: string; words: string; text: string; crest: Blazon; ranking: { name: string; pct: number }[] }): Promise<string> {
  await document.fonts?.ready
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)
  // double rule frame
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.strokeRect(48, 48, W - 96, H - 96)
  ctx.lineWidth = 1.2
  ctx.strokeRect(62, 62, W - 124, H - 124)
  ctx.fillStyle = MUTED
  ctx.textAlign = 'left'
  ctx.font = '500 30px "Alegreya SC", Georgia, serif'
  ctx.fillText(`${opts.appName.toLowerCase()} · какой ваш дом`, 110, 140)
  ctx.fillRect(110, 162, W - 220, 1.5)
  const crest = await loadSvg(renderBlazon(opts.crest, heraldryLib()))
  ctx.drawImage(crest, 110, 210, 330, 393)
  ctx.fillStyle = MUTED
  ctx.font = '500 30px "Alegreya SC", Georgia, serif'
  ctx.fillText('ваш дом', 480, 300)
  ctx.fillStyle = INK
  ctx.font = '500 76px "Alegreya SC", Georgia, serif'
  let y = wrap(ctx, opts.house.toLowerCase(), 480, 380, 500, 80, 2)
  if (opts.words) {
    ctx.fillStyle = MUTED
    ctx.font = 'italic 400 40px Alegreya, Georgia, serif'
    y = wrap(ctx, `«${opts.words}»`, 480, y + 10, 500, 50, 3)
  }
  ctx.fillStyle = INK
  ctx.font = '400 38px Alegreya, Georgia, serif'
  y = wrap(ctx, opts.text, 110, 700, W - 220, 54, 4)
  y += 30
  ctx.fillStyle = MUTED
  ctx.font = '500 30px "Alegreya SC", Georgia, serif'
  ctx.fillText('ближайшие дома', 110, y)
  ctx.fillRect(110, y + 16, W - 220, 1.5)
  y += 70
  for (const r of opts.ranking.slice(0, 4)) {
    ctx.fillStyle = INK
    ctx.font = '400 36px Alegreya, Georgia, serif'
    ctx.textAlign = 'left'
    ctx.fillText(r.name, 110, y)
    ctx.textAlign = 'right'
    ctx.fillText(`${r.pct}%`, W - 110, y)
    ctx.fillStyle = 'rgba(42,33,23,0.25)'
    ctx.fillRect(110, y + 14, W - 220, 1)
    y += 62
  }
  const nova = await loadSvg(NOVA)
  ctx.drawImage(nova, W - 170, H - 170, 64, 64)
  ctx.textAlign = 'right'
  ctx.fillStyle = GILT
  ctx.font = '500 24px "Alegreya SC", Georgia, serif'
  ctx.fillText('stella nova labs', W - 180, H - 128)
  return c.toDataURL('image/jpeg', 0.9)
}

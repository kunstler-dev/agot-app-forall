// Result cards for sharing: drawn on a canvas in the Stella Nova style and exported as PNG.

import { crestSvg, type CrestSpec } from './heraldry'

const NOVA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#F4C95D" stop-opacity="0.55"/><stop offset="45%" stop-color="#8B7CFF" stop-opacity="0.18"/><stop offset="100%" stop-color="#8B7CFF" stop-opacity="0"/></radialGradient><linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFF4D6"/><stop offset="55%" stop-color="#F4C95D"/><stop offset="100%" stop-color="#C9962E"/></linearGradient></defs><circle cx="64" cy="64" r="62" fill="url(#g)"/><path d="M64,32 C65.3,58.9 69.4,62.7 96,64 C69.4,65.3 65.3,69.1 64,96 C62.7,69.1 58.6,65.3 32,64 C58.6,62.7 62.7,58.9 64,32 Z" fill="#8B7CFF" transform="rotate(45 64 64)"/><path d="M64,7 C66.4,54.3 73.7,61.6 121,64 C73.7,66.4 66.4,73.7 64,121 C61.6,73.7 54.3,66.4 7,64 C54.3,61.6 61.6,54.3 64,7 Z" fill="url(#r)"/><circle cx="64" cy="64" r="4.3" fill="#fff"/></svg>`

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

function sky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#13152A')
  g.addColorStop(1, '#06070D')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const r = ctx.createRadialGradient(w / 2, h * 0.36, 0, w / 2, h * 0.36, w * 0.7)
  r.addColorStop(0, 'rgba(139,124,255,0.28)')
  r.addColorStop(1, 'rgba(139,124,255,0)')
  ctx.fillStyle = r
  ctx.fillRect(0, 0, w, h)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.5})`
    ctx.beginPath()
    ctx.arc(rnd() * w, rnd() * h, rnd() * 2 + 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
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

async function brandCorner(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const nova = await loadSvg(NOVA)
  ctx.drawImage(nova, w - 150, h - 150, 100, 100)
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(241,242,248,0.55)'
  ctx.font = '600 22px Cinzel, Georgia, serif'
  ctx.fillText('STELLA NOVA LABS', w - 160, h - 92)
}

export async function houseCard(opts: {
  appName: string
  house: string
  words: string
  text: string
  crest: CrestSpec
  ranking: { name: string; pct: number }[]
}): Promise<string> {
  await document.fonts?.ready
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  sky(ctx, W, H)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#F4C95D'
  ctx.font = '700 30px Manrope, sans-serif'
  ctx.fillText(`${opts.appName.toUpperCase()} · КАКОЙ ТЫ ДОМ?`, W / 2, 110)
  const crest = await loadSvg(crestSvg(opts.crest))
  ctx.shadowColor = 'rgba(244,201,93,0.45)'
  ctx.shadowBlur = 60
  ctx.drawImage(crest, W / 2 - 190, 160, 380, 450)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#F1F2F8'
  ctx.font = '700 92px "Cormorant Garamond", Georgia, serif'
  ctx.fillText(opts.house, W / 2, 720)
  if (opts.words) {
    ctx.fillStyle = '#F4C95D'
    ctx.font = 'italic 500 44px "Cormorant Garamond", Georgia, serif'
    ctx.fillText(`«${opts.words}»`, W / 2, 784)
  }
  ctx.fillStyle = 'rgba(241,242,248,0.78)'
  ctx.font = '500 32px Manrope, sans-serif'
  let y = wrap(ctx, opts.text, W / 2, 860, 860, 46, 3)
  y += 20
  ctx.textAlign = 'left'
  for (const r of opts.ranking.slice(0, 4)) {
    ctx.fillStyle = 'rgba(241,242,248,0.85)'
    ctx.font = '700 30px Manrope, sans-serif'
    ctx.fillText(r.name, 150, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#F4C95D'
    ctx.fillText(`${r.pct}%`, W - 150, y)
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(150, y + 14, W - 300, 8)
    ctx.fillStyle = '#8B7CFF'
    ctx.fillRect(150, y + 14, ((W - 300) * r.pct) / 100, 8)
    y += 66
  }
  await brandCorner(ctx, W, H)
  return c.toDataURL('image/png')
}

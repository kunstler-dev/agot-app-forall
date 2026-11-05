#!/usr/bin/env node
// Walks through the whole app on ?dev=1 and saves screenshots of every screen.
//   1) run the backend with DEV_AUTH=1 AUTO_CREATE_SCHEMA=1 ADMIN_IDS=1 and the built frontend
//   2) node scripts/screenshots.cjs http://localhost:8000 docs/screenshots [width] [height]
// Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).

const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const base = process.argv[2] || 'http://localhost:8000'
const out = process.argv[3] || 'docs/screenshots'
const width = Number(process.argv[4] || 390)
const height = Number(process.argv[5] || 844)
const scale = Number(process.env.SCALE || 2)
const uid = process.env.DEV_USER || '1'

fs.mkdirSync(out, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  let n = 0
  const shot = async (name) => {
    await sleep(450)
    const file = path.join(out, `${String(++n).padStart(2, '0')}-${name}.png`)
    await page.screenshot({ path: file })
    console.log('saved', file)
  }
  const click = async (text, opts = {}) => {
    await page.getByText(text, { exact: false, ...opts }).first().click()
  }

  await page.goto(`${base}/?dev=${uid}`)
  await sleep(700)
  await shot('splash')
  await sleep(1800)

  // onboarding: the house quiz
  if (await page.getByText('Начать').count()) {
    await shot('onboarding-quiz')
    await click('Начать')
    await sleep(300)
    await shot('quiz-question')
    for (let i = 0; i < 20; i++) {
      const answers = page.locator('button.press.rounded-2xl')
      if (!(await answers.count())) break
      await answers.nth(i % 3).click()
      await sleep(320)
      if (await page.getByText('Твой дом').count()) break
    }
    await sleep(800)
    await shot('quiz-result')
    await click('В приложение')
  }

  // today: character of the day
  await sleep(600)
  await shot('daily-empty')
  const names = await page.evaluate(async (u) => (await fetch('/api/daily/characters', { headers: { Authorization: `tma dev:${u}` } })).json(), uid)
  for (const c of names.slice(0, 5)) {
    await page.getByPlaceholder('Начни вводить имя').fill(c.name.slice(0, 4))
    await sleep(250)
    const opt = page.locator('button', { hasText: c.name }).first()
    if (await opt.count()) await opt.click()
    await sleep(900)
    if (await page.getByText('Поделиться без спойлеров').count()) break
  }
  await shot('daily-guesses')
  await page.mouse.wheel(0, 600)
  await shot('daily-hints')

  // crest of the day
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0))
  await click('Герб дня')
  await sleep(500)
  await shot('crest-day')

  // predictions
  await click('Прогнозы', { exact: true })
  await sleep(700)
  const opt = page.locator('button.press.relative.overflow-hidden').first()
  if (await opt.count()) await opt.click()
  await sleep(600)
  await shot('predictions')
  await click('Рейтинг')
  await sleep(600)
  await shot('leaderboard')

  // map
  await click('Карта', { exact: true })
  await sleep(1500)
  await shot('map')
  const pin = page.locator('svg g.cursor-pointer').first()
  if (await pin.count()) {
    const box = await pin.boundingBox()
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await sleep(700)
    await shot('map-location')
    await page.mouse.click(width / 2, 60)
    await sleep(500)
  }
  await click('Пути')
  await sleep(500)
  const p = page.locator('button.press.flex.items-center.justify-between').first()
  if (await p.count()) await p.click()
  await sleep(600)
  await shot('map-path')
  await click('Где это?')
  await sleep(500)
  await shot('geo-menu')
  await click('Тренировка')
  await sleep(800)
  await page.mouse.click(width / 2, height / 2)
  await sleep(300)
  await shot('geo-aim')
  await click('Здесь!')
  await sleep(900)
  await shot('geo-result')

  // profile, about, admin
  await page.locator('button[aria-label="Закрыть"]').first().click().catch(() => {})
  await click('Профиль', { exact: true })
  await sleep(900)
  await shot('profile')
  await click('О приложении')
  await sleep(600)
  await shot('about')
  await page.locator('button[aria-label="Назад"]').first().click()
  await sleep(300)
  if (await page.getByText('Админка').count()) {
    await click('Админка')
    await sleep(900)
    await shot('admin-stats')
    await click('События', { exact: true })
    await sleep(600)
    await shot('admin-events')
    await click('Статус', { exact: true })
    await sleep(600)
    await shot('admin-status')
  }

  // the gate, as a non-subscriber sees it (demo only: ?gate=1 is not a backend feature, we mock /api/me)
  await page.route('**/api/me', async (route) => {
    const r = await route.fetch()
    const j = await r.json()
    j.subscription = { ...j.subscription, ok: false, channel: j.subscription.channel || '@your_channel', title: j.subscription.title || 'Канал автора', url: 'https://t.me/' }
    await route.fulfill({ response: r, json: j })
  })
  await page.goto(`${base}/?dev=${uid}`)
  await sleep(2600)
  await shot('gate')

  await browser.close()
  if (errors.length) {
    console.error('page errors:\n' + errors.join('\n'))
    process.exitCode = 1
  }
})()

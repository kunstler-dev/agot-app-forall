#!/usr/bin/env node
// Pre-renders every house crest of a content directory to static SVGs (colour and engraving),
// so places that cannot run the renderer (bot messages, previews, docs) can use plain files.
//   npm run build:heraldry -- <content_dir>      (from frontend/)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { renderBlazon, type ChargeLibrary } from '../frontend/src/heraldry/render.ts'

const dir = resolve(process.argv[2] ?? join(import.meta.dirname, '../demo/content'))
const engine: ChargeLibrary = JSON.parse(readFileSync(join(import.meta.dirname, '../backend/app/content/charges.json'), 'utf8'))
const ownPath = join(dir, 'heraldry', 'charges.json')
const lib: ChargeLibrary = { ...engine, ...(existsSync(ownPath) ? JSON.parse(readFileSync(ownPath, 'utf8')) : {}) }
const houses = JSON.parse(readFileSync(join(dir, 'houses.json'), 'utf8'))
const out = join(dir, 'heraldry', 'rendered')
mkdirSync(out, { recursive: true })
for (const h of houses) {
  writeFileSync(join(out, `${h.id}.svg`), renderBlazon(h.crest, lib, { id: h.id }))
  writeFileSync(join(out, `${h.id}.engraved.svg`), renderBlazon(h.crest, lib, { id: `${h.id}e`, engraved: true }))
}
console.log(`${houses.length} houses rendered to ${out}`)

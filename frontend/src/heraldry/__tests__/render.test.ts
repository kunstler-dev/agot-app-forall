import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { renderBlazon, tinctureProblems, type Blazon, type ChargeLibrary } from '../render'

const engine: ChargeLibrary = JSON.parse(readFileSync(resolve(__dirname, '../../../../backend/app/content/charges.json'), 'utf8'))
const demoHouses: { id: string; crest: Blazon }[] = JSON.parse(readFileSync(resolve(__dirname, '../../../../demo/content/houses.json'), 'utf8'))

const plain = (field: string, charge?: string, tincture = 'or'): Blazon => ({
  field: { division: 'plain', tinctures: [field] },
  ordinary: { type: 'none', tincture: null },
  charges: charge ? [{ charge, tincture, count: 1, arrangement: 'single' }] : [],
})

describe('renderBlazon', () => {
  it('renders a few blazons the same way every time (snapshot)', () => {
    const blazons: Blazon[] = [
      plain('gules', 'lion_rampant', 'or'),
      { field: { division: 'per_pale', tinctures: ['azure', 'argent'] }, ordinary: { type: 'chief', tincture: 'or' }, charges: [{ charge: 'mullet', tincture: 'gules', count: 3, arrangement: 'two_one' }] },
      { field: { division: 'quarterly', tinctures: ['vert', 'or'] }, ordinary: { type: 'bordure', tincture: 'sable' }, charges: [] },
    ]
    for (const [i, b] of blazons.entries()) {
      expect(renderBlazon(b, engine, { id: `t${i}` })).toMatchSnapshot()
      expect(renderBlazon(b, engine, { id: `e${i}`, engraved: true })).toMatchSnapshot()
    }
  })

  it('uses Petra Sancta hatching, not colour, in engraving mode', () => {
    const svg = renderBlazon(plain('gules', 'mullet', 'or'), engine, { engraved: true, id: 'x' })
    expect(svg).toContain('<pattern')
    expect(svg).not.toContain('#A3302A')
  })

  it('draws one shield shape and no gradients or blur', () => {
    const svg = renderBlazon(plain('azure', 'eagle_displayed', 'argent'), engine, { id: 'y' })
    expect(svg).not.toMatch(/Gradient|feGaussianBlur/)
    expect(svg.match(/M4 4 H96 V52/g)?.length).toBeGreaterThanOrEqual(2)
  })
})

describe('tincture rule', () => {
  it('flags metal on metal and colour on colour', () => {
    expect(tinctureProblems(plain('or', 'mullet', 'argent'))).toEqual(['mullet argent on or'])
    expect(tinctureProblems(plain('gules', 'mullet', 'azure'))).toEqual(['mullet azure on gules'])
    expect(tinctureProblems(plain('gules', 'mullet', 'or'))).toEqual([])
  })
})

describe('content', () => {
  it('every demo house uses an existing charge and keeps the tincture rule', () => {
    for (const h of demoHouses) {
      for (const c of h.crest.charges) expect(engine[c.charge], `${h.id}: ${c.charge}`).toBeDefined()
      expect(h.crest.canon_exception || tinctureProblems(h.crest).length === 0, h.id).toBe(true)
    }
  })
})

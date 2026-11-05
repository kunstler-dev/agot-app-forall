// Illustrations: public-domain artworks (CC0) from the Art Institute of Chicago open-access
// collection, stored in public/art/ with their credits in public/art/credits.json.
import type { ArtName } from './pick'

const FILES: Record<ArtName, string> = {
  castle: 'castle.jpg',
  raven: 'raven.jpg',
  archive: 'candle.jpg',
  ship: 'ship.jpg',
  wyrm: 'wyrm.jpg',
  hood: 'knight.jpg',
  shield: 'wyrm.jpg',
  crown: 'battle.jpg',
  moon: 'moon.jpg',
  knight: 'knight.jpg',
}

export function Art({ name, className = '', position = 'center' }: { name: ArtName; className?: string; position?: string }) {
  return <img src={`/art/${FILES[name]}`} alt="" loading="lazy" draggable={false} className={`h-full w-full object-cover ${className}`} style={{ objectPosition: position }} />
}

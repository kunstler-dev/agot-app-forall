export type ArtName = 'castle' | 'raven' | 'archive' | 'ship' | 'wyrm' | 'hood' | 'shield' | 'crown' | 'moon' | 'knight'

/** Picks an illustration for any string (an event tag, an id) so the same thing always gets the same picture. */
export function artFor(key: string): ArtName {
  const names = ['castle', 'raven', 'archive', 'ship', 'wyrm', 'crown'] as const
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return names[h % names.length]
}

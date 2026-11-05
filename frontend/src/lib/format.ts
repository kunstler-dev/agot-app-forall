/** Short, flat, no bounce: opacity and at most 8px of travel. */
export const ease = { duration: 0.18, ease: 'easeOut' as const }

const ROMAN: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]

export function roman(n: number): string {
  let out = ''
  for (const [v, s] of ROMAN) while (n >= v) {
    out += s
    n -= v
  }
  return out
}

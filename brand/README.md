# Stella Nova Labs — brand kit

*Stars don't fear the dark — they're born in it.*

Stella Nova Labs is a studio from Coburg, Germany, that builds interactive apps for authors of fandom channels. The brand is a **nova**: a star flaring up in the night. Each fandom lives *inside* the brand: the night sky and gold stay, the fandom brings its own textures (parchment, wax, steel, crests).

## Files

| File | Use |
|---|---|
| `stella-nova-mark.svg` | The mark alone: favicon, corner of share cards, footers |
| `stella-nova-logo.svg` | Mark + wordmark for dark backgrounds (README, splash, decks) |
| `stella-nova-logo-light.svg` | The same for light backgrounds |
| `stella-nova-wordmark.svg` | Wordmark only, outlined |
| `stella-nova-icon-512.svg` / `.png` | Bot avatar and app icon (512×512) |
| `tokens.css` | Tailwind v4 `@theme` tokens |
| `build_brand.py` | Regenerates all SVGs (the wordmark is converted to outlines from Cinzel) |

## Palette

| Token | Hex | Role |
|---|---|---|
| Night | `#06070D` | Background |
| Surface | `#0F1120` | Cards |
| Surface 2 | `#171A2E` | Inputs, raised elements |
| Star gold | `#F4C95D` | Primary accent, main buttons, points |
| Nova violet | `#8B7CFF` | Secondary accent, progress, paths |
| Ink | `#F1F2F8` | Text |
| Muted | `#8E93AD` | Secondary text |

## Type

- **Cinzel** (600): the `STELLA NOVA LABS` wordmark and small brand lines. Latin only.
- **Cormorant Garamond** (600–700): headings in apps; supports Cyrillic and fits medieval fantasy.
- **Manrope** (400–800): body text and **all numbers** (Cormorant has old-style figures that read badly in stats).

All three are under the SIL Open Font License (Google Fonts).

## Rules

- Where the brand appears: the launch splash (the nova flares, then "Stella Nova Labs presents"), the footer "Made by Stella Nova Labs" in the profile and the About screen, a small mark in the corner of share cards, READMEs, the favicon and the bot avatar. It must never get in the way of the fandom content.
- Keep clear space around the mark of at least half its width. Don't recolor the rays, add outlines or rotate the mark.
- A tenant may change the two accents (`theme.accent`, `theme.accent2` in `tenant.json`); the night background stays.
- Fandom visuals are always original stylisations: no stills, official logos, logo fonts or actors' likenesses.

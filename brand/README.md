# Stella Nova Labs: brand kit

*Stars don't fear the dark — they're born in it.*

Stella Nova Labs is a studio from Coburg, Germany, that builds interactive apps for authors of fandom channels. The mark is a **nova drawn as an engraving**: thin ink lines, a dotted ring, nothing glowing. A fandom lives inside the brand: the paper and the ink stay, the fandom brings its own crests and maps.

## Files

| File | Use |
|---|---|
| `stella-nova-mark.svg` / `stella-nova-mark-light.svg` | The mark on paper / on the night background; favicon, corner of share cards, footers |
| `stella-nova-logo.svg` / `stella-nova-logo-dark.svg` | Mark + wordmark for parchment / for night backgrounds |
| `stella-nova-wordmark.svg` | Wordmark only, outlined |
| `stella-nova-icon-512.svg` / `.png` | Bot avatar and app icon: paper, a double rule, the mark |
| `tokens.css` | Tailwind v4 `@theme` tokens (night and parchment) |
| `build_brand.py` | Regenerates the SVGs (the wordmark is outlined from Alegreya SC) |

## Palette

| Token | Night (default) | Parchment | Role |
|---|---|---|---|
| paper | `#16130F` | `#EFE6D2` | background, warm, never blue-violet |
| paper-2 | `#1F1B15` | `#E6DBC2` | raised surfaces |
| ink | `#E8DFCC` | `#2A2117` | text |
| ink-muted | `#A39883` | `#6E604B` | secondary text |
| rule | ink at 18–20% | | hairlines |
| wax | `#B8322A` | `#9E2A22` | the main action, errors, "no" |
| gilt | `#C9A24A` | `#8C6A1F` | rare accents: folio numbers, drop caps, first places |
| verdigris / ochre / slate | `#4F8A7A` / `#C08A2E` / `#4A463F` | `#2F6B5C` / `#9A6B1C` / `#8B8272` | daily grid: match / partial / no match |

The night theme is the default. Parchment is a choice in the profile.

## Type

- **Alegreya SC** (500): headings, rubrics, tab labels, the wordmark. Small caps with `letter-spacing: 0.06em`.
- **Alegreya** (400, 400 italic, 700): text. Old-style figures in running text, `lining-nums tabular-nums` in tables.
- Self-hosted, cyrillic + latin only, about 160 KB in total. Scale: 13 / 15 / 17 / 21 / 28 / 36.

Both are under the SIL Open Font License.

## Rules

- Structure comes from **rules and margins**, not cards: hairlines, double rules for sections, folio numbers in the margin, drop caps.
- Corners are `2px` or square. Round shapes only for the avatar medallion and radio buttons.
- One bright accent per screen: the main action is sealing-wax red.
- Motion: opacity and up to 8px of travel, 150–220 ms, ease-out. The daily cell flip is the only "show" animation.
- Where the brand appears: the splash (the nova draws itself, then "Stella Nova Labs представляет"), the footer in the profile and on the About screen, the corner of share cards, the favicon and the bot avatar.

## What we don't do

- No gradients (the one exception: a barely visible paper vignette), no glow, no coloured shadows, no glass or blur.
- No purple-gold "fantasy dashboard" palette, no starfields.
- No Cinzel, no Manrope, no Inter.
- No stock icon packs and no emoji in the interface (emoji live only in the text people share to chats).
- No pills, no `rounded-2xl` cards for everything.
- By default crests come from written blazons through our renderer and maps from our generator; a tenant can swap in its own images (see the engine README).

`scripts/check_design.sh` enforces most of this in CI.

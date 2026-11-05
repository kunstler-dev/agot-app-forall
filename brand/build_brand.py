#!/usr/bin/env python3
"""Builds the Stella Nova Labs brand SVGs: the nova mark, mark + wordmark, the 512px bot icon.

The wordmark is converted to outlines (Cinzel 600, SIL Open Font License) so the files render
the same everywhere without the font installed. Needs `pip install fonttools` and network access
to fetch the font once:  python brand/build_brand.py
"""

from __future__ import annotations

import io
import math
import urllib.request
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

OUT = Path(__file__).resolve().parent
FONT_URL = "https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-gjgTYo.ttf"

NIGHT, SURFACE, GOLD, VIOLET, INK = "#06070D", "#0F1120", "#F4C95D", "#8B7CFF", "#F1F2F8"


def sparkle(cx: float, cy: float, r: float, waist: float) -> str:
    """Four-pointed star with concave sides; waist = how far the curves pull toward the center."""
    w = r * waist
    return (f"M{cx},{cy - r} C{cx + w * 0.25},{cy - w} {cx + w},{cy - w * 0.25} {cx + r},{cy} "
            f"C{cx + w},{cy + w * 0.25} {cx + w * 0.25},{cy + w} {cx},{cy + r} "
            f"C{cx - w * 0.25},{cy + w} {cx - w},{cy + w * 0.25} {cx - r},{cy} "
            f"C{cx - w},{cy - w * 0.25} {cx - w * 0.25},{cy - w} {cx},{cy - r} Z")


def mark(cx: float, cy: float, r: float, uid: str) -> tuple[str, str]:
    """(defs, body) of the nova: long rays, short diagonal rays, a soft glow and a bright core."""
    defs = f'''<radialGradient id="glow{uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="{GOLD}" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="{VIOLET}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="{VIOLET}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ray{uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFF4D6"/>
      <stop offset="55%" stop-color="{GOLD}"/>
      <stop offset="100%" stop-color="#C9962E"/>
    </linearGradient>'''
    body = (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#glow{uid})"/>'
            f'<path d="{sparkle(cx, cy, r * 0.52, 0.16)}" fill="{VIOLET}" opacity="0.9" '
            f'transform="rotate(45 {cx} {cy})"/>'
            f'<path d="{sparkle(cx, cy, r * 0.92, 0.17)}" fill="url(#ray{uid})"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r * 0.07:.2f}" fill="#FFFFFF"/>')
    return defs, body


def text_path(font: TTFont, text: str, x: float, baseline: float, size: float, tracking: float) -> tuple[str, float]:
    """Outlines of `text`; returns (svg path d, advance width)."""
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = size / font["head"].unitsPerEm
    pen = SVGPathPen(gs)
    cursor = 0.0
    for ch in text:
        name = cmap.get(ord(ch))
        if name is None:
            continue
        g = gs[name]
        tp = TransformPen(pen, (scale, 0, 0, -scale, x + cursor, baseline))
        g.draw(tp)
        cursor += g.width * scale + tracking
    return pen.getCommands(), cursor - tracking


def svg(w: float, h: float, defs: str, body: str, bg: str | None = None) -> str:
    bg_rect = f'<rect width="{w}" height="{h}" rx="{w * 0.22:.0f}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'<defs>{defs}</defs>{bg_rect}{body}</svg>\n')


def main() -> None:
    font = TTFont(io.BytesIO(urllib.request.urlopen(FONT_URL).read()))
    # 1. mark
    d, b = mark(64, 64, 62, "m")
    (OUT / "stella-nova-mark.svg").write_text(svg(128, 128, d, b))
    # 2. icon 512 for the bot avatar: night background, faint stars
    d, b = mark(256, 256, 210, "i")
    stars = "".join(f'<circle cx="{256 + 220 * math.cos(a):.0f}" cy="{256 + 220 * math.sin(a * 1.7):.0f}" '
                    f'r="{1.6 + (i % 3):.1f}" fill="{INK}" opacity="0.5"/>'
                    for i, a in enumerate([0.4, 1.3, 2.2, 2.9, 3.8, 4.6, 5.5]))
    bgdefs = (f'<radialGradient id="bg" cx="50%" cy="45%" r="70%"><stop offset="0%" stop-color="#171A2E"/>'
              f'<stop offset="100%" stop-color="{NIGHT}"/></radialGradient>')
    (OUT / "stella-nova-icon-512.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs>{bgdefs}{d}'
        f'</defs><rect width="512" height="512" fill="url(#bg)"/>{stars}{b}</svg>\n')
    # 3. horizontal logo: mark + STELLA NOVA / LABS
    top, w1 = text_path(font, "STELLA NOVA", 118, 62, 40, 4)
    bottom, w2 = text_path(font, "LABS", 118, 92, 20, 13)
    width = 118 + max(w1, w2) + 16
    d, b = mark(52, 56, 50, "l")
    logo_body = (b + f'<path d="{top}" fill="{INK}"/>'
                 f'<path d="{bottom}" fill="{GOLD}"/>')
    (OUT / "stella-nova-logo.svg").write_text(svg(round(width), 112, d, logo_body))
    # 4. light variant of the logo for light backgrounds
    (OUT / "stella-nova-logo-light.svg").write_text(
        svg(round(width), 112, d, logo_body.replace(f'fill="{INK}"', f'fill="{NIGHT}"')))
    # 5. stacked wordmark only (for footers)
    t, wt = text_path(font, "STELLA NOVA LABS", 0, 22, 22, 3)
    (OUT / "stella-nova-wordmark.svg").write_text(svg(round(wt), 28, "", f'<path d="{t}" fill="{INK}"/>'))
    print("brand files written to", OUT)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Builds the Stella Nova Labs brand SVGs: the engraved nova, mark + wordmark, the 512px bot icon.

The mark is drawn as an engraving: thin ink lines, a dotted ring, no halo and no gradient.
The wordmark is Alegreya SC 500 (SIL Open Font License) converted to outlines, so the files
render the same everywhere. Needs `pip install fonttools` and network access to fetch the font:
    python brand/build_brand.py
"""

from __future__ import annotations

import io
import urllib.request
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

OUT = Path(__file__).resolve().parent
FONT_URL = "https://fonts.gstatic.com/s/alegreyasc/v28/taiTGmRtCJ62-O0HhNEa-ZZc-rUx.ttf"

PAPER, PAPER_DARK, INK, INK_LIGHT, WAX, GILT = "#EFE6D2", "#16130F", "#2A2117", "#E8DFCC", "#B8322A", "#C9A24A"

LONG = "M64 8 L69 59 L120 64 L69 69 L64 120 L59 69 L8 64 L59 59 Z"
SHORT = "M64 30 L67 61 L98 64 L67 67 L64 98 L61 67 L30 64 L61 61 Z"


def mark(color: str, x: float = 0, y: float = 0, scale: float = 1) -> str:
    return (f'<g transform="translate({x} {y}) scale({scale})" fill="none" stroke="{color}">'
            f'<path d="{LONG}" stroke-width="2.2"/>'
            f'<path d="{SHORT}" stroke-width="1.4" transform="rotate(45 64 64)"/>'
            f'<circle cx="64" cy="64" r="16" stroke-width="0.8" stroke-dasharray="1.5 3.5"/>'
            f'<circle cx="64" cy="64" r="3.2" fill="{color}" stroke="none"/></g>')


def text_path(font: TTFont, text: str, x: float, baseline: float, size: float, tracking: float) -> tuple[str, float]:
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
        g.draw(TransformPen(pen, (scale, 0, 0, -scale, x + cursor, baseline)))
        cursor += g.width * scale + tracking
    return pen.getCommands(), cursor - tracking


def svg(w: float, h: float, body: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>\n'


def main() -> None:
    font = TTFont(io.BytesIO(urllib.request.urlopen(FONT_URL).read()))
    (OUT / "stella-nova-mark.svg").write_text(svg(128, 128, mark(INK)))
    (OUT / "stella-nova-mark-light.svg").write_text(svg(128, 128, mark(INK_LIGHT)))
    # bot icon: paper, a double rule, the mark
    icon = (f'<rect width="512" height="512" fill="{PAPER}"/>'
            f'<rect x="28" y="28" width="456" height="456" fill="none" stroke="{INK}" stroke-width="4"/>'
            f'<rect x="44" y="44" width="424" height="424" fill="none" stroke="{INK}" stroke-width="1.5"/>'
            + mark(INK, 80, 80, 2.75))
    (OUT / "stella-nova-icon-512.svg").write_text(svg(512, 512, icon))
    # horizontal logo: mark + stella nova / labs
    top, w1 = text_path(font, "stella nova", 120, 62, 46, 3)
    bottom, w2 = text_path(font, "labs", 122, 94, 24, 9)
    width = round(120 + max(w1, w2) + 16)
    for name, color in (("stella-nova-logo.svg", INK), ("stella-nova-logo-dark.svg", INK_LIGHT)):
        body = mark(color, 4, 4, 0.82) + f'<path d="{top}" fill="{color}"/><path d="{bottom}" fill="{WAX if color == INK else GILT}"/>'
        (OUT / name).write_text(svg(width, 112, body))
    t, wt = text_path(font, "stella nova labs", 0, 24, 26, 2)
    (OUT / "stella-nova-wordmark.svg").write_text(svg(round(wt), 32, f'<path d="{t}" fill="{INK}"/>'))
    print("brand files written to", OUT)


if __name__ == "__main__":
    main()

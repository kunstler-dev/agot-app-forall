#!/usr/bin/env python3
"""Hand-drawn parchment map generator for fandom worlds.

Takes a small JSON spec (coarse coastline polygons, mountain ranges, forests, rivers, lakes, labels)
and renders an original, stylised SVG: jittered ink coastlines, coastal ripple lines, hatched
mountains, tree glyphs, a compass rose and a frame. Deterministic for a given seed.

    python scripts/mapgen.py demo/mapspec.json demo/content/map.svg

Spec format (all coordinates in map units, the same units locations.json uses):
{
  "width": 1000, "height": 1400, "seed": 7, "title": "…", "subtitle": "…",
  "lands":     [{"points": [[x, y], ...], "detail": 1.0}],
  "lakes":     [{"points": [[x, y], ...]}],
  "mountains": [{"points": [[x, y], ...], "size": 18}],
  "hills":     [{"points": [[x, y], ...]}],
  "forests":   [{"points": [[x, y], ...], "density": 1.0}],   # polygon filled with trees
  "rivers":    [{"points": [[x, y], ...], "width": 2}],
  "lines":     [{"points": [[x, y], ...], "width": 6, "style": "wall"}],
  "labels":    [{"text": "…", "x": 0, "y": 0, "size": 22, "kind": "sea|region|small", "rotate": 0}]
}
"""

from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

INK = "#3b2a1a"
INK_SOFT = "#5a4630"
SEA_INK = "#4d5d63"
PAPER = "#e9d9b4"
PAPER_DARK = "#d8c290"
LAND = "#efe1bd"
SEA = "#bcc6b8"
SEA_DEEP = "#9fb0a6"


def jitter_polygon(pts: list[list[float]], rnd: random.Random, detail: float, closed: bool = True,
                   depth: int = 4) -> list[tuple[float, float]]:
    """Midpoint displacement: a coarse outline becomes a ragged, hand-drawn coastline."""
    out = [tuple(p) for p in pts]
    if closed:
        out.append(out[0])
    rough = 0.22 * detail
    for _ in range(depth):
        nxt = [out[0]]
        for (x1, y1), (x2, y2) in zip(out, out[1:]):
            length = math.hypot(x2 - x1, y2 - y1)
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            if length > 2:
                nx, ny = -(y2 - y1) / length, (x2 - x1) / length
                off = rnd.uniform(-1, 1) * length * rough
                mx, my = mx + nx * off, my + ny * off
            nxt += [(mx, my), (x2, y2)]
        out = nxt
        rough *= 0.92
    return out[:-1] if closed else out


def smooth_path(pts: list[tuple[float, float]], closed: bool) -> str:
    """Catmull-Rom through the points, as cubic Béziers."""
    if len(pts) < 3:
        return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    p = list(pts)
    n = len(p)
    d = [f"M{p[0][0]:.1f},{p[0][1]:.1f}"]
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = p[(i - 1) % n] if closed or i > 0 else p[0]
        p1, p2 = p[i], p[(i + 1) % n]
        p3 = p[(i + 2) % n] if closed or i + 2 < n else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}")
    if closed:
        d.append("Z")
    return " ".join(d)


def point_in_poly(x: float, y: float, poly: list[list[float]]) -> bool:
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi:
            inside = not inside
        j = i
    return inside


def along(points: list[list[float]], step: float):
    """Points evenly spaced along a polyline."""
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        length = math.hypot(x2 - x1, y2 - y1)
        n = max(1, int(length / step))
        for k in range(n):
            t = k / n
            yield x1 + (x2 - x1) * t, y1 + (y2 - y1) * t


def mountain(x: float, y: float, s: float, rnd: random.Random) -> str:
    h = s * rnd.uniform(0.85, 1.25)
    w = s * rnd.uniform(0.9, 1.2)
    peak = (x + rnd.uniform(-0.1, 0.1) * w, y - h)
    left, right = (x - w * 0.7, y), (x + w * 0.7, y)
    shade = " ".join(f"M{peak[0] + (i + 1) * w * 0.1:.1f},{peak[1] + (i + 1) * h * 0.18:.1f} "
                     f"l{w * 0.12:.1f},{h * 0.16:.1f}" for i in range(3))
    base = (x + rnd.uniform(0.05, 0.25) * w, y)
    return (f'<path d="M{left[0]:.1f},{left[1]:.1f} L{peak[0]:.1f},{peak[1]:.1f} L{right[0]:.1f},{right[1]:.1f} Z" '
            f'fill="{LAND}" stroke="none"/>'
            f'<path d="M{peak[0]:.1f},{peak[1]:.1f} L{right[0]:.1f},{right[1]:.1f} L{base[0]:.1f},{base[1]:.1f} Z" '
            f'fill="{PAPER_DARK}" stroke="none"/>'
            f'<path d="M{left[0]:.1f},{left[1]:.1f} L{peak[0]:.1f},{peak[1]:.1f} L{right[0]:.1f},{right[1]:.1f}" '
            f'fill="none" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>'
            f'<path d="{shade}" stroke="{INK_SOFT}" stroke-width="1" fill="none"/>')


def hill(x: float, y: float, rnd: random.Random) -> str:
    w = rnd.uniform(9, 13)
    return (f'<path d="M{x - w:.1f},{y:.1f} Q{x:.1f},{y - w * 0.9:.1f} {x + w:.1f},{y:.1f}" fill="none" '
            f'stroke="{INK_SOFT}" stroke-width="1.3"/>')


def tree(x: float, y: float, rnd: random.Random) -> str:
    s = rnd.uniform(5, 7.5)
    return (f'<path d="M{x:.1f},{y - s * 1.6:.1f} L{x + s * 0.75:.1f},{y:.1f} L{x - s * 0.75:.1f},{y:.1f} Z" '
            f'fill="#a8a070" stroke="{INK_SOFT}" stroke-width="0.9"/>'
            f'<path d="M{x:.1f},{y:.1f} v{s * 0.45:.1f}" stroke="{INK_SOFT}" stroke-width="0.9"/>')


def compass(x: float, y: float, r: float) -> str:
    rays = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2
        long_ = i % 2 == 0
        rr = r if long_ else r * 0.55
        ax, ay = x + math.cos(a) * rr, y + math.sin(a) * rr
        b1 = a + math.pi / 2
        w = r * (0.13 if long_ else 0.09)
        bx1, by1 = x + math.cos(b1) * w, y + math.sin(b1) * w
        bx2, by2 = x - math.cos(b1) * w, y - math.sin(b1) * w
        fill = INK if i % 4 == 0 else "#8a6a3a" if long_ else PAPER_DARK
        rays.append(f'<path d="M{bx1:.1f},{by1:.1f} L{ax:.1f},{ay:.1f} L{bx2:.1f},{by2:.1f} Z" fill="{fill}" '
                    f'stroke="{INK}" stroke-width="0.8"/>')
    return (f'<g><circle cx="{x}" cy="{y}" r="{r * 0.72:.1f}" fill="none" stroke="{INK}" stroke-width="1"/>'
            f'<circle cx="{x}" cy="{y}" r="{r * 0.78:.1f}" fill="none" stroke="{INK}" stroke-width="0.5"/>'
            + "".join(rays) +
            f'<text x="{x}" y="{y - r - 6:.1f}" text-anchor="middle" font-size="{r * 0.32:.0f}" '
            f'font-family="Georgia, serif" fill="{INK}">N</text></g>')


def waves(spec: dict, rnd: random.Random, polys: list) -> str:
    """Small hand-drawn wave marks scattered over open sea."""
    W, H = spec["width"], spec["height"]
    out = []
    tries = 0
    while len(out) < spec.get("waves", 70) and tries < 4000:
        tries += 1
        x, y = rnd.uniform(40, W - 40), rnd.uniform(130, H - 40)
        near = any(point_in_poly(x + dx, y + dy, p) for p in polys for dx, dy in
                   ((0, 0), (40, 0), (-40, 0), (0, 40), (0, -40), (28, 28), (-28, -28), (28, -28), (-28, 28)))
        if near:
            continue
        w = rnd.uniform(9, 14)
        out.append(f'<path d="M{x - w:.0f},{y:.0f} q{w / 2:.1f},-5 {w:.1f},0 t{w:.1f},0" fill="none" '
                   f'stroke="{SEA_INK}" stroke-width="1.1" stroke-opacity="0.45" stroke-linecap="round"/>')
    return "<g>" + "".join(out) + "</g>"


def ship(x: float, y: float, k: float, flip: bool) -> str:
    sx = -k if flip else k
    return (f'<g transform="translate({x} {y}) scale({sx} {k})" stroke="{INK}" stroke-width="{1.2 / k:.2f}" '
            f'stroke-linejoin="round">'
            f'<path d="M-22,0 L22,0 L16,9 L-16,9 Z" fill="#8a6a3a"/>'
            f'<path d="M-2,0 L-2,-34 M10,0 L10,-24" fill="none"/>'
            f'<path d="M-2,-32 C10,-28 12,-14 -2,-6 Z" fill="{LAND}"/>'
            f'<path d="M10,-23 C18,-20 19,-10 10,-5 Z" fill="{LAND}"/>'
            f'<path d="M-2,-34 L-12,-31 L-2,-28 Z" fill="#a3242c"/>'
            f'<path d="M-30,12 q6,-4 12,0 t12,0 t12,0 t12,0 t12,0" fill="none" stroke="{SEA_INK}"/></g>')


def serpent(x: float, y: float, k: float) -> str:
    return (f'<g transform="translate({x} {y}) scale({k})" stroke="{INK}" stroke-width="{1.3 / k:.2f}" fill="#7f9a8a">'
            f'<path d="M-40,6 C-34,-10 -24,-10 -20,4 C-16,-12 -4,-12 0,4 C4,-12 16,-12 20,4 L20,10 C16,0 6,0 2,10 '
            f'C-2,0 -14,0 -18,10 C-22,0 -32,0 -36,12 Z"/>'
            f'<path d="M20,4 C24,-8 34,-12 40,-6 L46,-8 L42,-2 C40,4 30,6 22,10 Z"/>'
            f'<circle cx="37" cy="-5" r="1.4" fill="{INK}" stroke="none"/>'
            f'<path d="M-30,16 q5,-3 10,0 t10,0 t10,0 t10,0 t10,0 t10,0" fill="none" stroke="{SEA_INK}"/></g>')


def rhumbs(cx: float, cy: float, W: float, H: float) -> str:
    L = math.hypot(W, H)
    lines = "".join(f'<line x1="{cx}" y1="{cy}" x2="{cx + L * math.cos(math.radians(a)):.0f}" '
                    f'y2="{cy + L * math.sin(math.radians(a)):.0f}"/>' for a in range(0, 360, 15))
    return f'<g stroke="{INK}" stroke-width="0.7" stroke-opacity="0.13">{lines}</g>'


def cartouche(x: float, y: float, title: str, subtitle: str) -> str:
    w = max(300, len(title) * 31)
    return (f'<g transform="translate({x} {y})">'
            f'<path d="M{-w / 2 - 34},-6 L{-w / 2},-30 L{w / 2},-30 L{w / 2 + 34},-6 L{w / 2},18 L{-w / 2},18 Z" '
            f'fill="{PAPER}" stroke="{INK}" stroke-width="2"/>'
            f'<path d="M{-w / 2 - 22},-6 L{-w / 2 + 6},-24 L{w / 2 - 6},-24 L{w / 2 + 22},-6 L{w / 2 - 6},12 L{-w / 2 + 6},12 Z" '
            f'fill="none" stroke="{INK}" stroke-width="0.8"/>'
            f'<text x="0" y="2" text-anchor="middle" font-family="\'Cormorant Garamond\', Georgia, serif" '
            f'font-size="34" font-weight="700" letter-spacing="7" fill="{INK}">{esc(title)}</text>'
            f'<text x="0" y="44" text-anchor="middle" font-family="Georgia, serif" font-style="italic" '
            f'font-size="15" fill="{INK_SOFT}">{esc(subtitle)}</text></g>')


def esc(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def render(spec: dict) -> str:
    W, H = spec["width"], spec["height"]
    rnd = random.Random(spec.get("seed", 1))
    lands = [smooth_path(jitter_polygon(l["points"], rnd, l.get("detail", 1.0)), True) for l in spec["lands"]]
    lakes = [smooth_path(jitter_polygon(l["points"], rnd, 0.6, depth=4), True) for l in spec.get("lakes", [])]
    all_land = " ".join(lands)
    parts: list[str] = []
    parts.append(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<defs>
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="3" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.42  0 0 0 0 0.22  0 0 0 0.22 0"/>
    <feComposite in2="SourceGraphic" operator="in"/>
    <feBlend in2="SourceGraphic" mode="multiply"/>
  </filter>
  <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
    <stop offset="60%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#3b2408" stop-opacity="0.38"/>
  </radialGradient>
  <pattern id="seahatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
    <path d="M0,7 h14" stroke="{SEA_INK}" stroke-width="0.5" opacity="0.25"/>
  </pattern>
  <path id="land" d="{all_land}"/>
  <clipPath id="landclip"><use href="#land"/></clipPath>
<radialGradient id="seagrad" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="{SEA}"/><stop offset="1" stop-color="{SEA_DEEP}"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#seagrad)"/>
<rect width="{W}" height="{H}" fill="url(#seahatch)"/>''')
    cx, cy = spec.get("compass", [W - 90, H - 110])
    parts.append(rhumbs(cx, cy, W, H))
    parts.append(waves(spec, rnd, [l["points"] for l in spec["lands"]]))
    for d in spec.get("decor", []):
        parts.append(ship(d["x"], d["y"], d.get("scale", 1), d.get("flip", False)) if d["type"] == "ship"
                     else serpent(d["x"], d["y"], d.get("scale", 1)))
    # coastal ripples: the land outline stroked wide and faint, under the land
    for w, op in ((46, 0.10), (30, 0.16), (16, 0.22)):
        parts.append(f'<use href="#land" fill="none" stroke="{SEA_INK}" stroke-width="{w}" '
                     f'stroke-opacity="{op}" stroke-linejoin="round"/>')
        parts.append(f'<use href="#land" fill="none" stroke="{SEA}" stroke-width="{w - 4}" '
                     f'stroke-linejoin="round"/>')
    parts.append(f'<use href="#land" fill="{LAND}" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>')
    # inner shading along the coast
    parts.append(f'<g clip-path="url(#landclip)"><use href="#land" fill="none" stroke="{PAPER_DARK}" '
                 f'stroke-width="18" stroke-opacity="0.55"/></g>')
    for lk in lakes:
        parts.append(f'<path d="{lk}" fill="{SEA}" stroke="{INK}" stroke-width="1.6"/>')
    for rv in spec.get("rivers", []):
        pts = jitter_polygon(rv["points"], rnd, 0.35, closed=False, depth=4)
        parts.append(f'<path d="{smooth_path(pts, False)}" fill="none" stroke="{SEA_INK}" '
                     f'stroke-width="{rv.get("width", 2)}" stroke-linecap="round"/>')
    for ln in spec.get("lines", []):
        pts = [tuple(p) for p in ln["points"]]
        d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        w = ln.get("width", 6)
        parts.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w + 2}" stroke-linecap="square"/>'
                     f'<path d="{d}" fill="none" stroke="#f4f1ea" stroke-width="{w}" stroke-linecap="square"/>'
                     f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="1" stroke-dasharray="3 5"/>')
    for f in spec.get("forests", []):
        poly = f["points"]
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        n = int((max(xs) - min(xs)) * (max(ys) - min(ys)) / 260 * f.get("density", 1.0))
        pts = []
        for _ in range(n * 3):
            x, y = rnd.uniform(min(xs), max(xs)), rnd.uniform(min(ys), max(ys))
            if point_in_poly(x, y, poly):
                pts.append((x, y))
            if len(pts) >= n:
                break
        parts.append('<g clip-path="url(#landclip)">' + "".join(tree(x, y, rnd) for x, y in sorted(pts, key=lambda p: p[1])) + "</g>")
    for h in spec.get("hills", []):
        parts.append("<g>" + "".join(hill(x + rnd.uniform(-5, 5), y + rnd.uniform(-5, 5), rnd)
                                     for x, y in along(h["points"], 16)) + "</g>")
    for m in spec.get("mountains", []):
        s = m.get("size", 18)
        pts = [(x + rnd.uniform(-s * 0.3, s * 0.3), y + rnd.uniform(-s * 0.3, s * 0.3))
               for x, y in along(m["points"], s * 0.9)]
        parts.append("<g>" + "".join(mountain(x, y, s, rnd) for x, y in sorted(pts, key=lambda p: p[1])) + "</g>")
    for lb in spec.get("labels", []):
        kind = lb.get("kind", "region")
        size = lb.get("size", 22 if kind == "region" else 26 if kind == "sea" else 13)
        color = SEA_INK if kind == "sea" else INK_SOFT
        style = "italic" if kind == "sea" else "normal"
        spacing = 4 if kind in ("region", "sea") else 1
        rot = lb.get("rotate", 0)
        parts.append(f'<text x="{lb["x"]}" y="{lb["y"]}" transform="rotate({rot} {lb["x"]} {lb["y"]})" '
                     f'text-anchor="middle" font-family="\'Cormorant Garamond\', Georgia, serif" '
                     f'font-style="{style}" font-size="{size}" letter-spacing="{spacing}" fill="{color}" '
                     f'fill-opacity="0.85">{esc(lb["text"])}</text>')
    parts.append(compass(cx, cy, spec.get("compass_size", 52)))
    if spec.get("title"):
        tx, ty = spec.get("title_pos", [W / 2, 62])
        parts.append(cartouche(tx, ty, spec["title"], spec.get("subtitle", "")))
    # paper texture over everything, then a vignette and a double frame
    parts.append(f'<rect width="{W}" height="{H}" fill="{PAPER}" opacity="0.18" filter="url(#paper)"/>')
    parts.append(f'<rect width="{W}" height="{H}" fill="url(#vignette)"/>')
    parts.append(f'<rect x="10" y="10" width="{W - 20}" height="{H - 20}" fill="none" stroke="{INK}" stroke-width="3"/>'
                 f'<rect x="18" y="18" width="{W - 36}" height="{H - 36}" fill="none" stroke="{INK}" stroke-width="1"/>')
    parts.append("</svg>")
    return "\n".join(parts)


def main() -> None:
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    Path(sys.argv[2]).write_text(render(spec), encoding="utf-8")
    print(f"wrote {sys.argv[2]}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Source of backend/app/content/charges.json: the engine's generic heraldic charges.

Each charge is SVG in a 100×100 box drawn in the manner of medieval armorials: flat tincture,
one ink contour, inner detail in ink lines, beasts in canonical poses facing dexter (viewer's
left), "armed and langued" claws and tongue. Placeholders: fill='T' (tincture + contour),
stroke='T' (tincture line), stroke='I' / fill='I' (ink), fill='G' (claws and tongue).
Run: python scripts/charges_engine.py
"""
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "backend" / "app" / "content" / "charges.json"


def star(cx, cy, r1, r2, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        r = r1 if i % 2 == 0 else r2
        a = math.radians(rot + i * 180 / n)
        pts.append(f"{cx + r * math.cos(a):.1f},{cy + r * math.sin(a):.1f}")
    return "M" + " L".join(pts) + " Z"


def rays(cx, cy, r_in, r_out, n, wavy_every=2):
    out = []
    for i in range(n):
        a = math.radians(i * 360 / n - 90)
        b1 = math.radians(i * 360 / n - 90 - 180 / n * 0.45)
        b2 = math.radians(i * 360 / n - 90 + 180 / n * 0.45)
        tip = (cx + r_out * math.cos(a), cy + r_out * math.sin(a))
        p1 = (cx + r_in * math.cos(b1), cy + r_in * math.sin(b1))
        p2 = (cx + r_in * math.cos(b2), cy + r_in * math.sin(b2))
        if i % wavy_every:
            mid = (cx + (r_in + r_out) / 2 * math.cos(a + 0.12), cy + (r_in + r_out) / 2 * math.sin(a + 0.12))
            out.append(f"M{p1[0]:.1f},{p1[1]:.1f} Q{mid[0]:.1f},{mid[1]:.1f} {tip[0]:.1f},{tip[1]:.1f} L{p2[0]:.1f},{p2[1]:.1f} Z")
        else:
            out.append(f"M{p1[0]:.1f},{p1[1]:.1f} L{tip[0]:.1f},{tip[1]:.1f} L{p2[0]:.1f},{p2[1]:.1f} Z")
    return " ".join(out)


C = {}

C["mullet"] = {"label": "Звезда", "svg": f"<path fill='T' d='{star(50, 52, 44, 18)}'/>"}
C["cross_formy"] = {"label": "Крест лапчатый", "svg": "<path fill='T' d='M38,6 L62,6 L55,43 L94,36 L94,64 L55,57 L62,94 L38,94 L45,57 L6,64 L6,36 L45,43 Z'/>"}
C["lozenge"] = {"label": "Ромб", "svg": "<path fill='T' d='M50,4 L82,50 L50,96 L18,50 Z'/><path stroke='I' stroke-width='1.4' d='M50,18 L72,50 L50,82 L28,50 Z'/>"}
C["roundel"] = {"label": "Кружок", "svg": "<circle fill='T' cx='50' cy='50' r='36'/>"}
C["key"] = {"label": "Ключ", "svg": "<path fill='T' d='M50,4 C62,4 70,12 70,22 C70,32 62,40 54,40 L54,78 L66,78 L66,86 L54,86 L54,90 L64,90 L64,96 L46,96 L46,40 C38,40 30,32 30,22 C30,12 38,4 50,4 Z'/><circle fill='I' cx='50' cy='22' r='8'/>"}
C["crown"] = {"label": "Корона", "svg": "<path fill='T' d='M10,80 L8,38 L24,52 L34,26 L44,48 L50,18 L56,48 L66,26 L76,52 L92,38 L90,80 Z'/><path fill='T' d='M8,80 L92,80 L92,92 L8,92 Z'/><path stroke='I' stroke-width='1.4' d='M14,86 h8 M30,86 h8 M46,86 h8 M62,86 h8 M78,86 h8'/><circle fill='T' cx='50' cy='15' r='5'/><circle fill='T' cx='34' cy='23' r='4'/><circle fill='T' cx='66' cy='23' r='4'/>"}
C["tower"] = {"label": "Башня", "svg": "<path fill='T' d='M26,96 L30,34 L22,34 L22,12 L32,12 L32,20 L42,20 L42,12 L58,12 L58,20 L68,20 L68,12 L78,12 L78,34 L70,34 L74,96 Z'/><path fill='I' d='M42,96 L42,78 C42,70 58,70 58,78 L58,96 Z M46,44 L54,44 L54,58 L46,58 Z'/><path stroke='I' stroke-width='1.1' d='M30,46 H40 M60,46 H71 M29,62 H42 M58,62 H72 M28,80 H40 M60,80 H73 M36,34 V46 M64,34 V46 M35,62 V80 M66,62 V80'/>"}
C["fish_naiant"] = {"label": "Рыба плывущая", "svg": "<path fill='T' d='M6,50 L20,40 C36,30 60,30 74,40 L90,28 L86,50 L90,72 L74,60 C60,70 36,70 20,60 Z'/><path fill='T' d='M40,34 L48,22 L56,34 Z M40,66 L48,78 L56,66 Z'/><circle fill='I' cx='18' cy='47' r='2.4'/><path stroke='I' stroke-width='1.2' d='M28,40 C32,46 32,54 28,60 M40,42 l4,4 l4,-4 l4,4 l4,-4 l4,4 M40,52 l4,4 l4,-4 l4,4 l4,-4 l4,4'/>"}
C["lion_rampant"] = {"label": "Лев восстающий", "svg": "<path fill='T' d='M64,64 C80,62 88,50 84,38 C82,30 86,22 94,20 L98,26 C92,28 90,34 92,40 C96,54 86,68 68,70 Z'/><path fill='T' d='M40,6 L48,4 L54,10 L60,10 L62,18 L58,22 L62,28 L56,34 L60,44 C66,52 70,60 68,68 C72,74 76,78 82,80 L90,82 L88,92 L74,92 L62,84 L56,88 L52,96 L38,96 L42,88 L46,80 C40,74 38,66 40,58 L32,54 L20,56 L12,50 L16,44 L28,44 L32,40 L22,34 L12,30 L16,22 L28,26 L34,28 L30,20 L34,12 Z'/><path fill='G' d='M12,30 L6,28 L10,33 Z M12,50 L6,50 L11,54 Z M88,92 L94,95 L90,88 Z M30,22 L24,22 L29,25 Z'/><path stroke='I' stroke-width='1.3' d='M42,10 L46,16 L42,22 M50,14 L54,20 L50,26 M44,26 L48,32 L44,38 M52,40 C56,46 58,52 58,58 M46,62 L52,66 M48,70 L54,74'/><circle fill='I' cx='38' cy='14' r='1.8'/>"}
C["eagle_displayed"] = {"label": "Орёл с распростёртыми крыльями", "svg": "<path fill='T' d='M50,10 L56,14 L58,22 L64,24 L58,28 L58,40 L70,30 L84,20 L96,18 L92,26 L96,30 L88,34 L92,40 L82,42 L84,48 L70,50 L60,54 L60,66 L72,74 L66,76 L62,90 L56,82 L50,94 L44,82 L38,90 L34,76 L28,74 L40,66 L40,54 L30,50 L16,48 L18,42 L8,40 L12,34 L4,30 L8,26 L4,18 L16,20 L30,30 L42,40 L42,28 L42,18 L46,12 Z'/><path fill='G' d='M58,24 L64,24 L60,27 Z'/><path stroke='I' stroke-width='1.2' d='M18,26 L40,40 M14,34 L40,46 M24,44 L40,50 M82,26 L60,40 M86,34 L60,46 M76,44 L60,50 M46,60 L50,66 L54,60 M46,70 L50,76 L54,70'/><circle fill='I' cx='51' cy='17' r='1.8'/>"}
C["stag_statant"] = {"label": "Олень стоящий", "svg": "<path stroke='I' stroke-width='6' d='M24,26 L18,10 M18,10 L10,6 M19,14 L8,16 M24,26 L30,10 M30,10 L36,4 M28,15 L38,14'/><path stroke='T' stroke-width='3.6' d='M24,26 L18,10 M18,10 L10,6 M19,14 L8,16 M24,26 L30,10 M30,10 L36,4 M28,15 L38,14'/><path fill='T' d='M14,32 L22,26 L30,28 L36,44 L62,44 C72,44 80,46 82,52 L88,48 L86,58 L82,66 L84,94 L78,94 L74,72 L70,70 L68,94 L62,94 L62,70 L42,70 L40,94 L34,94 L34,70 L30,66 L30,94 L24,94 L26,64 L28,50 L26,42 L18,40 L10,38 Z'/><circle fill='I' cx='22' cy='32' r='1.7'/><path stroke='I' stroke-width='1.2' d='M38,52 C46,56 56,56 64,52 M28,40 L32,46'/>"}
C["bear_rampant"] = {"label": "Медведь восстающий", "svg": "<path fill='T' d='M28,96 L32,74 C24,68 20,58 22,48 L12,42 L16,34 L26,36 C28,28 32,22 38,20 C36,14 40,10 44,13 C48,9 54,11 55,17 C61,19 65,25 63,31 L72,31 L84,23 L88,29 L78,39 L68,43 C72,51 72,61 68,69 L72,81 L84,85 L82,93 L62,91 L58,79 L46,81 L46,96 Z'/><path fill='G' d='M84,23 L90,20 L88,26 Z M12,42 L6,40 L10,45 Z M82,93 L88,96 L84,89 Z'/><circle fill='I' cx='50' cy='23' r='1.8'/><path stroke='I' stroke-width='1.3' d='M44,13 L42,8 M61,31 L66,32 M38,50 C44,58 54,60 62,56 M34,64 L40,68 M50,70 L54,74'/>"}
C["owl"] = {"label": "Сова", "svg": "<path fill='T' d='M30,18 L40,28 C46,26 54,26 60,28 L70,18 L72,38 C80,48 80,64 72,76 L74,92 L62,86 L50,92 L38,86 L26,92 L28,76 C20,64 20,48 28,38 Z'/><circle fill='T' cx='40' cy='44' r='9'/><circle fill='T' cx='60' cy='44' r='9'/><circle fill='I' cx='40' cy='44' r='3.6'/><circle fill='I' cx='60' cy='44' r='3.6'/><path fill='G' d='M46,54 L54,54 L50,62 Z'/><path stroke='I' stroke-width='1.2' d='M36,66 l4,4 l4,-4 l4,4 l4,-4 l4,4 l4,-4 M36,76 l4,4 l4,-4 l4,4 l4,-4 l4,4 l4,-4'/>"}
C["heron"] = {"label": "Цапля", "svg": "<path fill='T' d='M72,10 C64,10 60,16 62,22 L92,18 L64,28 C66,36 62,42 56,46 C40,52 30,64 32,74 L46,72 L46,94 L50,94 L50,72 L56,70 C66,62 70,48 70,38 C72,30 74,24 72,18 Z'/><path fill='T' d='M44,94 L56,94 L54,96 L42,96 Z'/><circle fill='I' cx='68' cy='18' r='1.6'/><path stroke='I' stroke-width='1.2' d='M40,62 C46,60 52,56 56,50 M38,68 C46,66 52,62 58,56'/>"}
C["raven"] = {"label": "Ворон", "svg": "<path fill='T' d='M88,30 L70,30 C66,22 58,20 52,24 C44,28 42,38 44,46 L20,64 L8,84 L28,74 L24,90 L40,72 C52,76 64,70 68,60 C72,50 70,42 68,38 Z'/><path fill='T' d='M44,74 L40,90 L46,94 M54,72 L54,90 L60,94' stroke-width='2'/><circle fill='I' cx='62' cy='30' r='1.8'/><path stroke='I' stroke-width='1.2' d='M30,62 L48,50 M28,70 L50,58 M36,74 L54,62'/>"}
C["sun_in_splendour"] = {"label": "Солнце в сиянии", "svg": f"<path fill='T' d='{rays(50, 50, 20, 49, 16)}'/><circle fill='T' cx='50' cy='50' r='21'/><path stroke='I' stroke-width='1.3' d='M41,46 q3,-3 6,0 M53,46 q3,-3 6,0 M50,48 L48,56 L51,56 M43,62 q7,5 14,0'/>"}
C["lymphad"] = {"label": "Галера", "svg": "<path fill='T' d='M8,66 L92,66 L84,82 L16,82 Z'/><path stroke='I' stroke-width='3' d='M50,64 L50,10'/><path fill='T' d='M50,14 C66,20 72,34 70,56 L50,56 Z'/><path fill='T' d='M50,18 C38,24 32,38 34,56 L50,56 Z'/><path fill='G' d='M50,10 L64,13 L50,17 Z'/><path stroke='I' stroke-width='1.2' d='M20,72 H80 M26,82 L22,90 M38,82 L34,90 M50,82 L46,90 M62,82 L58,90 M74,82 L70,90 M56,24 L60,52 M44,26 L42,52'/>"}
C["fox_head"] = {"label": "Голова лисы", "svg": "<path fill='T' d='M20,10 L40,34 C46,32 54,32 60,34 L80,10 L78,44 C82,52 80,62 74,68 L50,94 L26,68 C20,62 18,52 22,44 Z'/><path fill='I' d='M34,54 L44,52 L42,58 Z M66,54 L56,52 L58,58 Z M46,84 L54,84 L50,92 Z'/><path stroke='I' stroke-width='1.2' d='M26,22 L36,38 M74,22 L64,38 M30,66 L40,70 M70,66 L60,70'/>"}
C["rose"] = {"label": "Роза", "svg": "".join(
    f"<circle fill='T' cx='{50 + 24 * math.cos(math.radians(a)):.1f}' cy='{50 + 24 * math.sin(math.radians(a)):.1f}' r='19'/>" for a in range(-90, 270, 72))
    + "".join(f"<path fill='I' d='M{50 + 33 * math.cos(math.radians(a - 5)):.1f},{50 + 33 * math.sin(math.radians(a - 5)):.1f} L{50 + 47 * math.cos(math.radians(a)):.1f},{50 + 47 * math.sin(math.radians(a)):.1f} L{50 + 33 * math.cos(math.radians(a + 5)):.1f},{50 + 33 * math.sin(math.radians(a + 5)):.1f} Z'/>" for a in range(-54, 306, 72))
    + "".join(f"<circle fill='T' cx='{50 + 11 * math.cos(math.radians(a)):.1f}' cy='{50 + 11 * math.sin(math.radians(a)):.1f}' r='10'/>" for a in range(-54, 306, 72))
    + "<circle fill='T' cx='50' cy='50' r='8'/><g fill='I'>" + "".join(f"<circle cx='{50 + 4.5 * math.cos(math.radians(a)):.1f}' cy='{50 + 4.5 * math.sin(math.radians(a)):.1f}' r='1.3'/>" for a in range(0, 360, 60)) + "<circle cx='50' cy='50' r='1.4'/></g>"}
C["sword"] = {"label": "Меч", "svg": "<path fill='T' d='M46,4 L54,4 L56,68 L44,68 Z'/><path fill='T' d='M24,68 L76,68 L76,76 L24,76 Z'/><path fill='T' d='M46,76 L54,76 L54,90 L46,90 Z'/><circle fill='T' cx='50' cy='94' r='5'/><path stroke='I' stroke-width='1.2' d='M50,10 V64'/>"}

OUT.write_text(json.dumps(C, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"{len(C)} charges -> {OUT}")

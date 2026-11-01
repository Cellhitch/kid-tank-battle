#!/usr/bin/env python3
"""Generate digital versions of the kid's drawn roles as SVG (thick-marker style).
Usage: python3 scripts/make_kid_roles.py   -> assets/kid-roles/<id>_<team>.svg
"""
import os, re
import sys
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'assets', 'kid-roles')
TEAMS = {'blue': ('#3a6ea5', '#bcd6f0'), 'red': ('#c44536', '#f3c5bd')}
INK = '#161616'
W = 'stroke="#161616" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"'

def stick(c, f, weapon=''):
    return f'''<circle cx="100" cy="60" r="26" fill="#fff" {W}/>
<circle cx="91" cy="55" r="3.5" fill="{INK}"/><circle cx="109" cy="55" r="3.5" fill="{INK}"/>
<path d="M90 70 Q100 79 110 70" fill="none" {W} stroke-width="5"/>
<path d="M100 86 V160 M100 105 L68 135 M100 105 L132 135 M100 160 L74 215 M100 160 L126 215" fill="none" {W}/>
<path d="M82 92 H118 V140 H82Z" fill="{f}" {W} stroke-width="6" opacity=".9"/>{weapon}'''

def tank(c, f, big=False):
    base = f'''<path d="M20 190 H180 Q196 190 196 206 Q196 222 180 222 H20 Q4 222 4 206 Q4 190 20 190Z" fill="#fff" {W}/>
<circle cx="35" cy="206" r="9" fill="{f}" {W} stroke-width="5"/><circle cx="73" cy="206" r="9" fill="{f}" {W} stroke-width="5"/>
<circle cx="111" cy="206" r="9" fill="{f}" {W} stroke-width="5"/><circle cx="149" cy="206" r="9" fill="{f}" {W} stroke-width="5"/>'''
    if not big:
        return base + f'''<rect x="45" y="140" width="95" height="50" rx="10" fill="{f}" {W}/>
<circle cx="92" cy="165" r="12" fill="#fff" {W} stroke-width="6"/>
<path d="M140 158 H215 M215 146 V170" fill="none" {W} stroke-width="14"/>
<path d="M50 140 V118 H72 V140" fill="#fff" {W}/>'''
    cannons = ''.join(f'<path d="M150 {y} H212 M212 {y-9} V{y+9}" fill="none" {W} stroke-width="13"/>' for y in (150, 112, 74))
    return base + f'''<path d="M50 190 L66 20 H134 L150 190Z" fill="{f}" {W}/>
<path d="M66 20 L150 190 M134 20 L50 190 M58 105 H142" fill="none" {W} stroke-width="6"/>{cannons}
<path d="M100 20 V-2 H125 V10 H100" fill="#fff" {W} stroke-width="6" transform="translate(0,6)"/>'''

ROLES = {}
ROLES['cannon_tank'] = lambda c, f: tank(c, f)
ROLES['tower_tank'] = lambda c, f: tank(c, f, True)
ROLES['bomb_thrower'] = lambda c, f: stick(c, f, f'<path d="M132 135 L150 118" {W}/><circle cx="165" cy="105" r="24" fill="{INK}"/><path d="M165 80 Q170 66 182 64" fill="none" {W} stroke-width="5"/><path d="M178 58 l8 -8 M184 66 l12 -2" {W} stroke-width="4" stroke="{c}"/>')
ROLES['spark_spearman'] = lambda c, f: stick(c, f, f'<path d="M132 135 L170 70 L150 62 L184 20" fill="none" {W} stroke="{c}" stroke-width="8"/><path d="M178 8 l8 10 M192 24 l12 -4 M190 8 l4 14" {W} stroke-width="4"/>')
ROLES['lookout_sniper'] = lambda c, f: ('<path d="M10 235 V200 H50 V170 H90 V140 H130 V110" fill="none" ' + W + '/>' + stick(c, f, f'<path d="M132 135 L205 120" {W} stroke-width="12"/><circle cx="210" cy="120" r="6" fill="{c}" stroke="none"/>'))
ROLES['hammer_fighter'] = lambda c, f: stick(c, f, f'<path d="M132 135 L170 190" {W} stroke-width="8"/><rect x="150" y="170" width="46" height="62" rx="14" fill="{c}" {W}/>')
ROLES['spiky_sun'] = lambda c, f: ''.join(f'<path d="M100 120 L{100+95*__import__("math").cos(a*0.5236):.0f} {120+95*__import__("math").sin(a*0.5236):.0f}" {W} stroke-width="7"/>' for a in range(12)) + f'<circle cx="100" cy="120" r="46" fill="{f}" {W}/><circle cx="85" cy="110" r="5" fill="{INK}"/><circle cx="115" cy="110" r="5" fill="{INK}"/><path d="M82 132 Q100 150 118 132" fill="none" {W} stroke-width="6"/>'
ROLES['x_giant'] = lambda c, f: f'''<path d="M60 230 H140 M70 230 V30 Q100 -5 130 30 V230" fill="{f}" {W}/>
<path d="M70 50 L130 220 M130 50 L70 220" fill="none" {W} stroke-width="6"/>
<circle cx="88" cy="30" r="4" fill="{INK}"/><circle cx="112" cy="30" r="4" fill="{INK}"/><path d="M40 238 H160" {W} stroke-width="14"/>'''
ROLES['monster_mouth'] = lambda c, f: f'<ellipse cx="100" cy="125" rx="80" ry="62" fill="{INK}"/><path d="M40 105 L55 80 L70 105 L85 78 L100 105 L115 78 L130 105 L145 80 L160 105" fill="#fff" {W} stroke-width="5"/><path d="M60 160 Q100 195 140 160" fill="{c}" stroke="none"/><circle cx="70" cy="30" r="5" fill="{INK}"/><circle cx="100" cy="22" r="5" fill="{INK}"/><circle cx="130" cy="30" r="5" fill="{INK}"/>'
ROLES['spotted_rock'] = lambda c, f: f'<path d="M70 20 L150 30 L170 120 L190 200 L120 230 L40 215 L20 150 L55 100Z" fill="{f}" {W}/><circle cx="95" cy="90" r="11" fill="{INK}"/><circle cx="130" cy="140" r="9" fill="{INK}"/><circle cx="80" cy="170" r="10" fill="{INK}"/>'

ROLES['flag_tank'] = lambda c, f: tank(c, f) + f'<path d="M92 140 V60" fill="none" {W}/><rect x="92" y="30" width="56" height="38" fill="{c}" {W}/>'
ROLES['rocket_turret'] = lambda c, f: (f'<path d="M40 235 H160" {W} stroke-width="14"/><rect x="62" y="110" width="76" height="115" rx="30" fill="{f}" {W}/>'
    f'<path d="M88 110 V60 H112 V110" fill="#fff" {W}/><path d="M138 150 H180 M138 185 H180" {W} stroke-width="14"/>'
    f'<path d="M100 40 V10 M82 48 L68 30 M118 48 L132 30" fill="none" {W} stroke="{c}" stroke-width="7"/>')
ROLES['big_eye'] = lambda c, f: f'<circle cx="100" cy="115" r="85" fill="#fff" {W}/><circle cx="100" cy="115" r="50" fill="{INK}"/><circle cx="118" cy="100" r="13" fill="#fff" stroke="none"/><path d="M60 205 l-10 30 M100 210 v30 M140 205 l10 30" {W}/>'
ROLES['bow_flower'] = lambda c, f: f'<ellipse cx="100" cy="55" rx="26" ry="42" fill="none" {W} stroke-width="12"/><path d="M100 110 L30 85 Q10 130 30 175 Z M100 110 L170 85 Q190 130 170 175 Z" fill="{INK}"/><circle cx="100" cy="130" r="22" fill="{c}" {W}/><circle cx="92" cy="125" r="3.5" fill="#fff"/><circle cx="108" cy="125" r="3.5" fill="#fff"/><path d="M100 152 V225" {W}/>'
ROLES['moon'] = lambda c, f: f'<path d="M150 20 A100 100 0 1 0 150 230 A80 80 0 1 1 150 20Z" fill="{f}" {W}/><circle cx="185" cy="70" r="12" fill="{c}" {W} stroke-width="5"/>'
def _star(x, y, k, fl):
    import math
    pts = []
    for i in range(10):
        r = (36 if i % 2 == 0 else 15) * k; a = -math.pi / 2 + i * math.pi / 5
        pts.append(f'{x + r * math.cos(a):.0f},{y + r * math.sin(a):.0f}')
    return f'<polygon points="{" ".join(pts)}" fill="{fl}" {W} stroke-width="6"/>'
ROLES['star_rain'] = lambda c, f: _star(60, 100, 1.4, f) + _star(155, 80, 1.0, c) + _star(110, 190, 1.6, f)

ROLES['pennant_spearman'] = lambda c, f: stick(c, f, f'<path d="M132 135 L196 62" {W} stroke-width="8"/><polygon points="196,34 232,70 190,80" fill="{c}" {W} stroke-width="6"/>')
ROLES['shield_bearer'] = lambda c, f: stick(c, f, f'<rect x="128" y="88" width="62" height="86" fill="#fff" {W} stroke-width="7"/><path d="M128 117 H190 M128 146 H190 M159 88 V174" fill="none" {W} stroke="{c}" stroke-width="5"/>')
ROLES['drill_soldier'] = lambda c, f: stick(c, f, f'<polygon points="132,150 215,128 168,64" fill="{f}" {W} stroke-width="7"/><path d="M158 130 L190 98 M176 124 L196 112 M150 112 L176 90" fill="none" {W} stroke-width="5"/>')
ROLES['fighter_plane'] = lambda c, f: (f'<path d="M20 120 Q100 85 200 120 Q100 155 20 120Z" fill="{f}" {W}/>'
    f'<path d="M95 115 L135 40 L158 40 L130 115 Z M95 125 L135 200 L158 200 L130 125Z" fill="#fff" {W}/>'
    f'<path d="M30 118 L12 80 L40 82 Z" fill="{c}" {W} stroke-width="6"/><circle cx="165" cy="118" r="11" fill="{c}" {W} stroke-width="5"/><path d="M205 95 V145" {W} stroke-width="7"/>')

def dedupe(svg):
    # later attribute wins (lets a shape override the default marker style W)
    def fix(m):
        attrs = re.findall(r'([\w:-]+)="([^"]*)"', m.group(2))
        d = {}
        for k, v in attrs: d[k] = v
        return '<' + m.group(1) + ''.join(f' {k}="{v}"' for k, v in d.items()) + m.group(3) + '>'
    return re.sub(r'<([a-zA-Z]+)((?:\s+[\w:-]+="[^"]*")+)(\s*/?)>', fix, svg)

os.makedirs(OUT, exist_ok=True)
for team, (c, f) in TEAMS.items():
    for rid, fn in ROLES.items():
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 260 280" width="520" height="560">{fn(c, f)}</svg>'
        svg = dedupe(svg)
        open(os.path.join(OUT, f'{rid}_{team}.svg'), 'w').write(svg)
print('wrote', len(ROLES) * len(TEAMS), 'svgs to', os.path.normpath(OUT))

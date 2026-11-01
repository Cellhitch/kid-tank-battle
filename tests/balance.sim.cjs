// Not part of CI: plays N full games with a simple bot and prints the win rate.
const C = require('../game-core.js');
function play(seed, style) {
  const s = C.makeState(seed); const r = C.makeState(seed * 31).rng;
  for (let i = 0; i < 20 * 60 * 3 && !s.over; i++) {
    if (i % 5 === 0) {
      const pick = style === 'random' ? C.PLAYABLE[Math.floor(r() * 6)]
        : s.units.some(u => u.side === 'red' && u.type === 'tower_tank') ? 'cannon_tank' : (s.units.filter(u => u.side === 'blue').length % 2 ? 'hammer_fighter' : 'lookout_sniper');
      if (style === 'idle') { /* no deploys */ } else C.deploy(s, pick);
    }
    for (const h of s.hazards) if (h.kind === 'rock' && style !== 'idle') C.collectRock(s, h.x);
    C.step(s, 0.1);
  }
  return { over: s.over, t: Math.round(s.t) };
}
for (const style of ['idle', 'random', 'smart']) {
  let w = 0, t = 0; const N = 40;
  for (let k = 1; k <= N; k++) { const g = play(k, style); if (g.over === 'win') { w++; t += g.t; } }
  console.log(style.padEnd(7), 'win', w + '/' + N, w ? 'avg win time ' + Math.round(t / w) + 's' : '');
}

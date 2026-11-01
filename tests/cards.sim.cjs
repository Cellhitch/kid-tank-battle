// Not CI: Boss AI vs. (a) a passive player, (b) a mirrored AI player; prints win rates.
const K = require('../cards-core.js');
function run(seed, playerAI) {
  const s = K.newGame(seed);
  for (let g = 0; g < 4000 && !s.over; g++) {
    const side = s.turn;
    if (side === 'p' && !playerAI) { K.endTurn(s); continue; }
    let n = 0; while (!s.over && K.aiAct(s, side) && n++ < 80);
    if (!s.over) K.endTurn(s);
  }
  return { over: s.over, turns: s.turnNo };
}
for (const [label, ai] of [['passive player', false], ['AI player (mirror)', true]]) {
  let win = 0, turns = 0; const N = 300;
  for (let i = 1; i <= N; i++) { const r = run(i, ai); if (r.over === 'win') win++; turns += r.turns; }
  console.log(label.padEnd(20), 'player wins', win + '/' + N, 'avg turns', (turns / N).toFixed(1));
}

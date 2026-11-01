const test = require('node:test'), assert = require('node:assert');
const C = require('../game-core.js');

test('deploy spends energy and refuses when poor', () => {
  const s = C.makeState(1);
  assert.ok(C.deploy(s, 'hammer_fighter'));
  assert.equal(Math.round(s.energy), 30);
  s.energy = 5;
  assert.equal(C.deploy(s, 'x_giant'), false);
  assert.equal(C.deploy(s, 'tower_tank'), false, 'boss is not playable');
});

test('energy regenerates and caps at 100', () => {
  const s = C.makeState(1);
  for (let i = 0; i < 600; i++) C.step(s, 0.1);
  assert.ok(s.energy <= 100);
});

test('melee unit kills an enemy in range', () => {
  const s = C.makeState(1); s.waveTimer = 999; s.eventTimer = 999;
  const a = C.addUnit(s, 'blue', 'hammer_fighter', 400);
  const b = C.addUnit(s, 'red', 'spark_spearman', 430);
  for (let i = 0; i < 200 && !b.dead; i++) C.step(s, 0.1);
  assert.ok(b.hp <= 0 || !s.units.includes(b));
});

test('x_giant takes reduced damage', () => {
  const s = C.makeState(1); s.waveTimer = 999; s.eventTimer = 999;
  const g = C.addUnit(s, 'blue', 'x_giant', 300), h = C.addUnit(s, 'blue', 'hammer_fighter', 100);
  const gh = g.hp, hh = h.hp;
  const foe = C.addUnit(s, 'red', 'cannon_tank', 800);
  foe.x = 300 + 40; // within range of giant only
  C.step(s, 0.5);
  assert.ok(gh - g.hp > 0 && gh - g.hp <= 30 * 0.65 + 0.01);
});

test('enemies that reach the base can destroy it -> lose', () => {
  const s = C.makeState(1); s.waveTimer = 999; s.eventTimer = 999;
  const e = C.addUnit(s, 'red', 'hammer_fighter', C.BASE_X + 30);
  for (let i = 0; i < 2000 && !s.over; i++) C.step(s, 0.1);
  assert.equal(s.over, 'lose');
});

test('killing the boss wins', () => {
  const s = C.makeState(1); s.waveTimer = 999; s.eventTimer = 999;
  s.bossSpawned = true;
  const boss = C.addUnit(s, 'red', 'tower_tank', 600);
  boss.hp = 1;
  C.addUnit(s, 'blue', 'cannon_tank', 500);
  for (let i = 0; i < 100 && !s.over; i++) C.step(s, 0.1);
  assert.equal(s.over, 'win');
});

test('boss fires a volley at up to 3 targets', () => {
  const s = C.makeState(1); s.waveTimer = 999; s.eventTimer = 999;
  s.bossSpawned = true;
  const boss = C.addUnit(s, 'red', 'tower_tank', 700);
  const t = [0, 1, 2, 3].map(i => C.addUnit(s, 'blue', 'x_giant', 500 + i * 20));
  boss.cd = 0; C.step(s, 0.01);
  assert.equal(t.filter(u => u.hp < u.maxHp).length, 3);
});

test('hazard rock gives energy when clicked; mouth hurts units', () => {
  const s = C.makeState(1); s.waveTimer = 999; s.eventTimer = 999;
  s.hazards.push({ kind: 'rock', x: 500, life: 5, tick: 1 });
  s.energy = 10;
  assert.ok(C.collectRock(s, 510)); assert.equal(s.energy, 45);
  assert.equal(C.collectRock(s, 510), false);
  const u = C.addUnit(s, 'blue', 'x_giant', 500); u.cd = 99;
  s.hazards.push({ kind: 'monster_mouth', x: 500, life: 5, tick: 0.1 });
  C.step(s, 0.2);
  assert.ok(u.hp < u.maxHp);
});

test('deterministic with same seed', () => {
  const run = () => { const s = C.makeState(7); for (let i = 0; i < 600; i++) C.step(s, 0.1); return s.units.map(u => u.type + Math.round(u.x)).join(); };
  assert.equal(run(), run());
});

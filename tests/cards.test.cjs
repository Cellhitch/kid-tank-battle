const test = require('node:test'), assert = require('node:assert');
const K = require('../cards-core.js');

function game() { const s = K.newGame(3); return s; }
function give(s, side, key) { const uid = s.nextId++; s[side].hand.push({ uid, key }); return uid; }
function put(s, side, key, o = {}) {
  const d = K.CARDS[key];
  const m = { id: s.nextId++, key, atk: d.atk, hp: d.hp, maxHp: d.hp, taunt: !!d.taunt, charge: !!d.charge, ready: true, attacked: false, frozen: false, ...o };
  s[side].board.push(m); return m;
}

test('decks have 20 cards, opening hands 3 (you) and 4+1 draw (Boss), turn 1 has 1 mana', () => {
  const s = game();
  assert.equal(Object.values(K.DECK_LIST).reduce((a, b) => a + b), 20);
  assert.equal(s.p.hand.length, 4);   // 3 + the turn-1 draw
  assert.equal(s.e.hand.length, 4);
  assert.equal(s.p.mana, 1);
});

test('mana grows by 1 each turn up to 10', () => {
  const s = game();
  for (let i = 0; i < 30 && !s.over; i++) K.endTurn(s);
  assert.equal(s.p.maxMana, 10);
});

test('cannot play a card you cannot afford', () => {
  const s = game(); const uid = give(s, 'p', 'cannon_tank');
  assert.equal(K.playCard(s, 'p', uid), false);
  s.p.mana = 5; assert.ok(K.playCard(s, 'p', uid));
  assert.equal(s.p.mana, 0);
});

test('new minion is asleep, charge minion can attack right away', () => {
  const s = game(); s.p.mana = 10;
  K.playCard(s, 'p', give(s, 'p', 'cannon_tank'));
  K.playCard(s, 'p', give(s, 'p', 'hammer_fighter'));
  const [tank, hammer] = s.p.board;
  assert.equal(K.canAttack(s, 'p', tank), false);
  assert.equal(K.canAttack(s, 'p', hammer), true);
  assert.ok(K.attack(s, 'p', hammer.id, 'hero'));
  assert.equal(s.e.hp, 20 - 3);
  assert.equal(K.attack(s, 'p', hammer.id, 'hero'), false, 'only one attack per turn');
});

test('taunt must be attacked first', () => {
  const s = game();
  const a = put(s, 'p', 'cannon_tank'); const rock = put(s, 'e', 'spotted_rock'); put(s, 'e', 'cannon_tank');
  assert.equal(K.attack(s, 'p', a.id, 'hero'), false);
  assert.equal(K.attack(s, 'p', a.id, s.e.board[1].id), false);
  assert.ok(K.attack(s, 'p', a.id, rock.id));
});

test('minions trade damage and die at 0 hp', () => {
  const s = game();
  const a = put(s, 'p', 'hammer_fighter'), b = put(s, 'e', 'spark_spearman');
  K.attack(s, 'p', a.id, b.id);
  assert.equal(s.e.board.length, 0);
  assert.equal(s.p.board.length, 0, 'hammer 3/2 takes 2 and dies');
});

test('battlecries: bomb pings all, sniper hits hero, spark freezes', () => {
  const s = game(); s.p.mana = 10;
  const e1 = put(s, 'e', 'cannon_tank'), e2 = put(s, 'e', 'x_giant');
  K.playCard(s, 'p', give(s, 'p', 'bomb_thrower'));
  assert.equal(e1.hp, 4); assert.equal(e2.hp, 5);
  K.playCard(s, 'p', give(s, 'p', 'lookout_sniper'));
  assert.equal(s.e.hp, 18);
  K.playCard(s, 'p', give(s, 'p', 'spark_spearman'));
  assert.ok(s.e.board.some(m => m.frozen));
});

test('frozen minion skips its next attack, then is free', () => {
  const s = game();
  const m = put(s, 'e', 'cannon_tank', { frozen: true });
  K.endTurn(s);                       // Boss turn starts
  assert.equal(K.canAttack(s, 'e', m), false);
  K.endTurn(s); K.endTurn(s);         // you, Boss again
  assert.equal(K.canAttack(s, 'e', m), true);
});

test('monster mouth eats a target; spiky sun hits everything', () => {
  const s = game(); s.p.mana = 10;
  const t = put(s, 'e', 'cannon_tank'), mine = put(s, 'p', 'spark_spearman', { hp: 1 });
  assert.ok(K.playCard(s, 'p', give(s, 'p', 'monster_mouth'), t.id));
  assert.equal(s.e.board.length, 0);
  assert.equal(K.playCard(s, 'p', give(s, 'p', 'monster_mouth'), 999), false);
  K.playCard(s, 'p', give(s, 'p', 'spiky_sun'));
  assert.equal(s.p.board.length, 0);
});

test('hero power: you pick a target, Boss fires 3 shots; once per turn', () => {
  const s = game(); s.p.mana = 5;
  assert.ok(K.heroPower(s, 'p', 'hero')); assert.equal(s.e.hp, 19);
  assert.equal(K.heroPower(s, 'p', 'hero'), false);
  K.endTurn(s); s.e.mana = 5;
  const before = s.p.hp; K.heroPower(s, 'e');
  assert.equal(s.p.hp, before - 1 + 0 * 1, 'with no minions only the hero can be hit (once)');
});

test('hero at 0 hp ends the game', () => {
  const s = game(); s.e.hp = 2;
  const a = put(s, 'p', 'cannon_tank');
  K.attack(s, 'p', a.id, 'hero');
  assert.equal(s.over, 'win');
});

test('Boss AI always finishes its turn and games always end', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = K.newGame(seed);
    for (let guard = 0; guard < 3000 && !s.over; guard++) {
      if (s.turn === 'p') K.endTurn(s);           // passive player
      else { let n = 0; while (K.aiAct(s, 'e') && n++ < 60 && !s.over); if (!s.over) K.endTurn(s); }
    }
    assert.ok(s.over, 'seed ' + seed + ' did not finish');
  }
});

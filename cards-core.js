/* Card-game rules (no DOM). Sides: 'p' = you, 'e' = the Boss (Tower Tank). */
(function (root) {
  const HERO_HP = { p: 25, e: 20 }, MIN_HAND = 3, BOARD_MAX = 6, HAND_MAX = 7, MANA_MAX = 10, POWER_COST = 2;

  const CARDS = {
    spotted_rock:   { name: '斑点陨石', type: 'minion', cost: 1, atk: 0, hp: 3, taunt: true, text: '嘲讽：敌人必须先打我' },
    shield_bearer:  { name: '栅栏盾兵', type: 'minion', cost: 2, atk: 1, hp: 4, taunt: true, text: '嘲讽：敌人必须先打我' },
    pennant_spearman:{ name: '旗枪兵',  type: 'minion', cost: 2, atk: 3, hp: 1, text: '攻击很高，但很脆' },
    bow_flower:     { name: '花结兵',   type: 'minion', cost: 2, atk: 1, hp: 3, text: '出场：我方英雄恢复4点生命' },
    spark_spearman: { name: '闪电矛兵', type: 'minion', cost: 2, atk: 2, hp: 2, text: '出场：冻结一个敌方随从' },
    rocket_turret:  { name: '火箭炮台', type: 'minion', cost: 3, atk: 1, hp: 4, text: '每回合开始：随机打敌人1点' },
    big_eye:        { name: '巨眼怪',   type: 'minion', cost: 3, atk: 2, hp: 4, text: '出场：抽一张牌' },
    hammer_fighter: { name: '大锤兵',   type: 'minion', cost: 3, atk: 3, hp: 2, charge: true, text: '冲锋：出场就能攻击' },
    bomb_thrower:   { name: '炸弹兵',   type: 'minion', cost: 3, atk: 2, hp: 3, text: '出场：对所有敌方随从造成1点伤害' },
    flag_tank:      { name: '旗手坦克', type: 'minion', cost: 4, atk: 3, hp: 4, text: '出场：我方其他随从+1攻击' },
    drill_soldier:  { name: '钻头兵',   type: 'minion', cost: 4, atk: 3, hp: 3, text: '出场：对一个随机敌方随从造成3点伤害' },
    fighter_plane:  { name: '战斗机',   type: 'minion', cost: 4, atk: 3, hp: 3, flying: true, text: '飞行：攻击时不用管嘲讽' },
    lookout_sniper: { name: '狙击手',   type: 'minion', cost: 4, atk: 3, hp: 3, text: '出场：对敌方英雄造成2点伤害' },
    x_giant:        { name: 'X塔巨人',  type: 'minion', cost: 4, atk: 3, hp: 6, taunt: true, text: '嘲讽：敌人必须先打我' },
    cannon_tank:    { name: '小炮坦克', type: 'minion', cost: 5, atk: 5, hp: 5, text: '又大又强！' },
    spiky_sun:      { name: '刺猬太阳', type: 'spell', cost: 2, target: false, text: '对所有随从造成1点伤害' },
    moon:           { name: '月光', type: 'spell', cost: 2, target: false, text: '我方英雄+4血，我方随从全部回满血' },
    star_rain:      { name: '星星雨', type: 'spell', cost: 3, target: false, text: '随机打敌人1点，共5次' },
    monster_mouth:  { name: '怪兽大嘴', type: 'spell', cost: 3, target: 'enemyMinion', text: '吃掉一个敌方随从' },
  };
  const DECK_LIST = { spotted_rock: 1, shield_bearer: 2, pennant_spearman: 2, bow_flower: 2, spark_spearman: 2, rocket_turret: 2,
    big_eye: 2, hammer_fighter: 2, bomb_thrower: 2, flag_tank: 1, drill_soldier: 2, fighter_plane: 2, lookout_sniper: 2,
    x_giant: 1, cannon_tank: 2, spiky_sun: 1, moon: 1, star_rain: 1, monster_mouth: 1 }; // 31 cards

  const opp = side => (side === 'p' ? 'e' : 'p');

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function newGame(seed) {
    const rng = mulberry32(seed == null ? 1 : seed);
    const s = { rng, nextId: 1, turn: 'p', turnNo: 0, over: null, events: [], log: [], aiSkip: new Set() };
    for (const side of ['p', 'e']) {
      s[side] = { hp: HERO_HP[side], maxHp: HERO_HP[side], mana: 0, maxMana: 0, deck: freshDeck(rng), hand: [], board: [], powerUsed: false };
    }
    for (let i = 0; i < 3; i++) { draw(s, 'p'); draw(s, 'e'); }
    startTurn(s, 'p');
    return s;
  }

  function freshDeck(rng) {
    const deck = [];
    for (const [k, n] of Object.entries(DECK_LIST)) for (let i = 0; i < n; i++) deck.push(k);
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck;
  }
  function ev(s, e) { s.events.push(e); }
  function say(s, text) { s.log.push(text); if (s.log.length > 30) s.log.shift(); }

  function draw(s, side) {
    const me = s[side];
    if (!me.deck.length) me.deck = freshDeck(s.rng); // the deck never runs out: reshuffle
    const key = me.deck.pop();
    if (me.hand.length >= HAND_MAX) { ev(s, { k: 'burn', side, key }); return; }
    me.hand.push({ uid: s.nextId++, key });
  }
  /* You always have at least MIN_HAND cards to choose from. */
  function topUp(s, side) { while (s[side].hand.length < MIN_HAND) draw(s, side); }

  function heal(s, side, ref, n) {
    if (ref === 'hero') { const h = s[side]; const g = Math.min(n, h.maxHp - h.hp); h.hp += g; if (g > 0) ev(s, { k: 'heal', side, ref: 'hero', n: g }); return; }
    const f = findMinion(s, ref); if (!f) return;
    const g = Math.min(n, f.m.maxHp - f.m.hp); f.m.hp += g; if (g > 0) ev(s, { k: 'heal', side: f.side, ref, n: g });
  }
  const randomFoe = (s, foeSide) => {
    const pool = ['hero', ...s[foeSide].board.filter(m => m.hp > 0).map(m => m.id)];
    return pool[Math.floor(s.rng() * pool.length)];
  };

  function startTurn(s, side) {
    const me = s[side];
    s.turn = side; s.turnNo++;
    me.maxMana = Math.min(MANA_MAX, me.maxMana + 1);
    me.mana = me.maxMana; me.powerUsed = false;
    s.aiSkip = new Set();
    draw(s, side); topUp(s, side);
    for (const m of me.board) { m.attacked = false; m.ready = !m.frozen; }
    for (const m of me.board.slice()) if (m.key === 'rocket_turret' && m.hp > 0) { hurt(s, opp(side), randomFoe(s, opp(side)), 1); ev(s, { k: 'power', side }); }
    cleanup(s);
  }

  function endTurn(s) {
    if (s.over) return false;
    const side = s.turn;
    for (const m of s[side].board) m.frozen = false;
    startTurn(s, opp(side));
    return true;
  }

  const findMinion = (s, id) => { for (const side of ['p', 'e']) { const m = s[side].board.find(x => x.id === id); if (m) return { m, side }; } return null; };

  /* target refs: 'hero' (with side) or a minion id */
  function hurt(s, side, ref, n) {
    if (ref === 'hero') { s[side].hp -= n; ev(s, { k: 'dmg', side, ref: 'hero', n }); return; }
    const f = findMinion(s, ref); if (!f) return;
    f.m.hp -= n; ev(s, { k: 'dmg', side: f.side, ref, n });
  }

  function cleanup(s) {
    for (const side of ['p', 'e']) {
      const dead = s[side].board.filter(m => m.hp <= 0);
      for (const m of dead) ev(s, { k: 'die', side, ref: m.id, key: m.key });
      s[side].board = s[side].board.filter(m => m.hp > 0);
    }
    checkEnd(s);
  }
  function checkEnd(s) {
    if (s.over) return;
    if (s.e.hp <= 0) s.over = 'win';
    else if (s.p.hp <= 0) s.over = 'lose';
  }

  function legalAttackTargets(s, side, attacker) {
    if (s.over || s.turn !== side) return [];
    const foe = s[opp(side)];
    const taunts = foe.board.filter(m => m.taunt);
    if (taunts.length && !(attacker && attacker.flying)) return taunts.map(m => m.id);
    return [...foe.board.map(m => m.id), 'hero'];
  }
  const canAttack = (s, side, m) => !s.over && s.turn === side && m.ready && !m.attacked && m.atk > 0;

  function attack(s, side, attackerId, target) {
    const a = s[side].board.find(m => m.id === attackerId);
    if (!a || !canAttack(s, side, a)) return false;
    if (!legalAttackTargets(s, side, a).includes(target)) return false;
    const foeSide = opp(side);
    ev(s, { k: 'attack', side, ref: a.id, target, foeSide });
    if (target === 'hero') { hurt(s, foeSide, 'hero', a.atk); say(s, `${CARDS[a.key].name} 攻击英雄`); }
    else {
      const t = s[foeSide].board.find(m => m.id === target);
      hurt(s, foeSide, target, a.atk); hurt(s, side, a.id, t.atk);
      say(s, `${CARDS[a.key].name} 攻击 ${CARDS[t.key].name}`);
    }
    a.attacked = true;
    cleanup(s);
    return true;
  }

  function canPlay(s, side, uid) {
    if (s.over || s.turn !== side) return false;
    const me = s[side], c = me.hand.find(h => h.uid === uid);
    if (!c) return false;
    const d = CARDS[c.key];
    if (d.cost > me.mana) return false;
    if (d.type === 'minion' && me.board.length >= BOARD_MAX) return false;
    if (d.target === 'enemyMinion' && !s[opp(side)].board.length) return false;
    return true;
  }

  function playCard(s, side, uid, target) {
    if (!canPlay(s, side, uid)) return false;
    const me = s[side], foe = s[opp(side)];
    const idx = me.hand.findIndex(h => h.uid === uid);
    const key = me.hand[idx].key, d = CARDS[key];
    if (d.target === 'enemyMinion' && !foe.board.some(m => m.id === target)) return false;
    me.hand.splice(idx, 1); me.mana -= d.cost;
    say(s, `${side === 'p' ? '你' : 'Boss'}打出 ${d.name}`);
    if (d.type === 'minion') {
      const m = { id: s.nextId++, key, atk: d.atk, hp: d.hp, maxHp: d.hp, taunt: !!d.taunt, charge: !!d.charge, flying: !!d.flying,
        ready: !!d.charge, attacked: false, frozen: false };
      me.board.push(m);
      ev(s, { k: 'summon', side, ref: m.id });
      if (key === 'spark_spearman' && foe.board.length) {
        const t = foe.board[Math.floor(s.rng() * foe.board.length)]; t.frozen = true; ev(s, { k: 'freeze', side: opp(side), ref: t.id });
      } else if (key === 'bomb_thrower') foe.board.slice().forEach(t => hurt(s, opp(side), t.id, 1));
      else if (key === 'lookout_sniper') hurt(s, opp(side), 'hero', 2);
      else if (key === 'bow_flower') heal(s, side, 'hero', 4);
      else if (key === 'big_eye') draw(s, side);
      else if (key === 'flag_tank') me.board.forEach(o => { if (o !== m) o.atk += 1; });
      else if (key === 'drill_soldier' && foe.board.length) hurt(s, opp(side), foe.board[Math.floor(s.rng() * foe.board.length)].id, 3);
    } else if (key === 'monster_mouth') {
      hurt(s, opp(side), target, 999);
    } else if (key === 'moon') {
      heal(s, side, 'hero', 4); me.board.forEach(o => heal(s, side, o.id, 99));
    } else if (key === 'star_rain') {
      for (let i = 0; i < 5; i++) hurt(s, opp(side), randomFoe(s, opp(side)), 1);
    } else if (key === 'spiky_sun') {
      [...s.p.board, ...s.e.board].forEach(m => hurt(s, s.p.board.includes(m) ? 'p' : 'e', m.id, 1));
    }
    cleanup(s);
    topUp(s, side);
    return true;
  }

  /* Hero power (2 mana, once per turn).
   * You: 炮击 — 1 damage to a target you pick.  Boss: 三炮齐射 — 1 damage to up to 3 random enemies. */
  function canPower(s, side) { return !s.over && s.turn === side && !s[side].powerUsed && s[side].mana >= POWER_COST; }
  function heroPower(s, side, target) {
    if (!canPower(s, side)) return false;
    const foeSide = opp(side), foe = s[foeSide];
    if (side === 'p') {
      if (target !== 'hero' && !foe.board.some(m => m.id === target)) return false;
      hurt(s, foeSide, target, 1);
    } else {
      const pool = ['hero', ...foe.board.map(m => m.id)];
      for (let i = 0; i < 3 && pool.length; i++) { const j = Math.floor(s.rng() * pool.length); hurt(s, foeSide, pool.splice(j, 1)[0], 1); }
    }
    s[side].mana -= POWER_COST; s[side].powerUsed = true;
    say(s, `${side === 'p' ? '你' : 'Boss'}使用英雄技能`);
    ev(s, { k: 'power', side });
    cleanup(s);
    return true;
  }

  /* ---------- AI (the Boss). One action per call; returns an action object or null when done. ---------- */
  function aiAct(s, side) {
    if (s.over || s.turn !== side) return null;
    const me = s[side], foeSide = opp(side), foe = s[foeSide];

    // 1. play the most expensive card we can
    const options = me.hand.filter(c => canPlay(s, side, c.uid)).filter(c => {
      const d = CARDS[c.key];
      if (c.key === 'monster_mouth') return foe.board.some(m => m.atk + m.hp >= 5);
      if (c.key === 'spiky_sun') return foe.board.filter(m => m.hp <= 1).length > me.board.filter(m => m.hp <= 1).length;
      if (c.key === 'drill_soldier') return foe.board.length > 0;
      if (c.key === 'moon') return me.hp <= me.maxHp - 3 || me.board.some(m => m.hp < m.maxHp);
      if (c.key === 'bow_flower' || c.key === 'flag_tank') return true;
      return true;
    }).sort((a, b) => CARDS[b.key].cost - CARDS[a.key].cost);
    if (options.length) {
      const c = options[0];
      let target;
      if (c.key === 'monster_mouth') target = foe.board.slice().sort((a, b) => (b.atk + b.hp) - (a.atk + a.hp))[0].id;
      playCard(s, side, c.uid, target);
      return { k: 'play', key: c.key };
    }
    // 2. attacks
    const ready = me.board.filter(m => canAttack(s, side, m) && !s.aiSkip.has(m.id));
    const totalAtk = me.board.filter(m => canAttack(s, side, m)).reduce((n, m) => n + m.atk, 0);
    for (const a of ready) {
      const legal = legalAttackTargets(s, side, a);
      let choice = null;
      if (legal.includes('hero') && totalAtk >= foe.hp) choice = 'hero';
      else {
        let best = -Infinity;
        for (const id of legal) {
          if (id === 'hero') continue;
          const t = foe.board.find(m => m.id === id);
          const kills = a.atk >= t.hp, survives = a.hp > t.atk;
          let sc = -Infinity;
          if (kills && survives) sc = 10 + t.atk + t.hp;
          else if (kills) sc = (t.atk + t.hp) - (a.atk + a.hp) + 2;
          else if (t.taunt && survives) sc = 1;
          if (sc > best) { best = sc; choice = id; }
        }
        if (best <= 0) choice = legal.includes('hero') ? 'hero' : (best > -Infinity ? choice : null);
      }
      if (choice == null) { s.aiSkip.add(a.id); continue; }
      attack(s, side, a.id, choice);
      return { k: 'attack', id: a.id, target: choice };
    }
    // 3. hero power with leftover mana (the Boss always; a simulated 'p' fires at the face)
    if (canPower(s, side)) { heroPower(s, side, 'hero'); return { k: 'power' }; }
    return null;
  }

  const api = { HERO_HP, MIN_HAND, BOARD_MAX, HAND_MAX, MANA_MAX, POWER_COST, CARDS, DECK_LIST, opp, newGame, startTurn, endTurn,
    playCard, canPlay, attack, canAttack, legalAttackTargets, heroPower, canPower, aiAct };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Cards = api;
})(typeof window !== 'undefined' ? window : globalThis);

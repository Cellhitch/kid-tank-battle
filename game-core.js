/* Game rules (no DOM) — shared by the browser and the node tests. */
(function (root) {
  const W = 960, GY = 440, BASE_X = 70, ENERGY_MAX = 100;

  /* Roles come from the kid's drawing. */
  const UNITS = {
    hammer_fighter: { name: '大锤兵', en: 'Hammer', cost: 30, hp: 120, atk: 32, range: 48, cd: 1.3, speed: 72, h: 100, desc: '近战，打得重' },
    spark_spearman: { name: '闪电矛兵', en: 'Spark', cost: 20, hp: 100, atk: 22, range: 70, cd: 1.1, speed: 90, h: 100, stun: 0.8, desc: '闪电让对手停一下' },
    bomb_thrower:   { name: '炸弹兵', en: 'Bomb', cost: 28, hp: 95, atk: 34, range: 120, cd: 1.8, speed: 75, h: 100, splash: 60, desc: '炸弹范围伤害' },
    lookout_sniper: { name: '狙击手', en: 'Sniper', cost: 35, hp: 88, atk: 36, range: 300, cd: 2.2, speed: 60, h: 105, opener: 1.5, desc: '远程，第一枪+50%' },
    cannon_tank:    { name: '小炮坦克', en: 'Tank', cost: 45, hp: 130, atk: 30, range: 220, cd: 1.6, speed: 63, h: 90, desc: '远程炮击' },
    x_giant:        { name: 'X塔巨人', en: 'Giant', cost: 60, hp: 260, atk: 28, range: 55, cd: 1.4, speed: 45, h: 150, armor: 0.65, desc: '铁壁，少受35%伤害' },
    tower_tank:     { name: '塔楼重坦', en: 'BOSS', cost: 0, hp: 1800, atk: 40, range: 340, cd: 2.8, speed: 21, h: 290, volley: 3, boss: true, desc: 'Boss：三炮齐射' },
  };
  const PLAYABLE = ['spark_spearman', 'hammer_fighter', 'bomb_thrower', 'lookout_sniper', 'cannon_tank', 'x_giant'];
  const WAVES = 5;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeState(seed) {
    return {
      t: 0, energy: 60, baseHp: 400, baseMax: 400,
      units: [], hazards: [], fx: [], queue: [],
      nextId: 1, waveIdx: 0, waveTimer: 4, bossSpawned: false, boss: null,
      trickle: 6, eventTimer: 16, queueTimer: 0,
      banner: { text: '第 1 波来了！', life: 2.5 },
      over: null, rng: mulberry32(seed == null ? 12345 : seed),
    };
  }

  function addUnit(s, side, type, x) {
    const d = UNITS[type];
    const k = side === 'red' ? 1.15 : 1; // enemies a bit tougher
    const u = { id: s.nextId++, side, type, x, hp: Math.round(d.hp * k), maxHp: Math.round(d.hp * k),
      cd: 0.3, flash: 0, opened: false, moving: false, dead: false };
    s.units.push(u);
    if (d.boss) s.boss = u;
    return u;
  }

  function deploy(s, type) {
    const d = UNITS[type];
    if (s.over || !d || d.boss || s.energy < d.cost) return false;
    s.energy -= d.cost;
    addUnit(s, 'blue', type, BASE_X + 40);
    return true;
  }

  function collectRock(s, x) {
    const i = s.hazards.findIndex(h => h.kind === 'rock' && Math.abs(h.x - x) < 55);
    if (i < 0) return false;
    s.hazards.splice(i, 1);
    s.energy = Math.min(ENERGY_MAX, s.energy + 35);
    s.fx.push({ k: 'text', x, y: GY - 120, text: '+35 ⚡', life: 1 });
    return true;
  }

  function damage(s, target, dmg) {
    if (target === 'base') { s.baseHp -= dmg; return; }
    const d = UNITS[target.type];
    target.hp -= dmg * (d.armor || 1);
    target.flash = 0.15;
    if (target.hp <= 0) target.dead = true;
  }

  function enemiesOf(s, u) { return s.units.filter(o => o.side !== u.side && !o.dead); }

  function attack(s, u, target) {
    const d = UNITS[u.type];
    let dmg = d.atk;
    if (d.opener && !u.opened) { dmg *= d.opener; u.opened = true; }
    const dir = u.side === 'blue' ? 1 : -1;
    const ranged = d.range > 100;
    const ty = target === 'base' ? GY - 60 : GY - d.h * 0.5;
    const tx = target === 'base' ? BASE_X : target.x;
    if (d.volley) {
      // Boss: fire at up to 3 nearest enemies (or the base)
      const foes = enemiesOf(s, u).filter(o => Math.abs(o.x - u.x) <= d.range)
        .sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x)).slice(0, d.volley);
      const tg = foes.length ? foes : ['base'];
      tg.forEach((t, i) => {
        damage(s, t, dmg);
        s.fx.push({ k: 'shot', x1: u.x + dir * 100, y1: GY - 230 + i * 36, x2: t === 'base' ? BASE_X : t.x, y2: GY - 50, life: 0.25, side: u.side, big: true });
      });
      return;
    }
    if (d.splash) {
      s.fx.push({ k: 'shot', x1: u.x, y1: GY - d.h * 0.7, x2: tx, y2: ty, life: 0.2, side: u.side });
      s.fx.push({ k: 'boom', x: tx, y: ty, r: d.splash, life: 0.35 });
      damage(s, target, dmg);
      enemiesOf(s, u).forEach(o => { if (o !== target && Math.abs(o.x - tx) <= d.splash) damage(s, o, dmg * 0.6); });
      return;
    }
    if (d.stun && target !== 'base') target.cd = Math.max(target.cd, d.stun); // no stacking (prevents stun-lock)
    damage(s, target, dmg);
    if (ranged) s.fx.push({ k: 'shot', x1: u.x + dir * 30, y1: GY - d.h * 0.6, x2: tx, y2: ty, life: 0.18, side: u.side });
    else s.fx.push({ k: 'hit', x: tx, y: ty, life: 0.2 });
    if (d.stun) s.fx.push({ k: 'zap', x: tx, y: ty, life: 0.25 });
  }

  function spawnWave(s) {
    const w = s.waveIdx;
    const pool = PLAYABLE.slice(0, Math.min(2 + w, PLAYABLE.length));
    const n = 2 + w + (w >= 3 ? 1 : 0);
    for (let i = 0; i < n; i++) s.queue.push(pool[Math.floor(s.rng() * pool.length)]);
  }

  function step(s, dt) {
    if (s.over) return;
    s.t += dt;
    s.energy = Math.min(ENERGY_MAX, s.energy + 13 * dt);
    if (s.banner) { s.banner.life -= dt; if (s.banner.life <= 0) s.banner = null; }

    // --- waves & boss ---
    if (s.waveIdx < WAVES) {
      s.waveTimer -= dt;
      if (s.waveTimer <= 0) {
        spawnWave(s);
        s.waveIdx++;
        s.waveTimer = 9;
        if (s.waveIdx < WAVES) s.banner = { text: `第 ${s.waveIdx + 1} 波来了！`, life: 2.2 };
      }
    } else if (!s.bossSpawned) {
      s.waveTimer -= dt;
      if (s.waveTimer <= 0) {
        s.bossSpawned = true;
        addUnit(s, 'red', 'tower_tank', W + 80);
        s.banner = { text: '⚠ 塔楼重坦 Boss 来了！', life: 3.5 };
      }
    } else {
      s.trickle -= dt;
      if (s.trickle <= 0) { s.trickle = 6; s.queue.push(PLAYABLE[Math.floor(s.rng() * 4)]); }
    }
    s.queueTimer -= dt;
    if (s.queue.length && s.queueTimer <= 0) {
      addUnit(s, 'red', s.queue.shift(), W - 40);
      s.queueTimer = 0.8;
    }

    // --- hazards ---
    s.eventTimer -= dt;
    if (s.eventTimer <= 0) {
      s.eventTimer = 18 + s.rng() * 8;
      const kind = ['monster_mouth', 'spiky_sun', 'rock'][Math.floor(s.rng() * 3)];
      s.hazards.push({ kind: kind === 'rock' ? 'rock' : kind, x: 300 + s.rng() * 360, life: kind === 'monster_mouth' ? 7 : 8, tick: 1 });
    }
    for (const h of s.hazards) {
      h.life -= dt;
      if (h.kind === 'rock') continue;
      h.tick -= dt;
      if (h.tick <= 0) {
        h.tick = 1;
        const rad = h.kind === 'monster_mouth' ? 45 : 55;
        const dmg = h.kind === 'monster_mouth' ? 45 : 22;
        for (const u of s.units) {
          if (u.dead || Math.abs(u.x - h.x) > rad) continue;
          if (UNITS[u.type].boss) damage(s, u, dmg * 0.45); else damage(s, u, dmg);
          s.fx.push({ k: 'hit', x: u.x, y: GY - 50, life: 0.2 });
        }
      }
    }
    s.hazards = s.hazards.filter(h => h.life > 0);

    // --- units ---
    for (const u of s.units) {
      if (u.dead) continue;
      const d = UNITS[u.type];
      const dir = u.side === 'blue' ? 1 : -1;
      u.cd -= dt; u.flash = Math.max(0, u.flash - dt);
      u.moving = false;
      // pick target: nearest enemy unit in range, else enemy base
      let target = null, best = Infinity;
      for (const o of s.units) {
        if (o.dead || o.side === u.side) continue;
        const dist = Math.abs(o.x - u.x);
        if (dist <= d.range && dist < best) { best = dist; target = o; }
      }
      if (d.boss && u.x > W - 150) target = null; // the Boss walks fully on screen first
      else if (!target && u.side === 'red' && u.x - BASE_X <= d.range) target = 'base';
      if (target) {
        if (u.cd <= 0) { attack(s, u, target); u.cd = d.cd; }
        continue;
      }
      // move, but don't stack on an ally just ahead
      const blocked = s.units.some(o => o !== u && !o.dead && o.side === u.side && (o.x - u.x) * dir > 0 && (o.x - u.x) * dir < 34);
      if (!blocked) {
        u.x += dir * d.speed * dt;
        u.moving = true;
        if (u.side === 'blue') u.x = Math.min(u.x, W - 120);
        else u.x = Math.max(u.x, BASE_X + 30);
      }
    }
    for (const u of s.units) if (u.dead) s.fx.push({ k: 'puff', x: u.x, y: GY - 40, life: 0.5 });
    s.units = s.units.filter(u => !u.dead);

    for (const f of s.fx) f.life -= dt;
    s.fx = s.fx.filter(f => f.life > 0);

    // --- win / lose ---
    if (s.bossSpawned && (!s.boss || s.boss.dead || !s.units.includes(s.boss))) s.over = 'win';
    else if (s.baseHp <= 0) { s.baseHp = 0; s.over = 'lose'; }
  }

  const api = { W, GY, BASE_X, ENERGY_MAX, UNITS, PLAYABLE, WAVES, makeState, deploy, step, collectRock, addUnit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Core = api;
})(typeof window !== 'undefined' ? window : globalThis);

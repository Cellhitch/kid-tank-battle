/* Rendering + input for Kid Tank Battle. Rules live in game-core.js. */
(function () {
  const C = window.Core;
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const IMG = {};
  const names = [...C.PLAYABLE, 'tower_tank', 'spiky_sun', 'monster_mouth', 'spotted_rock'];
  let loaded = 0;
  names.forEach(n => ['blue', 'red'].forEach(side => {
    const im = new Image(); im.onload = () => loaded++; im.src = `assets/${n}_${side}.svg`; IMG[n + '_' + side] = im;
  }));

  let s = C.makeState(Date.now() & 0xffff), running = false, last = 0;

  /* --- deck buttons --- */
  const deck = $('deck');
  C.PLAYABLE.forEach((t, i) => {
    const d = C.UNITS[t];
    const b = document.createElement('button');
    b.className = 'card'; b.dataset.t = t;
    b.innerHTML = `<span class="key">${i + 1}</span><img src="assets/${t}_blue.svg" alt=""><b>${d.name}</b><small>⚡${d.cost}</small>`;
    b.title = d.desc;
    b.addEventListener('click', () => { if (running) C.deploy(s, t); });
    deck.appendChild(b);
  });
  addEventListener('keydown', e => {
    const i = '123456'.indexOf(e.key);
    if (i >= 0 && running) C.deploy(s, C.PLAYABLE[i]);
  });

  /* --- rock pickup --- */
  cv.addEventListener('pointerdown', e => {
    if (!running) return;
    const r = cv.getBoundingClientRect();
    C.collectRock(s, (e.clientX - r.left) / r.width * C.W);
  });

  function start() {
    s = C.makeState(Date.now() & 0xffff); running = true; last = performance.now();
    $('title').hidden = true; $('end').hidden = true;
    requestAnimationFrame(loop);
  }
  $('startBtn').onclick = start; $('againBtn').onclick = start;

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    C.step(s, dt);
    draw(now / 1000); hud();
    if (s.over) {
      running = false;
      const win = s.over === 'win';
      $('endTitle').textContent = win ? '🎉 胜利！' : '💥 基地被攻破了';
      $('endSub').textContent = win ? `你打败了塔楼重坦 Boss！用时 ${Math.round(s.t)} 秒` : '再试一次，试试多派几个炮坦克和巨人！';
      $('end').hidden = false;
      return;
    }
    requestAnimationFrame(loop);
  }

  function hud() {
    $('energyBar').style.width = (s.energy / C.ENERGY_MAX * 100) + '%';
    $('baseBar').style.width = Math.max(0, s.baseHp / s.baseMax * 100) + '%';
    $('waveLbl').textContent = s.bossSpawned ? 'Boss 战！' : `第 ${Math.min(s.waveIdx + 1, C.WAVES)} / ${C.WAVES} 波`;
    deck.querySelectorAll('.card').forEach(b => b.classList.toggle('poor', s.energy < C.UNITS[b.dataset.t].cost));
    $('bossHud').hidden = !(s.boss && s.units.includes(s.boss));
    if (s.boss) $('bossBar').style.width = Math.max(0, s.boss.hp / s.boss.maxHp * 100) + '%';
  }

  /* --- drawing --- */
  const stars = Array.from({ length: 40 }, (_, i) => ({ x: (i * 241) % 960, y: 12 + (i * 97) % 170, r: 2 + (i % 3) }));
  function sprite(type, side, x, h, flash, bob) {
    const im = IMG[type + '_' + side];
    if (!im || !im.complete || !im.naturalWidth) return;
    const w = h * (260 / 280) * 1.0; const hh = h / 0.88 * 1.0; // svg viewBox 260x280, ground at 88%
    const dh = hh * 1.3, dw = dh * (260 / 280);
    ctx.save();
    ctx.translate(x, C.GY + 6 - dh * 0.88 + (bob || 0));
    if (side === 'red') ctx.scale(-1, 1);
    if (flash > 0) ctx.globalAlpha = 0.55;
    ctx.drawImage(im, -dw / 2, 0, dw, dh);
    ctx.restore();
  }
  function bar(x, y, w, f, col) {
    ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, 9);
    ctx.fillStyle = '#26305a'; ctx.fillRect(x - w / 2, y, w, 5);
    ctx.fillStyle = col; ctx.fillRect(x - w / 2, y, w * Math.max(0, f), 5);
  }
  function draw(t) {
    const g = ctx.createLinearGradient(0, 0, 0, C.GY);
    g.addColorStop(0, '#0b1026'); g.addColorStop(1, '#2a3a6e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = '#f5e9a8';                                  // moon
    ctx.beginPath(); ctx.arc(120, 80, 34, 0, 7); ctx.fill();
    ctx.fillStyle = '#12204a'; ctx.beginPath(); ctx.arc(136, 70, 30, 0, 7); ctx.fill();
    stars.forEach((st, i) => { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); ctx.fillStyle = '#fff'; ctx.fillRect(st.x, st.y, st.r, st.r); });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e9e4d2'; ctx.fillRect(0, C.GY + 4, 960, 100);   // paper ground
    ctx.fillStyle = '#000'; ctx.fillRect(0, C.GY, 960, 8);
    // base
    ctx.fillStyle = '#3a6ea5'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
    ctx.fillRect(18, C.GY - 90, 44, 90); ctx.strokeRect(18, C.GY - 90, 44, 90);
    ctx.fillStyle = '#fff'; ctx.fillRect(36, C.GY - 128, 5, 40); ctx.fillStyle = '#3a6ea5'; ctx.fillRect(41, C.GY - 128, 26, 16);
    // hazards
    for (const h of s.hazards) {
      const nm = { monster_mouth: 'monster_mouth', spiky_sun: 'spiky_sun', rock: 'spotted_rock' }[h.kind];
      const im = IMG[nm + '_blue'];
      const pulse = h.kind === 'rock' ? 1 + 0.08 * Math.sin(t * 6) : 1;
      if (im && im.complete) ctx.drawImage(im, h.x - 45 * pulse, C.GY - 90 * pulse + (h.kind === 'spiky_sun' ? -30 : 0), 90 * pulse, 97 * pulse);
      if (h.kind === 'rock') { ctx.fillStyle = '#f5c542'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('点我 +⚡', h.x, C.GY - 100); }
    }
    // units (back to front by y irrelevant; sort by x)
    for (const u of s.units) {
      const d = C.UNITS[u.type];
      const bob = u.moving ? Math.sin(t * 9 + u.id) * 2 : 0;
      sprite(u.type, u.side, u.x, d.h, u.flash, bob);
      bar(u.x, C.GY - d.h * 1.3 - (d.boss ? 6 : 12), d.boss ? 120 : 44, u.hp / u.maxHp, u.side === 'blue' ? '#5aa0e6' : '#e0584a');
    }
    // fx
    for (const f of s.fx) {
      const a = Math.min(1, f.life * 4);
      ctx.globalAlpha = a;
      if (f.k === 'shot') { ctx.strokeStyle = f.big ? '#ff8a3d' : (f.side === 'blue' ? '#9fd0ff' : '#ffb3a8'); ctx.lineWidth = f.big ? 8 : 4; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); }
      else if (f.k === 'boom') { ctx.fillStyle = '#ffb03d'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.2 - f.life), 0, 7); ctx.fill(); }
      else if (f.k === 'hit') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, 14, 0, 7); ctx.fill(); }
      else if (f.k === 'zap') { ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(f.x - 10, f.y - 60); ctx.lineTo(f.x + 8, f.y - 25); ctx.lineTo(f.x - 8, f.y - 20); ctx.lineTo(f.x + 6, f.y + 10); ctx.stroke(); }
      else if (f.k === 'puff') { ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(f.x, f.y - (0.5 - f.life) * 40, 22 * (1.5 - f.life), 0, 7); ctx.fill(); }
      else if (f.k === 'text') { ctx.fillStyle = '#f5c542'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(f.text, f.x, f.y - (1 - f.life) * 40); }
      ctx.globalAlpha = 1;
    }
    if (s.banner) {
      ctx.globalAlpha = Math.min(1, s.banner.life);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 190, 960, 70);
      ctx.fillStyle = s.banner.text.startsWith('⚠') ? '#ff6a5a' : '#fff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.banner.text, 480, 238); ctx.globalAlpha = 1;
    }
  }
  window.__game = { get state() { return s; }, Core: C };
  draw(0);
})();

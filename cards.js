/* UI for the card game. Rules live in cards-core.js. */
(function () {
  const K = window.Cards, $ = id => document.getElementById(id);
  let s = null, sel = null, busy = false, toastTimer = null;
  const art = (key, side) => `assets/${key}_${side === 'e' ? 'red' : 'blue'}.svg`;

  /* ---------- rendering ---------- */
  function targetRefs() {
    const out = new Set();
    if (!sel || !s) return out;
    if (sel.mode === 'attack') {
      const a = s.p.board.find(m => m.id === sel.id);
      if (a) K.legalAttackTargets(s, 'p', a).forEach(t => out.add(t === 'hero' ? 'h:e' : 'm:' + t));
    } else if (sel.mode === 'spell') s.e.board.forEach(m => out.add('m:' + m.id));
    else if (sel.mode === 'power') { out.add('h:e'); s.e.board.forEach(m => out.add('m:' + m.id)); }
    return out;
  }

  function minionHTML(m, side, targets) {
    const d = K.CARDS[m.key], ref = 'm:' + m.id;
    const cls = ['minion', side === 'p' ? 'mine' : 'foe'];
    if (m.taunt) cls.push('taunt');
    if (m.frozen) cls.push('frozen');
    if (side === 'p' && K.canAttack(s, 'p', m)) cls.push('ready');
    if (sel && sel.mode === 'attack' && sel.id === m.id) cls.push('selected');
    if (targets.has(ref)) cls.push('target');
    const tag = m.frozen ? '❄ 冻结' : m.taunt ? '🛡 嘲讽' : m.flying ? '✈ 飞行' : m.charge ? '⚡ 冲锋' : '';
    return `<div class="${cls.join(' ')}" data-ref="${ref}">${tag ? `<span class="tag">${tag}</span>` : ''}
      <img src="${art(m.key, side)}" class="${side === 'e' ? 'flip' : ''}" alt=""><div class="nm">${d.name}</div>
      <span class="badge a">${m.atk}</span><span class="badge h ${m.hp < m.maxHp ? 'dmg' : ''}">${m.hp}</span></div>`;
  }

  function cardHTML(c) {
    const d = K.CARDS[c.key];
    const playable = s.turn === 'p' && !busy && K.canPlay(s, 'p', c.uid);
    const cls = ['card', d.type === 'spell' ? 'spell' : 'minion'];
    if (playable) cls.push('playable'); else if (s.p.mana < d.cost) cls.push('poor');
    if (sel && sel.mode === 'spell' && sel.uid === c.uid) cls.push('selected');
    return `<div class="${cls.join(' ')}" data-uid="${c.uid}"><span class="cost">${d.cost}</span>
      <img src="${art(c.key, 'p')}" alt=""><div class="nm">${d.name}</div><div class="tx">${d.text}</div>
      ${d.type === 'minion' ? `<span class="badge a">${d.atk}</span><span class="badge h">${d.hp}</span>` : ''}</div>`;
  }

  const crystals = side => { const m = s[side]; return `⚡ ${m.mana}/${m.maxMana}`; };

  function render() {
    const targets = targetRefs();
    $('eHp').textContent = Math.max(0, s.e.hp); $('pHp').textContent = Math.max(0, s.p.hp);
    $('eMana').textContent = crystals('e'); $('pMana').textContent = crystals('p');
    $('eCards').textContent = `🃏 手牌 ${s.e.hand.length}`;
    $('pDeck').textContent = '手牌至少 3 张';
    $('enemyHero').classList.toggle('target', targets.has('h:e'));
    $('enemyBoard').innerHTML = s.e.board.map(m => minionHTML(m, 'e', targets)).join('');
    $('playerBoard').innerHTML = s.p.board.map(m => minionHTML(m, 'p', targets)).join('');
    $('hand').innerHTML = s.p.hand.map(cardHTML).join('');
    const myTurn = s.turn === 'p' && !busy && !s.over;
    $('powerBtn').disabled = !(myTurn && K.canPower(s, 'p'));
    $('powerBtn').classList.toggle('sel', !!sel && sel.mode === 'power');
    $('endBtn').disabled = !myTurn;
    const nothingLeft = myTurn && !s.p.hand.some(c => K.canPlay(s, 'p', c.uid)) && !s.p.board.some(m => K.canAttack(s, 'p', m));
    $('endBtn').classList.toggle('glow', nothingLeft);
    $('hint').textContent = hint(myTurn, nothingLeft);
    playEvents();
    if (s.over && $('end').hidden) setTimeout(showEnd, 900);
  }

  function hint(myTurn, nothingLeft) {
    if (s.over) return s.over === 'win' ? '你赢了！' : '你输了…';
    if (!myTurn) return 'Boss 的回合，看它怎么出牌…';
    if (sel) return sel.mode === 'attack' ? '选一个要打的敌人（红框）· 点空白处取消'
      : sel.mode === 'spell' ? '选一个敌方随从（红框）· 点空白处取消' : '选一个目标（红框）· 点空白处取消';
    if (nothingLeft) return '没事可做啦，点「结束回合」';
    if (s.p.hand.some(c => K.canPlay(s, 'p', c.uid))) return '你的回合：点亮绿框的手牌来打出它';
    if (s.p.board.some(m => K.canAttack(s, 'p', m))) return '点一个绿框随从，再点要攻击的敌人';
    return '能量不够出牌，点「结束回合」';
  }

  function playEvents() {
    const evs = s.events; s.events = [];
    for (const e of evs) {
      const sel1 = r => document.querySelector(`[data-ref="${r}"]`);
      if (e.k === 'heal') {
        const el = sel1(e.ref === 'hero' ? 'h:' + e.side : 'm:' + e.ref);
        if (el) { const f = document.createElement('span'); f.className = 'float heal'; f.textContent = '+' + e.n; el.appendChild(f); setTimeout(() => f.remove(), 900); }
      } else if (e.k === 'dmg') {
        const el = sel1(e.ref === 'hero' ? 'h:' + e.side : 'm:' + e.ref);
        if (el) { const f = document.createElement('span'); f.className = 'float'; f.textContent = '-' + Math.min(e.n, 99); el.appendChild(f); el.classList.add('shake'); setTimeout(() => { f.remove(); el.classList.remove('shake'); }, 900); }
      } else if (e.k === 'attack') {
        const el = sel1('m:' + e.ref); if (el) el.classList.add(e.side === 'p' ? 'lunge-up' : 'lunge-down');
      } else if (e.k === 'summon') {
        const el = sel1('m:' + e.ref); if (el) el.classList.add('pop');
      }
    }
  }

  function toast(text) {
    $('toast').textContent = text; clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').textContent = ''; }, 2600);
  }

  /* ---------- player input ---------- */
  function onClick(e) {
    if (busy || s.over || s.turn !== 'p') return;
    const handEl = e.target.closest('.card[data-uid]');
    const refEl = e.target.closest('[data-ref]');
    if (handEl) return clickCard(Number(handEl.dataset.uid));
    if (e.target.closest('#powerBtn')) {
      if (K.canPower(s, 'p')) { sel = sel && sel.mode === 'power' ? null : { mode: 'power' }; render(); }
      return;
    }
    if (sel && refEl && targetRefs().has(refEl.dataset.ref)) return clickTarget(refEl.dataset.ref);
    if (refEl && refEl.dataset.ref.startsWith('m:')) {
      const id = Number(refEl.dataset.ref.slice(2)), m = s.p.board.find(x => x.id === id);
      if (m) {
        if (K.canAttack(s, 'p', m)) { sel = sel && sel.id === id ? null : { mode: 'attack', id }; render(); }
        else toast(m.frozen ? '它被冻住了，这回合不能攻击' : m.attacked ? '它这回合已经攻击过了' : m.atk === 0 ? '它没有攻击力，只能当盾牌' : '刚出场的随从要等下回合才能攻击');
        return;
      }
    }
    if (!e.target.closest('button')) { sel = null; render(); }
  }

  function clickCard(uid) {
    const c = s.p.hand.find(h => h.uid === uid), d = K.CARDS[c.key];
    if (sel && sel.mode === 'spell' && sel.uid === uid) { sel = null; return render(); }
    sel = null;
    if (!K.canPlay(s, 'p', uid)) {
      toast(d.cost > s.p.mana ? `能量不够：需要 ⚡${d.cost}，你有 ⚡${s.p.mana}` : d.type === 'minion' ? '战场满了（最多 6 个）' : '没有可以吃掉的敌方随从');
      return render();
    }
    if (d.target === 'enemyMinion') { sel = { mode: 'spell', uid }; return render(); }
    K.playCard(s, 'p', uid); render();
  }

  function clickTarget(ref) {
    const t = ref === 'h:e' ? 'hero' : Number(ref.slice(2));
    if (sel.mode === 'attack') K.attack(s, 'p', sel.id, t);
    else if (sel.mode === 'spell') K.playCard(s, 'p', sel.uid, t);
    else if (sel.mode === 'power') K.heroPower(s, 'p', t);
    sel = null; render();
  }

  /* ---------- Boss turn ---------- */
  function endMyTurn() {
    if (busy || s.over || s.turn !== 'p') return;
    sel = null; K.endTurn(s); busy = true; render();
    setTimeout(bossStep, 800);
  }
  function bossStep() {
    if (s.over) { busy = false; return render(); }
    const act = K.aiAct(s, 'e');
    if (act) {
      toast('Boss：' + s.log[s.log.length - 1]);
      render(); setTimeout(bossStep, 1000);
    } else {
      K.endTurn(s); busy = false; render();
      toast('轮到你了！');
    }
  }

  function showEnd() {
    const win = s.over === 'win';
    $('endTitle').textContent = win ? '🎉 你赢了！' : '💥 你输了';
    $('endSub').textContent = win ? `你打败了塔楼重坦 Boss！用了 ${Math.ceil(s.turnNo / 2)} 个回合` : '别灰心，再来一局！试试用嘲讽随从保护自己。';
    $('end').hidden = false;
  }

  function start() {
    s = K.newGame((Date.now() & 0xffff) + 1); sel = null; busy = false;
    $('title').hidden = true; $('end').hidden = true; $('toast').textContent = '';
    render(); toast('你先手！');
  }

  $('app').addEventListener('click', onClick);
  $('endBtn').addEventListener('click', endMyTurn);
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  $('rulesBtn').addEventListener('click', () => { $('title').hidden = false; $('startBtn').textContent = '继续游戏'; });
  window.__cards = { get state() { return s; }, K };
  s = K.newGame(1); render();
})();

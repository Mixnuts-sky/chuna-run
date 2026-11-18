'use strict';
// =====================================================================
//  ちゅなランド：トップ・もんだい ダンジョン・ガチャ・ずかん・きせかえ・けん
// =====================================================================

const SFXL = {
  ok: () => [784, 1047, 1319].forEach((f, i) => note(f, i * 0.07, 0.14, { type: 'square', vol: 0.05 })),
  ng: () => note(196, 0, 0.3, { type: 'sawtooth', vol: 0.05, slide: 0.7 }),
  chest: () => [523, 784, 1047, 1568].forEach((f, i) => note(f, i * 0.08, 0.18, { type: 'triangle', vol: 0.07 })),
  turn: () => [300, 340, 300, 340].forEach((f, i) => note(f, i * 0.09, 0.08, { type: 'square', vol: 0.04 })),
  fan: () => [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => note(f, i * 0.09, 0.25, { type: 'square', vol: 0.06 })),
};

// ---------------------------------------------------------------------
//  トップ
// ---------------------------------------------------------------------
function toLand() {
  if (!G || !G.demo) newRun(SAVE.chara, true);
  refreshWallet();
  show('land');
}
function refreshWallet() {
  $('wCoins').textContent = LAND.coins;
  $('wPoints').textContent = LAND.points;
  const n = LAND.tickets.filter((t) => !t.used).length;
  $('tkBadge').hidden = !n; $('tkBadge').textContent = n;
}
$('goRun').addEventListener('click', () => { audio(); SFX.pop(); toTitle(); });
$('runHome').addEventListener('click', () => { SFX.pop(); toLand(); });
$('goDg').addEventListener('click', () => { audio(); SFX.pop(); openDgEntry(); });
$('goGacha').addEventListener('click', () => { audio(); SFX.pop(); openGacha(); });
$('goZukan').addEventListener('click', () => { audio(); SFX.pop(); openZukan(); });
$('goWear').addEventListener('click', () => { audio(); SFX.pop(); openWear(); });
$('goTickets').addEventListener('click', () => { audio(); SFX.pop(); openTickets(); });
$('goMap').addEventListener('click', () => { audio(); SFX.pop(); location.href = 'map.html'; });

// ---------------------------------------------------------------------
//  もんだい ダンジョン
// ---------------------------------------------------------------------
const DG = { fee: 30, floors: 10, chestEvery: 3, hearts: 3, sel: { subj: 'math', diff: 'easy' } };
const DG_MON = [ // なんかい め に でる モンスター
  { img: 'grape', name: 'ぐれーぷすらいむ' }, { img: 'weo', name: 'うぇーおー' }, { img: 'weo', name: 'ピンク うぇーおー', tint: 'hue-rotate(290deg)' },
  { img: 'family', name: '3にんかぞく すらいむ' }, { img: 'weo', name: 'みずいろ うぇーおー', tint: 'hue-rotate(160deg)' }, { img: 'shima', name: 'しまじろう' },
  { img: 'grape', name: 'つよい ぐれーぷ', tint: 'saturate(1.6) brightness(.85)' }, { img: 'siren', name: 'セイレーン' }, { img: 'ningyo', name: 'にんぎょ' },
];
function openDgEntry() {
  const s = DG.sel;
  if (s.diff === 'main' && s.subj !== 'kanji') s.diff = 'easy';
  $('dgSubj').innerHTML = Object.entries(SUBJECTS).map(([k, v]) => `<button type="button" class="pk${k === s.subj ? ' on' : ''}" data-k="${k}"><i>${v.icon}</i>${v.name}</button>`).join('');
  const diffs = Object.entries(DIFFS).filter(([k]) => k !== 'main' || s.subj === 'kanji');
  $('dgDiff').innerHTML = diffs.map(([k, v]) => `<button type="button" class="pk sm${k === s.diff ? ' on' : ''}" data-k="${k}">${v.name}<small>せいかい ⭐${v.pt}</small></button>`).join('');
  $('dgSubj').querySelectorAll('.pk').forEach((b) => b.addEventListener('click', () => { s.subj = b.dataset.k; SFX.pop(); openDgEntry(); }));
  $('dgDiff').querySelectorAll('.pk').forEach((b) => b.addEventListener('click', () => { s.diff = b.dataset.k; SFX.pop(); openDgEntry(); }));
  const free = LAND.dgFree, can = free || LAND.coins >= DG.fee;
  $('dgFee').innerHTML = free ? '🎉 はじめて は ただ で はいれる よ！'
    : `はいる のに 🪙 ${DG.fee} コイン（いま ${LAND.coins} コイン）${can ? '' : '<br><b class="warn">コイン が たりない よ。ラン で あつめて きてね！</b>'}`;
  $('dgEnter').disabled = !can;
  const best = LAND.dgBest[`${s.subj}|${s.diff}`];
  if (best) $('dgFee').innerHTML += `<div class="dg-best">いままで の さいこう：${best}かい</div>`;
  if (UI.scr !== 'dgEntry') show('dgEntry');
}
$('dgEntryBack').addEventListener('click', () => { SFX.pop(); toLand(); });
$('dgEnter').addEventListener('click', () => startDungeon());

let D = null;
function startDungeon() {
  const { subj, diff } = DG.sel;
  if (!LAND.dgFree && LAND.coins < DG.fee) return;
  if (LAND.dgFree) LAND.dgFree = false; else LAND.coins -= DG.fee;
  writeLand();
  // メイン かんじ：ぜんぶ を 1かい ずつ（まちがえた もの は あと で もういちど）。つづき は つぎ の ダンジョン へ
  let mainQ = null;
  if (diff === 'main') {
    const all = KLIST.filter((k) => k.level === 'main').map((k) => k.word);
    if (!LAND.mainLeft || !LAND.mainLeft.length) LAND.mainLeft = shuffle(all.slice());
    mainQ = LAND.mainLeft;
  }
  D = { subj, diff, floor: 1, hp: DG.hearts, pts: 0, coins: 0, ok: 0, ng: 0, mon: null, busy: false, mainQ };
  SFX.special();
  show('dg');
  nextFloor();
}
function nextFloor() {
  const boss = D.floor === DG.floors;
  const m = boss ? { img: 'boss', name: 'らすぼす どらぎょ' } : DG_MON[(D.floor - 1 + irnd(0, 1)) % DG_MON.length];
  D.mon = { ...m, hp: boss ? 3 : 1, max: boss ? 3 : 1, boss };
  $('dgChest').hidden = true;
  const img = $('dgMonImg');
  img.src = `img/${m.img}.png`;
  img.style.filter = m.tint || '';
  $('dgMon').className = `dg-mon in${boss ? ' boss' : ''}`;
  $('dgMonName').textContent = m.name;
  renderDgTop();
  askDg();
}
function renderDgTop() {
  $('dgFloor').textContent = D.floor === DG.floors ? '🐉 さいご の かい' : `${D.floor}かい / ${DG.floors}`;
  $('dgHearts').innerHTML = Array.from({ length: DG.hearts }, (_, i) => `<span class="${i < D.hp ? '' : 'off'}">❤</span>`).join('');
  $('dgPts').innerHTML = `⭐ ${D.pts}　🪙 ${D.coins}`;
  $('dgMonHp').innerHTML = D.mon && D.mon.max > 1 ? Array.from({ length: D.mon.max }, (_, i) => `<i class="${i < D.mon.hp ? 'on' : ''}"></i>`).join('') : '';
}
function askDg() {
  let entry = null;
  if (D.mainQ && D.mainQ.length) entry = KLIST.find((k) => k.word === D.mainQ[0] && k.level === 'main');
  const q = makeQuestion(D.subj, D.diff, entry);
  D.q = q; D.busy = false;
  $('dgPrompt').innerHTML = q.html + (D.mainQ ? `<span class="q-tag">メイン かんじ のこり ${D.mainQ.length}</span>` : '');
  $('dgSay').hidden = !q.speak;
  $('dgOpts').className = `dg-opts${q.pic ? ' pic' : ''}${q.eng ? ' eng' : ''}`;
  $('dgOpts').innerHTML = q.opts.map((o, i) => `<button type="button" class="opt" data-i="${i}">${o}</button>`).join('');
  $('dgOpts').querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => answerDg(+b.dataset.i, b)));
  $('dgQ').classList.remove('hide');
  if (q.speak && (q.auto || q.eng)) setTimeout(() => q.speak(), 300);
}
$('dgSay').addEventListener('click', () => { audio(); if (D && D.q && D.q.speak) D.q.speak(); });
function pop(text, cls = '') {
  const p = $('dgPop');
  p.className = `dg-pop ${cls}`; p.textContent = text;
  void p.offsetWidth; p.classList.add('show');
}
function answerDg(i, btn) {
  if (!D || D.busy) return;
  D.busy = true;
  const q = D.q, good = i === q.ans, opts = $('dgOpts').querySelectorAll('.opt');
  opts[q.ans].classList.add('right');
  if (good) {
    const pt = DIFFS[D.diff].pt * (D.mon.boss ? 2 : 1);
    D.pts += pt; D.ok++;
    if (D.mainQ) D.mainQ.shift();
    SFXL.ok();
    pop(`せいかい！ ⭐＋${pt}`, 'good');
    D.mon.hp--;
    $('dgMon').classList.add('hit');
    setTimeout(() => $('dgMon').classList.remove('hit'), 300);
    renderDgTop();
    if (D.mon.hp > 0) { setTimeout(askDg, 1000); return; }
    setTimeout(() => {
      $('dgMon').className = 'dg-mon out';
      $('dgQ').classList.add('hide');
      if (D.mon.boss) { setTimeout(() => endDungeon(true), 900); return; }
      if (D.floor % DG.chestEvery === 0) { setTimeout(() => { $('dgChest').hidden = false; $('dgChest').className = 'dg-chest'; }, 500); return; }
      setTimeout(() => { D.floor++; nextFloor(); }, 700);
    }, 800);
  } else {
    btn.classList.add('wrong');
    D.ng++; D.hp--;
    if (D.mainQ && D.mainQ.length > 1) D.mainQ.push(D.mainQ.shift()); // まちがえた かんじ は あと で もういちど
    SFXL.ng();
    pop(`ざんねん！ こたえ は「${q.opts[q.ans]}」`, 'bad');
    if (q.word && q.say) { /* かんじ：こたえ を みせる だけ */ }
    $('scrDg').classList.add('shake'); setTimeout(() => $('scrDg').classList.remove('shake'), 400);
    renderDgTop();
    setTimeout(() => (D.hp <= 0 ? endDungeon(false) : askDg()), 1700);
  }
  writeLand();
}
$('dgChest').addEventListener('click', () => {
  if (!D || $('dgChest').classList.contains('open')) return;
  const c = irnd(8, 14) + D.floor;
  D.coins += c;
  $('dgChest').classList.add('open');
  SFXL.chest();
  pop(`たからばこ！ 🪙＋${c}`, 'good');
  renderDgTop();
  setTimeout(() => { D.floor++; nextFloor(); }, 1300);
});
$('dgQuit').addEventListener('click', () => { if (D && confirm('ダンジョン から かえる？（もらった ポイント は もって かえれる よ）')) endDungeon(false, true); });
function endDungeon(clear, quit = false) {
  if (!D || D.ended) return;
  D.ended = true;
  let bonus = 0;
  if (clear) { bonus = 30 + DIFFS[D.diff].pt * 10; D.coins += bonus; }
  LAND.points += D.pts;
  LAND.coins += D.coins;
  const key = `${D.subj}|${D.diff}`, reached = clear ? DG.floors : D.floor - (quit ? 1 : 0);
  LAND.dgBest[key] = Math.max(LAND.dgBest[key] || 0, reached);
  if (D.mainQ && !D.mainQ.length) LAND.mainLeft = null;
  writeLand();
  (clear ? SFX.win : SFX.over)();
  $('dgEndTitle').textContent = clear ? '🎉 ダンジョン クリア！' : quit ? 'かえって きた よ' : 'ハート が なくなった……';
  $('dgEndStats').innerHTML = `<div class="st"><small>すすんだ かい</small><b>${reached}かい</b></div>
    <div class="st"><small>せいかい</small><b>${D.ok}もん</b></div>
    <div class="st main"><small>もらった ポイント</small><b>⭐ ${D.pts}</b></div>
    <div class="st"><small>もらった コイン</small><b>🪙 ${D.coins}</b></div>
    ${D.mainQ && !D.mainQ.length ? '<div class="st main"><small>メイン かんじ</small><b>ぜんぶ できた！</b></div>' : ''}
    <div class="st"><small>いま の ポイント</small><b>⭐ ${LAND.points}</b></div>`;
  show('dgEnd');
}
$('dgEndGacha').addEventListener('click', () => { SFX.pop(); openGacha(); });
$('dgEndLand').addEventListener('click', () => { SFX.pop(); toLand(); });

// ---------------------------------------------------------------------
//  ガチャ
// ---------------------------------------------------------------------
function openGacha() {
  $('gPts').textContent = LAND.points;
  $('gStamp').textContent = LAND.stamps;
  $('gStampBar').style.width = `${(LAND.stamps / GACHA.ceil) * 100}%`;
  $('gPull1').disabled = LAND.points < GACHA.cost;
  $('gPull10').disabled = LAND.points < GACHA.cost * 10;
  $('slot').innerHTML = LAND.points < GACHA.cost ? '<small>ポイント は もんだい ダンジョン で もらえる よ</small>' : '';
  show('gacha');
}
$('gBack').addEventListener('click', () => { SFX.pop(); toLand(); });
$('gOdds').addEventListener('click', () => {
  alert(`かくりつ\n\n🧸 めっっちゃ おおあたり（おもちゃ）0.5%\n👗 おおあたり（ふく）0.5%\n📚 おおあたり（ほん）0.5%\n🍬 あたり（おかし）5%\n🎀 きせかえ 15%\n🌟 キラキラ シール 10%\n🏷️ シール 68.5%\n\nスタンプ が ${GACHA.ceil}こ たまる と おもちゃ かくてい！`);
});
let pulling = false;
function doPull(n) {
  if (pulling || LAND.points < GACHA.cost * n) return;
  pulling = true; audio();
  const res = [];
  for (let i = 0; i < n; i++) res.push(pullOnce());
  // いちばん いい もの で カプセル の いろ を きめる
  const rank = (r) => (r.kind === 'toy' ? 4 : r.kind === 'clothes' || r.kind === 'book' ? 3 : r.kind === 'snack' ? 2 : r.kind === 'wear' || r.kind === 'rare' ? 1 : 0);
  const top = Math.max(...res.map(rank));
  const cap = ['#9ad0ff', '#c79bff', '#ffd84a', 'rainbow', 'rainbow'][top];
  $('machine').classList.add('turn');
  SFXL.turn();
  $('slot').innerHTML = `<div class="capsule${cap === 'rainbow' ? ' rainbow' : ''}" style="${cap === 'rainbow' ? '' : `background:linear-gradient(180deg,${cap} 50%,#fff 50%)`}"></div>`;
  setTimeout(() => {
    $('machine').classList.remove('turn');
    showResults(res, top);
    pulling = false;
  }, top >= 3 ? 2200 : 1300);
}
$('gPull1').addEventListener('click', () => doPull(1));
$('gPull10').addEventListener('click', () => doPull(10));
function resCard(r) {
  if (TICKETS[r.kind]) {
    const T = TICKETS[r.kind];
    return `<div class="rc ticket k-${r.kind}"><div class="rc-rank">${T.rank}${r.ticket && r.ticket.ceil ? '（スタンプ）' : ''}</div><i>${T.icon}</i><b>${T.name}</b><small>おうち の ひと に みせてね</small></div>`;
  }
  if (r.kind === 'wear') { const w = WEAR[r.wear]; return `<div class="rc wear"><div class="rc-rank">きせかえ</div><i>${w.icon}</i><b>${w.name}</b><small>きせかえ で つけられる よ</small></div>`; }
  const s = STICKER[r.sticker];
  return `<div class="rc sticker${s.rare ? ' rare' : ''}"><div class="rc-rank">${s.rare ? '🌟 キラキラ シール' : 'シール'}${r.isNew ? ' <em>NEW!</em>' : ''}</div>${stickerImg(s)}<b>${s.name}</b></div>`;
}
function stickerImg(s, locked = false) {
  const f = [s.tint ? tintFilter(s.tint) : '', locked ? 'brightness(0) opacity(.25)' : ''].join(' ').trim();
  return `<span class="sk-img${s.rare && !locked ? ' foil' : ''}"><img src="img/${s.img}.png" alt="" style="${f ? `filter:${f}` : ''}"></span>`;
}
const TINT_FILTER = { '#ff9ad5': 'hue-rotate(290deg) saturate(1.3)', '#7fe3f0': 'hue-rotate(160deg)', '#ffd84a': 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.1)', '#b98aff': 'hue-rotate(230deg)', '#6fdc8c': 'hue-rotate(90deg)' };
const tintFilter = (c) => TINT_FILTER[c] || '';
function showResults(res, top) {
  const big = top >= 2;
  $('gRes').className = `gres${res.length > 1 ? ' many' : ''}${top >= 3 ? ' wow' : ''}${top >= 4 ? ' mega' : ''}`;
  $('gRes').innerHTML = `${top >= 4 ? '<div class="wow-t">🎊 めっっちゃ おおあたり！！ 🎊</div>' : top >= 3 ? '<div class="wow-t">🎉 おおあたり！ 🎉</div>' : top === 2 ? '<div class="wow-t">✨ あたり！ ✨</div>' : ''}
    <div class="rcs">${res.map(resCard).join('')}</div>
    <div class="foot"><button type="button" class="mid go" id="gResOk">やったー！</button></div>`;
  if (big) { SFXL.fan(); confetti(top >= 4 ? 160 : top >= 3 ? 90 : 40); } else SFX.item();
  show('gres');
  $('gResOk').addEventListener('click', () => { SFX.pop(); refreshWallet(); openGacha(); });
}
function confetti(n) {
  let box = document.querySelector('.conf-box');
  if (!box) { box = document.createElement('div'); box.className = 'conf-box'; $('stage').appendChild(box); }
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'conf';
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = pick(['#ff6fa8', '#ffd84a', '#7fc8ff', '#7a4fd0', '#6fdc8c', '#ff9a3a']);
    c.style.animationDelay = `${Math.random() * 0.8}s`;
    c.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    box.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}

// ---------------------------------------------------------------------
//  シール ずかん
// ---------------------------------------------------------------------
function openZukan() {
  const have = STICKERS.filter((s) => LAND.stickers[s.id]).length;
  $('zkCount').textContent = `${have} / ${STICKERS.length}`;
  $('zukan').innerHTML = STICKERS.map((s) => {
    const n = LAND.stickers[s.id] || 0;
    return `<div class="zk${s.rare ? ' rare' : ''}${n ? '' : ' none'}">${stickerImg(s, !n)}<b>${n ? s.name : '？？？'}</b>${n > 1 ? `<span class="cnt">×${n}</span>` : ''}</div>`;
  }).join('');
  show('zukan');
}
$('zkBack').addEventListener('click', () => { SFX.pop(); toLand(); });

// ---------------------------------------------------------------------
//  きせかえ
// ---------------------------------------------------------------------
function openWear() {
  const row = (slot) => [`<button type="button" class="wr${!LAND.wear[slot] ? ' on' : ''}" data-s="${slot}" data-id=""><i>✖</i>なし</button>`]
    .concat(WEARS.filter((w) => w.slot === slot).map((w) => {
      const own = LAND.owned[w.id];
      return `<button type="button" class="wr${LAND.wear[slot] === w.id ? ' on' : ''}${own ? '' : ' lock'}" data-s="${slot}" data-id="${w.id}" ${own ? '' : 'disabled'}><i>${own ? w.icon : '❔'}</i>${own ? w.name : '？？？'}</button>`;
    })).join('');
  $('wearHat').innerHTML = row('hat');
  $('wearTrail').innerHTML = row('trail');
  const C = CHARAS[SAVE.chara], hat = LAND.wear.hat && WEAR[LAND.wear.hat], tr = LAND.wear.trail && WEAR[LAND.wear.trail];
  $('wearPrev').innerHTML = `<img src="img/${C.img}.png" alt="">${hat ? `<span class="w-hat">${hat.icon}</span>` : ''}${tr ? `<span class="w-tr">${tr.icon}${tr.icon}${tr.icon}</span>` : ''}<b>${C.name}</b>`;
  document.querySelectorAll('#scrWear .wr').forEach((b) => b.addEventListener('click', () => {
    LAND.wear[b.dataset.s] = b.dataset.id || null; writeLand(); SFX.pop(); openWear();
  }));
  if (UI.scr !== 'wear') show('wear');
}
$('wearBack').addEventListener('click', () => { SFX.pop(); toLand(); });

// ---------------------------------------------------------------------
//  もってる けん（つかった は おうち の ひと が ばんごう で きめる）
// ---------------------------------------------------------------------
function openTickets() {
  const list = LAND.tickets.slice().sort((a, b) => (a.used - b.used) || b.date - a.date);
  $('tickets').innerHTML = list.length ? list.map((t) => {
    const T = TICKETS[t.kind];
    return `<div class="tk k-${t.kind}${t.used ? ' used' : ''}"><i>${T.icon}</i><div class="tk-m"><small>${T.rank}</small><b>${T.name}</b><span>${fmtDate(t.date)} に でた${t.used ? `・${fmtDate(t.usedDate)} に つかった` : ''}</span></div>
      ${t.used ? '<span class="tk-used">つかった</span>' : `<button type="button" class="mid tk-use" data-id="${t.id}">つかった</button>`}</div>`;
  }).join('') : '<div class="empty">まだ けん は ない よ。ガチャ で あたる かも！</div>';
  $('tickets').querySelectorAll('.tk-use').forEach((b) => b.addEventListener('click', () => {
    askPin('この けん を「つかった」に する', (ok) => {
      if (!ok) return;
      const t = LAND.tickets.find((x) => x.id === b.dataset.id);
      if (t) { t.used = true; t.usedDate = Date.now(); writeLand(); SFX.win(); }
      openTickets();
    });
  }));
  refreshWallet();
  if (UI.scr !== 'tickets') show('tickets');
}
$('tkBack').addEventListener('click', () => { SFX.pop(); toLand(); });
$('tkParent').addEventListener('click', () => askPin('ばんごう を かえる', (ok) => { if (ok) { LAND.pin = null; writeLand(); askPin('あたらしい ばんごう', () => {}); } }));

// ばんごう（4けた）。まだ ない とき は きめる（2かい いれる）
let PIN = null;
function askPin(title, cb) {
  PIN = { title, cb, buf: '', mode: LAND.pin ? 'check' : 'new', first: null };
  renderPin();
  $('pinAsk').hidden = false;
}
function renderPin() {
  const P = PIN;
  $('pinTitle').textContent = P.mode === 'check' ? '🔒 おうち の ひと の ばんごう' : P.mode === 'new' ? '🔒 ばんごう を きめて ください' : '🔒 もういちど いれて ください';
  $('pinSub').textContent = P.mode === 'check' ? `${P.title}（4けた）` : 'おうち の ひと だけ が しって いる 4けた の ばんごう';
  $('pinDots').innerHTML = [0, 1, 2, 3].map((i) => `<i class="${i < P.buf.length ? 'on' : ''}"></i>`).join('');
  $('pinPad').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', ''].map((k) => (k ? `<button type="button" data-k="${k}">${k}</button>` : '<span></span>')).join('');
  $('pinPad').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => pinKey(b.dataset.k)));
}
function pinKey(k) {
  const P = PIN;
  if (!P) return;
  if (k === '⌫') { P.buf = P.buf.slice(0, -1); renderPin(); return; }
  if (P.buf.length >= 4) return;
  P.buf += k; SFX.pop(); renderPin();
  if (P.buf.length < 4) return;
  setTimeout(() => {
    if (P.mode === 'check') {
      if (P.buf === LAND.pin) closePin(true);
      else { SFXL.ng(); P.buf = ''; $('pinSub').textContent = 'ばんごう が ちがいます'; renderPinDots(); }
    } else if (P.mode === 'new') { P.first = P.buf; P.buf = ''; P.mode = 'again'; renderPin(); }
    else if (P.buf === P.first) { LAND.pin = P.buf; writeLand(); closePin(true); showToast('🔒 ばんごう を きめました', 1.6); }
    else { SFXL.ng(); P.mode = 'new'; P.buf = ''; renderPin(); $('pinSub').textContent = 'ちがって いました。もういちど きめて ください'; }
  }, 150);
}
function renderPinDots() { $('pinDots').innerHTML = [0, 1, 2, 3].map(() => '<i></i>').join(''); }
function closePin(ok) { const cb = PIN && PIN.cb; PIN = null; $('pinAsk').hidden = true; if (cb) cb(ok); }
$('pinCancel').addEventListener('click', () => closePin(false));

// Escape で もどる
addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (!$('pinAsk').hidden) { closePin(false); return; }
  const back = { dgEntry: 'dgEntryBack', gacha: 'gBack', zukan: 'zkBack', wear: 'wearBack', tickets: 'tkBack' }[UI.scr];
  if (back) $(back).click();
});

window.LAND_TEST = { LAND: () => LAND, toLand, openGacha, doPull, pullOnce, startDungeon, D: () => D, endDungeon, openTickets, askPin };

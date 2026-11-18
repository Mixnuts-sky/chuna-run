'use strict';
// =====================================================================
//  ちゅなちゃんラン：がめん（タイトル・キャラ・ランキング・けっか・ひとやすみ）と そうさ
// =====================================================================

const UI = { scr: 'title', lastRun: null, rankTab: 'rank' };
const SCREENS = { title: 'scrTitle', chara: 'scrChara', rank: 'scrRank', result: 'scrResult', pause: 'scrPause' };
const IS_TOUCH = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
if (IS_TOUCH) document.body.classList.add('touch');

function show(name) {
  UI.scr = name;
  Object.entries(SCREENS).forEach(([k, id]) => { $(id).hidden = k !== name; });
  $('play').hidden = !(name === 'play' || name === 'pause');
  const first = name !== 'play' && $(SCREENS[name]) && $(SCREENS[name]).querySelector('button.go, button');
  if (first && !IS_TOUCH) first.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------
//  がめん の おおきさ（16:9 を まんなか に。はみださない ように ちぢめる）
// ---------------------------------------------------------------------
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const k = Math.min(vw / W, vh / H);
  $('stage').style.transform = `translate(-50%, -50%) scale(${k})`;
  VIEW_K = Math.min(3, k * (window.devicePixelRatio || 1));
  cv.width = Math.round(W * VIEW_K); cv.height = Math.round(H * VIEW_K);
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 200));

// ---------------------------------------------------------------------
//  タイトル
// ---------------------------------------------------------------------
function toTitle() {
  newRun(SAVE.chara, true);
  const C = CHARAS[SAVE.chara];
  $('titleChara').textContent = `${C.name}（${C.job}）`;
  $('titleBest').textContent = SAVE.best ? `🚩 じぶん の きろく ${SAVE.best} m` : '';
  show('title');
}
function startGame() {
  audio();
  newRun(SAVE.chara, false);
  show('play');
  showToast('よーい……どん！', 1.2);
  note(784, 0, 0.12, { vol: 0.05 }); note(1047, 0.25, 0.2, { vol: 0.06 });
}

// ---------------------------------------------------------------------
//  キャラ へんこう
// ---------------------------------------------------------------------
function openChara() {
  $('charaList').innerHTML = CHARA_IDS.map((id) => {
    const C = CHARAS[id];
    return `<button type="button" class="chara${id === SAVE.chara ? ' on' : ''}" data-id="${id}">
      <img src="img/${C.img}.png" alt=""><b>${C.name}</b><span class="job">${C.job}</span>
      <span class="trait">${C.trait}</span>
      <span class="sk"><em>まほう：${C.magic}</em><br>${C.magicDesc}</span>
      <span class="sk"><em>ひっさつ：${C.special}</em><br>${C.specialDesc}</span></button>`;
  }).join('');
  $('charaList').querySelectorAll('.chara').forEach((b) => b.addEventListener('click', () => {
    audio();
    SAVE.chara = b.dataset.id; writeSave();
    $('charaList').querySelectorAll('.chara').forEach((x) => x.classList.toggle('on', x === b));
    SFX.pop();
  }));
  show('chara');
}

// ---------------------------------------------------------------------
//  ランキング（ベスト10・りれき）
// ---------------------------------------------------------------------
const charaCell = (id) => { const C = CHARAS[id] || CHARAS.chuna; return `<img src="img/${C.img}.png" alt=""> ${C.name}`; };
function renderRank(highlightId) {
  document.querySelectorAll('#scrRank .tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === UI.rankTab));
  const body = $('rankBody');
  if (UI.rankTab === 'rank') {
    if (!SAVE.ranking.length) { body.innerHTML = '<div class="empty">まだ きろく が ないよ。はしって みよう！</div>'; return; }
    body.innerHTML = `<table>${SAVE.ranking.map((r, i) => `<tr class="${r.id && r.id === highlightId ? 'me' : ''}${UI.askDel === i ? ' asking' : ''}"><td class="n">${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${esc(r.name)}</td><td class="c">${charaCell(r.chara)}</td><td class="d">${r.dist} m</td><td class="t">${fmtDate(r.date)}</td>`
      + `<td class="x">${UI.askDel === i ? `<span class="ask">けす？<button type="button" class="yes" data-i="${i}">けす</button><button type="button" class="no">やめる</button></span>` : `<button type="button" class="del" data-i="${i}" aria-label="けす">🗑</button>`}</td></tr>`).join('')}</table>`;
    body.querySelectorAll('.del').forEach((b) => b.addEventListener('click', () => { UI.askDel = +b.dataset.i; SFX.pop(); renderRank(highlightId); }));
    body.querySelectorAll('.ask .no').forEach((b) => b.addEventListener('click', () => { UI.askDel = -1; SFX.pop(); renderRank(highlightId); }));
    body.querySelectorAll('.ask .yes').forEach((b) => b.addEventListener('click', () => { deleteRanking(+b.dataset.i); UI.askDel = -1; SFX.bump(); renderRank(); }));
  } else {
    if (!SAVE.history.length) { body.innerHTML = '<div class="empty">まだ りれき が ないよ</div>'; return; }
    body.innerHTML = `<table>${SAVE.history.map((r) => `<tr><td class="t">${fmtDate(r.date)}</td><td class="c">${charaCell(r.chara)}</td><td class="d">${r.dist} m</td><td>🪙 ${r.coins}</td><td>${r.name ? `🏆 ${esc(r.name)}` : ''}</td></tr>`).join('')}</table>`;
  }
  const me = body.querySelector('tr.me');
  if (me) me.scrollIntoView({ block: 'nearest' });
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function deleteRanking(i) {
  const r = SAVE.ranking[i];
  if (!r) return;
  SAVE.ranking.splice(i, 1);
  const h = SAVE.history.find((x) => x.id === r.id);
  if (h) delete h.name;
  writeSave();
}
function openRank(tab = 'rank', highlightId = null) {
  UI.rankTab = tab;
  UI.askDel = -1;
  show('rank');
  renderRank(highlightId);
}
document.querySelectorAll('#scrRank .tab').forEach((t) => t.addEventListener('click', () => { UI.rankTab = t.dataset.tab; renderRank(); SFX.pop(); }));

// ---------------------------------------------------------------------
//  けっか（ランクイン なら なまえ を いれて ほぞん。まえ に つかった なまえ から えらべる）
// ---------------------------------------------------------------------
RUN.onGameOver = (r) => {
  const run = { id: `${Date.now()}`, date: Date.now(), chara: r.chara, dist: r.dist, coins: r.coins, kills: r.kills };
  const newBest = r.dist > (SAVE.best || 0);
  const slot = rankSlot(r.dist);
  addHistory(run);
  UI.lastRun = run;
  $('resTitle').textContent = newBest && r.dist > 0 ? '🚩 きろく こうしん！' : r.why;
  $('resStats').innerHTML = `<div class="st main"><small>はしった きょり</small><b>${r.dist} m</b></div>
    <div class="st"><small>コイン</small><b>${r.coins}</b></div><div class="st"><small>たおした かず</small><b>${r.kills}</b></div>
    <div class="st"><small>キャラ</small><b style="font-size:20px">${CHARAS[r.chara].name}</b></div>`;
  $('resEntry').hidden = slot < 0;
  $('resBtns').hidden = slot >= 0;
  if (slot >= 0) {
    $('resRankIn').textContent = `🏆 ${slot + 1}い に ランクイン！`;
    $('resName').value = SAVE.names[0] || '';
    $('resNames').innerHTML = SAVE.names.map((n) => `<button type="button" data-n="${esc(n)}">${esc(n)}</button>`).join('');
    $('resNames').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { $('resName').value = b.dataset.n; SFX.pop(); }));
    SFX.record();
  }
  show('result');
  if (slot >= 0 && !IS_TOUCH) $('resName').focus();
};
function saveName() {
  const name = ($('resName').value || '').trim().slice(0, 10) || 'ななし';
  const run = UI.lastRun;
  if (!run || run.saved) return;
  run.saved = true;
  const h = SAVE.history.find((x) => x.id === run.id);
  addRanking(run, name);
  if (h) h.name = name;
  writeSave();
  SFX.win();
  // ほぞん おわり：けっか に もどった とき は「もういちど」「タイトルへ」だけ に する
  $('resEntry').hidden = true;
  $('resBtns').hidden = false;
  $('resRankIn').textContent = '';
  openRank('rank', run.id);
}
$('resSave').addEventListener('click', saveName);
$('resName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } e.stopPropagation(); });
$('resAgain').addEventListener('click', startGame);
$('resTitleBtn').addEventListener('click', toTitle);

// ---------------------------------------------------------------------
//  ひとやすみ
// ---------------------------------------------------------------------
function pauseGame() {
  if (UI.scr !== 'play' || !G || G.over) return;
  PAUSED = true; G.holding = false;
  show('pause');
}
function resumeGame() {
  if (UI.scr !== 'pause') return;
  show('play');
  showToast('さいかい！', 0.9);
  setTimeout(() => { PAUSED = false; }, 350);
}
$('btnPause').addEventListener('click', pauseGame);
$('pauseGo').addEventListener('click', resumeGame);
$('pauseQuit').addEventListener('click', () => { show('play'); PAUSED = false; gameOver('とちゅう で おわり'); G.deadT = 1.2; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
addEventListener('blur', pauseGame);

// ---------------------------------------------------------------------
//  ボタン・キー
// ---------------------------------------------------------------------
$('goStart').addEventListener('click', startGame);
$('goChara').addEventListener('click', () => { audio(); openChara(); });
$('goRank').addEventListener('click', () => { audio(); openRank(); });
$('charaBack').addEventListener('click', toTitle);
$('rankBack').addEventListener('click', () => (UI.lastRun && G && !G.demo ? show('result') : toTitle()));

function holdBtn(el, down, up) {
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); audio(); el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch { /* なし */ } down(); });
  const off = () => { el.classList.remove('on'); if (up) up(); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => el.addEventListener(ev, off));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
holdBtn($('btnJump'), jumpDown, jumpUp);
holdBtn($('btnMagic'), magic);
holdBtn($('btnSpecial'), special);
// がめん を タップ しても ジャンプ
cv.addEventListener('pointerdown', (e) => { if (UI.scr !== 'play') return; e.preventDefault(); audio(); jumpDown(); });
cv.addEventListener('pointerup', () => { if (UI.scr === 'play') jumpUp(); });

const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  audio();
  if (UI.scr === 'play') {
    if (JUMP_KEYS.includes(e.code)) { if (!e.repeat) jumpDown(); e.preventDefault(); }
    else if ((e.code === 'KeyZ' || e.code === 'KeyJ') && !e.repeat) magic();
    else if ((e.code === 'KeyX' || e.code === 'KeyK') && !e.repeat) special();
    else if (e.code === 'KeyP' || e.code === 'Escape') pauseGame();
    return;
  }
  if (UI.scr === 'pause' && (e.code === 'KeyP' || e.code === 'Escape')) { resumeGame(); e.preventDefault(); return; }
  if (e.code === 'Escape' && (UI.scr === 'chara' || UI.scr === 'rank')) { $(UI.scr === 'chara' ? 'charaBack' : 'rankBack').click(); return; }
  if (UI.scr === 'title' && e.code === 'Space') { startGame(); e.preventDefault(); }
});
addEventListener('keyup', (e) => { if (UI.scr === 'play' && JUMP_KEYS.includes(e.code)) jumpUp(); });

// まいフレーム：ボタン の ようす
let lastBtn = '';
RUN.onFrame = () => {
  if (UI.scr !== 'play' || !G) return;
  const g = Math.floor(G.gauge), key = `${g}|${G.cool > 0}|${G.special ? 1 : 0}`;
  if (key === lastBtn) return;
  lastBtn = key;
  $('btnSpecial').querySelector('.gauge i').style.width = `${g}%`;
  $('btnSpecial').classList.toggle('full', g >= 100 && !G.special);
  $('btnMagic').classList.toggle('cool', G.cool > 0);
  $('btnMagic').querySelector('.lbl').textContent = CHARAS[G.chara].btn;
};

// ---------------------------------------------------------------------
//  はじめ
// ---------------------------------------------------------------------
loadSave();
fit();
loadImages().then(() => {
  toTitle();
  requestAnimationFrame(frame);
});
window.UI_TEST = { show, toTitle, startGame, openRank, openChara, pauseGame, resumeGame, saveName, UI };

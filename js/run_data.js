'use strict';
// =====================================================================
//  ちゅなちゃんラン：キャラ・アイテム・セーブ（ランキング・りれき）・おと
// =====================================================================

const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------------
//  キャラ（まほう ボタン・ひっさつ・とくせい）
// ---------------------------------------------------------------------
const CHARAS = {
  chuna: {
    name: 'ちゅな', job: 'まほうつかい', img: 'chuna', color: '#8a5ad8',
    trait: 'とおく の てき を たおせる',
    magic: 'ほし の まほう', magicDesc: 'ほし が まえ に とんで いく。あたった てき を たおす',
    special: 'ながれぼし の あめ', specialDesc: 'がめん の てき を ぜんぶ たおす',
    cool: 0.45, btn: 'まほう',
  },
  kenshi: {
    name: 'かずぅ', job: 'けんし', img: 'kenshi', color: '#4a7fd6',
    trait: 'いわ や はこ を こわせる',
    magic: 'けん', magicDesc: 'めのまえ を きる。てき も いわ も はこ も こわす',
    special: 'とっしん ぎり', specialDesc: '3びょう むてき で はやく はしって ぜんぶ なぎたおす',
    cool: 0.38, btn: 'けん',
  },
  odoriko: {
    name: 'みなり', job: 'おどりこ', img: 'odoriko', color: '#ff7aa8',
    trait: 'そら で もう 1かい ジャンプ',
    magic: 'ハート の わ', magicDesc: 'まわり の てき を なかよし に して けす',
    special: 'みんな で ダンス', specialDesc: 'がめん の てき が おどって コイン に なる',
    cool: 0.8, btn: 'ハート',
  },
};
const CHARA_IDS = Object.keys(CHARAS);

// アイテム（ふわふわ うかぶ しゃぼんだま）
const ITEMS = {
  rocket: { name: 'むてき ダッシュ', icon: '🚀', sec: 4, w: 16 },
  magnet: { name: 'マグネット', icon: '🧲', sec: 10, w: 18 },
  heart: { name: 'ハート', icon: '💗', sec: 0, w: 16 },
  barrier: { name: 'バリア', icon: '🛡️', sec: 0, w: 16 },
  feather: { name: 'はね', icon: '🪶', sec: 10, w: 16 },
  nyanko: { name: 'にゃんこ', icon: '🐱', sec: 12, w: 14 },
};
const pickItem = () => {
  const ids = Object.keys(ITEMS), tot = ids.reduce((s, k) => s + ITEMS[k].w, 0);
  let r = Math.random() * tot;
  for (const k of ids) { r -= ITEMS[k].w; if (r <= 0) return k; }
  return ids[0];
};

// ---------------------------------------------------------------------
//  え（img/*.png）
// ---------------------------------------------------------------------
const IMG = {};
function loadImages() {
  const names = ['chuna', 'kenshi', 'odoriko', 'grape', 'weo', 'family', 'shima', 'siren', 'ningyo', 'boss', 'nyanko'];  // シール の え は <img> で よむ
  return Promise.all(names.map((n) => new Promise((ok) => {
    const im = new Image();
    im.onload = () => { IMG[n] = im; ok(); };
    im.onerror = () => ok();
    im.src = `img/${n}.png`;
  })));
}
// しろく ひかる え（あたった とき）・いろ ちがい
const TINTED = {};
function tinted(name, color) {
  const key = `${name}|${color}`;
  if (TINTED[key]) return TINTED[key];
  const im = IMG[name];
  if (!im) return null;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = color === '#ffffff' ? 'source-atop' : 'multiply';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0);
  return (TINTED[key] = c);
}

// ---------------------------------------------------------------------
//  セーブ（この たんまつ の ブラウザ に のこる）
// ---------------------------------------------------------------------
const STORE_KEY = 'chunarun:v1';
const RANK_MAX = 10, HIST_MAX = 300, NAMES_MAX = 12;
let SAVE = { chara: 'chuna', best: 0, ranking: [], history: [], names: [] };
function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (d && typeof d === 'object') SAVE = { ...SAVE, ...d };
  } catch { /* よめない とき は はじめから */ }
  if (!CHARAS[SAVE.chara]) SAVE.chara = 'chuna';
}
function writeSave() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(SAVE)); } catch { /* ほぞん できない とき は なにもしない */ }
}
// ランキング に はいる か（10い いない）
const rankSlot = (dist) => {
  if (dist <= 0) return -1;
  const i = SAVE.ranking.findIndex((r) => dist > r.dist);
  if (i >= 0) return i;
  return SAVE.ranking.length < RANK_MAX ? SAVE.ranking.length : -1;
};
function addHistory(run) {
  SAVE.history.unshift(run);
  if (SAVE.history.length > HIST_MAX) SAVE.history.length = HIST_MAX;
  SAVE.best = Math.max(SAVE.best || 0, run.dist);
  writeSave();
}
function addRanking(run, name) {
  const entry = { name, chara: run.chara, dist: run.dist, date: run.date, id: run.id };
  const i = rankSlot(run.dist);
  if (i < 0) return -1;
  SAVE.ranking.splice(i, 0, entry);
  SAVE.ranking.length = Math.min(SAVE.ranking.length, RANK_MAX);
  run.name = name;
  SAVE.names = [name, ...SAVE.names.filter((n) => n !== name)].slice(0, NAMES_MAX);
  writeSave();
  return i;
}
const fmtDate = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };

// ---------------------------------------------------------------------
//  おと（WebAudio。はじめて さわった とき に うごきだす）
// ---------------------------------------------------------------------
let AC = null, MASTER = null;
function audio() {
  if (!AC) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); MASTER = AC.createGain(); MASTER.gain.value = 0.9; MASTER.connect(AC.destination); } catch { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function note(freq, at = 0, dur = 0.12, o = {}) {
  if (!AC) return;
  const t = AC.currentTime + at, osc = AC.createOscillator(), g = AC.createGain();
  osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(freq * o.slide, t + dur);
  g.gain.setValueAtTime(o.vol || 0.06, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g); g.connect(MASTER);
  osc.start(t); osc.stop(t + dur + 0.02);
}
const SFX = {
  jump: () => note(520, 0, 0.14, { type: 'sine', vol: 0.07, slide: 1.8 }),
  jump2: () => note(700, 0, 0.14, { type: 'sine', vol: 0.07, slide: 1.6 }),
  coin: () => { note(1568, 0, 0.06, { vol: 0.04 }); note(2093, 0.05, 0.1, { vol: 0.04 }); },
  stomp: () => note(300, 0, 0.12, { type: 'square', vol: 0.07, slide: 0.5 }),
  pop: () => note(880, 0, 0.1, { type: 'triangle', vol: 0.07, slide: 1.5 }),
  hurt: () => { note(220, 0, 0.25, { type: 'sawtooth', vol: 0.07, slide: 0.5 }); },
  magic: () => note(1200, 0, 0.12, { type: 'triangle', vol: 0.06, slide: 1.6 }),
  slash: () => note(400, 0, 0.1, { type: 'sawtooth', vol: 0.05, slide: 2.2 }),
  ring: () => [784, 988, 1175].forEach((f, i) => note(f, i * 0.04, 0.12, { type: 'sine', vol: 0.05 })),
  item: () => [784, 988, 1319, 1568].forEach((f, i) => note(f, i * 0.06, 0.14, { type: 'square', vol: 0.05 })),
  special: () => [523, 659, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.07, 0.2, { type: 'square', vol: 0.06 })),
  speed: () => [660, 880, 1100].forEach((f, i) => note(f, i * 0.08, 0.12, { type: 'triangle', vol: 0.06 })),
  boss: () => [196, 185, 175, 165].forEach((f, i) => note(f, i * 0.18, 0.22, { type: 'sawtooth', vol: 0.06 })),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => note(f, i * 0.09, 0.18, { type: 'square', vol: 0.06 })),
  over: () => [523, 440, 349, 262].forEach((f, i) => note(f, i * 0.16, 0.24, { type: 'triangle', vol: 0.07 })),
  record: () => [1047, 1319, 1568, 2093].forEach((f, i) => note(f, i * 0.08, 0.16, { type: 'square', vol: 0.06 })),
  bump: () => note(150, 0, 0.15, { type: 'square', vol: 0.07, slide: 0.6 }),
  fire: () => note(260, 0, 0.18, { type: 'sawtooth', vol: 0.04, slide: 0.6 }),
};

let toastT = null;
function showToast(msg, sec = 1.8) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, sec * 1000);
}

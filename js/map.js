'use strict';
// =====================================================================
//  ちゅなランド：ちず で おでかけ
//  じぶん の めせん（3D）で あるく。みぎ の ちず と まわり の どうぶつ・おみせ から
//  いま どこ に いる か を かんがえて、いっしょ に いる こ を いきたい ところ へ つれて いく。
// =====================================================================

const $ = (id) => document.getElementById(id);
const W = 960, H = 540, VW = 600, VH = 540, MAPX = 600;
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------------
//  ばしょ
// ---------------------------------------------------------------------
const PLACES = {
  zoo: {
    name: 'どうぶつえん', icon: '🦁', outdoor: true,
    sky: ['#7fc8ff', '#d9f2ff'], floor: ['#e8c98f', '#c9a467'], mapPath: '#f3dfb0', mapBlock: '#a8dc96',
    spots: [['ライオン', '🦁'], ['ぞう', '🐘'], ['きりん', '🦒'], ['パンダ', '🐼'], ['ペンギン', '🐧'], ['おさる', '🐒'], ['しまうま', '🦓'], ['くま', '🐻'],
      ['かば', '🦛'], ['フラミンゴ', '🦩'], ['ゴリラ', '🦍'], ['わに', '🐊'], ['うさぎ', '🐰'], ['ふくろう', '🦉'], ['カンガルー', '🦘'], ['コアラ', '🐨'],
      ['とら', '🐯'], ['ラッコ', '🦦'], ['ひつじ', '🐑'], ['らくだ', '🐫']],
    fillers: [['もり', '🌳'], ['ふんすい', '⛲'], ['トイレ', '🚻'], ['ばいてん', '🏪'], ['ひろば', '🌼']],
    wall: 'fence',
  },
  park: {
    name: 'ゆうえんち', icon: '🎡', outdoor: true,
    sky: ['#ffb3d9', '#fff0f7'], floor: ['#d8d0e8', '#b4a8cc'], mapPath: '#efe6fa', mapBlock: '#ffd6ea',
    spots: [['かんらんしゃ', '🎡'], ['メリーゴーランド', '🎠'], ['ジェットコースター', '🎢'], ['おしろ', '🏰'], ['おばけやしき', '👻'], ['きしゃ', '🚂'],
      ['コーヒーカップ', '☕'], ['アイスやさん', '🍦'], ['ふうせんや', '🎈'], ['ポップコーン', '🍿'], ['ゴーカート', '🏎️'], ['ボート', '🚣'],
      ['サーカス', '🎪'], ['ステージ', '🎤'], ['わたあめ', '🍭'], ['しゃしん', '📸'], ['ロケット', '🚀'], ['ぼうけん の しま', '🏝️']],
    fillers: [['はなだん', '💐'], ['ベンチ', '🪑'], ['トイレ', '🚻'], ['き', '🌲']],
    wall: 'stripe',
  },
  dept: {
    name: 'デパート', icon: '🏬', outdoor: false,
    sky: ['#f4efe6', '#e6dccb'], floor: ['#eae4f2', '#c9bfd8'], mapPath: '#f6f2ea', mapBlock: '#d9e8f7',
    spots: [['おもちゃ', '🧸'], ['ふく', '👗'], ['ほんや', '📚'], ['ケーキ', '🍰'], ['くつ', '👟'], ['やおや', '🥕'], ['おかしや', '🍬'], ['めがね', '👓'],
      ['かばん', '👜'], ['とけい', '⌚'], ['はなや', '💐'], ['ぶんぼうぐ', '✏️'], ['ペット', '🐶'], ['でんき', '📺'], ['スポーツ', '⚽'], ['パンや', '🍞'],
      ['レストラン', '🍝'], ['ゲーム', '🎮']],
    fillers: [['エレベーター', '🛗'], ['トイレ', '🚻'], ['はしら', '🏛️'], ['ベンチ', '🪑']],
    wall: 'shop',
  },
};
const DIFF = {
  easy: { name: 'やさしい', n: 4, showMe: true, rounds: 3, coin: 10, pt: 2, desc: 'ちず に「いま ここ」が でる' },
  normal: { name: 'ふつう', n: 5, showMe: false, rounds: 3, coin: 15, pt: 3, desc: 'まわり を みて いま どこ か かんがえる' },
  hard: { name: 'むずかしい', n: 6, showMe: false, rounds: 3, coin: 20, pt: 4, desc: 'ひろい！ まよわない かな？' },
};
const FRIENDS = [
  { img: 'odoriko', name: 'みなり' }, { img: 'kenshi', name: 'かずぅ' }, { img: 'nyanko', name: 'にゃんこ' },
];

// ---------------------------------------------------------------------
//  おと
// ---------------------------------------------------------------------
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function note(f, at = 0, dur = 0.12, type = 'square', vol = 0.05) {
  if (!AC) return;
  const t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  step: () => note(220, 0, 0.06, 'triangle', 0.05),
  turn: () => note(330, 0, 0.05, 'triangle', 0.04),
  bump: () => note(120, 0, 0.15, 'square', 0.06),
  pop: () => note(880, 0, 0.08, 'triangle', 0.06),
  yay: () => [523, 659, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.08, 0.2, 'square', 0.05)),
};

// ---------------------------------------------------------------------
//  セーブ（ちゅなランド と おなじ ちょきん）
// ---------------------------------------------------------------------
const LAND_KEY = 'chunaland:v1';
function addReward(coins, points) {
  try {
    const d = JSON.parse(localStorage.getItem(LAND_KEY) || '{}') || {};
    d.coins = (d.coins || 0) + coins;
    d.points = (d.points || 0) + points;
    d.mapClears = (d.mapClears || 0) + 1;
    localStorage.setItem(LAND_KEY, JSON.stringify(d));
    return d;
  } catch { return {}; }
}

// ---------------------------------------------------------------------
//  え
// ---------------------------------------------------------------------
const IMG = {};
function loadImg(n) { return new Promise((ok) => { const im = new Image(); im.onload = () => { IMG[n] = im; ok(); }; im.onerror = ok; im.src = `img/${n}.png`; }); }

// かべ の もよう（ばしょ・しるし ごと に 1まい）
const TEX = 128;
function makeTex(place, kind, spot) {
  const c = document.createElement('canvas'); c.width = TEX; c.height = TEX;
  const g = c.getContext('2d');
  const P = PLACES[place];
  if (kind === 'outer') {
    if (P.outdoor) { // たかい さく
      g.fillStyle = '#6b8f4e'; g.fillRect(0, 0, TEX, TEX);
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#5a7d40' : '#7aa35a'; g.beginPath(); g.arc(i * 18 + 8, 18, 18, 0, 7); g.fill(); }
      g.fillStyle = '#8a6a44'; g.fillRect(0, 70, TEX, 58);
      g.fillStyle = '#6e5233'; for (let x = 4; x < TEX; x += 16) g.fillRect(x, 70, 4, 58);
    } else { // まど の ある かべ
      g.fillStyle = '#efe8dc'; g.fillRect(0, 0, TEX, TEX);
      g.fillStyle = '#a9d7f5'; g.fillRect(16, 20, 96, 60); g.strokeStyle = '#8a7a6a'; g.lineWidth = 4; g.strokeRect(16, 20, 96, 60); g.beginPath(); g.moveTo(64, 20); g.lineTo(64, 80); g.stroke();
      g.fillStyle = '#d8cdbb'; g.fillRect(0, 110, TEX, 18);
    }
    return c;
  }
  if (kind === 'plain') { // みち を ふさぐ だけ の かべ（しるし なし）
    if (P.wall === 'fence') { g.fillStyle = '#8cc56e'; g.fillRect(0, 0, TEX, TEX); g.fillStyle = '#6fae55'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(irnd(0, 128), irnd(0, 128), irnd(14, 26), 0, 7); g.fill(); } }
    else if (P.wall === 'stripe') { g.fillStyle = '#b8dcaa'; g.fillRect(0, 0, TEX, TEX); g.fillStyle = '#9ccb8a'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(irnd(0, 128), irnd(0, 128), irnd(12, 22), 0, 7); g.fill(); } }
    else { g.fillStyle = '#f1ece2'; g.fillRect(0, 0, TEX, TEX); g.fillStyle = '#e2d9c8'; g.fillRect(0, 110, TEX, 18); g.fillRect(56, 0, 16, 110); }
    return c;
  }
  if (kind === 'gate') {
    g.fillStyle = '#c0504d'; g.fillRect(0, 0, TEX, TEX);
    g.fillStyle = '#fff3c4'; g.fillRect(10, 14, 108, 36);
    g.fillStyle = '#3a2a4d'; g.font = '900 22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('いりぐち', 64, 33);
    g.fillStyle = '#5a3a2a'; g.fillRect(30, 64, 68, 64);
    return c;
  }
  const [name, icon] = spot;
  const filler = kind === 'filler';
  if (P.wall === 'fence') {
    g.fillStyle = filler ? '#8cc56e' : '#bfe3a8'; g.fillRect(0, 0, TEX, TEX);
    if (!filler) { g.fillStyle = '#e9d2a6'; g.fillRect(0, 84, TEX, 44); g.fillStyle = '#b68b56'; for (let x = 2; x < TEX; x += 14) g.fillRect(x, 80, 6, 48); g.fillRect(0, 92, TEX, 6); g.fillRect(0, 112, TEX, 6); }
    else { g.fillStyle = '#6fae55'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(irnd(10, 118), irnd(10, 118), irnd(14, 26), 0, 7); g.fill(); } }
  } else if (P.wall === 'stripe') {
    const cols = filler ? ['#cfe8c4', '#b8dcaa'] : [pick(['#ff9ac8', '#9ad0ff', '#ffd84a', '#b98aff', '#8be0b0']), '#ffffff'];
    for (let x = 0; x < TEX; x += 16) { g.fillStyle = cols[(x / 16) % 2]; g.fillRect(x, 0, 16, TEX); }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, TEX, TEX);
  } else {
    g.fillStyle = filler ? '#f1ece2' : '#fffaf0'; g.fillRect(0, 0, TEX, TEX);
    if (!filler) {
      const col = pick(['#ff6fa8', '#5aa9e6', '#ffb347', '#6fcf97', '#b98aff', '#e05a5a']);
      for (let x = 0; x < TEX; x += 16) { g.fillStyle = (x / 16) % 2 ? '#ffffff' : col; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 16, 16); g.arc(x + 8, 16, 8, 0, Math.PI); g.fill(); }
      g.fillStyle = '#e6eef5'; g.fillRect(8, 100, 112, 28);
    }
  }
  // しるし（えもじ と なまえ）
  g.font = `${filler ? 50 : 62}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(icon, 64, filler ? 58 : 54);
  if (!filler || name !== 'もり') {
    g.font = `900 ${name.length > 6 ? 12 : 16}px sans-serif`;
    const tw = Math.min(120, g.measureText(name).width + 14);
    g.fillStyle = 'rgba(255,250,240,.95)'; g.fillRect(64 - tw / 2, 92, tw, 22);
    g.strokeStyle = '#3a2a4d'; g.lineWidth = 2; g.strokeRect(64 - tw / 2, 92, tw, 22);
    g.fillStyle = '#3a2a4d'; g.fillText(name, 64, 104);
  }
  return c;
}

// ---------------------------------------------------------------------
//  ちず を つくる（こうし の みち を ランダム に けずる）
// ---------------------------------------------------------------------
let M = null; // { place, diff, S, grid[y][x] (-1 = みち, それ以外 = blocks の ばんごう), blocks[], gate }
function genMap(place, diff) {
  const P = PLACES[place], n = DIFF[diff].n, S = 2 * n + 1;
  const isPath = Array.from({ length: S }, () => Array(S).fill(false));
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) isPath[2 * j + 1][2 * i + 1] = true;
  // ぜんいき の き（DFS）
  const seen = new Set(), stack = [[irnd(0, n - 1), irnd(0, n - 1)]];
  seen.add(stack[0].join());
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const nb = shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).map(([dx, dy]) => [i + dx, j + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !seen.has(`${a},${b}`));
    if (!nb.length) { stack.pop(); continue; }
    const [a, b] = nb[0];
    isPath[j + b + 1][i + a + 1] = true; // あいだ の みち
    seen.add(`${a},${b}`); stack.push([a, b]);
  }
  // わっか を ふやす
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (i < n - 1 && Math.random() < 0.5) isPath[2 * j + 1][2 * i + 2] = true;
    if (j < n - 1 && Math.random() < 0.5) isPath[2 * j + 2][2 * i + 1] = true;
  }
  // しるし を おく ばしょ（あいだ の かたまり）。どれ も みち に となりあう
  const centers = [];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) centers.push([2 * i + 2, 2 * j + 2]);
  for (const [x, y] of centers) {
    const side = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    if (!side.some(([a, b]) => isPath[b][a])) { const [a, b] = pick(side); isPath[b][a] = true; }
  }
  const spots = shuffle(P.spots.slice());
  const blocks = [];
  const grid = Array.from({ length: S }, (_, y) => Array.from({ length: S }, (_, x) => (isPath[y][x] ? -1 : null)));
  const addBlock = (b) => { blocks.push(b); return blocks.length - 1; };
  const outerId = addBlock({ kind: 'outer', tex: makeTex(place, 'outer') });
  const fillTex = P.fillers.map((f) => ({ spot: f, tex: makeTex(place, 'filler', f) }));
  const plainTex = makeTex(place, 'plain');
  shuffle(centers).forEach(([x, y], k) => {
    if (k < spots.length && k < centers.length - Math.floor(centers.length / 6)) grid[y][x] = addBlock({ kind: 'spot', name: spots[k][0], icon: spots[k][1], x, y, tex: makeTex(place, 'spot', spots[k]) });
    else { const f = pick(fillTex); grid[y][x] = addBlock({ kind: 'filler', name: f.spot[0], icon: f.spot[1], x, y, tex: f.tex }); }
  });
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (grid[y][x] !== null) continue;
    if (x === 0 || y === 0 || x === S - 1 || y === S - 1) grid[y][x] = outerId;
    else grid[y][x] = addBlock({ kind: 'filler', name: '', icon: '', x, y, tex: plainTex, small: true });
  }
  // いりぐち（した の まんなか）
  const gx = 2 * Math.floor(n / 2) + 1;
  const gateId = addBlock({ kind: 'gate', tex: makeTex(place, 'gate'), x: gx, y: S - 1 });
  grid[S - 1][gx] = gateId;
  M = { place, diff, S, n, grid, blocks, gate: [gx, S - 1] };
}
const isWalk = (x, y) => M && y >= 0 && x >= 0 && y < M.S && x < M.S && M.grid[y][x] === -1;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DIR_NAME = ['きた', 'ひがし', 'みなみ', 'にし'];

// みち の ながさ（となり が もくてき の ブロック に なる ところ まで）
function bfsDist(sx, sy, target) {
  const B = M.blocks[target], goal = (x, y) => DIRS.some(([dx, dy]) => x + dx === B.x && y + dy === B.y);
  const q = [[sx, sy, 0]], seen = new Set([`${sx},${sy}`]);
  while (q.length) {
    const [x, y, d] = q.shift();
    if (goal(x, y)) return d;
    for (const [dx, dy] of DIRS) { const a = x + dx, b = y + dy; if (isWalk(a, b) && !seen.has(`${a},${b}`)) { seen.add(`${a},${b}`); q.push([a, b, d + 1]); } }
  }
  return 99;
}

// ---------------------------------------------------------------------
//  ゲーム の ようす
// ---------------------------------------------------------------------
const S = {
  scr: 'start', place: 'zoo', diff: 'easy',
  x: 1, y: 1, dir: 0, // いる ところ（マス）と むき
  vx: 1.5, vy: 1.5, va: 0, // みえかた（なめらか に うごく）
  anim: null, queue: null, round: 0, target: null, steps: 0, best: 0, hintT: 0, bumpT: 0,
  total: { coins: 0, pts: 0, stars: 0 }, friend: FRIENDS[0], peek: false,
};
const angOf = (d) => d * Math.PI / 2;

function startTrip() {
  genMap(S.place, S.diff);
  S.round = 0; S.total = { coins: 0, pts: 0, stars: 0 };
  S.friend = pick(FRIENDS);
  $('friendImg').src = `img/${S.friend.img}.png`;
  // はじめ の いち：やさしい は いりぐち、ほか は どこか の まがりかど
  if (S.diff === 'easy') { S.x = M.gate[0]; S.y = M.gate[1] - 1; S.dir = 0; }
  else {
    const nodes = [];
    for (let j = 0; j < M.n; j++) for (let i = 0; i < M.n; i++) nodes.push([2 * i + 1, 2 * j + 1]);
    [S.x, S.y] = pick(nodes);
    const open = [0, 1, 2, 3].filter((d) => isWalk(S.x + DIRS[d][0], S.y + DIRS[d][1]));
    S.dir = pick(open.length ? open : [0]);
  }
  S.vx = S.x + 0.5; S.vy = S.y + 0.5; S.va = angOf(S.dir);
  show('play');
  nextTarget();
}
function nextTarget() {
  const spots = M.blocks.map((b, i) => [b, i]).filter(([b, i]) => b.kind === 'spot' && i !== S.target);
  const far = spots.filter(([, i]) => bfsDist(S.x, S.y, i) >= (S.diff === 'hard' ? 6 : 4));
  const [B, id] = pick(far.length ? far : spots);
  S.target = id; S.steps = 0; S.best = bfsDist(S.x, S.y, id); S.hintT = 0;
  S.round++;
  $('goal').innerHTML = `<span>${B.icon}</span><b>${B.name}</b><small>${S.round} / ${DIFF[S.diff].rounds}</small>`;
  say(pick([`${B.name} が みたい！ つれて いって！`, `ねえねえ、${B.name} に いきたい な！`, `${B.name} って どこ かな？ いこう！`]), 4);
  drawMapPanel();
}
let sayT = null;
function say(text, sec = 3) {
  $('bubble').textContent = text; $('bubble').hidden = false;
  clearTimeout(sayT); sayT = setTimeout(() => { $('bubble').hidden = true; }, sec * 1000);
}

// うごく
function act(a) {
  if (S.scr !== 'play') return;
  audio();
  if (S.anim) { S.queue = a; return; }
  const from = { x: S.vx, y: S.vy, a: S.va };
  if (a === 'left' || a === 'right' || a === 'back') {
    const turn = a === 'left' ? -1 : a === 'right' ? 1 : 2;
    S.dir = (S.dir + turn + 4) % 4;
    S.anim = { from, to: { x: from.x, y: from.y, a: from.a + turn * Math.PI / 2 }, t: 0, dur: a === 'back' ? 0.4 : 0.25 };
    SFX.turn();
  } else if (a === 'go') {
    const [dx, dy] = DIRS[S.dir], nx = S.x + dx, ny = S.y + dy;
    if (!isWalk(nx, ny)) { S.bumpT = 0.25; SFX.bump(); return; }
    S.x = nx; S.y = ny; S.steps++;
    S.anim = { from, to: { x: nx + 0.5, y: ny + 0.5, a: from.a }, t: 0, dur: 0.24 };
    SFX.step();
  }
}
function arrived() {
  const B = M.blocks[S.target];
  return DIRS.some(([dx, dy]) => S.x + dx === B.x && S.y + dy === B.y);
}
function onArrive() {
  const B = M.blocks[S.target], D = DIFF[S.diff];
  const stars = S.steps <= S.best + 2 ? 3 : S.steps <= S.best * 1.6 + 2 ? 2 : 1;
  const coins = D.coin + (stars - 1) * 3, pts = D.pt + (stars === 3 ? 1 : 0);
  S.total.coins += coins; S.total.pts += pts; S.total.stars += stars;
  const land = addReward(coins, pts);
  SFX.yay();
  S.scr = 'arrive';
  const last = S.round >= D.rounds;
  $('arrTitle').textContent = `やったー！ ${B.name} に ついた！`;
  $('arrBody').innerHTML = `<div class="arr-icon">${B.icon}</div>
    <div class="arr-stars">${'★'.repeat(stars)}<span>${'★'.repeat(3 - stars)}</span></div>
    <p>${S.steps}ぽ で ついた よ（いちばん ちかい みち は ${S.best}ぽ）</p>
    <div class="arr-get">🪙 ＋${coins}　⭐ ＋${pts}</div>
    ${last ? `<div class="arr-total">きょう の おでかけ：🪙 ${S.total.coins}・⭐ ${S.total.pts}<br>もってる コイン ${land.coins ?? '-'}・ポイント ${land.points ?? '-'}</div>` : ''}
    <div class="arr-friend"><img src="img/${S.friend.img}.png" alt=""><span>${pick(['ありがとう！ たのしい！', 'すごい！ ちず が よめる ね！', 'わーい！ ついた！'])}</span></div>`;
  $('arrNext').hidden = last; $('arrAgain').hidden = !last; $('arrHome').hidden = !last;
  show('arrive');
}
$('arrNext').addEventListener('click', () => { SFX.pop(); show('play'); nextTarget(); });
$('arrAgain').addEventListener('click', () => { SFX.pop(); show('start'); });
$('arrHome').addEventListener('click', () => { location.href = 'index.html'; });

// ---------------------------------------------------------------------
//  3D（レイキャスト）
// ---------------------------------------------------------------------
const cv = $('cv'), ctx = cv.getContext('2d');
let K = 1;
const FOCAL = (VW / 2) / Math.tan(33 * Math.PI / 180);
const EYE = 0.45, WALLH = 0.95;
function render3D() {
  const P = PLACES[M.place], hz = VH * 0.46 + (S.bumpT > 0 ? Math.sin(S.bumpT * 60) * 4 : 0);
  // そら・てんじょう と じめん
  let g = ctx.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, hz + 1);
  if (!P.outdoor) { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 4; i++) { const y = hz * (0.15 + i * 0.2); ctx.fillRect(VW / 2 - 120 + i * 20, y, 240 - i * 40, 6 - i); } }
  else { ctx.fillStyle = 'rgba(255,255,255,.8)'; [[80, 60, 40], [420, 90, 30], [300, 40, 24]].forEach(([x, y, r]) => { const ox = ((x - S.va * 120) % (VW + 200) + VW + 200) % (VW + 200) - 100; ctx.beginPath(); ctx.arc(ox, y, r, 0, 7); ctx.arc(ox + r, y + 6, r * 0.8, 0, 7); ctx.arc(ox - r, y + 8, r * 0.7, 0, 7); ctx.fill(); }); }
  g = ctx.createLinearGradient(0, hz, 0, VH);
  g.addColorStop(0, P.floor[1]); g.addColorStop(1, P.floor[0]);
  ctx.fillStyle = g; ctx.fillRect(0, hz, VW, VH - hz);
  const dx = Math.sin(S.va), dy = -Math.cos(S.va), px = Math.cos(S.va) * 0.65, py = Math.sin(S.va) * 0.65;
  ctx.imageSmoothingEnabled = true;
  for (let col = 0; col < VW; col++) {
    const cam = 2 * (col + 0.5) / VW - 1, rx = dx + px * cam, ry = dy + py * cam;
    let mx = Math.floor(S.vx), my = Math.floor(S.vy);
    const ddx = Math.abs(1 / (rx || 1e-9)), ddy = Math.abs(1 / (ry || 1e-9));
    const stx = rx < 0 ? -1 : 1, sty = ry < 0 ? -1 : 1;
    let sdx = rx < 0 ? (S.vx - mx) * ddx : (mx + 1 - S.vx) * ddx, sdy = ry < 0 ? (S.vy - my) * ddy : (my + 1 - S.vy) * ddy;
    let side = 0, id = null;
    for (let k = 0; k < 64; k++) {
      if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
      if (mx < 0 || my < 0 || mx >= M.S || my >= M.S) break;
      if (M.grid[my][mx] !== -1) { id = M.grid[my][mx]; break; }
    }
    if (id === null) continue;
    const perp = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
    let wx = side === 0 ? S.vy + perp * ry : S.vx + perp * rx;
    wx -= Math.floor(wx);
    let tx = Math.floor(wx * TEX);
    if ((side === 0 && rx < 0) || (side === 1 && ry > 0)) tx = TEX - 1 - tx;
    const bottom = hz + EYE * FOCAL / perp, top = hz - (WALLH - EYE) * FOCAL / perp;
    ctx.drawImage(M.blocks[id].tex, tx, 0, 1, TEX, col, top, 1, bottom - top);
    const shade = (side ? 0.12 : 0) + Math.min(0.55, perp / 14);
    if (shade > 0.01) { ctx.fillStyle = `rgba(${P.outdoor ? '120,150,190' : '150,140,130'},${shade})`; ctx.fillRect(col, top, 1, bottom - top); }
  }
  // もくてき が みえて いる と きらきら
  if (S.target != null && arrived() && S.scr === 'play') { /* つく と すぐ おわる */ }
  if (S.bumpT > 0) { ctx.fillStyle = `rgba(255,255,255,${S.bumpT})`; ctx.fillRect(0, 0, VW, VH); }
}

// ---------------------------------------------------------------------
//  ちず（みぎ がわ・おおきく も みられる）
// ---------------------------------------------------------------------
const mcv = $('mapcv'), mctx = mcv.getContext('2d');
function drawMap(g, size, big) {
  const P = PLACES[M.place], cs = size / M.S;
  g.clearRect(0, 0, size, size);
  for (let y = 0; y < M.S; y++) for (let x = 0; x < M.S; x++) {
    const id = M.grid[y][x];
    if (id === -1) g.fillStyle = P.mapPath;
    else { const B = M.blocks[id]; g.fillStyle = B.kind === 'outer' ? (P.outdoor ? '#7aa35a' : '#c9bfae') : B.kind === 'gate' ? '#c0504d' : B.kind === 'filler' ? (P.outdoor ? '#c8e6b8' : '#e7e1d6') : P.mapBlock; }
    g.fillRect(x * cs, y * cs, cs + 0.5, cs + 0.5);
  }
  g.strokeStyle = 'rgba(58,42,77,.25)'; g.lineWidth = 1;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const B of M.blocks) {
    if (B.kind === 'gate') { g.font = `900 ${Math.max(9, cs * 0.32)}px sans-serif`; g.fillStyle = '#fff'; g.fillText('いりぐち', (B.x + 0.5) * cs, (B.y + 0.5) * cs); continue; }
    if (B.kind !== 'spot' && !(B.kind === 'filler' && !B.small)) continue;
    const cx = (B.x + 0.5) * cs, cy = (B.y + 0.5) * cs;
    g.font = `${cs * (B.kind === 'spot' ? 0.78 : 0.6)}px sans-serif`;
    g.fillStyle = '#000'; g.fillText(B.icon, cx, cy - (big ? cs * 0.12 : 0));
    if (B.kind === 'spot' && (big || cs >= 34)) {
      g.font = `900 ${Math.max(9, cs * (big ? 0.26 : 0.27))}px sans-serif`;
      g.lineWidth = 3; g.strokeStyle = '#fffaf0'; g.strokeText(B.name, cx, cy + cs * 0.42); g.fillStyle = '#3a2a4d'; g.fillText(B.name, cx, cy + cs * 0.42);
    }
    if (M.blocks.indexOf(B) === S.target) { g.strokeStyle = '#ff3b6b'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, cs * 0.62, 0, 7); g.stroke(); }
  }
  // いま ここ（やさしい・ヒント の とき）
  if (DIFF[S.diff].showMe || S.hintT > 0) {
    const cx = (S.vx) * cs, cy = (S.vy) * cs, r = cs * 0.42;
    if (S.hintT > 0 && Math.floor(S.hintT * 6) % 2 === 0 && !DIFF[S.diff].showMe) return;
    g.save(); g.translate(cx, cy); g.rotate(S.va);
    g.fillStyle = '#ff3b6b'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.75, r * 0.7); g.lineTo(0, r * 0.35); g.lineTo(-r * 0.75, r * 0.7); g.closePath(); g.fill(); g.stroke();
    g.restore();
    if (big || cs > 26) { g.font = `900 ${Math.max(10, cs * 0.3)}px sans-serif`; g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText('いま ここ', cx, cy - cs * 0.62); g.fillStyle = '#ff3b6b'; g.fillText('いま ここ', cx, cy - cs * 0.62); }
  }
}
function drawMapPanel() {
  const size = 330;
  mcv.width = Math.round(size * K); mcv.height = Math.round(size * K);
  mctx.setTransform(K, 0, 0, K, 0, 0);
  drawMap(mctx, size, false);
  if ($('bigmap') && !$('bigmap').hidden) {
    const b = $('bigcv'), bs = 500;
    b.width = Math.round(bs * K); b.height = Math.round(bs * K);
    const bg = b.getContext('2d'); bg.setTransform(K, 0, 0, K, 0, 0);
    drawMap(bg, bs, true);
  }
}

// ---------------------------------------------------------------------
//  がめん
// ---------------------------------------------------------------------
const SCRS = { start: 'scrStart', arrive: 'scrArrive' };
function show(name) {
  S.scr = name;
  Object.entries(SCRS).forEach(([k, id]) => { $(id).hidden = k !== name; });
  $('hud').hidden = !(name === 'play' || name === 'arrive');
  if (name === 'start') renderStart();
  $('stage').scrollTop = 0;
}
function renderStart() {
  $('placeList').innerHTML = Object.entries(PLACES).map(([k, P]) => `<button type="button" class="pk big-pk${k === S.place ? ' on' : ''}" data-k="${k}"><i>${P.icon}</i>${P.name}</button>`).join('');
  $('diffList').innerHTML = Object.entries(DIFF).map(([k, D]) => `<button type="button" class="pk${k === S.diff ? ' on' : ''}" data-k="${k}">${D.name}<small>${D.desc}</small></button>`).join('');
  $('placeList').querySelectorAll('.pk').forEach((b) => b.addEventListener('click', () => { S.place = b.dataset.k; SFX.pop(); renderStart(); }));
  $('diffList').querySelectorAll('.pk').forEach((b) => b.addEventListener('click', () => { S.diff = b.dataset.k; SFX.pop(); renderStart(); }));
}
$('goTrip').addEventListener('click', () => { audio(); SFX.pop(); startTrip(); });
$('startHome').addEventListener('click', () => { location.href = 'index.html'; });
$('tripQuit').addEventListener('click', () => { if (confirm('おでかけ を やめる？')) show('start'); });
$('hint').addEventListener('click', () => {
  if (S.scr !== 'play') return;
  S.hintT = 3; SFX.pop();
  const [dx, dy] = DIRS[S.dir];
  say(DIFF[S.diff].showMe ? 'ちず の あか い やじるし が いま いる ところ だよ。やじるし の さき が まえ！' : `ちず を みて！ いま ${DIR_NAME[S.dir]} を むいて いる よ`, 4);
  void dx; void dy;
});
['left', 'go', 'right', 'back'].forEach((a) => {
  const b = $(`b_${a}`);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); act(a); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => b.classList.remove('on')));
});
mcv.addEventListener('click', () => { if (S.scr !== 'play') return; $('bigmap').hidden = false; SFX.pop(); drawMapPanel(); });
$('bigmap').addEventListener('click', () => { $('bigmap').hidden = true; SFX.pop(); });
addEventListener('keydown', (e) => {
  audio();
  if (!$('bigmap').hidden && (e.code === 'Escape' || e.code === 'KeyM')) { $('bigmap').hidden = true; return; }
  if (S.scr !== 'play') return;
  const k = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'go', KeyW: 'go', ArrowDown: 'back', KeyS: 'back' }[e.code];
  if (k) { act(k); e.preventDefault(); }
  if (e.code === 'KeyM') { $('bigmap').hidden = false; drawMapPanel(); }
  if (e.code === 'KeyH') $('hint').click();
});

function fit() {
  const k = Math.min(innerWidth / W, innerHeight / H);
  $('stage').style.transform = `translate(-50%, -50%) scale(${k})`;
  K = Math.min(3, k * (devicePixelRatio || 1));
  cv.width = Math.round(VW * K); cv.height = Math.round(VH * K);
  if (M) drawMapPanel();
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 200));
$('stage').addEventListener('scroll', (e) => { e.target.scrollTop = 0; e.target.scrollLeft = 0; });

// ---------------------------------------------------------------------
//  ループ
// ---------------------------------------------------------------------
let last = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
  if (M && (S.scr === 'play' || S.scr === 'arrive')) {
    if (S.anim) {
      const A = S.anim; A.t += dt;
      const k = clamp(A.t / A.dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      S.vx = A.from.x + (A.to.x - A.from.x) * e; S.vy = A.from.y + (A.to.y - A.from.y) * e; S.va = A.from.a + (A.to.a - A.from.a) * e;
      if (k >= 1) {
        S.anim = null; S.va = angOf(S.dir); S.vx = S.x + 0.5; S.vy = S.y + 0.5;
        if (S.scr === 'play' && arrived()) setTimeout(onArrive, 250);
        else if (S.queue) { const q = S.queue; S.queue = null; act(q); }
      }
      drawMapPanel();
    }
    S.bumpT = Math.max(0, S.bumpT - dt);
    if (S.hintT > 0) { S.hintT = Math.max(0, S.hintT - dt); drawMapPanel(); }
    ctx.setTransform(K, 0, 0, K, 0, 0);
    render3D();
  }
  requestAnimationFrame(frame);
}

Promise.all(FRIENDS.map((f) => loadImg(f.img))).then(() => {
  fit();
  show('start');
  requestAnimationFrame(frame);
});

window.MAP_TEST = { S, show, M: () => M, act, genMap, bfsDist, startTrip, onArrive, isWalk, DIRS };

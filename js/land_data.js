'use strict';
// =====================================================================
//  ちゅなランド：コイン の ちょきん・ポイント・ガチャ・シール・きせかえ・けん・もんだい
// =====================================================================

const irnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------------
//  セーブ（ラン の セーブ とは べつ。この たんまつ の ブラウザ に のこる）
// ---------------------------------------------------------------------
const LAND_KEY = 'chunaland:v1';
let LAND = null;
const LAND_NEW = () => ({
  coins: 0, points: 0, stamps: 0, pulls: 0, dgFree: true,
  stickers: {}, wear: { hat: null, trail: null }, owned: {},
  tickets: [], pin: null, dgBest: {}, mainLeft: null, log: [],
});
function loadLand() {
  try { LAND = { ...LAND_NEW(), ...(JSON.parse(localStorage.getItem(LAND_KEY) || 'null') || {}) }; } catch { LAND = LAND_NEW(); }
}
function writeLand() {
  try { localStorage.setItem(LAND_KEY, JSON.stringify(LAND)); } catch { /* ほぞん できない とき は なにもしない */ }
}
loadLand();

// ---------------------------------------------------------------------
//  ガチャ
// ---------------------------------------------------------------------
const GACHA = { cost: 10, ceil: 300 };
// ほんもの の プレゼント けん（おうち の ひと が かって くれる）
const TICKETS = {
  snack: { rank: 'あたり', name: 'すきな おかし 1こ けん', icon: '🍬', color: '#ffb347' },
  clothes: { rank: 'おおあたり', name: 'すきな ふく を かって あげる けん', icon: '👗', color: '#ff6fa8' },
  book: { rank: 'おおあたり', name: 'すきな ほん を かって あげる けん', icon: '📚', color: '#7a4fd0' },
  toy: { rank: 'めっっちゃ おおあたり', name: 'すきな おもちゃ を かって あげる けん', icon: '🧸', color: '#ff3b6b' },
};
// かくりつ（%）。のこり は シール・きせかえ
const ODDS = [
  ['toy', 0.5], ['clothes', 0.5], ['book', 0.5], ['snack', 5],
  ['wear', 15], ['rare', 10], // のこり（68.5%）は ふつう の シール
];

// シール（ステラクエスト の え）
const STICKERS = [
  // id, なまえ, え, いろ（tint）, レア
  ['grape', 'ぐれーぷすらいむ', 'grape'], ['weo', 'うぇーおー', 'weo'],
  ['weo_p', 'ピンク うぇーおー', 'weo', '#ff9ad5'], ['weo_b', 'みずいろ うぇーおー', 'weo', '#7fe3f0'], ['weo_y', 'きいろ うぇーおー', 'weo', '#ffd84a'],
  ['weo_v', 'むらさき うぇーおー', 'weo', '#b98aff'], ['weo_g', 'みどり うぇーおー', 'weo', '#6fdc8c'],
  ['family', '3にんかぞく すらいむ', 'family'], ['nyanko', 'にゃんこ', 'nyanko'],
  ['chuna', 'ちゅな', 'chuna'], ['kenshi', 'かずぅ', 'kenshi'], ['odoriko', 'みなり', 'odoriko'],
  ['v_king', 'おうさま', 'v_king'], ['v_princess', 'おひめさま', 'v_princess'], ['v_guard', 'このえへい', 'v_guard'],
  ['v_girl', 'むら の おんなのこ', 'v_girl'], ['v_boy', 'むら の おとこのこ', 'v_boy'], ['v_man', 'おとな の おとこ', 'v_man'],
  ['v_woman', 'おとな の おんな', 'v_woman'], ['v_grandpa', 'おじいちゃん', 'v_grandpa'], ['v_grandma', 'おばあちゃん', 'v_grandma'],
  ['v_gate', 'もんばん の へいし', 'v_gate'], ['v_alto', 'けんじゃ アルト', 'v_alto'],
  ['shima', 'しまじろう', 'shima', null, true], ['siren', 'セイレーン', 'siren', null, true], ['ningyo', 'にんぎょ', 'ningyo', null, true],
  ['boss', 'らすぼす どらぎょ', 'boss', null, true], ['grape_gold', 'きんいろ ぐれーぷ', 'grape', '#ffd84a', true],
  ['chuna_k', 'キラキラ ちゅな', 'chuna', null, true], ['nyanko_k', 'キラキラ にゃんこ', 'nyanko', null, true],
].map(([id, name, img, tint, rare]) => ({ id, name, img, tint: tint || null, rare: !!rare }));
const STICKER = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

// きせかえ（ラン で つかえる）
const WEARS = [
  ['ribbon', 'hat', '🎀', 'リボン'], ['crown', 'hat', '👑', 'おうかん'], ['flower', 'hat', '🌸', 'おはな'], ['tophat', 'hat', '🎩', 'シルクハット'],
  ['cap', 'hat', '🧢', 'ぼうし'], ['strawberry', 'hat', '🍓', 'いちご'], ['star', 'hat', '⭐', 'おほしさま'],
  ['sparkle', 'trail', '✨', 'キラキラ'], ['hearts', 'trail', '💖', 'ハート'], ['rainbow', 'trail', '🌈', 'にじ'], ['bubbles', 'trail', '🫧', 'あわ'],
  ['notes', 'trail', '🎵', 'おんぷ'], ['petals', 'trail', '🌸', 'はなびら'],
].map(([id, slot, icon, name]) => ({ id, slot, icon, name }));
const WEAR = Object.fromEntries(WEARS.map((w) => [w.id, w]));

// 1かい まわす（けっか は すぐ ほぞん する。よみこみ なおし で やりなおせない）
function pullOnce() {
  LAND.points -= GACHA.cost;
  LAND.pulls++;
  LAND.stamps++;
  let kind = 'sticker';
  if (LAND.stamps >= GACHA.ceil) kind = 'toy';
  else {
    let r = Math.random() * 100;
    for (const [k, p] of ODDS) { r -= p; if (r < 0) { kind = k; break; } }
  }
  const res = { kind, t: Date.now() };
  if (TICKETS[kind]) {
    const tk = { id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, kind, date: Date.now(), used: false, ceil: kind === 'toy' && LAND.stamps >= GACHA.ceil };
    LAND.tickets.push(tk);
    res.ticket = tk;
    if (kind === 'toy') LAND.stamps = 0; // おもちゃ が でたら スタンプ は はじめ から
  } else if (kind === 'wear') {
    const left = WEARS.filter((w) => !LAND.owned[w.id]);
    if (left.length) { const w = pick(left); LAND.owned[w.id] = true; res.wear = w.id; }
    else { res.kind = 'rare'; }
  }
  if (res.kind === 'rare' || res.kind === 'sticker') {
    const pool = STICKERS.filter((s) => s.rare === (res.kind === 'rare'));
    const s = pick(pool);
    res.sticker = s.id;
    res.isNew = !LAND.stickers[s.id];
    LAND.stickers[s.id] = (LAND.stickers[s.id] || 0) + 1;
  }
  LAND.log.unshift({ t: res.t, kind: res.kind, sticker: res.sticker || null, wear: res.wear || null });
  LAND.log.length = Math.min(LAND.log.length, 200);
  writeLand();
  return res;
}

// ---------------------------------------------------------------------
//  もんだい（4たく）
// ---------------------------------------------------------------------
const DIFFS = {
  easy: { name: 'やさしい', pt: 1 },
  normal: { name: 'ふつう', pt: 2 },
  hard: { name: 'むずかしい', pt: 3 },
  main: { name: 'メイン かんじ', pt: 3 },
};
const SUBJECTS = {
  math: { name: 'さんすう', icon: '🔢' },
  kanji: { name: 'かんじ', icon: '🈴' },
  english: { name: 'えいご', icon: '🔤' },
  music: { name: 'おんがく', icon: '🎵' },
};
const pick4 = (ans, pool, key = (x) => x) => {
  const others = shuffle(pool.filter((x) => key(x) !== key(ans)));
  const seen = new Set([key(ans)]), out = [ans];
  for (const o of others) { if (out.length >= 4) break; if (!seen.has(key(o))) { seen.add(key(o)); out.push(o); } }
  return shuffle(out);
};

// さんすう（ステラクエスト と おなじ なんいど）
const mk = (a, op, b) => ({ a, op, b, ans: op === '+' ? a + b : a - b });
const MATH = {
  1: [() => { const a = irnd(1, 8); return mk(a, '+', irnd(1, 9 - a)); }, () => { const a = irnd(2, 9); return mk(a, '-', irnd(1, a - 1)); }],
  2: [() => { const u = irnd(0, 8); return mk(10 + u, '+', irnd(1, 9 - u)); }, () => { const u = irnd(1, 9); return mk(10 + u, '-', irnd(1, u)); }],
  3: [() => { const ua = irnd(0, 9); return mk(irnd(1, 2) * 10 + ua, '+', irnd(1, 2) * 10 + irnd(0, 9 - ua)); },
    () => { let a, b; do { const ta = irnd(1, 2), ua = irnd(0, 9); a = ta * 10 + ua; b = irnd(1, ta) * 10 + irnd(0, ua); } while (a === b); return mk(a, '-', b); }],
  4: [() => { const a = irnd(2, 9); return mk(a, '+', irnd(10 - a, 9)); }, () => mk(10, '-', irnd(1, 9))],
  5: [() => { const u = irnd(1, 9); return mk(10 + u, '+', irnd(10 - u, 9)); }, () => { const u = irnd(1, 8); return mk(10 + u, '-', irnd(u + 1, 9)); }],
  6: [() => { const ua = irnd(1, 9); return mk(irnd(1, 2) * 10 + ua, '+', irnd(1, 2) * 10 + irnd(10 - ua, 9)); }, () => { const ua = irnd(0, 8); return mk(20 + ua, '-', 10 + irnd(ua + 1, 9)); }],
};
const LV = { easy: [1, 2], normal: [3, 4], hard: [5, 6], main: [5, 6] };
function mathQ(diff) {
  const q = pick(MATH[pick(LV[diff])])();
  const near = [q.ans + 1, q.ans - 1, q.ans + 2, q.ans - 2, q.ans + 10, q.ans - 10, q.ans + 3].filter((v) => v >= 0);
  const opts = pick4(q.ans, near);
  return { html: `<span class="q-math">${q.a} ${q.op === '-' ? '−' : '＋'} ${q.b} ＝ ？</span>`, opts: opts.map(String), ans: opts.indexOf(q.ans), say: `${q.ans}` };
}

// かんじ（よみかた を えらぶ）
const KLIST = window.LAND_KANJI || [];
function kanjiQ(diff, entry) {
  const lv = { easy: [1, 2], normal: [3, 4], hard: [5, 6] }[diff];
  const pool = diff === 'main' ? KLIST.filter((k) => k.level === 'main') : KLIST.filter((k) => lv.includes(k.level));
  const e = entry || pick(pool);
  const opts = pick4(e, KLIST, (k) => k.reading);
  return { html: `<span class="q-kanji">${e.word}</span><span class="q-sub">よみかた は どれ？</span>`, opts: opts.map((o) => o.reading), ans: opts.indexOf(e), word: e.word, say: e.reading };
}

// えいご
const UPPER = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], LOWER = UPPER.map((c) => c.toLowerCase());
const ABC_READ = ['えー', 'びー', 'しー', 'でぃー', 'いー', 'えふ', 'じー', 'えいち', 'あい', 'じぇー', 'けー', 'える', 'えむ', 'えぬ', 'おー', 'ぴー', 'きゅー', 'あーる', 'えす', 'てぃー', 'ゆー', 'ぶい', 'だぶりゅー', 'えっくす', 'わい', 'ぜっと'];
const FIRST_WORDS = [
  ['a', 'ant', '🐜'], ['b', 'bus', '🚌'], ['c', 'cat', '🐱'], ['d', 'dog', '🐶'], ['e', 'egg', '🥚'], ['f', 'fish', '🐟'],
  ['g', 'gift', '🎁'], ['h', 'hat', '🎩'], ['i', 'igloo', '🛖'], ['j', 'juice', '🧃'], ['k', 'kite', '🪁'], ['l', 'lion', '🦁'],
  ['m', 'moon', '🌙'], ['n', 'nut', '🥜'], ['o', 'octopus', '🐙'], ['p', 'pig', '🐷'], ['q', 'queen', '👑'], ['r', 'rabbit', '🐰'],
  ['s', 'sun', '☀️'], ['t', 'tiger', '🐯'], ['u', 'umbrella', '☂️'], ['v', 'van', '🚐'], ['w', 'web', '🕸️'], ['y', 'yo-yo', '🪀'], ['z', 'zebra', '🦓'],
];
const CVC = [
  ['cat', '🐱'], ['hat', '🎩'], ['bag', '👜'], ['van', '🚐'], ['bed', '🛏️'], ['hen', '🐔'], ['pen', '🖊️'], ['web', '🕸️'],
  ['pig', '🐷'], ['six', '6️⃣'], ['lip', '👄'], ['dog', '🐶'], ['box', '📦'], ['fox', '🦊'], ['sun', '☀️'], ['bus', '🚌'], ['cup', '🥤'], ['bug', '🐛'],
];
function speakEn(text, rate = 0.8) {
  try {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = rate; u.pitch = 1.1;
    speechSynthesis.speak(u);
  } catch { /* よめなくても あそべる */ }
}
function englishQ(diff) {
  const lv = pick(LV[diff]);
  if (lv <= 2) {
    const i = irnd(0, 25), list = lv === 1 ? UPPER : LOWER, ans = list[i], opts = pick4(ans, list);
    return { html: `<span class="q-sub">「${ABC_READ[i]}」の ${lv === 1 ? 'おおもじ' : 'こもじ'} は どれ？</span>`, opts, ans: opts.indexOf(ans), eng: true, speak: () => speakEn(UPPER[i]) };
  }
  if (lv === 3) {
    const i = irnd(0, 25), ans = LOWER[i], opts = pick4(ans, LOWER);
    return { html: `<span class="q-eng">${UPPER[i]}</span><span class="q-sub">の こもじ は どれ？</span>`, opts, ans: opts.indexOf(ans), eng: true, speak: () => speakEn(UPPER[i]) };
  }
  if (lv === 4) {
    const w = pick(FIRST_WORDS), opts = pick4(w[0], LOWER.filter((c) => c !== 'x'));
    return { html: `<span class="q-pic">${w[2]}</span><span class="q-eng sm">${w[1]}</span><span class="q-sub">は どの もじ で はじまる？</span>`, opts, ans: opts.indexOf(w[0]), eng: true, speak: () => speakEn(`${w[1]}. ${w[1]}.`, 0.7) };
  }
  if (lv === 5) {
    const w = pick(CVC), v = w[0][1], opts = pick4(v, ['a', 'e', 'i', 'o', 'u']);
    return { html: `<span class="q-pic">${w[1]}</span><span class="q-eng sm">${w[0][0]}<u>&nbsp;?&nbsp;</u>${w[0][2]}</span><span class="q-sub">まんなか の おと は？</span>`, opts, ans: opts.indexOf(v), eng: true, speak: () => speakEn(`${w[0]}. ${w[0]}.`, 0.6) };
  }
  const w = pick(CVC), opts = pick4(w, CVC, (x) => x[0]);
  return { html: `<span class="q-eng">${w[0]}</span><span class="q-sub">は どれ？</span>`, opts: opts.map((o) => o[1]), ans: opts.indexOf(w), pic: true, speak: () => speakEn(w[0], 0.6) };
}

// おんがく（ごせんふ の おんぷ・きいて あてる）
const NOTE_NAMES = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド', 'レ', 'ミ'];
const NOTE_FREQ = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659];
const NOTE_LABEL = (i) => (i >= 7 ? `たかい ${NOTE_NAMES[i]}` : NOTE_NAMES[i]);
function staffSvg(i) {
  // した の せん ＝ ミ（i=2）。1だん ＝ 10px
  const W = 260, top = 30, gap = 20, yOf = (k) => top + gap * 4 - (k - 2) * (gap / 2), y = yOf(i), x = 170;
  let s = `<svg class="q-staff" viewBox="0 0 ${W} 150" width="${W}" height="150">`;
  for (let l = 0; l < 5; l++) s += `<line x1="10" x2="${W - 10}" y1="${top + l * gap}" y2="${top + l * gap}" stroke="#3a2a4d" stroke-width="2.5"/>`;
  s += `<text x="16" y="${top + gap * 4 + 14}" font-size="96" fill="#3a2a4d" font-family="serif">𝄞</text>`;
  if (i === 0) s += `<line x1="${x - 22}" x2="${x + 22}" y1="${yOf(0)}" y2="${yOf(0)}" stroke="#3a2a4d" stroke-width="2.5"/>`;
  s += `<ellipse cx="${x}" cy="${y}" rx="13" ry="9.5" transform="rotate(-20 ${x} ${y})" fill="#3a2a4d"/>`;
  s += i >= 6 ? `<line x1="${x - 12}" x2="${x - 12}" y1="${y}" y2="${y + 52}" stroke="#3a2a4d" stroke-width="3"/>` : `<line x1="${x + 12}" x2="${x + 12}" y1="${y}" y2="${y - 52}" stroke="#3a2a4d" stroke-width="3"/>`;
  return s + '</svg>';
}
function playNote(i) { if (!audio()) return; note(NOTE_FREQ[i], 0, 0.7, { type: 'sine', vol: 0.12 }); }
function musicQ(diff) {
  if (diff === 'hard' && Math.random() < 0.5) { // きいて あてる
    const i = irnd(0, 7), opts = pick4(i, [0, 1, 2, 3, 4, 5, 6, 7]);
    return { html: '<span class="q-pic">👂</span><span class="q-sub">この おと は どれ？</span>', opts: opts.map(NOTE_LABEL), ans: opts.indexOf(i), listen: true, speak: () => playNote(i), auto: true };
  }
  const range = { easy: 4, normal: 7, hard: 9 }[diff];
  const i = irnd(0, range), opts = pick4(i, Array.from({ length: range + 1 }, (_, k) => k), (k) => NOTE_NAMES[k] + (k >= 7 ? 'h' : ''));
  return { html: staffSvg(i) + '<span class="q-sub">この おんぷ は どれ？</span>', opts: opts.map(NOTE_LABEL), ans: opts.indexOf(i), speak: () => playNote(i) };
}

function makeQuestion(subj, diff, entry) {
  if (subj === 'kanji') return kanjiQ(diff, entry);
  if (subj === 'english') return englishQ(diff);
  if (subj === 'music') return musicQ(diff);
  return mathQ(diff);
}

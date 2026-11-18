'use strict';
// =====================================================================
//  ちゅなちゃんラン：はしる・ジャンプ・てき・ボス・レア・アイテム・けしき
//  よこ に じどう で すすむ。きょり（m）を きそう。250m ごと に はやく なる。1000m ごと に ボス
// =====================================================================

const W = 960, H = 540, GROUND = 405, PXM = 40, HERO_SX = 230;
const PHY = { g: 2600, jumpV: 1020, cut: -9999, coyote: 0.1, buffer: 0.13, base: 330, step: 24, max: 760 }; // cut：はやく はなした とき の ひくい ジャンプ（こども むけ に つかわない）
const HERO = { w: 44, h: 92, drawH: 118 };
const ENEMY = {
  grape: { img: 'grape', h: 62, w: 70, vx: -50, stomp: true, hp: 1 },
  weo: { img: 'weo', h: 64, w: 56, vx: -40, stomp: true, hp: 1, hop: true },
  fly: { img: 'weo', h: 58, w: 54, vx: -90, stomp: true, hp: 1, fly: true },
  family: { img: 'family', h: 112, w: 66, vx: -30, stomp: true, hp: 2 },
  shima: { img: 'shima', h: 150, w: 90, vx: -170, stomp: true, hp: 1, rare: true },
};
const WEO_TINTS = ['#ff9ad5', '#7fe3f0', '#ffd84a', '#b98aff', '#6fdc8c', '#ffad5a'];
const DAY = [ // [いち, うえ の いろ, した の いろ, あかるさ, なまえ]
  [0.00, '#6ec6ff', '#d4f0ff', 1.0, '☀ あさ'],
  [0.30, '#6ec6ff', '#d4f0ff', 1.0, null],
  [0.40, '#ff8a5c', '#ffd28a', 0.85, '🌇 ゆうがた'],
  [0.52, '#2a2f7a', '#5a5aa8', 0.55, '🌙 よる'],
  [0.68, '#0b0f2e', '#2a1d5c', 0.42, '✨ ほしぞら'],
  [0.90, '#0b0f2e', '#2a1d5c', 0.42, null],
  [1.00, '#6ec6ff', '#d4f0ff', 1.0, null],
];
const DAY_LEN = 2400; // m で 1しゅう

const cv = $('cv'), ctx = cv.getContext('2d');
let G = null, PAUSED = false, VIEW_K = 1, FORCE_SEG = null;
const RUN = { onGameOver: null };

// ---------------------------------------------------------------------
//  はじめる
// ---------------------------------------------------------------------
function newRun(chara, demo = false) {
  G = {
    chara, demo, t: 0, x: 0, y: GROUND, vy: 0, onGround: true, jumps: 0, coyote: 0, buffer: 0, holding: false, cutOK: false,
    hp: 3, inv: 0, barrier: false, buffs: {}, gauge: 0, coins: 0, kills: 0, cool: 0, speed: PHY.base,
    dist: 0, nextSpeed: 250, nextBoss: 1000, bossN: 0, bossMode: false,
    ground: [{ x0: -600, x1: 900 }], plats: [], obs: [], enemies: [], coinsArr: [], items: [], shots: [], foes: [], fx: [], pops: [],
    genX: 900, boss: null, rare: null, water: 0, special: null, slash: null, ring: null, nyankoT: 0, bridge: 0,
    over: false, deadT: 0, shake: 0, flash: 0, flashColor: '255,255,255', recordShown: false, best: SAVE.best || 0,
    phaseName: '☀ あさ', speedFx: 0, safe: 2, landT: 0,
  };
  for (let i = 0; i < 6; i++) genSegment();
  PAUSED = false;
}
const camX = () => G.x - HERO_SX;
const visible = (x, m = 80) => x > camX() - m && x < camX() + W + m;

// ---------------------------------------------------------------------
//  みち を つくる（すこし さき まで）
// ---------------------------------------------------------------------
function pushGround(x0, x1) {
  const last = G.ground[G.ground.length - 1];
  if (last && Math.abs(last.x1 - x0) < 1) last.x1 = x1; else G.ground.push({ x0, x1 });
}
const coinLine = (x, y, n, gap = 48) => { for (let i = 0; i < n; i++) G.coinsArr.push({ x: x + i * gap, y }); };
const coinArc = (x, w, top, n = 5) => { for (let i = 0; i < n; i++) { const k = i / (n - 1); G.coinsArr.push({ x: x + k * w, y: GROUND - 40 - Math.sin(k * Math.PI) * top }); } };
const addEnemy = (kind, x, y = GROUND) => {
  const d = ENEMY[kind], e = { kind, x, y, baseY: y, vy: 0, t: rnd(0, 6), hp: d.hp, hitT: 0, dead: false };
  if (kind === 'weo' || kind === 'fly') e.tint = pick(WEO_TINTS);
  if (y !== GROUND && !d.fly) e.still = true; // あしば の うえ は うごかない
  G.enemies.push(e);
  return e;
};
function genSegment() {
  const x = G.genX, s = G.speed, air = 2 * PHY.jumpV / PHY.g, d = clamp(G.dist / 3000, 0, 1);
  let len = 400;
  const flat = (n) => { pushGround(x, x + n); return n; };
  // デモ・ボス・みず の なか・はじめ：あんぜん な みち
  if (G.demo || G.safe > 0 || G.bossMode || G.water > 0) {
    G.safe = Math.max(0, G.safe - 1);
    len = flat(rnd(380, 520));
    if (Math.random() < 0.6) coinLine(x + 80, GROUND - (Math.random() < 0.5 ? 40 : 150), 5);
    if (G.bossMode && Math.random() < 0.35) { G.plats.push({ x: x + 120, y: GROUND - 120, w: 170 }); coinLine(x + 140, GROUND - 160, 3, 50); }
    if (G.water > 0 && Math.random() < 0.5) coinArc(x + 60, 300, 220, 6);
    G.genX += len;
    return;
  }
  // レア が でる
  if (G.dist > 250 && !G.rare && !G.boss && Math.random() < 0.016) {
    const r = Math.random(), kind = r < 0.5 ? 'shima' : r < 0.75 ? 'siren' : 'ningyo';
    spawnRare(kind);
    if (kind !== 'siren') { genSegment(); return; }
  }
  const table = [
    ['flat', 10], ['pit', 14 + d * 10], ['pitPlat', 5 + d * 6], ['rock', 8], ['crate', 6], ['spike', 4 + d * 6],
    ['grape', 10], ['weo', 7 + d * 3], ['fly', 3 + d * 7], ['family', d > 0.15 ? 5 : 0], ['stairs', 7], ['high', d > 0.1 ? 6 : 0],
    ['item', 5], ['coins', 6], ['star', 2.5], ['pitEnemy', d > 0.3 ? 6 : 0],
    ['pit2', d > 0.03 ? 7 + d * 5 : 0], ['lift', d > 0.08 ? 6 : 0], ['crumble', 6], ['spring', 5],
    ['crate2', d > 0.15 ? 4 : 0], ['roll', d > 0.1 ? 5 + d * 3 : 0], ['islands', d > 0.2 ? 4 + d * 4 : 0],
  ];
  const tot = table.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * tot, kind = 'flat';
  for (const [k, w] of table) { r -= w; if (r <= 0) { kind = k; break; } }
  if (FORCE_SEG) { kind = FORCE_SEG; FORCE_SEG = null; }
  switch (kind) {
    case 'flat': len = flat(rnd(300, 480)); if (Math.random() < 0.5) coinLine(x + 60, GROUND - 40, 5); break;
    case 'pit': case 'pitEnemy': {
      const gap = Math.max(90, s * air * (0.3 + 0.24 * d));
      pushGround(x, x + 140);
      coinArc(x + 140 - 20, gap + 40, 150);
      pushGround(x + 140 + gap, x + 140 + gap + 300);
      if (kind === 'pitEnemy') addEnemy(Math.random() < 0.5 ? 'grape' : 'weo', x + 140 + gap + 220);
      len = 140 + gap + 300; break;
    }
    case 'pitPlat': {
      const gap = s * air * (0.85 + 0.35 * d), pw = 160;
      pushGround(x, x + 140);
      const px = x + 140 + gap / 2 - pw / 2;
      G.plats.push({ x: px, y: GROUND - 120, w: pw });
      coinLine(px + 30, GROUND - 160, 3, 50);
      pushGround(x + 140 + gap, x + 140 + gap + 300);
      len = 140 + gap + 300; break;
    }
    case 'rock': case 'crate': len = flat(440); G.obs.push({ type: kind, x: x + 220, w: kind === 'rock' ? 66 : 60, h: kind === 'rock' ? 56 : 60 }); coinLine(x + 214, GROUND - 120, 2, 40); break;
    case 'spike': { len = flat(460); const w = 70 + Math.round(d * 2) * 40; G.obs.push({ type: 'spike', x: x + 200, w, h: 26 }); coinArc(x + 160, w + 80, 160, 4); break; }
    case 'grape': case 'weo': len = flat(520); addEnemy(kind, x + 320); if (Math.random() < 0.3 + d * 0.4) addEnemy('grape', x + 460); break;
    case 'fly': len = flat(520); addEnemy('fly', x + 360, GROUND - rnd(140, 190)); coinLine(x + 160, GROUND - 40, 4); break;
    case 'family': len = flat(560); addEnemy('family', x + 360); break;
    case 'stairs': {
      len = flat(760);
      G.plats.push({ x: x + 140, y: GROUND - 115, w: 170 }, { x: x + 360, y: GROUND - 220, w: 170 });
      coinLine(x + 160, GROUND - 155, 3, 50); coinLine(x + 380, GROUND - 260, 3, 50);
      if (Math.random() < 0.35) G.items.push({ x: x + 560, y: GROUND - 300, id: pickItem(), t: 0 });
      else if (Math.random() < 0.4) G.coinsArr.push({ x: x + 600, y: GROUND - 300, star: true });
      break;
    }
    case 'high': { // うえ の みち（した は あな）
      pushGround(x, x + 150);
      G.plats.push({ x: x + 110, y: GROUND - 120, w: 220 }, { x: x + 400, y: GROUND - 150, w: 220 });
      coinLine(x + 140, GROUND - 160, 4, 50); coinLine(x + 430, GROUND - 190, 4, 50);
      if (Math.random() < 0.5) addEnemy('grape', x + 560, GROUND - 150);
      pushGround(x + 680, x + 980);
      len = 980; break;
    }
    case 'pit2': { // あな が 2つ つづく
      const gap = Math.max(90, s * air * (0.3 + 0.15 * d));
      pushGround(x, x + 140);
      coinArc(x + 120, gap + 40, 140, 4);
      pushGround(x + 140 + gap, x + 140 + gap + 230);
      const x2 = x + 140 + gap + 230;
      coinArc(x2 - 20, gap + 40, 140, 4);
      pushGround(x2 + gap, x2 + gap + 300);
      len = x2 + gap + 300 - x; break;
    }
    case 'lift': { // おおきな あな と うえした に うごく あしば
      const gap = s * air * 1.45, pw = 150;
      pushGround(x, x + 140);
      const px = x + 140 + gap / 2 - pw / 2;
      G.plats.push({ x: px, y: GROUND - 90, baseY: GROUND - 40, w: pw, mv: { amp: 130, sp: 2.4, ph: rnd(0, 6) }, kind: 'lift' });
      G.coinsArr.push({ x: px + pw / 2, y: GROUND - 260, star: Math.random() < 0.4 });
      pushGround(x + 140 + gap, x + 140 + gap + 300);
      len = 140 + gap + 300; break;
    }
    case 'crumble': { // ふむ と おちる はし（とまらず はしれば だいじょうぶ）
      const n = 3 + Math.round(d * 2), bw = 110, step = 124;
      pushGround(x, x + 160);
      for (let i = 0; i < n; i++) G.plats.push({ x: x + 170 + i * step, y: GROUND, w: bw, crumble: true, kind: 'crumble' });
      coinLine(x + 190, GROUND - 50, n * 2, 62);
      const end = x + 170 + n * step + 4;
      pushGround(end, end + 300);
      len = end + 300 - x; break;
    }
    case 'spring': { // ばね で びよーん
      len = flat(620);
      G.obs.push({ type: 'spring', x: x + 200, w: 64, h: 24 });
      coinArc(x + 200, 300, 330, 6);
      G.coinsArr.push({ x: x + 350, y: GROUND - 370, star: true });
      break;
    }
    case 'crate2': len = flat(460); G.obs.push({ type: 'crate2', x: x + 220, w: 60, h: 116 }); coinLine(x + 220, GROUND - 160, 2, 40); break;
    case 'roll': { // ころがって くる いわ
      len = flat(760);
      G.obs.push({ type: 'roll', x: x + 640, w: 58, h: 58, rot: 0 });
      coinLine(x + 200, GROUND - 40, 4);
      break;
    }
    case 'islands': { // ちいさな しま を ぴょんぴょん
      const gap = Math.max(90, s * air * 0.32);
      let cx0 = x;
      pushGround(cx0, cx0 + 140); cx0 += 140;
      for (let i = 0; i < 3; i++) { coinArc(cx0 - 20, gap + 40, 140, 3); cx0 += gap; pushGround(cx0, cx0 + 190); cx0 += 190; }
      pushGround(cx0, cx0 + 200);
      len = cx0 + 200 - x; break;
    }
    case 'item': len = flat(440); G.items.push({ x: x + 240, y: GROUND - 175, id: pickItem(), t: 0 }); break;
    case 'coins': len = flat(480); coinArc(x + 80, 320, 190, 7); break;
    case 'star': len = flat(420); G.coinsArr.push({ x: x + 240, y: GROUND - 200, star: true }); break;
    default: len = flat(400);
  }
  // ステージ の ものが みち の そと（あな の うえ）に はみださない ように
  G.genX += len;
}

function spawnRare(kind) {
  if (kind === 'shima') {
    const x = G.genX;
    pushGround(x, x + 760);
    const e = addEnemy('shima', x + 700);
    G.rare = { kind: 'shima', e };
    G.genX += 760;
  } else if (kind === 'siren') {
    G.rare = { kind: 'siren', sx: W + 140, y: GROUND - 260, t: 0, life: 10, hp: 2, shotT: 1.2, st: 'enter', hitT: 0 };
    showToast('🎵 セイレーン が うたいだした！ おんぷ を よけて！', 2.4);
  } else {
    G.rare = { kind: 'ningyo', sx: W + 140, y: GROUND - 170, t: 0, st: 'enter' };
    G.water = 12; G.safe = 1;
    showToast('🧜 にんぎょ が きた！ うみ の なか に なった！', 2.4);
  }
}

// ---------------------------------------------------------------------
//  そうさ
// ---------------------------------------------------------------------
function jumpDown() {
  if (!G || G.over || PAUSED) return;
  G.holding = true; G.buffer = PHY.buffer;
}
function jumpUp() { if (G) G.holding = false; }
function doJump(air) {
  const feather = G.buffs.feather > 0, water = G.water > 0;
  let v = PHY.jumpV * (feather ? 1.15 : 1);
  if (water) v = 640;
  else if (air) v *= 0.86;
  G.vy = -v; G.onGround = false; G.coyote = 0; G.buffer = 0; G.cutOK = !water;
  if (air) { G.jumps++; SFX.jump2(); burst(G.x, G.y, 8, '#ffffff', 'star'); } else SFX.jump();
  if (water) burst(G.x, G.y - 30, 5, '#bff3ff', 'bubble');
}
function magic() {
  if (!G || G.over || PAUSED || G.demo || G.cool > 0) return;
  const C = CHARAS[G.chara];
  G.cool = C.cool;
  if (G.chara === 'chuna') {
    // ボス・セイレーン・にんぎょ が まえ に いたら そっち へ とぶ
    const x0 = G.x + 34, y0 = G.y - 58, vx = G.speed + 780;
    let vy = 0;
    const tg = magicTarget();
    if (tg) { const t = (tg.x - x0) / vx; if (t > 0.02 && t < 0.85) vy = clamp((tg.y - y0) / t, -900, 900); }
    G.shots.push({ x: x0, y: y0, vx, vy, life: 0.85 }); SFX.magic();
  }
  else if (G.chara === 'kenshi') { G.slash = { t: 0, hit: new Set() }; SFX.slash(); }
  else { G.ring = { t: 0, hit: new Set() }; SFX.ring(); }
}
function magicTarget() {
  const box = G.boss && G.boss.st !== 'dead' && G.boss.st !== 'leave' ? bossBox()
    : G.rare && G.rare.kind === 'siren' && G.rare.st !== 'leave' ? sirenBox()
      : G.rare && G.rare.kind === 'ningyo' && !G.rare.gift ? ningyoBox() : null;
  if (!box || box.l < G.x + 40) return null;
  return { x: (box.l + box.r) / 2, y: (box.t + box.b) / 2 };
}
function special() {
  if (!G || G.over || PAUSED || G.demo || G.gauge < 100 || G.special) return;
  G.gauge = 0;
  const C = CHARAS[G.chara];
  showToast(`✨ ${C.special}！ ✨`, 1.8);
  SFX.special(); G.flash = 0.6; G.flashColor = '255,240,160'; G.shake = 0.3;
  if (G.chara === 'chuna') {
    G.special = { kind: 'rain', t: 0, dur: 1.8 };
    G.enemies.forEach((e) => { if (!e.dead && visible(e.x, 0)) e.doom = rnd(0.15, 1.1); });
    hitBoss(3); hitRare(9);
    G.foes.length = 0;
  } else if (G.chara === 'kenshi') {
    G.special = { kind: 'dash', t: 0, dur: 3.2, bossT: 0 };
  } else {
    G.special = { kind: 'dance', t: 0, dur: 1.6 };
    G.enemies.forEach((e) => { if (!e.dead && visible(e.x, 0)) { e.dance = 0.01; } });
    G.foes.forEach((f) => { G.coins++; popText(f.sx + camX(), f.y, '+1', '#ffd84a'); });
    G.foes.length = 0;
    hitBoss(2); hitRare(9);
  }
}
const invincible = () => G.buffs.rocket > 0 || (G.special && G.special.kind === 'dash');

// ---------------------------------------------------------------------
//  うごかす
// ---------------------------------------------------------------------
function update(dt) {
  G.t += dt;
  if (G.over) { updateDead(dt); return; }
  updatePlats(dt);
  const prevY = G.y, cam0 = camX();
  // タイマー
  G.inv = Math.max(0, G.inv - dt); G.cool = Math.max(0, G.cool - dt); G.flash = Math.max(0, G.flash - dt); G.shake = Math.max(0, G.shake - dt);
  G.bridge = Math.max(0, G.bridge - dt); G.speedFx = Math.max(0, G.speedFx - dt); G.landT = Math.max(0, G.landT - dt);
  for (const k of Object.keys(G.buffs)) { G.buffs[k] -= dt; if (G.buffs[k] <= 0) { delete G.buffs[k]; if (k === 'rocket') { G.rescue = true; G.vy = 0; } } }
  if (G.water > 0) { G.water -= dt; if (G.water <= 0) { G.water = 0; showToast('うみ から でた！', 1.4); if (G.rare && G.rare.kind === 'ningyo') G.rare.st = 'leave'; } }
  if (G.special) { G.special.t += dt; if (G.special.t >= G.special.dur) { if (G.special.kind === 'dash') G.rescue = true; G.special = null; } }

  // まえ に すすむ
  const mult = G.buffs.rocket > 0 ? 1.8 : G.special && G.special.kind === 'dash' ? 1.6 : 1;
  G.x += G.speed * mult * dt;
  G.dist = Math.floor(G.x / PXM);
  if (!G.demo) {
    if (G.dist >= G.nextSpeed) {
      G.nextSpeed += 250;
      if (G.speed < PHY.max) { G.speed = Math.min(PHY.max, G.speed + PHY.step); showToast('💨 スピード アップ！', 1.6); SFX.speed(); G.speedFx = 1.2; }
    }
    if (!G.recordShown && G.best > 0 && G.dist > G.best) { G.recordShown = true; showToast('🚩 きろく こうしん！', 2); SFX.record(); burst(G.x, G.y - 60, 20, '#ffd84a', 'star'); }
    if (G.dist >= G.nextBoss && !G.boss && !G.bossMode && !(G.rare && G.rare.kind !== 'ningyo')) startBoss();
    const ph = dayPhase(G.dist);
    if (ph.name && ph.name !== G.phaseName) { G.phaseName = ph.name; if (G.dist > 50) showToast(ph.name, 1.6); }
  }

  // たて の うごき
  const groundHere = () => G.bridge > 0 || G.rescue || (G.special && G.special.kind === 'dash') || G.demo || onGroundAt(G.x);
  if (G.buffs.rocket > 0) {
    G.y += (GROUND - 80 - G.y) * Math.min(1, dt * 8); G.vy = 0; G.onGround = false;
  } else {
    if (G.buffer > 0) {
      G.buffer -= dt;
      const canAir = (G.chara === 'odoriko' || G.buffs.feather > 0) && G.jumps < 1;
      if (G.onGround || G.coyote > 0 || G.water > 0) doJump(false);
      else if (canAir) doJump(true);
    }
    if (!G.holding && G.cutOK && G.vy < PHY.cut) { G.vy = PHY.cut; G.cutOK = false; }
    let g = PHY.g;
    if (G.water > 0) g *= 0.36;
    else if (G.buffs.feather > 0 && G.vy > 0) g *= 0.55;
    G.vy = Math.min(G.vy + g * dt, G.water > 0 ? 380 : 1500);
    G.y += G.vy * dt;
    const was = G.onGround;
    G.onGround = false;
    if (G.vy >= 0) {
      if (prevY <= GROUND + 6 && G.y >= GROUND && groundHere()) { G.y = GROUND; G.vy = 0; G.onGround = true; }
      G.plat = null;
      for (const p of G.plats) if (!G.onGround && !p.falling && G.x > p.x - 14 && G.x < p.x + p.w + 14 && prevY <= p.y + 6 && G.y >= p.y) { G.y = p.y; G.vy = 0; G.onGround = true; G.plat = p; if (p.crumble && !p.fallT) { p.fallT = 0.001; SFX.pop(); } }
      for (const o of G.obs) if (!G.onGround && !o.dead && o.type !== 'spike' && o.type !== 'spring' && G.x > o.x - 6 && G.x < o.x + o.w + 6 && prevY <= GROUND - o.h + 6 && G.y >= GROUND - o.h) { G.y = GROUND - o.h; G.vy = 0; G.onGround = true; }
    }
    if (G.onGround) { if (!was) G.landT = 0.12; G.coyote = PHY.coyote; G.jumps = 0; if (G.rescue && onGroundAt(G.x)) G.rescue = false; } else G.coyote -= dt;
    // あな に おちた
    if (G.y > H + 140) {
      if (G.barrier || G.demo) { G.barrier = false; G.y = GROUND; G.vy = -1250; G.rescue = true; G.inv = 1; G.flash = 0.5; G.flashColor = '160,220,255'; showToast('🛡️ バリア が たすけて くれた！', 1.8); SFX.item(); }
      else { gameOver('あな に おちた……'); return; }
    }
  }

  const hb = heroBox();
  // てき
  G.enemies.forEach((e) => updateEnemy(e, dt, hb, prevY));
  // しょうがいぶつ
  for (const o of G.obs) {
    if (o.dead) continue;
    if (o.type === 'roll' && visible(o.x, 200)) { o.x -= 170 * dt; o.rot -= 170 * dt / 29; }
    const ob = { l: o.x, r: o.x + o.w, t: GROUND - o.h, b: GROUND };
    if (o.type === 'spring') { o.boing = Math.max(0, (o.boing || 0) - dt); if (overlap(hb, ob) && G.vy >= 0 && !(G.buffs.rocket > 0)) { G.vy = -1300; G.y = Math.min(G.y, ob.t); G.onGround = false; G.jumps = 0; G.coyote = 0; o.boing = 0.35; note(523, 0, 0.08, { vol: 0.06 }); note(1046, 0.08, 0.14, { vol: 0.06 }); burst(o.x + o.w / 2, ob.t, 8, '#ffd84a', 'star'); } continue; }
    if (!overlap(hb, ob)) continue;
    if (o.type !== 'spike' && G.y <= ob.t + 2) continue; // うえ に のって いる
    if (invincible()) { breakObs(o); continue; }
    if (o.type === 'spike') hurt(); else { breakObs(o, true); hurt(); }
  }
  // コイン・ほし
  const mag = G.buffs.magnet > 0;
  for (const c of G.coinsArr) {
    if (c.got) continue;
    const dx = G.x - c.x, dy = (G.y - 50) - c.y, dd = Math.hypot(dx, dy);
    if (mag && dd < 300) { c.x += dx * Math.min(1, dt * 9); c.y += dy * Math.min(1, dt * 9); }
    if (dd < 40) {
      c.got = true;
      if (c.star) { G.gauge = Math.min(100, G.gauge + 15); SFX.pop(); popText(c.x, c.y, 'ひっさつ ＋', '#ffd84a'); burst(c.x, c.y, 12, '#fff3a0', 'star'); }
      else { G.coins++; G.gauge = Math.min(100, G.gauge + 1.5); SFX.coin(); }
    }
  }
  // アイテム
  for (const it of G.items) {
    if (it.got) continue;
    it.t += dt;
    if (Math.hypot(G.x - it.x, (G.y - 50) - (it.y + Math.sin(it.t * 3) * 8)) < 52) { it.got = true; giveItem(it.id); }
  }
  // まほう
  updateShots(dt);
  updateSlashRing(dt);
  updateNyanko(dt);
  // ボス・レア・てき の たま
  if (G.boss) updateBoss(dt, hb, prevY);
  if (G.rare) updateRare(dt, hb);
  updateFoes(dt, hb);
  // ひっさつ の えんしゅつ
  if (G.special && G.special.kind === 'rain' && Math.random() < 0.7) G.fx.push({ x: camX() + rnd(0, W), y: -20, vx: -120, vy: rnd(500, 700), life: 1.2, color: pick(['#fff3a0', '#ffd84a', '#ffffff']), size: rnd(8, 14), kind: 'star' });
  if (G.special && G.special.kind === 'dance' && Math.random() < 0.5) G.fx.push({ x: camX() + rnd(0, W), y: rnd(60, GROUND), vx: 0, vy: -80, life: 1, color: pick(['#ff6fa8', '#b98aff', '#ffd84a']), size: rnd(14, 20), kind: 'note' });
  if (G.buffs.rocket > 0 || (G.special && G.special.kind === 'dash')) G.fx.push({ x: G.x - 30, y: G.y - rnd(10, 80), vx: -G.speed * 0.6, vy: 0, life: 0.3, color: G.buffs.rocket > 0 ? '#ffb347' : '#a8d4ff', size: rnd(4, 9), kind: 'spark' });
  if (G.water > 0 && Math.random() < 0.2) G.fx.push({ x: camX() + rnd(0, W), y: H, vx: 0, vy: -rnd(40, 90), life: 4, color: '#dff7ff', size: rnd(4, 10), kind: 'bubble' });
  // こうか・もじ
  G.fx.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'spark' || p.kind === 'star') p.vy += 600 * dt * (p.kind === 'spark' ? 0 : 1); p.life -= dt; });
  G.fx = G.fx.filter((p) => p.life > 0);
  G.pops.forEach((p) => { p.y -= 50 * dt; p.life -= dt; });
  G.pops = G.pops.filter((p) => p.life > 0);
  // みち を のばす・うしろ を けす
  while (G.genX < camX() + W + 700) genSegment();
  const cut = camX() - 300;
  G.ground = G.ground.filter((s) => s.x1 > cut - 200);
  G.plats = G.plats.filter((p) => p.x + p.w > cut && p.y < H + 120);
  G.obs = G.obs.filter((o) => o.x + o.w > cut && !(o.dead && o.deadT > 0.6));
  G.enemies = G.enemies.filter((e) => e.x > cut && e.y < H + 200 && !(e.dead && e.deadT > 0.7));
  G.coinsArr = G.coinsArr.filter((c) => !c.got && c.x > cut);
  G.items = G.items.filter((i) => !i.got && i.x > cut);
  void cam0;
}
const heroBox = () => ({ l: G.x - HERO.w / 2, r: G.x + HERO.w / 2, t: G.y - HERO.h, b: G.y });
const overlap = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const onGroundAt = (x) => G.ground.some((s) => x + 14 >= s.x0 && x - 14 <= s.x1);

function enemyBox(e) { const d = ENEMY[e.kind]; return { l: e.x - d.w / 2, r: e.x + d.w / 2, t: e.y - d.h, b: e.y }; }
function updateEnemy(e, dt, hb, prevY) {
  const d = ENEMY[e.kind];
  e.t += dt;
  if (e.dead) { e.deadT = (e.deadT || 0) + dt; e.y += (e.deadVy = (e.deadVy || -500) + 1800 * dt) * dt; return; }
  e.hitT = Math.max(0, e.hitT - dt);
  if (e.doom != null) { e.doom -= dt; if (e.doom <= 0) { killEnemy(e, 'star'); return; } }
  if (e.dance != null) { e.dance += dt; if (e.dance > 0.7) { killEnemy(e, 'dance'); return; } return; }
  if (!visible(e.x, 260)) return; // とおい あいだ は とまって いる
  if (!e.still) e.x += d.vx * dt;
  if (d.fly) e.y = e.baseY + Math.sin(e.t * 3) * 28;
  else if (d.hop) {
    e.vy += 2000 * dt; e.y += e.vy * dt;
    if (e.y >= e.baseY) { e.y = e.baseY; e.vy = 0; e.hopT = (e.hopT || 0) + dt; if (e.hopT > 1.1) { e.hopT = 0; e.vy = -720; } }
  } else if (e.baseY === GROUND && !onGroundAtFor(e.x)) { e.vy += 2000 * dt; e.y += e.vy * dt; }
  if (G.demo) return;
  const eb = enemyBox(e);
  if (!overlap(hb, eb)) return;
  if (invincible()) { killEnemy(e, 'hit'); return; }
  if (d.stomp && G.vy > 0 && prevY <= eb.t + 22) {
    e.hp--; e.hitT = 0.2;
    G.vy = G.holding ? -1050 : -780; G.cutOK = false; G.y = eb.t;
    SFX.stomp(); burst(e.x, eb.t, 8, '#ffffff', 'spark');
    if (e.hp <= 0) killEnemy(e, 'stomp');
    return;
  }
  hurt();
}
const onGroundAtFor = (x) => G.ground.some((s) => x >= s.x0 && x <= s.x1);
function killEnemy(e, how) {
  if (e.dead) return;
  e.dead = true; e.deadT = 0; e.deadVy = -500;
  G.kills++;
  G.gauge = Math.min(100, G.gauge + 7);
  const bonus = e.kind === 'shima' ? 25 : how === 'dance' || how === 'ring' ? 2 : 1;
  G.coins += bonus;
  popText(e.x, e.y - ENEMY[e.kind].h - 10, how === 'ring' || how === 'dance' ? `なかよし！ +${bonus}` : `+${bonus}`, how === 'ring' || how === 'dance' ? '#ff6fa8' : '#ffd84a');
  burst(e.x, e.y - 30, 12, how === 'ring' || how === 'dance' ? '#ff9ad5' : '#ffffff', how === 'ring' || how === 'dance' ? 'heart' : 'star');
  SFX.pop();
  if (e.kind === 'shima') {
    G.items.push({ x: e.x + 60, y: GROUND - 120, id: 'rocket', t: 0 });
    showToast('🎁 しまじろう を たおした！ たからもの！', 2.2);
    SFX.win();
    if (G.rare && G.rare.e === e) G.rare = null;
  }
}
function updatePlats(dt) {
  for (const p of G.plats) {
    if (p.mv) {
      const oy = p.y;
      p.y = p.baseY - p.mv.amp * (0.5 + 0.5 * Math.sin(G.t * p.mv.sp + p.mv.ph));
      if (G.plat === p && G.onGround) G.y = p.y; // のって いる ひと も いっしょ に うごく
      p.dy = p.y - oy;
    }
    if (p.fallT > 0) {
      p.fallT += dt;
      if (p.fallT > 0.4) { p.falling = true; p.vy = (p.vy || 0) + 2200 * dt; p.y += p.vy * dt; if (G.plat === p) G.plat = null; }
    }
  }
}
function breakObs(o, bump) {
  if (o.dead || o.type === 'spring') return;
  o.dead = true; o.deadT = 0;
  burst(o.x + o.w / 2, GROUND - o.h / 2, 14, o.type === 'crate' || o.type === 'crate2' ? '#c08a4a' : '#9aa0aa', 'spark');
  if (bump) SFX.bump(); else { SFX.pop(); G.coins++; popText(o.x + o.w / 2, GROUND - o.h - 10, '+1', '#ffd84a'); }
}
function hurt() {
  if (G.inv > 0 || invincible() || G.over || G.demo) return;
  if (G.barrier) { G.barrier = false; G.inv = 1.0; SFX.bump(); burst(G.x, G.y - 50, 16, '#a8e0ff', 'spark'); showToast('🛡️ バリア で まもった！', 1.4); return; }
  G.hp--; G.inv = 1.6; G.shake = 0.35; G.flash = 0.35; G.flashColor = '255,90,90';
  SFX.hurt();
  if (G.hp <= 0) gameOver('ちからつきた……');
}
function giveItem(id) {
  const it = ITEMS[id];
  SFX.item(); burst(G.x, G.y - 60, 14, '#ffffff', 'star');
  if (id === 'heart') { G.hp = Math.min(5, G.hp + 1); showToast('💗 ハート が ふえた！', 1.4); return; }
  if (id === 'barrier') { G.barrier = true; showToast('🛡️ バリア！ 1かい まもって くれる', 1.6); return; }
  G.buffs[id] = it.sec;
  if (id === 'rocket') showToast('🚀 むてき ダッシュ！', 1.6);
  else if (id === 'magnet') showToast('🧲 マグネット！ コイン が あつまる', 1.6);
  else if (id === 'feather') showToast('🪶 はね！ たかく ふわふわ・そら で もう1かい ジャンプ', 2);
  else if (id === 'nyanko') { showToast('🐱 にゃんこ が てつだって くれる！', 1.6); G.nyankoT = 0.3; }
}

// まほう
function updateShots(dt) {
  for (const s of G.shots) {
    s.x += s.vx * dt; s.y += (s.vy || 0) * dt; s.life -= dt;
    if (Math.random() < 0.8) G.fx.push({ x: s.x - 10, y: s.y + rnd(-6, 6), vx: -200, vy: 0, life: 0.25, color: '#fff3a0', size: rnd(3, 6), kind: 'spark' });
    const box = { l: s.x - 16, r: s.x + 16, t: s.y - 16, b: s.y + 16 };
    for (const e of G.enemies) if (!e.dead && overlap(box, enemyBox(e))) { killEnemy(e, 'star'); s.life = 0; break; }
    if (s.life > 0 && G.boss && overlap(box, bossBox())) { hitBoss(1, 0.9); s.life = 0; }
    if (s.life > 0 && G.rare && G.rare.kind === 'siren' && overlap(box, sirenBox())) { hitRare(1); s.life = 0; }
    if (s.life > 0 && G.rare && G.rare.kind === 'ningyo' && overlap(box, ningyoBox())) { ningyoGift(); s.life = 0; }
    for (const f of G.foes) if (s.life > 0 && Math.abs(f.sx + camX() - s.x) < 28 && Math.abs(f.y - s.y) < 30) { f.dead = true; G.coins++; popText(s.x, s.y, '+1', '#ffd84a'); }
  }
  G.shots = G.shots.filter((s) => s.life > 0 && s.x < camX() + W + 60);
}
function updateSlashRing(dt) {
  if (G.slash) {
    const S = G.slash; S.t += dt;
    const box = { l: G.x + 4, r: G.x + 156, t: G.y - 130, b: G.y + 6 };
    for (const e of G.enemies) if (!e.dead && !S.hit.has(e) && overlap(box, enemyBox(e))) { S.hit.add(e); killEnemy(e, 'slash'); }
    for (const o of G.obs) if (!o.dead && o.type !== 'spike' && o.type !== 'spring' && overlap(box, { l: o.x, r: o.x + o.w, t: GROUND - o.h, b: GROUND })) breakObs(o);
    if (G.boss && !S.hit.has('boss') && overlap(box, bossBox())) { S.hit.add('boss'); hitBoss(2); }
    if (G.rare && G.rare.kind === 'ningyo' && overlap(box, ningyoBox())) ningyoGift();
    for (const f of G.foes) if (overlap(box, { l: f.sx + camX() - 18, r: f.sx + camX() + 18, t: f.y - 18, b: f.y + 18 })) { f.dead = true; G.coins++; popText(f.sx + camX(), f.y, 'はじいた！ +1', '#ffd84a'); }
    if (S.t > 0.22) G.slash = null;
  }
  if (G.ring) {
    const R = G.ring; R.t += dt;
    const r = Math.min(1, R.t / 0.3) * 175, cx = G.x, cy = G.y - 50;
    const inR = (b) => { const nx = clamp(cx, b.l, b.r), ny = clamp(cy, b.t, b.b); return Math.hypot(nx - cx, ny - cy) < r; };
    for (const e of G.enemies) if (!e.dead && !R.hit.has(e) && inR(enemyBox(e))) { R.hit.add(e); killEnemy(e, 'ring'); }
    if (G.boss && !R.hit.has('boss') && inR(bossBox())) { R.hit.add('boss'); hitBoss(2); }
    if (G.rare && G.rare.kind === 'ningyo' && inR(ningyoBox())) ningyoGift();
    for (const f of G.foes) if (Math.hypot(f.sx + camX() - cx, f.y - cy) < r) { f.dead = true; G.coins++; popText(f.sx + camX(), f.y, 'ハート で けした！', '#ff6fa8'); }
    if (R.t > 0.4) G.ring = null;
  }
}
function updateNyanko(dt) {
  if (!(G.buffs.nyanko > 0)) return;
  G.nyankoT -= dt;
  if (G.nyankoT > 0) return;
  const tgt = G.enemies.filter((e) => !e.dead && e.x > G.x && e.x < G.x + 520).sort((a, b) => a.x - b.x)[0];
  if (tgt) { G.nyankoT = 0.7; G.fx.push({ x: G.x - 50, y: G.y - 30, tx: tgt.x, ty: tgt.y - 30, vx: 0, vy: 0, life: 0.25, color: '#fff', size: 0, kind: 'paw' }); killEnemy(tgt, 'star'); popText(tgt.x, tgt.y - 90, 'にゃーん！', '#ff9ad5'); }
  else if (G.boss && G.boss.st !== 'enter') { G.nyankoT = 1.6; hitBoss(1); popText(G.x + 100, G.y - 120, 'にゃーん！', '#ff9ad5'); }
  else G.nyankoT = 0.2;
}

// ---------------------------------------------------------------------
//  ボス（1000m ごと）：らすぼす どらぎょ
// ---------------------------------------------------------------------
function startBoss() {
  G.bossMode = true;
  const n = G.bossN;
  G.boss = { n, hp: 6 + n * 2, maxHp: 6 + n * 2, sx: W + 220, y: GROUND - 190, st: 'enter', t: 0, stT: 0, shots: 0, shotT: 1.2, inv: 0, life: 40, hitHero: 0 };
  showToast('⚠ ボス どらぎょ が あらわれた！ ふみつけ か まほう で たおそう！', 2.8);
  SFX.boss(); G.shake = 0.6;
}
const bossBox = () => { const B = G.boss, x = camX() + B.sx; return { l: x - 62, r: x + 62, t: B.y - 150, b: B.y - 8 }; };
function hitBoss(n, inv = 0.45) {
  const B = G.boss;
  if (!B || B.inv > 0 || B.st === 'dead' || B.st === 'leave') return;
  B.hp -= n; B.inv = inv; G.gauge = Math.min(100, G.gauge + 3 * n);
  SFX.stomp(); G.shake = 0.2;
  burst(camX() + B.sx, B.y - 80, 14, '#ffd84a', 'star');
  popText(camX() + B.sx, B.y - 170, `-${n}`, '#ff6f6f');
  if (B.hp <= 0) {
    B.st = 'dead'; B.stT = 0;
    const reward = 30 + B.n * 10;
    G.coins += reward; G.gauge = Math.min(100, G.gauge + 40); G.kills++;
    showToast(`🎉 ボス を たおした！ コイン ＋${reward}`, 2.6);
    SFX.win(); G.flash = 0.6; G.flashColor = '255,240,160';
    for (let i = 0; i < 40; i++) G.fx.push({ x: camX() + B.sx, y: B.y - 80, vx: rnd(-400, 400), vy: rnd(-700, -200), life: 1.4, color: pick(['#ffd84a', '#ff6fa8', '#ffffff']), size: rnd(6, 12), kind: 'star' });
  }
}
function updateBoss(dt, hb, prevY) {
  const B = G.boss;
  B.t += dt; B.stT += dt; B.inv = Math.max(0, B.inv - dt); B.hitHero = Math.max(0, B.hitHero - dt);
  if (B.st !== 'dead' && B.st !== 'leave') { B.life -= dt; if (B.life <= 0) { B.st = 'leave'; B.stT = 0; showToast('どらぎょ は とんで いった……', 1.8); } }
  const hoverY = GROUND - 190 + Math.sin(B.t * 2.2) * 26;
  switch (B.st) {
    case 'enter': B.sx += (720 - B.sx) * Math.min(1, dt * 2.5); B.y = hoverY; if (Math.abs(B.sx - 720) < 6) { B.st = 'hover'; B.stT = 0; B.shots = 0; } break;
    case 'hover':
      B.sx += (720 - B.sx) * Math.min(1, dt * 3); B.y = hoverY;
      B.shotT -= dt;
      if (B.shotT <= 0) {
        B.shotT = Math.max(0.85, 1.5 - B.n * 0.12); B.shots++;
        const low = Math.random() < 0.62;
        G.foes.push({ kind: 'fire', sx: B.sx - 70, y: low ? GROUND - 30 : GROUND - 128, vx: -(420 + B.n * 30), r: 20, t: 0 });
        SFX.fire();
        if (B.shots >= 3) { B.st = 'warn'; B.stT = 0; }
      }
      break;
    case 'warn': B.y += (GROUND - B.y) * Math.min(1, dt * 5); B.sx += Math.sin(B.t * 60) * 1.5; if (B.stT > 0.85) { B.st = 'charge'; B.stT = 0; SFX.boss(); } break;
    case 'charge': B.y = GROUND; B.sx -= (500 + B.n * 40) * dt; if (B.sx < -180) { B.st = 'enter'; B.sx = W + 200; B.shotT = 1.0; } break;
    case 'dead': B.y += 300 * dt; if (B.stT > 1.2) endBoss(true); return;
    case 'leave': B.y -= 260 * dt; B.sx += 200 * dt; if (B.stT > 1.6) endBoss(false); return;
    default:
  }
  // ちゅなちゃん と ぶつかる：うえ から ふむ と ダメージ
  const bb = bossBox();
  if (!overlap(hb, bb)) return;
  if (invincible()) { if (B.hitHero <= 0) { B.hitHero = 0.6; hitBoss(2); } return; }
  if (G.vy > 0 && prevY <= bb.t + 26) { hitBoss(2); G.vy = -1100; G.cutOK = false; G.y = bb.t; return; }
  hurt();
}
function endBoss(win) {
  G.boss = null; G.bossMode = false; G.bossN++;
  G.nextBoss = (Math.floor(G.dist / 1000) + 1) * 1000;
  if (win) G.items.push({ x: G.x + 520, y: GROUND - 170, id: pickItem(), t: 0 });
}

// ---------------------------------------------------------------------
//  レア：しまじろう（てき と して）・セイレーン・にんぎょ
// ---------------------------------------------------------------------
const sirenBox = () => { const R = G.rare, x = camX() + R.sx; return { l: x - 60, r: x + 60, t: R.y - 120, b: R.y }; };
const ningyoBox = () => { const R = G.rare, x = camX() + R.sx; return { l: x - 70, r: x + 70, t: R.y - 120, b: R.y }; };
function hitRare(n) {
  const R = G.rare;
  if (!R) return;
  if (R.kind === 'siren' && R.st !== 'leave' && R.hitT <= 0) {
    R.hp -= n; R.hitT = 0.4; SFX.stomp();
    burst(camX() + R.sx, R.y - 60, 12, '#bff3ff', 'star');
    if (R.hp <= 0) {
      R.st = 'leave'; R.stT = 0;
      G.coins += 30; G.gauge = Math.min(100, G.gauge + 20); G.kills++;
      showToast('🎵 セイレーン が おとなしく なった！ コイン ＋30', 2.2); SFX.win();
    }
  }
  if (R.kind === 'shima' && R.e && !R.e.dead) killEnemy(R.e, 'star');
}
function ningyoGift() {
  const R = G.rare;
  if (!R || R.kind !== 'ningyo' || R.gift) return;
  R.gift = true; R.st = 'leave';
  const id = pickItem();
  G.coins += 20;
  showToast('🧜 にんぎょ から プレゼント！ コイン ＋20', 2);
  giveItem(id);
}
function updateRare(dt, hb) {
  const R = G.rare;
  if (R.kind === 'shima') { if (!R.e || R.e.dead || R.e.x < camX() - 200) G.rare = null; else if (!R.told && visible(R.e.x, -40)) { R.told = true; showToast('⚡ しまじろう が きた！ たおす と たからもの！', 2.2); } return; }
  R.t += dt; R.hitT = Math.max(0, (R.hitT || 0) - dt);
  if (R.kind === 'siren') {
    if (R.st === 'enter') { R.sx += (760 - R.sx) * Math.min(1, dt * 2.5); if (Math.abs(R.sx - 760) < 24) { R.st = 'sing'; R.shotT = 0.5; } }
    if (R.st === 'sing') {
      R.life -= dt; R.y = GROUND - 250 + Math.sin(R.t * 1.6) * 30;
      R.shotT -= dt;
      if (R.shotT <= 0) { R.shotT = 1.05; G.foes.push({ kind: 'note', sx: R.sx - 50, y: Math.random() < 0.6 ? GROUND - 30 : GROUND - 120, vx: -360, r: 18, t: 0 }); note(pick([784, 880, 988, 1047]), 0, 0.2, { type: 'sine', vol: 0.05 }); }
      if (R.life <= 0) { R.st = 'leave'; R.stT = 0; }
    }
    if (R.st === 'leave') { R.stT = (R.stT || 0) + dt; R.y -= 200 * dt; R.sx += 150 * dt; if (R.stT > 1.5) G.rare = null; }
    return;
  }
  if (R.kind === 'ningyo') {
    if (R.st === 'enter') { R.sx += (640 - R.sx) * Math.min(1, dt * 1.5); R.y = GROUND - 170 + Math.sin(R.t * 2) * 50; if (overlap(hb, ningyoBox())) ningyoGift(); }
    if (R.st === 'leave' && !R.gone) { R.sx += 260 * dt; R.y -= 40 * dt; if (R.sx > W + 200) R.gone = true; }
    if (R.gone && G.water <= 0) G.rare = null;
  }
}
function updateFoes(dt, hb) {
  for (const f of G.foes) {
    f.sx += f.vx * dt; f.t += dt;
    const x = camX() + f.sx;
    if (!G.demo && !f.dead && overlap(hb, { l: x - f.r * 0.7, r: x + f.r * 0.7, t: f.y - f.r * 0.7, b: f.y + f.r * 0.7 })) { f.dead = true; hurt(); }
  }
  G.foes = G.foes.filter((f) => !f.dead && f.sx > -60);
}

// ---------------------------------------------------------------------
//  おわり
// ---------------------------------------------------------------------
function gameOver(why) {
  if (G.over) return;
  G.over = true; G.deadT = 0; G.why = why; G.vy = -700; G.shake = 0.4;
  SFX.over();
}
function updateDead(dt) {
  G.deadT += dt;
  G.vy += 1800 * dt; G.y += G.vy * dt;
  G.fx.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
  G.fx = G.fx.filter((p) => p.life > 0);
  if (G.deadT > 1.3 && !G.reported) { G.reported = true; if (RUN.onGameOver) RUN.onGameOver({ dist: G.dist, coins: G.coins, kills: G.kills, chara: G.chara, why: G.why }); }
}

// ---------------------------------------------------------------------
//  こうか
// ---------------------------------------------------------------------
function burst(x, y, n, color, kind = 'spark') {
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(120, 380); G.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: rnd(0.4, 0.8), color, size: rnd(4, 9), kind }); }
}
function popText(x, y, text, color) { G.pops.push({ x, y, text, color, life: 1 }); }

// ---------------------------------------------------------------------
//  けしき（あさ → ゆうがた → よる → ほしぞら）
// ---------------------------------------------------------------------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
function dayPhase(dist) {
  const p = (dist % DAY_LEN) / DAY_LEN;
  let i = 0;
  while (i < DAY.length - 2 && p >= DAY[i + 1][0]) i++;
  const a = DAY[i], b = DAY[i + 1], k = (p - a[0]) / (b[0] - a[0]);
  let name = null;
  for (let j = DAY.length - 1; j >= 0; j--) if (DAY[j][4] && p >= DAY[j][0]) { name = DAY[j][4]; break; }
  return { top: mix(a[1], b[1], k), bot: mix(a[2], b[2], k), light: a[3] + (b[3] - a[3]) * k, p, name };
}
const STARS = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.7, s: rnd(1, 2.6), tw: rnd(0, 6) }));

function drawSky(ph) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, ph.top); g.addColorStop(1, ph.bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const dark = clamp((1 - ph.light) / 0.55, 0, 1);
  if (dark > 0.05) {
    ctx.fillStyle = '#ffffff';
    STARS.forEach((s) => { ctx.globalAlpha = dark * (0.5 + 0.5 * Math.sin(G.t * 2 + s.tw)); ctx.beginPath(); ctx.arc(((s.x * W - camX() * 0.02) % W + W) % W, s.y * H, s.s, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
  }
  // おひさま・おつきさま
  const p = ph.p;
  if (p < 0.47 || p >= 0.95) {
    const k = p >= 0.95 ? (p - 0.95) / 0.52 : (p + 0.05) / 0.52;
    const sx = 100 + k * 760, sy = 230 - Math.sin(k * Math.PI) * 150;
    ctx.fillStyle = p > 0.36 && p < 0.47 ? '#ff9a4a' : '#fff1a0';
    ctx.beginPath(); ctx.arc(sx, sy, 38, 0, 7); ctx.fill();
  } else {
    const k = (p - 0.47) / 0.48, mx = 100 + k * 760, my = 230 - Math.sin(k * Math.PI) * 150;
    ctx.fillStyle = '#fff8d8'; ctx.beginPath(); ctx.arc(mx, my, 30, 0, 7); ctx.fill();
    ctx.fillStyle = ph.top; ctx.beginPath(); ctx.arc(mx + 13, my - 8, 26, 0, 7); ctx.fill();
  }
  // くも
  ctx.fillStyle = `rgba(255,255,255,${0.75 * ph.light})`;
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 260 - camX() * 0.15) % (W + 300) + W + 300) % (W + 300) - 150, cy = 70 + (i % 3) * 45;
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.arc(cx + 30, cy - 12, 32, 0, 7); ctx.arc(cx + 64, cy, 24, 0, 7); ctx.fill();
  }
  // とおく の やま・ちかく の おか
  const hills = (par, base, amp, col, step) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (let sx = 0; sx <= W + step; sx += step) { const wx = sx + camX() * par; ctx.lineTo(sx, base - Math.abs(Math.sin(wx / 230)) * amp - Math.sin(wx / 97) * amp * 0.25); }
    ctx.lineTo(W, H); ctx.fill();
  };
  const L = ph.light;
  hills(0.2, 380, 110, shade('#9ec7e8', L), 24);
  hills(0.45, 420, 60, shade('#8fd08a', L), 20);
  if (G.water > 0) { ctx.fillStyle = 'rgba(40,140,220,0.28)'; ctx.fillRect(0, 0, W, H); }
}
const shade = (h, l) => { const [r, g, b] = hex(h); return `rgb(${Math.round(r * l)},${Math.round(g * l)},${Math.round(b * (0.4 + l * 0.6))})`; };

function drawGround(ph) {
  const cx = camX(), L = ph.light;
  for (const s of G.ground) {
    const x0 = Math.max(-20, s.x0 - cx), x1 = Math.min(W + 20, s.x1 - cx);
    if (x1 <= x0) continue;
    ctx.fillStyle = shade('#b9854f', L); ctx.fillRect(x0, GROUND, x1 - x0, H - GROUND);
    ctx.fillStyle = shade('#a06e3c', L);
    for (let x = Math.floor((s.x0) / 60) * 60; x < s.x1; x += 60) { const sx = x - cx; if (sx > x0 - 60 && sx < x1) { ctx.fillRect(Math.max(x0, sx + 14), GROUND + 34, 18, 10); ctx.fillRect(Math.max(x0, sx + 40), GROUND + 64, 14, 8); } }
    ctx.fillStyle = shade('#6cc35a', L); ctx.fillRect(x0, GROUND - 4, x1 - x0, 18);
    ctx.fillStyle = shade('#4fa043', L); ctx.fillRect(x0, GROUND + 12, x1 - x0, 4);
    ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 3;
    if (s.x0 - cx > -10) { ctx.beginPath(); ctx.moveTo(s.x0 - cx, GROUND - 4); ctx.lineTo(s.x0 - cx, H); ctx.stroke(); }
    if (s.x1 - cx < W + 10) { ctx.beginPath(); ctx.moveTo(s.x1 - cx, GROUND - 4); ctx.lineTo(s.x1 - cx, H); ctx.stroke(); }
  }
  for (const p of G.plats) {
    let sx = p.x - cx;
    if (sx > W || sx + p.w < 0) continue;
    if (p.kind === 'crumble') { // ひび の はいった いし の はし
      if (p.fallT > 0 && !p.falling) sx += Math.sin(G.t * 70) * 3;
      rr(sx, p.y - 4, p.w, 30, 6, shade('#c9b79a', L));
      ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 3; ctx.strokeRect(sx + 1, p.y - 4, p.w - 2, 30);
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + p.w * 0.3, p.y - 4); ctx.lineTo(sx + p.w * 0.42, p.y + 10); ctx.lineTo(sx + p.w * 0.34, p.y + 26); ctx.moveTo(sx + p.w * 0.7, p.y - 4); ctx.lineTo(sx + p.w * 0.62, p.y + 14); ctx.stroke();
      continue;
    }
    if (p.kind === 'lift') { // うごく あしば：くさり と くも いろ
      ctx.strokeStyle = 'rgba(58,42,77,.35)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(sx + p.w / 2, p.baseY - p.mv.amp - 10); ctx.lineTo(sx + p.w / 2, p.baseY + 20); ctx.stroke(); ctx.setLineDash([]);
      rr(sx, p.y - 4, p.w, 24, 12, shade('#9fd8ff', L)); rr(sx, p.y - 6, p.w, 10, 6, '#ffffff');
      ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 3; ctx.strokeRect(sx + 1, p.y - 5, p.w - 2, 25);
      ctx.fillStyle = '#3a2a4d'; ctx.font = '900 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⇅', sx + p.w / 2, p.y + 9);
      continue;
    }
    rr(sx, p.y - 2, p.w, 26, 10, shade('#c99a62', L)); rr(sx, p.y - 6, p.w, 12, 6, shade('#7bd36a', L));
    ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 3; ctx.strokeRect(sx + 1, p.y - 5, p.w - 2, 28);
  }
}
function rr(x, y, w, h, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); }

function drawObs(o) {
  const sx = o.x - camX();
  if (sx > W + 20 || sx + o.w < -20) return;
  ctx.save();
  if (o.dead) { ctx.globalAlpha = Math.max(0, 1 - o.deadT * 2); o.deadT += 1 / 60; }
  ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 3;
  if (o.type === 'rock') {
    ctx.fillStyle = '#a5acb6'; ctx.beginPath();
    ctx.moveTo(sx + 4, GROUND); ctx.lineTo(sx, GROUND - 30); ctx.lineTo(sx + 16, GROUND - o.h); ctx.lineTo(sx + o.w - 14, GROUND - o.h + 4); ctx.lineTo(sx + o.w, GROUND - 22); ctx.lineTo(sx + o.w - 4, GROUND); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d3d8de'; ctx.fillRect(sx + 18, GROUND - o.h + 10, 18, 8);
  } else if (o.type === 'spring') {
    const k = o.boing > 0 ? 0.6 + 0.4 * Math.abs(Math.cos(o.boing * 30)) : 1, top = GROUND - o.h * k;
    ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 4;
    ctx.beginPath(); for (let i = 0; i <= 4; i++) { const yy = GROUND - (GROUND - top) * i / 4; ctx.lineTo(sx + (i % 2 ? o.w - 12 : 12), yy); } ctx.stroke();
    rr(sx - 4, top - 12, o.w + 8, 14, 7, '#ff6fa8'); ctx.strokeRect(sx - 4, top - 12, o.w + 8, 14);
    rr(sx + 4, GROUND - 6, o.w - 8, 8, 4, '#7a4fd0');
  } else if (o.type === 'roll') {
    const r = o.w / 2, cx0 = sx + r, cy = GROUND - r;
    ctx.save(); ctx.translate(cx0, cy); ctx.rotate(o.rot);
    ctx.fillStyle = '#9aa0aa'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c9ced6'; ctx.beginPath(); ctx.arc(-9, -9, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#7d838d'; ctx.beginPath(); ctx.arc(10, 8, 6, 0, 7); ctx.fill();
    ctx.restore();
    if (!o.dead) { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 3; i++) ctx.fillRect(sx + o.w + 6 + i * 12, GROUND - 14 - i * 12, 14, 4); }
  } else if (o.type === 'crate' || o.type === 'crate2') {
    ctx.fillStyle = '#d29a55';
    const n = o.type === 'crate2' ? 2 : 1, bh = o.h / n;
    for (let i = 0; i < n; i++) { const t = GROUND - bh * (i + 1); ctx.fillRect(sx, t, o.w, bh); ctx.strokeRect(sx, t, o.w, bh); ctx.beginPath(); ctx.moveTo(sx, t); ctx.lineTo(sx + o.w, t + bh); ctx.moveTo(sx + o.w, t); ctx.lineTo(sx, t + bh); ctx.stroke(); }
  } else {
    ctx.fillStyle = '#d8dde6';
    const n = Math.round(o.w / 22);
    for (let i = 0; i < n; i++) { const x = sx + i * (o.w / n); ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + o.w / n / 2, GROUND - o.h); ctx.lineTo(x + o.w / n, GROUND); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  ctx.restore();
}
function drawSprite(name, x, y, h, opt = {}) {
  const im = opt.tint ? tinted(name, opt.tint) : IMG[name];
  if (!im) return;
  const w = h * (im.width / im.height);
  ctx.save();
  ctx.translate(x, y);
  if (opt.rot) ctx.rotate(opt.rot);
  if (opt.flip) ctx.scale(-1, 1);
  if (opt.sq) ctx.scale(1 + opt.sq, 1 - opt.sq);
  if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
  ctx.drawImage(im, -w / 2, -h, w, h);
  if (opt.white) { ctx.globalAlpha = opt.white; ctx.drawImage(tinted(name, '#ffffff'), -w / 2, -h, w, h); }
  ctx.restore();
}
function drawCoin(c) {
  const sx = c.x - camX();
  if (sx < -30 || sx > W + 30) return;
  if (c.star) { drawStar(sx, c.y + Math.sin(G.t * 3 + c.x) * 6, 22, '#ffd84a'); return; }
  const k = Math.abs(Math.cos(G.t * 4 + c.x * 0.01));
  ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#b07a10'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(sx, c.y, 14 * Math.max(0.2, k), 14, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff7c0'; ctx.fillRect(sx - 2, c.y - 7, 4 * Math.max(0.3, k), 8);
}
function drawStar(x, y, r, col) {
  ctx.fillStyle = col; ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}
function drawHeart(x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s, y - s * 0.4, x, y + s * 0.35);
  ctx.fill();
}
function drawItem(it) {
  const sx = it.x - camX(), y = it.y + Math.sin(it.t * 3) * 8;
  if (sx < -40 || sx > W + 40) return;
  const g = ctx.createRadialGradient(sx - 8, y - 8, 4, sx, y, 30);
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(170,220,255,.55)');
  ctx.fillStyle = g; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(sx, y, 30, 0, 7); ctx.fill(); ctx.stroke();
  ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ITEMS[it.id].icon, sx, y + 2);
}
function drawFlag() {
  if (!G.best || G.demo) return;
  const sx = G.best * PXM - camX();
  if (sx < -60 || sx > W + 60) return;
  ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(sx, GROUND); ctx.lineTo(sx, GROUND - 190); ctx.stroke();
  const wave = Math.sin(G.t * 6) * 6;
  ctx.fillStyle = '#ff4f7a'; ctx.beginPath(); ctx.moveTo(sx, GROUND - 190); ctx.lineTo(sx + 70, GROUND - 172 + wave); ctx.lineTo(sx, GROUND - 150); ctx.closePath(); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
  label(sx, GROUND - 212, 'ここが きろく！', 20, '#ffffff', '#ff4f7a');
  label(sx, GROUND - 236, `${G.best} m`, 18, '#3a2a4d', '#fff3a0');
}
function label(x, y, text, size, fg, bg) {
  ctx.font = `900 ${size}px 'M PLUS Rounded 1c', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 18;
  rr(x - w / 2, y - size * 0.75, w, size * 1.5, size * 0.75, bg);
  ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = fg; ctx.fillText(text, x, y + 1);
}
function outlined(text, x, y, size, fill, align = 'left') {
  ctx.font = `900 ${size}px 'Kiwi Maru', 'M PLUS Rounded 1c', sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = Math.max(4, size / 6); ctx.strokeStyle = '#3a2a4d'; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

function drawHero() {
  const C = CHARAS[G.chara], sx = HERO_SX;
  let y = G.y, rot = 0, sq = 0;
  if (G.over) rot = G.deadT * 6;
  else if (G.buffs.rocket > 0) rot = -0.15;
  else if (G.onGround) { y -= Math.abs(Math.sin(G.t * G.speed / 38)) * 7; rot = Math.sin(G.t * G.speed / 38) * 0.05; if (G.landT > 0) sq = G.landT * 1.2; }
  else rot = clamp(G.vy * 0.00018, -0.2, 0.25);
  if (G.water > 0 && !G.onGround) rot = Math.sin(G.t * 4) * 0.12;
  const blink = G.inv > 0 && Math.floor(G.t * 12) % 2 === 0;
  if (G.buffs.rocket > 0) { // ロケット の ほのお
    for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#ff6a2a', '#ffb347', '#fff3a0'][i]; ctx.beginPath(); ctx.ellipse(sx - 40 - i * 4, y - 40, 34 - i * 9 + Math.sin(G.t * 40) * 4, 12 - i * 3, 0, 0, 7); ctx.fill(); }
  }
  if (G.buffs.nyanko > 0) drawSprite('nyanko', sx - 70, G.onGround ? G.y - Math.abs(Math.sin(G.t * 14)) * 10 : G.y, 64);
  if (G.rescue && !G.over && !onGroundAt(G.x)) { // あな の うえ は ふわふわ くも
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(sx - 26, GROUND + 6, 30, 16, 0, 0, 7); ctx.ellipse(sx + 4, GROUND, 36, 20, 0, 0, 7); ctx.ellipse(sx + 34, GROUND + 6, 28, 15, 0, 0, 7); ctx.fill();
  }
  ctx.save(); ctx.shadowColor = 'rgba(58,42,77,.55)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
  drawSprite(C.img, sx, y, HERO.drawH, { rot, sq, alpha: blink ? 0.35 : 1 });
  ctx.restore();
  if (G.barrier) { ctx.strokeStyle = 'rgba(140,210,255,.9)'; ctx.lineWidth = 4; ctx.fillStyle = 'rgba(170,225,255,.22)'; ctx.beginPath(); ctx.arc(sx, y - 56, 74 + Math.sin(G.t * 5) * 3, 0, 7); ctx.fill(); ctx.stroke(); }
  if (G.buffs.magnet > 0) { const r = 60 + (G.t * 90) % 60; ctx.strokeStyle = `rgba(255,90,120,${0.7 - (r - 60) / 90})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, y - 56, r, 0, 7); ctx.stroke(); ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🧲', sx + 36, y - 104 + Math.sin(G.t * 5) * 4); }
  if (G.buffs.feather > 0) { ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🪶', sx - 34, y - 96 + Math.sin(G.t * 6) * 4); }
  if (G.special && G.special.kind === 'dash') { ctx.strokeStyle = 'rgba(150,200,255,.85)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(sx + 40, y - 60, 60, -1.2, 1.2); ctx.stroke(); }
}
function drawSlashRing() {
  if (G.slash) {
    const k = G.slash.t / 0.22, sx = HERO_SX;
    ctx.save(); ctx.globalAlpha = 1 - k * 0.6;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(sx + 30, G.y - 64, 90, -1.5 + k * 0.6, 1.0 + k * 0.6); ctx.stroke();
    ctx.strokeStyle = '#8fd0ff'; ctx.lineWidth = 6; ctx.stroke();
    ctx.restore();
  }
  if (G.ring) {
    const k = Math.min(1, G.ring.t / 0.3), r = k * 175;
    ctx.save(); ctx.globalAlpha = 1 - G.ring.t / 0.45;
    ctx.strokeStyle = '#ff6fa8'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(HERO_SX, G.y - 50, r, 0, 7); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + G.t * 3; drawHeart(HERO_SX + Math.cos(a) * r, G.y - 50 + Math.sin(a) * r, 14, '#ff9ad5'); }
    ctx.restore();
  }
}
function drawBoss() {
  const B = G.boss;
  if (!B) return;
  const x = B.sx, flick = B.inv > 0 && Math.floor(G.t * 20) % 2 === 0;
  if (B.st === 'warn') label(x, B.y - 200, '！', 30, '#ffffff', '#ff4f4f');
  drawSprite('boss', x, B.y, 170, { rot: B.st === 'charge' ? -0.12 : B.st === 'dead' ? G.t * 3 : Math.sin(B.t * 3) * 0.05, white: flick ? 0.8 : 0, alpha: B.st === 'dead' ? Math.max(0, 1 - B.stT) : 1 });
  // HP
  if (B.st !== 'dead' && B.st !== 'leave') {
    const w = 300, x0 = W / 2 - w / 2;
    label(W / 2, 34, `ボス どらぎょ ${B.n + 1}ごうめ`, 17, '#ffffff', '#7a2a4d');
    rr(x0, 50, w, 16, 8, 'rgba(255,255,255,.9)');
    rr(x0 + 2, 52, (w - 4) * Math.max(0, B.hp / B.maxHp), 12, 6, '#ff5a7a');
  }
}
function drawRare() {
  const R = G.rare;
  if (!R || R.kind === 'shima') return;
  if (R.kind === 'siren') drawSprite('siren', R.sx, R.y, 120, { rot: Math.sin(R.t * 2) * 0.08, white: R.hitT > 0 ? 0.7 : 0 });
  if (R.kind === 'ningyo' && !R.gone) {
    drawSprite('ningyo', R.sx, R.y, 120, { rot: Math.sin(R.t * 2) * 0.1 });
    if (R.st === 'enter') label(R.sx, R.y - 140, 'さわる と プレゼント！', 16, '#ffffff', '#3aa0e0');
  }
}
function drawFoes() {
  for (const f of G.foes) {
    if (f.kind === 'fire') {
      const g = ctx.createRadialGradient(f.sx, f.y, 2, f.sx, f.y, f.r + 6);
      g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ff9a3a'); g.addColorStop(1, 'rgba(255,60,40,.2)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.sx, f.y, f.r + 6 + Math.sin(f.t * 30) * 2, 0, 7); ctx.fill();
    } else {
      ctx.font = '900 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.strokeText('♪', f.sx, f.y + Math.sin(f.t * 8) * 6);
      ctx.fillStyle = '#7a4fd0'; ctx.fillText('♪', f.sx, f.y + Math.sin(f.t * 8) * 6);
    }
  }
}
function drawFx() {
  const cx = camX();
  for (const p of G.fx) {
    const x = p.x - cx;
    ctx.globalAlpha = Math.min(1, p.life * 2.5);
    if (p.kind === 'star') drawStar(x, p.y, p.size, p.color);
    else if (p.kind === 'heart') drawHeart(x, p.y, p.size, p.color);
    else if (p.kind === 'note') { ctx.font = `900 ${p.size * 1.6}px sans-serif`; ctx.fillStyle = p.color; ctx.textAlign = 'center'; ctx.fillText('♪', x, p.y); }
    else if (p.kind === 'bubble') { ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, p.y, p.size, 0, 7); ctx.stroke(); }
    else if (p.kind === 'paw') { ctx.strokeStyle = '#ff9ad5'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(p.tx - cx, p.ty); ctx.stroke(); drawHeart(p.tx - cx, p.ty, 18, '#ff6fa8'); }
    else { ctx.fillStyle = p.color; ctx.fillRect(x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  }
  ctx.globalAlpha = 1;
  for (const p of G.pops) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    outlined(p.text, p.x - cx, p.y, 22, p.color, 'center');
  }
  ctx.globalAlpha = 1;
}
const BUFF_TXT = { rocket: 'むてき ダッシュ', magnet: 'マグネット', feather: 'ふわふわ はね', nyanko: 'にゃんこ' };
function drawHud() {
  outlined(`${G.dist} m`, 22, 58, 46, '#ffffff');
  if (G.best) outlined(`🚩 きろく ${Math.max(G.best, G.recordShown ? G.dist : 0)} m`, 24, 88, 18, G.recordShown ? '#ffd84a' : '#fff3c4');
  for (let i = 0; i < clamp(G.hp, 3, 10); i++) { const hx = 38 + i * 44; ctx.save(); ctx.shadowColor = '#3a2a4d'; ctx.shadowBlur = 0; drawHeart(hx, 128, 24, '#3a2a4d'); drawHeart(hx, 126, 19, i < G.hp ? '#ff5a8a' : 'rgba(255,255,255,.6)'); ctx.restore(); }
  // コイン
  ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#b07a10'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(38, 168, 14, 0, 7); ctx.fill(); ctx.stroke();
  outlined(`${G.coins}`, 62, 179, 28, '#fff3a0');
  // つかって いる アイテム（おわる まで ずっと だす）
  const act = Object.entries(G.buffs).map(([k, v]) => ({ icon: ITEMS[k].icon, name: BUFF_TXT[k] || ITEMS[k].name, left: v, k: clamp(v / ITEMS[k].sec, 0, 1) }));
  if (G.barrier) act.push({ icon: '🛡️', name: 'バリア', left: null, k: 1 });
  const pw = 148, gap = 6;
  let bx = Math.max(250, (W - act.length * (pw + gap)) / 2);
  for (const a of act) {
    const ending = a.left != null && a.left < 2 && Math.floor(G.t * 8) % 2 === 0;
    ctx.save(); ctx.globalAlpha = ending ? 0.55 : 1;
    rr(bx - 3, 11, pw + 6, 54, 18, '#3a2a4d'); rr(bx, 14, pw, 48, 15, 'rgba(255,250,240,.96)');
    ctx.font = '28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(a.icon, bx + 26, 38);
    ctx.font = '900 15px "M PLUS Rounded 1c", sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#3a2a4d';
    ctx.fillText(a.name, bx + 50, 30);
    if (a.left != null) {
      rr(bx + 50, 44, 66, 10, 5, '#e8d9f0'); rr(bx + 50, 44, 66 * a.k, 10, 5, '#7a4fd0');
      ctx.font = '900 16px sans-serif'; ctx.fillText(`${Math.ceil(a.left)}`, bx + 121, 49);
    } else { ctx.font = '900 13px "M PLUS Rounded 1c", sans-serif'; ctx.fillStyle = '#5a7fa0'; ctx.fillText('1かい まもる', bx + 50, 50); }
    ctx.restore();
    bx += pw + gap;
  }
  if (G.water > 0) label(W / 2, G.boss ? 100 : 60, `🌊 うみ の なか（ジャンプ で およぐ）${Math.ceil(G.water)}`, 16, '#ffffff', '#3aa0e0');
}

function render() {
  if (!G) return;
  ctx.setTransform(VIEW_K, 0, 0, VIEW_K, 0, 0);
  const ph = dayPhase(G.dist);
  ctx.save();
  if (G.shake > 0) ctx.translate(rnd(-1, 1) * G.shake * 18, rnd(-1, 1) * G.shake * 18);
  drawSky(ph);
  drawFlag();
  drawGround(ph);
  G.obs.forEach(drawObs);
  G.coinsArr.forEach(drawCoin);
  G.items.forEach(drawItem);
  for (const e of G.enemies) {
    const sx = e.x - camX(), d = ENEMY[e.kind];
    if (sx < -120 || sx > W + 120) continue;
    let rot = e.dead ? e.deadT * 8 : 0, sq = 0;
    if (!e.dead && !d.fly && !d.hop) sq = Math.sin(e.t * 9) * 0.05;
    if (e.dance != null) rot = Math.sin(e.dance * 30) * 0.4;
    drawSprite(d.img, sx, e.y, d.h * (e.kind === 'family' && e.hp < 2 ? 0.8 : 1), { rot, sq, tint: e.tint, white: e.hitT > 0 ? 0.7 : 0, alpha: e.dead ? Math.max(0, 1 - e.deadT * 1.5) : 1 });
    if (e.kind === 'shima' && !e.dead) label(sx, e.y - d.h - 18, '🎁 たからもの', 15, '#3a2a4d', '#fff3a0');
  }
  drawRare();
  drawBoss();
  drawFoes();
  G.shots.forEach((s) => drawStar(s.x - camX(), s.y, 18 + Math.sin(G.t * 30) * 2, '#fff3a0'));
  drawHero();
  drawSlashRing();
  drawFx();
  ctx.restore();
  if (G.speedFx > 0) { ctx.strokeStyle = `rgba(255,255,255,${G.speedFx * 0.5})`; ctx.lineWidth = 3; for (let i = 0; i < 14; i++) { const y = (i * 37 + G.t * 900) % H; ctx.beginPath(); ctx.moveTo(W, y); ctx.lineTo(W - 220, y); ctx.stroke(); } }
  if (G.flash > 0) { ctx.fillStyle = `rgba(${G.flashColor},${Math.min(0.55, G.flash)})`; ctx.fillRect(0, 0, W, H); }
  if (!G.demo) drawHud();
}

// ---------------------------------------------------------------------
//  ループ
// ---------------------------------------------------------------------
let lastT = 0;
function frame(t) {
  const dt = Math.min(1 / 30, (t - lastT) / 1000 || 0);
  lastT = t;
  if (G && !PAUSED) update(dt);
  render();
  if (RUN.onFrame) RUN.onFrame();
  requestAnimationFrame(frame);
}

// テスト よう
window.RUN_TEST = {
  G: () => G,
  set(o) { Object.assign(G, o); },
  warp(m) { G.x = m * PXM; G.genX = G.x + 300; G.ground.push({ x0: G.x - 400, x1: G.x + 300 }); G.y = GROUND; G.vy = 0; G.safe = 4; G.enemies.length = 0; G.obs.length = 0; G.plats.length = 0; G.plat = null; },
  boss() { startBoss(); },
  give: giveItem,
  enemy(kind, dx = 400) { return addEnemy(kind, G.x + dx); },
  rare(kind) { if (kind === 'shima') { G.genX = G.x + 300; G.ground.push({ x0: G.x - 50, x1: G.x + 300 }); } spawnRare(kind); return G.rare; },
  seg(kind) {
    const x = G.x + 120;
    G.ground = G.ground.filter((s) => s.x0 < x).map((s) => ({ x0: s.x0, x1: Math.min(s.x1, x) }));
    G.ground.push({ x0: G.x - 100, x1: x });
    G.plats = G.plats.filter((p) => p.x + p.w < G.x - 50); G.obs.length = 0; G.enemies.length = 0; G.items.length = 0;
    G.genX = x; G.safe = 0; FORCE_SEG = kind; genSegment(); G.safe = 2;
  },
  pit(dx = 300, w = 400) { const x = G.x + dx; G.ground = G.ground.map((s) => (s.x1 > x && s.x0 < x + w ? [{ x0: s.x0, x1: x }, { x0: x + w, x1: s.x1 }] : [s])).flat().filter((s) => s.x1 > s.x0); },
};

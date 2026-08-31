/* ============================================================
 * HLF2 · 网页版《半条命》极速版
 * 纯 JavaScript 射线投射 (raycasting) FPS 引擎
 * ============================================================ */
(function () {
  'use strict';

  // ---------------- 常量 ----------------
  const RW = 480, RH = 270;          // 3D 内部渲染分辨率
  const TEX = 64, SHADES = 32;
  const FOV_PLANE = 0.72;            // ≈ 72° 视野
  const MOVE = 3.2, RUN = 5.4, TURN = 2.4;
  const RADIUS = 0.22;

  // ---------------- DOM ----------------
  const scene = document.getElementById('scene');
  const sctx = scene.getContext('2d');
  const fx = document.getElementById('fx');
  const fctx = fx.getContext('2d');
  const mini = document.getElementById('minimap');
  const mctx = mini.getContext('2d');
  const el = (id) => document.getElementById(id);

  scene.width = RW; scene.height = RH;
  sctx.imageSmoothingEnabled = false;
  const frameImg = sctx.createImageData(RW, RH);
  const buf = new Uint32Array(frameImg.data.buffer);
  const zBuf = new Float32Array(RW);

  function fitFx() {
    const r = fx.getBoundingClientRect();
    fx.width = Math.max(320, Math.round(r.width));
    fx.height = Math.max(180, Math.round(r.height));
  }
  window.addEventListener('resize', fitFx);

  // ---------------- 资源 ----------------
  let WALLTEX = null, SPR = null;

  // ---------------- 武器定义 ----------------
  const WEAPONS = [
    { id: 'crowbar', name: '撬棍', melee: true, dmg: 28, rate: 0.42, range: 1.7, ammo: null, mag: 0, auto: true, sfx: 'crowbar' },
    { id: 'pistol', name: 'GLOCK 17', dmg: 20, rate: 0.20, range: 22, ammo: '9mm', mag: 17, spread: 0.012, auto: false, sfx: 'pistol', kick: 5 },
    { id: 'shotgun', name: 'SPAS-12', dmg: 11, pellets: 8, rate: 0.85, range: 13, ammo: 'buck', mag: 8, spread: 0.09, auto: false, sfx: 'shotgun', kick: 16 },
    { id: 'smg', name: 'MP5', dmg: 13, rate: 0.085, range: 20, ammo: 'smg', mag: 30, spread: 0.045, auto: true, sfx: 'smg', kick: 6 }
  ];

  const DIFF = {
    easy: { name: '简单', dmg: 0.55, hp: 0.8, label: '安全模式' },
    normal: { name: '普通', dmg: 1.0, hp: 1.0, label: '危险' },
    hard: { name: '困难', dmg: 1.7, hp: 1.35, label: '黑山噩梦' }
  };

  // ---------------- 敌人定义 ----------------
  const ENEMIES = {
    headcrab: { hp: 22, speed: 3.05, dmg: 9, atkRate: 0.85, sprite: 'headcrab', scale: 0.5, vOff: 0.0, radius: 0.28, ranged: false, sight: 11, score: 25 },
    zombie: { hp: 70, speed: 1.35, dmg: 20, atkRate: 1.25, sprite: 'zombie', scale: 1.0, vOff: 0.0, radius: 0.34, ranged: false, sight: 12, score: 50 },
    soldier: { hp: 65, speed: 2.0, dmg: 8, atkRate: 1.15, sprite: 'soldier', scale: 1.0, vOff: 0.0, radius: 0.32, ranged: true, sight: 16, score: 90, burst: 3 },
    vort: { hp: 95, speed: 1.7, dmg: 17, atkRate: 2.0, sprite: 'vort', scale: 1.0, vOff: 0.0, radius: 0.34, ranged: true, sight: 14, score: 120, beam: true }
  };

  const PICKUPS = {
    h: { sprite: 'medkit', kind: 'health', amount: 25, scale: 0.42, vOff: 0.0, msg: '+25 生命' },
    b: { sprite: 'battery', kind: 'armor', amount: 20, scale: 0.42, vOff: 0.0, msg: '+20 HEV 护甲' },
    '1': { sprite: 'ammo9mm', kind: 'ammo', ammo: '9mm', amount: 34, scale: 0.4, vOff: 0.0, msg: '9mm 弹药 x34' },
    '2': { sprite: 'ammoBuck', kind: 'ammo', ammo: 'buck', amount: 16, scale: 0.4, vOff: 0.0, msg: '霰弹 x16' },
    '3': { sprite: 'ammoSmg', kind: 'ammo', ammo: 'smg', amount: 60, scale: 0.4, vOff: 0.0, msg: 'MP5 弹药 x60' },
    S: { sprite: 'pickShotgun', kind: 'weapon', weapon: 2, amount: 16, scale: 0.5, vOff: 0.0, msg: '获得 SPAS-12 霰弹枪！' },
    U: { sprite: 'pickSmg', kind: 'weapon', weapon: 3, amount: 60, scale: 0.5, vOff: 0.0, msg: '获得 MP5 冲锋枪！' }
  };

  // ---------------- 游戏状态 ----------------
  const G = {
    state: 'menu',        // menu | play | pause | dead | levelend | win
    difficulty: 'normal',
    levelIndex: 0,
    map: [], mapW: 0, mapH: 0,
    light: 9.5,
    ceilCol: null, floorCol: null,
    entities: [],
    particles: [],
    decals: [],
    time: 0, totalTime: 0,
    score: 0, kills: 0, totalKills: 0,
    msg: '', msgT: 0,
    shake: 0, flashDmg: 0, flashPick: 0, muzzle: 0,
    hitMark: 0
  };

  const P = {
    x: 2.5, y: 2.5, dirX: 1, dirY: 0, planeX: 0, planeY: FOV_PLANE,
    pitch: 0, bob: 0, health: 100, armor: 0, weapon: 1,
    owned: [true, true, false, false],
    ammo: { '9mm': 68, buck: 0, smg: 0 },
    clip: [0, 17, 0, 0],
    cool: 0, swing: 0, reloading: 0, kick: 0,
    lastStep: 0, dead: false, flashlight: true, invuln: 0
  };

  const keys = Object.create(null);
  let mouseDown = false, sens = 0.0022, pointerLocked = false;

  // ---------------- 工具 ----------------
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const now = () => performance.now() / 1000;

  function isWall(mx, my) {
    if (mx < 0 || my < 0 || mx >= G.mapW || my >= G.mapH) return 1;
    return G.map[my][mx];
  }
  function solid(mx, my) { const t = isWall(mx, my); return t > 0 && t !== 9; }

  function message(text, dur) {
    G.msg = text; G.msgT = dur || 2.6;
    const m = el('toast'); m.textContent = text; m.classList.add('show');
  }

  // ---------------- 关卡加载 ----------------
  function loadLevel(index) {
    const L = Maps.LEVELS[index];
    G.levelIndex = index;
    G.light = L.light;
    G.entities = []; G.particles = []; G.decals = [];
    G.time = 0; G.kills = 0;
    const rows = L.rows;
    const w = Math.max.apply(null, rows.map(r => r.length));
    G.mapW = w; G.mapH = rows.length;
    G.map = [];
    for (let y = 0; y < rows.length; y++) {
      const line = rows[y].padEnd(w, '#');
      const row = new Uint8Array(w);
      for (let x = 0; x < w; x++) {
        const ch = line[x];
        if (Maps.WALLCHARS[ch]) { row[x] = Maps.WALLCHARS[ch]; continue; }
        row[x] = 0;
        const cx = x + 0.5, cy = y + 0.5;
        if (ch === '@') { P.x = cx; P.y = cy; }
        else if (ENEMY_CHARS[ch]) spawnEnemy(ENEMY_CHARS[ch], cx, cy);
        else if (PICKUPS[ch]) spawnPickup(ch, cx, cy);
        else if (ch === 'o') G.entities.push({ type: 'barrel', x: cx, y: cy, hp: 22, sprite: 'barrel', scale: 0.8, vOff: 0.0, radius: 0.3, solidBody: true, frame: 0 });
      }
      G.map.push(row);
    }
    // 出生朝向：面向开阔方向
    P.dirX = 1; P.dirY = 0; P.planeX = 0; P.planeY = FOV_PLANE; P.pitch = 0;
    if (solid((P.x | 0) + 1, P.y | 0)) { P.dirX = 0; P.dirY = 1; P.planeX = -FOV_PLANE; P.planeY = 0; }

    // 背景色查找表
    G.ceilCol = new Uint32Array(RH);
    G.floorCol = new Uint32Array(RH);
    const cTop = hex(L.ceil), cBot = mix(hex(L.ceil), [0, 0, 0], 0.45);
    const fTop = hex(L.floorTop), fBot = hex(L.floorBottom);
    for (let y = 0; y < RH; y++) {
      const t = y / RH;
      G.ceilCol[y] = pack(mix(cBot, cTop, clamp(t * 2, 0, 1)));
      G.floorCol[y] = pack(mix(fBot, fTop, clamp((t - 0.5) * 2, 0, 1)));
    }
    el('levelName').textContent = L.name;
    message(L.brief, 5);
    G.state = 'play';
    updateHUD();
  }

  const ENEMY_CHARS = { c: 'headcrab', z: 'zombie', s: 'soldier', v: 'vort' };

  function hex(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function pack(c) { return (255 << 24) | ((c[2] | 0) << 16) | ((c[1] | 0) << 8) | (c[0] | 0); }

  function spawnEnemy(kind, x, y) {
    const d = ENEMIES[kind];
    const mult = DIFF[G.difficulty].hp;
    G.entities.push({
      type: 'enemy', kind, x, y, hp: d.hp * mult, maxhp: d.hp * mult, def: d,
      sprite: d.sprite, scale: d.scale, vOff: d.vOff, radius: d.radius,
      state: 'idle', anim: Math.random() * 4, cool: Math.random() * 1.2,
      fireT: 0, burstLeft: 0, alive: true, pain: 0, wander: Math.random() * 6.283,
      solidBody: true
    });
  }
  function spawnPickup(ch, x, y) {
    const d = PICKUPS[ch];
    G.entities.push({ type: 'pickup', def: d, x, y, sprite: d.sprite, scale: d.scale, vOff: d.vOff, bobT: Math.random() * 6.283 });
  }

  // ---------------- 输入 ----------------
  document.addEventListener('keydown', (e) => {
    if (e.repeat) { keys[e.code] = true; return; }
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (G.state === 'play') {
      if (e.code === 'Digit1') switchWeapon(0);
      if (e.code === 'Digit2') switchWeapon(1);
      if (e.code === 'Digit3') switchWeapon(2);
      if (e.code === 'Digit4') switchWeapon(3);
      if (e.code === 'KeyR') reload();
      if (e.code === 'KeyF') { P.flashlight = !P.flashlight; Sound.play('empty'); }
      if (e.code === 'KeyQ') cycleWeapon(-1);
      if (e.code === 'KeyE') cycleWeapon(1);
      if (e.code === 'KeyM') { const m = Sound.toggleMute(); message(m ? '静音' : '声音开启', 1.2); }
    }
    if (e.code === 'Escape' && (G.state === 'play' || G.state === 'pause')) togglePause();
    if (e.code === 'Enter') {
      if (G.state === 'dead') restartLevel();
      else if (G.state === 'levelend') loadLevel(G.levelIndex + 1);
      else if (G.state === 'win' || G.state === 'menu') startGame();
    }
  });
  document.addEventListener('keyup', (e) => { keys[e.code] = false; });

  scene.parentElement.addEventListener('mousedown', (e) => {
    if (G.state !== 'play') return;
    if (!pointerLocked) { requestLock(); return; }
    if (e.button === 0) mouseDown = true;
  });
  document.addEventListener('mouseup', () => { mouseDown = false; });
  document.addEventListener('mousemove', (e) => {
    if (!pointerLocked || G.state !== 'play') return;
    rotate(-e.movementX * sens);
    P.pitch = clamp(P.pitch - e.movementY * sens * 260, -110, 110);
  });
  document.addEventListener('wheel', (e) => {
    if (G.state !== 'play' || !pointerLocked) return;
    cycleWeapon(e.deltaY > 0 ? 1 : -1);
  }, { passive: true });

  function requestLock() {
    const c = document.getElementById('viewport');
    if (c.requestPointerLock) c.requestPointerLock();
    Sound.init(); Sound.resume();
  }
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === document.getElementById('viewport');
    el('lockHint').classList.toggle('hidden', pointerLocked || G.state !== 'play');
    if (!pointerLocked && G.state === 'play') { /* 保持运行，仅提示 */ }
  });

  function rotate(a) {
    const c = Math.cos(a), s = Math.sin(a);
    const dx = P.dirX; P.dirX = dx * c - P.dirY * s; P.dirY = dx * s + P.dirY * c;
    const px = P.planeX; P.planeX = px * c - P.planeY * s; P.planeY = px * s + P.planeY * c;
  }

  // ---------------- 武器逻辑 ----------------
  function switchWeapon(i) {
    if (i === P.weapon || !P.owned[i]) { if (!P.owned[i]) Sound.play('empty'); return; }
    P.weapon = i; P.cool = Math.max(P.cool, 0.25); P.reloading = 0;
    Sound.play('reload'); updateHUD();
  }
  function cycleWeapon(dir) {
    for (let n = 1; n <= 4; n++) {
      const i = (P.weapon + dir * n + 8) % 4;
      if (P.owned[i]) { switchWeapon(i); return; }
    }
  }
  function reload() {
    const w = WEAPONS[P.weapon];
    if (w.melee || P.reloading > 0) return;
    if (P.clip[P.weapon] >= w.mag || P.ammo[w.ammo] <= 0) return;
    P.reloading = w.id === 'shotgun' ? 1.0 : 0.75;
    Sound.play('reload');
  }

  function fire() {
    const w = WEAPONS[P.weapon];
    if (P.cool > 0 || P.reloading > 0) return;
    if (w.melee) {
      P.cool = w.rate; P.swing = w.rate;
      Sound.play('crowbar');
      const hit = castHit(0, w.range, w.dmg, 0.55);
      if (!hit) setTimeout(() => { }, 0);
      return;
    }
    if (P.clip[P.weapon] <= 0) {
      if (P.ammo[w.ammo] > 0) reload(); else { Sound.play('empty'); P.cool = 0.3; }
      return;
    }
    P.clip[P.weapon]--;
    P.cool = w.rate; P.swing = Math.min(0.18, w.rate);
    P.kick = w.kick || 4;
    G.muzzle = 0.075;
    G.shake = Math.min(1.2, G.shake + (w.id === 'shotgun' ? 0.8 : 0.25));
    Sound.play(w.sfx);
    const shots = w.pellets || 1;
    for (let i = 0; i < shots; i++) {
      const ang = (Math.random() - 0.5) * w.spread * (shots > 1 ? 2 : 1);
      castHit(ang, w.range, w.dmg, 0.42);
    }
    updateHUD();
  }

  // 命中判定：沿射线步进，先撞墙则停
  function castHit(angleOff, range, dmg, hitRadius) {
    const c = Math.cos(angleOff), s = Math.sin(angleOff);
    const dx = P.dirX * c - P.dirY * s;
    const dy = P.dirX * s + P.dirY * c;
    const step = 0.055;
    let x = P.x, y = P.y;
    for (let t = 0; t < range; t += step) {
      x += dx * step; y += dy * step;
      if (solid(x | 0, y | 0)) {
        addImpact(x - dx * 0.05, y - dy * 0.05, t, '#d8d2c0');
        return null;
      }
      for (const e of G.entities) {
        if (e.type === 'enemy' && e.alive || e.type === 'barrel') {
          const d = Math.hypot(e.x - x, e.y - y);
          if (d < (e.radius + hitRadius * 0.35)) {
            damageEntity(e, dmg, dx, dy);
            addImpact(x, y, t, e.type === 'barrel' ? '#ffb14d' : '#a41414');
            return e;
          }
        }
      }
    }
    return null;
  }

  function addImpact(x, y, dist, color) {
    for (let i = 0; i < 6; i++) {
      G.particles.push({
        x, y, z: 0.5 + (Math.random() - 0.5) * 0.3,
        vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.6, vz: Math.random() * 1.4,
        life: 0.35 + Math.random() * 0.3, max: 0.65, color
      });
    }
  }

  function damageEntity(e, dmg, dx, dy) {
    if (e.type === 'barrel') {
      e.hp -= dmg;
      if (e.hp <= 0) explode(e);
      return;
    }
    if (!e.alive) return;
    e.hp -= dmg; e.pain = 0.18;
    G.hitMark = 0.12;
    Sound.play('hit');
    if (dx) { e.x += dx * 0.04; e.y += dy * 0.04; }
    if (e.hp <= 0) killEnemy(e);
    else if (e.state === 'idle') { e.state = 'chase'; }
  }

  function killEnemy(e) {
    e.alive = false; e.state = 'dead'; e.deadT = 0;
    G.kills++; G.totalKills++;
    G.score += e.def.score;
    Sound.play(e.kind === 'headcrab' ? 'crabDie' : 'dead');
    for (let i = 0; i < 14; i++) {
      G.particles.push({
        x: e.x, y: e.y, z: 0.4 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 2.4, vy: (Math.random() - 0.5) * 2.4, vz: Math.random() * 2,
        life: 0.5 + Math.random() * 0.5, max: 1, color: e.kind === 'vort' ? '#7ef07a' : '#8e1414'
      });
    }
    G.decals.push({ x: e.x, y: e.y, t: 0 });
    updateHUD();
  }

  function explode(b) {
    b.dead = true;
    Sound.play('explode');
    G.shake = 2.2;
    for (let i = 0; i < 40; i++) {
      G.particles.push({
        x: b.x, y: b.y, z: 0.3 + Math.random() * 0.8,
        vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, vz: Math.random() * 4,
        life: 0.5 + Math.random() * 0.7, max: 1.2,
        color: ['#ffdc6a', '#ff9a2e', '#ff4d1a', '#6b6b6b'][i % 4]
      });
    }
    // 范围伤害
    for (const e of G.entities) {
      if (e === b || e.dead) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < 3.2) {
        if (e.type === 'enemy' && e.alive) damageEntity(e, 120 * (1 - d / 3.2), 0, 0);
        else if (e.type === 'barrel') setTimeout(() => { if (!e.dead) explode(e); }, 120);
      }
    }
    const pd = Math.hypot(P.x - b.x, P.y - b.y);
    if (pd < 3.2) hurtPlayer(70 * (1 - pd / 3.2));
    G.entities = G.entities.filter(e => !e.dead);
  }

  function hurtPlayer(amount) {
    if (P.dead || P.invuln > 0) return;
    amount *= DIFF[G.difficulty].dmg;
    if (P.armor > 0) {
      const absorbed = Math.min(P.armor, amount * 0.6);
      P.armor -= absorbed; amount -= absorbed;
    }
    P.health -= amount;
    G.flashDmg = Math.min(1, G.flashDmg + amount / 45);
    G.shake = Math.min(2.5, G.shake + amount / 30);
    Sound.play('hurt');
    P.invuln = Math.max(P.invuln, 0.12);
    if (P.health <= 0) {
      P.health = 0; P.dead = true; G.state = 'dead';
      document.exitPointerLock && document.exitPointerLock();
      Sound.play('dead');
      el('deadStats').textContent = '击杀 ' + G.totalKills + ' · 得分 ' + G.score;
      showOverlay('deadScreen');
    }
    updateHUD();
  }

  // ---------------- 视线 ----------------
  function lineOfSight(ax, ay, bx, by, maxd) {
    let dx = bx - ax, dy = by - ay;
    const dist = Math.hypot(dx, dy);
    if (dist > (maxd || 99)) return false;
    dx /= dist; dy /= dist;
    const step = 0.12;
    let x = ax, y = ay;
    for (let t = 0; t < dist; t += step) {
      x += dx * step; y += dy * step;
      if (solid(x | 0, y | 0)) return false;
    }
    return true;
  }

  function tryMove(o, nx, ny, r) {
    r = r || RADIUS;
    if (!solid((nx + Math.sign(nx - o.x) * r) | 0, o.y | 0)) o.x = nx;
    if (!solid(o.x | 0, (ny + Math.sign(ny - o.y) * r) | 0)) o.y = ny;
  }

  // ---------------- 更新 ----------------
  function update(dt) {
    if (G.state !== 'play') return;
    G.time += dt; G.totalTime += dt;
    updatePlayer(dt);
    updateEntities(dt);
    updateParticles(dt);
    P.invuln = Math.max(0, P.invuln - dt);
    G.shake = Math.max(0, G.shake - dt * 3.4);
    G.flashDmg = Math.max(0, G.flashDmg - dt * 1.6);
    G.flashPick = Math.max(0, G.flashPick - dt * 2.4);
    G.muzzle = Math.max(0, G.muzzle - dt);
    G.hitMark = Math.max(0, G.hitMark - dt);
    if (G.msgT > 0) { G.msgT -= dt; if (G.msgT <= 0) el('toast').classList.remove('show'); }
    const t = Math.floor(G.totalTime);
    el('timer').textContent = String((t / 60) | 0).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }

  function updatePlayer(dt) {
    const sprint = keys.ShiftLeft || keys.ShiftRight;
    const crouch = keys.ControlLeft || keys.KeyC;
    let speed = (sprint && !crouch ? RUN : MOVE) * (crouch ? 0.45 : 1);
    let fwd = 0, strafe = 0;
    if (keys.KeyW || keys.ArrowUp) fwd += 1;
    if (keys.KeyS || keys.ArrowDown) fwd -= 1;
    if (keys.KeyA) strafe -= 1;
    if (keys.KeyD) strafe += 1;
    if (keys.ArrowLeft) rotate(TURN * dt);
    if (keys.ArrowRight) rotate(-TURN * dt);
    const len = Math.hypot(fwd, strafe) || 1;
    fwd /= len; strafe /= len;

    const vx = (P.dirX * fwd + P.planeX / FOV_PLANE * strafe) * speed;
    const vy = (P.dirY * fwd + P.planeY / FOV_PLANE * strafe) * speed;
    if (vx || vy) {
      tryMove(P, P.x + vx * dt, P.y + vy * dt);
      P.bob += dt * (sprint ? 13 : 9);
      if (P.bob - P.lastStep > Math.PI) { P.lastStep = P.bob; Sound.play('step'); }
    } else {
      P.bob += dt * 1.6;
    }
    P.crouch = crouch ? 1 : 0;

    // 开火
    const w = WEAPONS[P.weapon];
    if ((mouseDown || keys.Space) && (w.auto || !P.firedOnce)) { fire(); P.firedOnce = true; }
    if (!(mouseDown || keys.Space)) P.firedOnce = false;

    P.cool = Math.max(0, P.cool - dt);
    P.swing = Math.max(0, P.swing - dt);
    P.kick = Math.max(0, P.kick - dt * 42);
    if (P.reloading > 0) {
      P.reloading -= dt;
      if (P.reloading <= 0) {
        const need = w.mag - P.clip[P.weapon];
        const take = Math.min(need, P.ammo[w.ammo]);
        P.clip[P.weapon] += take; P.ammo[w.ammo] -= take;
        updateHUD();
      }
    }

    // 出口
    const tile = isWall(P.x | 0, P.y | 0);
    const front = isWall((P.x + P.dirX * 0.6) | 0, (P.y + P.dirY * 0.6) | 0);
    if (tile === 9 || front === 9) finishLevel();

    // 拾取
    for (const e of G.entities) {
      if (e.type !== 'pickup' || e.taken) continue;
      if (Math.hypot(e.x - P.x, e.y - P.y) < 0.55) tryPickup(e);
    }
    G.entities = G.entities.filter(e => !e.taken);
  }

  function tryPickup(e) {
    const d = e.def;
    if (d.kind === 'health') {
      if (P.health >= 100) return;
      P.health = Math.min(100, P.health + d.amount);
      Sound.play('health');
    } else if (d.kind === 'armor') {
      if (P.armor >= 100) return;
      P.armor = Math.min(100, P.armor + d.amount);
      Sound.play('pickup');
    } else if (d.kind === 'ammo') {
      P.ammo[d.ammo] += d.amount;
      Sound.play('pickup');
    } else if (d.kind === 'weapon') {
      const first = !P.owned[d.weapon];
      P.owned[d.weapon] = true;
      P.ammo[WEAPONS[d.weapon].ammo] += d.amount;
      if (first) { P.clip[d.weapon] = WEAPONS[d.weapon].mag; switchWeapon(d.weapon); }
      Sound.play('levelup');
    }
    e.taken = true;
    G.flashPick = 0.6;
    G.score += 10;
    message(d.msg, 1.8);
    updateHUD();
  }

  function updateEntities(dt) {
    for (const e of G.entities) {
      if (e.type === 'pickup') { e.bobT += dt * 2.6; continue; }
      if (e.type === 'barrel') continue;
      if (e.type !== 'enemy') continue;
      e.anim += dt * (e.state === 'chase' ? 7 : 2.4);
      e.pain = Math.max(0, e.pain - dt);
      if (!e.alive) { e.deadT += dt; continue; }
      e.cool = Math.max(0, e.cool - dt);
      e.fireT = Math.max(0, e.fireT - dt);

      const dx = P.x - e.x, dy = P.y - e.y;
      const dist = Math.hypot(dx, dy);
      const sees = dist < e.def.sight && lineOfSight(e.x, e.y, P.x, P.y, e.def.sight);

      if (e.state === 'idle') {
        if (sees) {
          e.state = 'chase';
          if (e.kind === 'zombie') Sound.play('zombieGrowl');
          else if (e.kind === 'headcrab') Sound.play('crabIdle');
          else if (e.kind === 'soldier') Sound.play('alarm');
        } else {
          e.wander += dt * 0.7;
          const wx = Math.cos(e.wander) * 0.5 * dt, wy = Math.sin(e.wander) * 0.5 * dt;
          tryMove(e, e.x + wx, e.y + wy, e.radius);
        }
        continue;
      }

      // chase / attack
      if (!sees) { e.lostT = (e.lostT || 0) + dt; if (e.lostT > 4) { e.state = 'idle'; e.lostT = 0; } }
      else e.lostT = 0;

      const nx = dx / (dist || 1), ny = dy / (dist || 1);
      const meleeRange = e.radius + 0.45;

      if (e.def.ranged) {
        const want = 3.2;
        let mv = 0;
        if (dist > want + 0.8) mv = 1; else if (dist < want - 1.2) mv = -1;
        // 侧移躲避
        const st = Math.sin(G.time * 1.6 + e.wander) * 0.7;
        const sx = -ny * st, sy = nx * st;
        const sp = e.def.speed * dt;
        if (sees || dist > 4) tryMove(e, e.x + (nx * mv + sx) * sp, e.y + (ny * mv + sy) * sp, e.radius);
        if (sees && e.cool <= 0) {
          e.cool = e.def.atkRate * (0.7 + Math.random() * 0.6);
          e.fireT = e.def.beam ? 0.45 : 0.25;
          if (e.def.beam) {
            Sound.play('zap');
            setTimeout(() => {
              if (e.alive && lineOfSight(e.x, e.y, P.x, P.y, e.def.sight)) hurtPlayer(e.def.dmg);
            }, 380);
          } else {
            const burst = e.def.burst || 1;
            for (let b = 0; b < burst; b++) {
              setTimeout(() => {
                if (!e.alive || G.state !== 'play') return;
                Sound.play('smg');
                if (lineOfSight(e.x, e.y, P.x, P.y, e.def.sight) && Math.random() < 0.62) hurtPlayer(e.def.dmg);
                else G.shake = Math.min(1.5, G.shake + 0.2);
              }, b * 110);
            }
          }
        }
      } else {
        if (dist > meleeRange) {
          const sp = e.def.speed * dt;
          // 简单绕障：直行不通就侧滑
          const px = e.x, py = e.y;
          tryMove(e, e.x + nx * sp, e.y + ny * sp, e.radius);
          if (Math.abs(e.x - px) < 1e-4 && Math.abs(e.y - py) < 1e-4) {
            const side = (e.side = e.side || (Math.random() < 0.5 ? 1 : -1));
            tryMove(e, e.x - ny * sp * side, e.y + nx * sp * side, e.radius);
          }
        } else if (e.cool <= 0) {
          e.cool = e.def.atkRate;
          e.fireT = 0.3;
          hurtPlayer(e.def.dmg);
        }
      }
    }
  }

  function updateParticles(dt) {
    for (const p of G.particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.z += p.vz * dt; p.vz -= 4.5 * dt;
      if (p.z < 0.03) { p.z = 0.03; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; }
    }
    if (G.particles.length > 400) G.particles.splice(0, G.particles.length - 400);
    G.particles = G.particles.filter(p => p.life > 0);
  }

  function finishLevel() {
    if (G.state !== 'play') return;
    Sound.play('door'); Sound.play('levelup');
    document.exitPointerLock && document.exitPointerLock();
    if (G.levelIndex >= Maps.LEVELS.length - 1) {
      G.state = 'win';
      el('winStats').textContent = '总击杀 ' + G.totalKills + ' · 得分 ' + G.score +
        ' · 用时 ' + fmt(G.totalTime);
      showOverlay('winScreen');
    } else {
      G.state = 'levelend';
      el('endTitle').textContent = Maps.LEVELS[G.levelIndex].name + ' 完成';
      el('endStats').textContent = '本章击杀 ' + G.kills + ' · 得分 ' + G.score + ' · 用时 ' + fmt(G.time);
      el('nextName').textContent = '下一章：' + Maps.LEVELS[G.levelIndex + 1].name;
      showOverlay('endScreen');
    }
  }
  function fmt(s) { s = Math.floor(s); return String((s / 60) | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

  // ---------------- 渲染：墙 ----------------
  function renderWalls() {
    const pitch = (P.pitch | 0) + (Math.sin(P.bob) * 1.6 | 0) - (P.crouch ? 16 : 0) + (G.shake ? (Math.random() - 0.5) * G.shake * 6 : 0);
    const horizon = (RH / 2 + pitch) | 0;

    // 天花板 / 地板
    for (let y = 0; y < RH; y++) {
      const col = y < horizon ? G.ceilCol[clamp(y, 0, RH - 1)] : G.floorCol[clamp(y, 0, RH - 1)];
      const o = y * RW;
      buf.fill(col, o, o + RW);
    }

    const lightRange = G.light * (P.flashlight ? 1 : 0.55) + (G.muzzle > 0 ? 6 : 0);

    for (let x = 0; x < RW; x++) {
      const camX = 2 * x / RW - 1;
      const rdx = P.dirX + P.planeX * camX;
      const rdy = P.dirY + P.planeY * camX;
      let mx = P.x | 0, my = P.y | 0;
      const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
      const ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      let sx, sy, sdx, sdy;
      if (rdx < 0) { sx = -1; sdx = (P.x - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - P.x) * ddx; }
      if (rdy < 0) { sy = -1; sdy = (P.y - my) * ddy; } else { sy = 1; sdy = (my + 1 - P.y) * ddy; }
      let side = 0, tile = 0, guard = 0;
      while (guard++ < 200) {
        if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; }
        else { sdy += ddy; my += sy; side = 1; }
        tile = isWall(mx, my);
        if (tile > 0) break;
      }
      const perp = side === 0 ? (sdx - ddx) : (sdy - ddy);
      zBuf[x] = perp;
      const lineH = (RH / perp) | 0;
      let dStart = -lineH / 2 + horizon;
      let dEnd = lineH / 2 + horizon;
      const y0 = Math.max(0, dStart | 0), y1 = Math.min(RH - 1, dEnd | 0);
      if (y1 < y0) continue;

      let wallX = side === 0 ? P.y + perp * rdy : P.x + perp * rdx;
      wallX -= Math.floor(wallX);
      let texX = (wallX * TEX) | 0;
      if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = TEX - texX - 1;

      // 明暗
      let lit = 1 - perp / lightRange;
      if (side === 1) lit *= 0.72;
      lit = clamp(lit, 0.13, 1);
      const shadeIdx = clamp((lit * (SHADES - 1)) | 0, 0, SHADES - 1);
      const tex = WALLTEX[clamp(tile - 1, 0, WALLTEX.length - 1)][shadeIdx];

      const stepT = TEX / lineH;
      let texPos = (y0 - horizon + lineH / 2) * stepT;
      let off = y0 * RW + x;
      const base = texX;
      for (let y = y0; y <= y1; y++) {
        const ty = texPos & 63;
        buf[off] = tex[(ty << 6) + base];
        texPos += stepT;
        off += RW;
      }
    }
    return horizon;
  }

  // ---------------- 渲染：精灵 ----------------
  function renderSprites(horizon) {
    const list = [];
    for (const e of G.entities) {
      const dx = e.x - P.x, dy = e.y - P.y;
      e._d = dx * dx + dy * dy;
      if (e._d < 900) list.push(e);
    }
    list.sort((a, b) => b._d - a._d);

    const invDet = 1 / (P.planeX * P.dirY - P.dirX * P.planeY);
    const lightRange = G.light * (P.flashlight ? 1 : 0.6) + (G.muzzle > 0 ? 6 : 0);

    for (const e of list) {
      const sx = e.x - P.x, sy = e.y - P.y;
      const tX = invDet * (P.dirY * sx - P.dirX * sy);
      const tY = invDet * (-P.planeY * sx + P.planeX * sy);
      if (tY <= 0.12) continue;

      const canvasSet = pickSprite(e);
      if (!canvasSet) continue;
      const dist = Math.sqrt(e._d);
      let lit = clamp(1 - dist / lightRange, 0.16, 1);
      if (e.pain > 0) lit = 1;
      const shade = canvasSet[clamp((lit * (Sprites.LEVELS - 1)) | 0, 0, Sprites.LEVELS - 1)];

      const screenX = ((RW / 2) * (1 + tX / tY)) | 0;
      const scale = e.scale || 1;
      let h = Math.abs((RH / tY) * scale) | 0;
      let w = h;
      const vOff = ((e.vOff || 0) * RH / tY) | 0;
      const bobY = e.type === 'pickup' ? Math.sin(e.bobT) * (RH / tY) * 0.02 : 0;
      const groundY = horizon + (RH / tY) / 2;
      const yStart = (groundY - h - vOff + bobY) | 0;

      let x0 = (screenX - w / 2) | 0, x1 = (screenX + w / 2) | 0;
      if (x1 < 0 || x0 >= RW || h < 1) continue;

      // 找可见连续区段
      let run = -1;
      for (let x = Math.max(0, x0); x <= Math.min(RW - 1, x1 + 1); x++) {
        const visible = x <= Math.min(RW - 1, x1) && tY < zBuf[x];
        if (visible && run < 0) run = x;
        if ((!visible || x === Math.min(RW - 1, x1) + 1) && run >= 0) {
          const rEnd = visible ? x : x - 1;
          const u0 = ((run - x0) / (x1 - x0 || 1)) * Sprites.SIZE;
          const u1 = ((rEnd + 1 - x0) / (x1 - x0 || 1)) * Sprites.SIZE;
          sctx.drawImage(shade, u0, 0, Math.max(0.5, u1 - u0), Sprites.SIZE,
            run, yStart, rEnd - run + 1, h);
          run = -1;
        }
      }
    }
  }

  function pickSprite(e) {
    if (e.type === 'pickup' || e.type === 'barrel') return SPR[e.sprite][0];
    if (e.type === 'enemy') {
      if (!e.alive) return SPR.corpse[0];
      if (e.fireT > 0 && e.def.ranged) {
        const set = e.kind === 'vort' ? SPR.vortFire : SPR.soldierFire;
        return set[(e.anim * 3 | 0) % set.length];
      }
      const set = SPR[e.sprite];
      return set[(e.anim | 0) % set.length];
    }
    return null;
  }

  // ---------------- 渲染：粒子（作为屏幕空间点） ----------------
  function renderParticles(horizon) {
    const invDet = 1 / (P.planeX * P.dirY - P.dirX * P.planeY);
    for (const p of G.particles) {
      const sx = p.x - P.x, sy = p.y - P.y;
      const tX = invDet * (P.dirY * sx - P.dirX * sy);
      const tY = invDet * (-P.planeY * sx + P.planeX * sy);
      if (tY <= 0.15) continue;
      const scrX = ((RW / 2) * (1 + tX / tY)) | 0;
      if (scrX < 0 || scrX >= RW || tY >= zBuf[scrX]) continue;
      const groundY = horizon + (RH / tY) / 2;
      const y = (groundY - (RH / tY) * p.z) | 0;
      const size = Math.max(1, (2.4 / tY * 3) | 0);
      sctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      sctx.fillStyle = p.color;
      sctx.fillRect(scrX - (size >> 1), y - (size >> 1), size, size);
    }
    sctx.globalAlpha = 1;
  }

  // ---------------- 渲染：武器视图模型 ----------------
  function renderViewmodel() {
    const W = fx.width, H = fx.height;
    const s = (H / 540) * 1.35;
    const w = WEAPONS[P.weapon];
    const bobX = Math.sin(P.bob) * 12 * s;
    const bobY = Math.abs(Math.cos(P.bob)) * 10 * s;
    const kick = P.kick * s;
    const cx = W * 0.63 + bobX, cy = H + bobY - kick;

    fctx.save();
    fctx.translate(cx, cy);
    fctx.scale(s, s);

    const flash = G.muzzle > 0;
    if (w.id === 'crowbar') {
      const sw = P.swing / (w.rate || 1);
      fctx.rotate(-0.9 + sw * 1.5);
      fctx.fillStyle = '#8f3b1e';
      fctx.fillRect(-30, -260, 30, 260);
      fctx.fillStyle = '#b04d27';
      fctx.fillRect(-30, -260, 10, 260);
      fctx.beginPath();
      fctx.moveTo(-30, -260); fctx.lineTo(-120, -300); fctx.lineTo(-118, -270);
      fctx.lineTo(-30, -232); fctx.closePath();
      fctx.fillStyle = '#9c4321'; fctx.fill();
      fctx.fillStyle = 'rgba(255,255,255,.18)';
      fctx.fillRect(-26, -250, 4, 230);
    } else if (w.id === 'pistol') {
      fctx.fillStyle = '#20232a';
      fctx.fillRect(-46, -120, 62, 120);           // 握把
      fctx.fillStyle = '#2b2f38';
      fctx.fillRect(-70, -180, 150, 62);           // 套筒
      fctx.fillStyle = '#151820';
      fctx.fillRect(60, -168, 26, 16);
      fctx.fillStyle = 'rgba(255,255,255,.12)';
      fctx.fillRect(-66, -176, 140, 6);
      fctx.fillStyle = '#0d0f13'; fctx.fillRect(64, -150, 18, 10);
      if (flash) muzzleFlash(96, -152);
    } else if (w.id === 'shotgun') {
      fctx.fillStyle = '#6b4526';
      fctx.fillRect(-70, -130, 90, 130);
      fctx.fillStyle = '#1d1f22';
      fctx.fillRect(-80, -200, 260, 46);
      fctx.fillStyle = '#2a2d31';
      fctx.fillRect(-40, -152, 150, 30);           // 前护木
      fctx.fillStyle = '#0e1012';
      fctx.fillRect(150, -196, 34, 38);
      fctx.fillStyle = 'rgba(255,255,255,.1)';
      fctx.fillRect(-76, -196, 250, 6);
      if (flash) muzzleFlash(200, -178);
    } else {
      fctx.fillStyle = '#191b1e';
      fctx.fillRect(-50, -140, 56, 140);
      fctx.fillStyle = '#23262a';
      fctx.fillRect(-90, -210, 220, 56);
      fctx.fillStyle = '#131518';
      fctx.fillRect(-20, -154, 34, 90);            // 弹匣
      fctx.fillRect(120, -200, 40, 22);
      fctx.fillStyle = 'rgba(255,255,255,.10)';
      fctx.fillRect(-86, -206, 210, 5);
      if (flash) muzzleFlash(176, -190);
    }
    fctx.restore();

    // HEV 手套
    fctx.save();
    fctx.translate(cx, cy); fctx.scale(s, s);
    fctx.fillStyle = '#d4611c';
    fctx.beginPath();
    fctx.moveTo(-70, 0); fctx.lineTo(-30, -100); fctx.lineTo(60, -80);
    fctx.lineTo(90, 0); fctx.closePath(); fctx.fill();
    fctx.fillStyle = '#a8480f';
    fctx.fillRect(-40, -70, 90, 12);
    fctx.restore();
  }

  function muzzleFlash(x, y) {
    const r = 26 + Math.random() * 22;
    const g = fctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(255,255,220,.95)');
    g.addColorStop(0.4, 'rgba(255,190,60,.75)');
    g.addColorStop(1, 'rgba(255,120,0,0)');
    fctx.fillStyle = g;
    fctx.beginPath(); fctx.arc(x, y, r, 0, 7); fctx.fill();
  }

  // ---------------- 渲染：叠加层 ----------------
  function renderOverlay() {
    const W = fx.width, H = fx.height;
    fctx.clearRect(0, 0, W, H);
    if (G.state === 'menu') return;

    renderViewmodel();

    // 准星
    const cx = W / 2, cy = H / 2 + (P.pitch * (H / RH) * 0);
    const spread = 8 + (P.cool * 60) + (WEAPONS[P.weapon].spread || 0) * 260;
    fctx.strokeStyle = G.hitMark > 0 ? '#ff5a3c' : 'rgba(120,255,160,.85)';
    fctx.lineWidth = 2;
    fctx.beginPath();
    fctx.moveTo(cx - spread - 8, cy); fctx.lineTo(cx - spread, cy);
    fctx.moveTo(cx + spread, cy); fctx.lineTo(cx + spread + 8, cy);
    fctx.moveTo(cx, cy - spread - 8); fctx.lineTo(cx, cy - spread);
    fctx.moveTo(cx, cy + spread); fctx.lineTo(cx, cy + spread + 8);
    fctx.stroke();
    if (G.hitMark > 0) {
      fctx.strokeStyle = '#ff5a3c';
      fctx.beginPath();
      fctx.moveTo(cx - 10, cy - 10); fctx.lineTo(cx - 4, cy - 4);
      fctx.moveTo(cx + 10, cy - 10); fctx.lineTo(cx + 4, cy - 4);
      fctx.moveTo(cx - 10, cy + 10); fctx.lineTo(cx - 4, cy + 4);
      fctx.moveTo(cx + 10, cy + 10); fctx.lineTo(cx + 4, cy + 4);
      fctx.stroke();
    }

    // 受伤 / 拾取闪光 + 暗角
    if (G.flashDmg > 0) {
      const g = fctx.createRadialGradient(cx, cy, H * 0.2, cx, cy, H * 0.85);
      g.addColorStop(0, 'rgba(160,0,0,0)');
      g.addColorStop(1, 'rgba(190,10,10,' + clamp(G.flashDmg, 0, 0.85) + ')');
      fctx.fillStyle = g; fctx.fillRect(0, 0, W, H);
    }
    if (G.flashPick > 0) {
      fctx.fillStyle = 'rgba(255,170,60,' + (G.flashPick * 0.18) + ')';
      fctx.fillRect(0, 0, W, H);
    }
    const vg = fctx.createRadialGradient(cx, cy, H * 0.35, cx, cy, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.55)');
    fctx.fillStyle = vg; fctx.fillRect(0, 0, W, H);

    // 低血量脉冲
    if (P.health < 30 && !P.dead) {
      const a = 0.12 + Math.sin(G.totalTime * 6) * 0.08;
      fctx.fillStyle = 'rgba(200,0,0,' + Math.max(0, a) + ')';
      fctx.fillRect(0, 0, W, H);
    }
  }

  // ---------------- 小地图 ----------------
  function renderMinimap() {
    const W = mini.width, H = mini.height;
    mctx.clearRect(0, 0, W, H);
    const view = 11;
    const cell = W / (view * 2);
    mctx.save();
    mctx.translate(W / 2, H / 2);
    for (let dy = -view; dy <= view; dy++) {
      for (let dx = -view; dx <= view; dx++) {
        const mx = (P.x | 0) + dx, my = (P.y | 0) + dy;
        const t = isWall(mx, my);
        if (!t) continue;
        mctx.fillStyle = t === 9 ? '#ff8c1a' : 'rgba(120,200,150,.65)';
        mctx.fillRect((mx - P.x) * cell, (my - P.y) * cell, cell + 0.6, cell + 0.6);
      }
    }
    for (const e of G.entities) {
      const dx = e.x - P.x, dy = e.y - P.y;
      if (Math.abs(dx) > view || Math.abs(dy) > view) continue;
      if (e.type === 'enemy' && e.alive) mctx.fillStyle = '#ff4040';
      else if (e.type === 'pickup') mctx.fillStyle = '#48d4ff';
      else if (e.type === 'barrel') mctx.fillStyle = '#ff9a2e';
      else continue;
      mctx.fillRect(dx * cell - 1.5, dy * cell - 1.5, 3.5, 3.5);
    }
    // 玩家
    mctx.fillStyle = '#ffd24a';
    mctx.beginPath();
    mctx.moveTo(P.dirX * 6, P.dirY * 6);
    mctx.lineTo(-P.dirY * 4 - P.dirX * 3, P.dirX * 4 - P.dirY * 3);
    mctx.lineTo(P.dirY * 4 - P.dirX * 3, -P.dirX * 4 - P.dirY * 3);
    mctx.closePath(); mctx.fill();
    mctx.restore();
  }

  // ---------------- HUD ----------------
  function updateHUD() {
    el('hp').textContent = Math.ceil(P.health);
    el('armor').textContent = Math.ceil(P.armor);
    const w = WEAPONS[P.weapon];
    el('weaponName').textContent = w.name;
    if (w.melee) { el('ammo').textContent = '--'; el('ammoRes').textContent = ''; }
    else {
      el('ammo').textContent = P.clip[P.weapon];
      el('ammoRes').textContent = '/ ' + P.ammo[w.ammo];
    }
    el('hpBar').style.width = clamp(P.health, 0, 100) + '%';
    el('armorBar').style.width = clamp(P.armor, 0, 100) + '%';
    el('hp').className = P.health < 30 ? 'val danger' : 'val';
    el('score').textContent = G.score;
    document.querySelectorAll('#weaponList li').forEach((li, i) => {
      li.classList.toggle('own', P.owned[i]);
      li.classList.toggle('active', i === P.weapon);
    });
  }

  // ---------------- 主循环 ----------------
  let last = now();
  function loop() {
    const t = now();
    let dt = Math.min(0.05, t - last);
    last = t;
    update(dt);
    if (G.state !== 'menu') {
      const horizon = renderWalls();
      sctx.putImageData(frameImg, 0, 0);
      renderSprites(horizon);
      renderParticles(horizon);
      renderOverlay();
      renderMinimap();
      updateHUDLight();
    }
    requestAnimationFrame(loop);
  }
  let hudTick = 0;
  function updateHUDLight() {
    hudTick++;
    if (hudTick % 6 === 0) updateHUD();
  }

  // ---------------- 界面控制 ----------------
  function showOverlay(id) {
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
    if (id) el(id).classList.remove('hidden');
    el('lockHint').classList.add('hidden');
  }
  function hideOverlays() {
    document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
  }

  function resetPlayer() {
    P.health = 100; P.armor = 25; P.dead = false;
    P.owned = [true, true, false, false];
    P.ammo = { '9mm': 68, buck: 0, smg: 0 };
    P.clip = [0, 17, 0, 0];
    P.weapon = 1; P.cool = 0; P.reloading = 0; P.invuln = 1.2;
    G.score = 0; G.totalKills = 0; G.totalTime = 0;
  }

  function startGame() {
    resetPlayer();
    hideOverlays();
    loadLevel(0);
    fitFx();
    requestLock();
  }
  function restartLevel() {
    P.health = 100; P.armor = Math.max(P.armor, 15); P.dead = false; P.invuln = 1.5;
    P.clip[P.weapon] = WEAPONS[P.weapon].melee ? 0 : Math.max(P.clip[P.weapon], Math.min(WEAPONS[P.weapon].mag, P.ammo[WEAPONS[P.weapon].ammo]));
    hideOverlays();
    loadLevel(G.levelIndex);
    requestLock();
  }
  function togglePause() {
    if (G.state === 'play') {
      G.state = 'pause';
      document.exitPointerLock && document.exitPointerLock();
      showOverlay('pauseScreen');
    } else if (G.state === 'pause') {
      hideOverlays();
      G.state = 'play';
      requestLock();
    }
  }

  // 按钮
  el('btnStart').addEventListener('click', startGame);
  el('btnResume').addEventListener('click', togglePause);
  el('btnQuit').addEventListener('click', () => { G.state = 'menu'; showOverlay('menuScreen'); });
  el('btnRetry').addEventListener('click', restartLevel);
  el('btnNext').addEventListener('click', () => { hideOverlays(); loadLevel(G.levelIndex + 1); requestLock(); });
  el('btnAgain').addEventListener('click', startGame);
  el('viewport').addEventListener('click', () => {
    if (G.state === 'play' && !pointerLocked) requestLock();
  });
  document.querySelectorAll('[data-diff]').forEach(b => {
    b.addEventListener('click', () => {
      G.difficulty = b.dataset.diff;
      document.querySelectorAll('[data-diff]').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    });
  });
  el('sens').addEventListener('input', (e) => {
    sens = parseFloat(e.target.value) / 1000;
    el('sensVal').textContent = e.target.value;
  });

  // ---------------- 启动 ----------------
  function boot() {
    const t0 = performance.now();
    WALLTEX = Textures.build();
    SPR = Sprites.build();
    fitFx();
    el('bootTime').textContent = ((performance.now() - t0) | 0) + ' ms';
    el('loading').classList.add('hidden');
    showOverlay('menuScreen');
    requestAnimationFrame(loop);
  }
  window.addEventListener('load', () => setTimeout(boot, 30));

  // 调试接口（控制台可用）：HLF2.state / HLF2.tp(x,y) / HLF2.god()
  window.HLF2 = {
    get state() { return G.state; },
    G, P, WEAPONS,
    tp(x, y) { P.x = x + 0.5; P.y = y + 0.5; },
    give() { P.owned = [true, true, true, true]; P.ammo = { '9mm': 999, buck: 999, smg: 999 }; updateHUD(); },
    god() { P.invuln = 1e9; return '无敌开启'; },
    nextLevel() { finishLevel(); },
    load(i) { hideOverlays(); loadLevel(i); },
    findExit() {
      for (let y = 0; y < G.mapH; y++) for (let x = 0; x < G.mapW; x++) if (G.map[y][x] === 9) return [x, y];
      return null;
    }
  };
})();

/* ============================================================
 * HLF2 - 精灵（怪物 / 道具 / 特效）程序化绘制
 * 每个精灵预渲染 N 个明暗等级，渲染时按距离取用。
 * ============================================================ */
(function (global) {
  'use strict';

  const S = 64;
  const LEVELS = 10;

  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function frame(draw) {
    const c = cv(S, S);
    const g = c.getContext('2d');
    draw(g, S);
    return c;
  }

  // 为一张画布生成明暗序列
  function shadeSet(src) {
    const out = [];
    for (let i = 0; i < LEVELS; i++) {
      const f = i / (LEVELS - 1);
      const c = cv(S, S);
      const g = c.getContext('2d');
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(0,0,0,' + (1 - f).toFixed(3) + ')';
      g.fillRect(0, 0, S, S);
      out.push(c);
    }
    return out;
  }

  function ell(g, x, y, rx, ry, color) {
    g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
  }

  /* ---------------- 头蟹 Headcrab ---------------- */
  function headcrab(step) {
    return frame((g) => {
      const bob = Math.sin(step) * 3;
      g.save(); g.translate(0, bob);
      // 腿
      g.strokeStyle = '#8a6a44'; g.lineWidth = 3; g.lineCap = 'round';
      const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
      legs.forEach((l, i) => {
        const sw = Math.sin(step * 2 + i) * 5;
        g.beginPath();
        g.moveTo(32 + l[0] * 8, 40);
        g.lineTo(32 + l[0] * (18 + Math.abs(sw)), 44 + i * 2);
        g.lineTo(32 + l[0] * (22 + sw), 58);
        g.stroke();
      });
      // 身体
      ell(g, 32, 36, 17, 13, '#b08a58');
      ell(g, 32, 32, 15, 10, '#c79c65');
      ell(g, 26, 30, 5, 3.4, 'rgba(255,255,255,.25)');
      // 口器
      g.fillStyle = '#5c3a22';
      g.beginPath(); g.moveTo(24, 45); g.lineTo(40, 45); g.lineTo(32, 52); g.closePath(); g.fill();
      g.fillStyle = '#e8e2d2';
      for (let i = 0; i < 4; i++) { g.fillRect(26 + i * 4, 45, 2, 3); }
      // 眼点
      g.fillStyle = '#2a1a10';
      g.beginPath(); g.arc(27, 38, 2, 0, 7); g.arc(37, 38, 2, 0, 7); g.fill();
      g.restore();
    });
  }

  /* ---------------- 僵尸 Zombie ---------------- */
  function zombie(step) {
    return frame((g) => {
      const sw = Math.sin(step) * 4;
      // 腿
      g.fillStyle = '#5c5f4a';
      g.fillRect(26 + sw * .5, 42, 6, 20);
      g.fillRect(34 - sw * .5, 42, 6, 20);
      // 躯干（白大褂）
      g.fillStyle = '#c9c6b4'; g.fillRect(23, 22, 18, 22);
      g.fillStyle = '#8f2d22'; // 血迹
      g.beginPath(); g.arc(30, 32, 5, 0, 7); g.arc(36, 38, 3, 0, 7); g.fill();
      // 露出的肋骨
      g.fillStyle = '#e2d9c4';
      for (let i = 0; i < 3; i++) g.fillRect(25, 26 + i * 4, 8, 1.6);
      // 手臂（前伸）
      g.fillStyle = '#b7ab92';
      g.save(); g.translate(23, 26); g.rotate(-0.5 + sw * .03); g.fillRect(-4, 0, 18, 5); g.restore();
      g.save(); g.translate(41, 26); g.rotate(0.4 - sw * .03); g.fillRect(-4, 0, 18, 5); g.restore();
      // 头 + 头蟹
      ell(g, 32, 18, 8, 9, '#9d9077');
      ell(g, 32, 13, 11, 8, '#b08a58');
      g.fillStyle = '#5c3a22';
      g.beginPath(); g.moveTo(26, 18); g.lineTo(38, 18); g.lineTo(32, 24); g.closePath(); g.fill();
      g.strokeStyle = '#8a6a44'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(23, 14); g.lineTo(16, 24); g.moveTo(41, 14); g.lineTo(48, 24); g.stroke();
    });
  }

  /* ---------------- HECU 士兵 ---------------- */
  function soldier(step, firing) {
    return frame((g) => {
      const sw = Math.sin(step) * 4;
      g.fillStyle = '#2f3a2a';
      g.fillRect(26 + sw * .4, 42, 6, 20);
      g.fillRect(34 - sw * .4, 42, 6, 20);
      g.fillStyle = '#3d4a33'; g.fillRect(22, 20, 20, 24);
      g.fillStyle = '#2a3324'; g.fillRect(22, 30, 20, 5); // 战术背心带
      g.fillStyle = '#586b47'; g.fillRect(19, 22, 6, 16); g.fillRect(39, 22, 6, 16);
      // 头盔 + 防毒面具
      ell(g, 32, 14, 9, 8, '#3d4a33');
      g.fillStyle = '#20261c'; g.fillRect(26, 14, 12, 8);
      g.fillStyle = '#9fb6c9'; // 目镜
      g.beginPath(); g.arc(29, 16, 2.6, 0, 7); g.arc(35, 16, 2.6, 0, 7); g.fill();
      g.fillStyle = '#141813'; g.fillRect(29, 20, 6, 4);
      // 武器
      g.fillStyle = '#1b1b1b'; g.fillRect(36, 30, 20, 4); g.fillRect(40, 34, 5, 5);
      if (firing) {
        g.fillStyle = '#ffd45a';
        g.beginPath(); g.arc(58, 32, 6, 0, 7); g.fill();
        g.fillStyle = '#fff3c0';
        g.beginPath(); g.arc(57, 32, 3, 0, 7); g.fill();
      }
    });
  }

  /* ---------------- Vortigaunt 异星奴隶 ---------------- */
  function vort(step, charging) {
    return frame((g) => {
      const sw = Math.sin(step) * 3;
      g.fillStyle = '#3f6b3a';
      g.fillRect(26 + sw * .4, 44, 7, 18); g.fillRect(34 - sw * .4, 44, 7, 18);
      g.fillStyle = '#4e8447'; g.fillRect(23, 22, 18, 24);
      g.fillStyle = '#3a6435'; g.fillRect(23, 34, 18, 4);
      // 胸口第三只手
      g.fillStyle = '#67a45c'; g.fillRect(29, 28, 6, 10);
      ell(g, 32, 16, 9, 9, '#54924b');
      g.fillStyle = '#c8f57a'; // 独眼
      g.beginPath(); g.arc(32, 15, 4, 0, 7); g.fill();
      g.fillStyle = '#1c2a16'; g.beginPath(); g.arc(32, 15, 1.8, 0, 7); g.fill();
      // 手臂
      g.strokeStyle = '#4e8447'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(24, 26); g.lineTo(14, 36 + sw); g.moveTo(40, 26); g.lineTo(50, 36 - sw); g.stroke();
      if (charging) {
        g.strokeStyle = '#8ef0ff'; g.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          g.globalAlpha = .4 + Math.random() * .6;
          g.beginPath();
          g.moveTo(14 + Math.random() * 4, 36); 
          g.lineTo(32 + (Math.random() - .5) * 10, 30 + (Math.random() - .5) * 10);
          g.lineTo(50 - Math.random() * 4, 36);
          g.stroke();
        }
        g.globalAlpha = 1;
      }
    });
  }

  /* ---------------- 道具 ---------------- */
  function medkit() {
    return frame((g) => {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(32, 54, 16, 4, 0, 0, 7); g.fill();
      g.fillStyle = '#e8e8e8'; g.fillRect(18, 30, 28, 22);
      g.fillStyle = '#cfcfcf'; g.fillRect(18, 30, 28, 4);
      g.fillStyle = '#d23b2f'; g.fillRect(29, 34, 6, 15); g.fillRect(23, 39, 18, 5);
      g.strokeStyle = '#8b8b8b'; g.lineWidth = 2; g.strokeRect(18, 30, 28, 22);
    });
  }
  function battery() {
    return frame((g) => {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(32, 54, 13, 4, 0, 0, 7); g.fill();
      g.fillStyle = '#2b3540'; g.fillRect(22, 30, 20, 22);
      g.fillStyle = '#ff7b1c'; g.fillRect(25, 33, 14, 10);
      g.fillStyle = '#ffd76a'; g.fillRect(25, 33, 14, 3);
      g.fillStyle = '#8ef0ff'; g.fillRect(25, 46, 14, 3);
      g.strokeStyle = '#0e1216'; g.lineWidth = 2; g.strokeRect(22, 30, 20, 22);
    });
  }
  function ammoBox(color, label) {
    return frame((g) => {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(32, 54, 15, 4, 0, 0, 7); g.fill();
      g.fillStyle = color; g.fillRect(20, 36, 24, 16);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(20, 36, 24, 4);
      g.fillStyle = '#f2e9c9'; g.font = 'bold 10px monospace'; g.textAlign = 'center';
      g.fillText(label, 32, 48);
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.strokeRect(20, 36, 24, 16);
    });
  }
  function weaponPickup(kind) {
    return frame((g) => {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(32, 52, 16, 4, 0, 0, 7); g.fill();
      if (kind === 'shotgun') {
        g.fillStyle = '#6b4a2a'; g.fillRect(14, 42, 16, 6);
        g.fillStyle = '#2b2b2b'; g.fillRect(28, 40, 24, 5); g.fillRect(30, 45, 14, 4);
      } else if (kind === 'smg') {
        g.fillStyle = '#232323'; g.fillRect(16, 40, 30, 6); g.fillRect(24, 46, 6, 10);
        g.fillStyle = '#3a3a3a'; g.fillRect(40, 38, 8, 4);
      } else {
        g.fillStyle = '#7a2f18'; g.fillRect(14, 44, 30, 5);
        g.fillRect(40, 34, 5, 14);
      }
    });
  }
  function barrel() {
    return frame((g) => {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(32, 58, 14, 4, 0, 0, 7); g.fill();
      const grad = g.createLinearGradient(18, 0, 46, 0);
      grad.addColorStop(0, '#7a2410'); grad.addColorStop(.4, '#c8481f');
      grad.addColorStop(1, '#5e1c0c');
      g.fillStyle = grad; g.fillRect(18, 18, 28, 40);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(18, 26, 28, 3); g.fillRect(18, 46, 28, 3);
      g.fillStyle = '#f5d24a'; g.font = 'bold 9px monospace'; g.textAlign = 'center';
      g.fillText('☣', 32, 42);
    });
  }
  function corpse() {
    return frame((g) => {
      g.fillStyle = 'rgba(90,10,10,.5)';
      g.beginPath(); g.ellipse(32, 56, 20, 6, 0, 0, 7); g.fill();
      g.fillStyle = '#6b5f4a'; g.fillRect(18, 50, 28, 8);
      g.fillStyle = '#7d2a1d'; g.fillRect(22, 48, 10, 4);
    });
  }

  function build() {
    const S2 = {};
    const set = (name, canvases) => { S2[name] = canvases.map(shadeSet); };
    set('headcrab', [headcrab(0), headcrab(1.6), headcrab(3.1), headcrab(4.7)]);
    set('zombie', [zombie(0), zombie(1.6), zombie(3.1), zombie(4.7)]);
    set('soldier', [soldier(0, false), soldier(1.6, false), soldier(3.1, false), soldier(4.7, false)]);
    set('soldierFire', [soldier(0, true), soldier(2.4, true)]);
    set('vort', [vort(0, false), vort(1.6, false), vort(3.1, false), vort(4.7, false)]);
    set('vortFire', [vort(0, true), vort(2.4, true)]);
    set('medkit', [medkit()]);
    set('battery', [battery()]);
    set('ammo9mm', [ammoBox('#3a5a86', '9MM')]);
    set('ammoBuck', [ammoBox('#8a5a1f', 'BUCK')]);
    set('ammoSmg', [ammoBox('#4a6b3a', 'SMG')]);
    set('pickShotgun', [weaponPickup('shotgun')]);
    set('pickSmg', [weaponPickup('smg')]);
    set('barrel', [barrel()]);
    set('corpse', [corpse()]);
    return S2;
  }

  global.Sprites = { build: build, LEVELS: LEVELS, SIZE: S };
})(window);

/* ============================================================
 * HLF2 - 纹理生成器
 * 所有墙面纹理都是程序化生成的 64x64 像素图，
 * 并预先烘焙 32 级明暗，渲染时直接查表，速度极快。
 * ============================================================ */
(function (global) {
  'use strict';

  const TEX = 64;
  const SHADES = 32;

  function rgb(r, g, b) {
    return (255 << 24) | (b << 16) | (g << 8) | r; // little-endian ABGR
  }

  function mkCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // ---------- 单张纹理绘制 ----------
  function paint(fn) {
    const c = mkCanvas(TEX, TEX);
    const g = c.getContext('2d');
    fn(g, TEX);
    const img = g.getImageData(0, 0, TEX, TEX);
    return new Uint32Array(img.data.buffer).slice();
  }

  function noise(g, size, amount, alpha) {
    for (let i = 0; i < amount; i++) {
      const x = (Math.random() * size) | 0;
      const y = (Math.random() * size) | 0;
      const v = (Math.random() * 255) | 0;
      g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + alpha + ')';
      g.fillRect(x, y, 1, 1);
    }
  }

  const painters = {
    // 1 混凝土墙
    concrete(g, s) {
      g.fillStyle = '#6a6a63'; g.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 16) {
        for (let x = 0; x < s; x += 32) {
          const off = (y / 16) % 2 ? 16 : 0;
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.fillRect(x + off, y, 31, 1);
          g.fillRect(x + off, y, 1, 15);
          g.fillStyle = 'rgba(255,255,255,0.07)';
          g.fillRect(x + off + 1, y + 1, 29, 13);
        }
      }
      noise(g, s, 900, 0.10);
    },
    // 2 金属板
    metal(g, s) {
      g.fillStyle = '#5d6570'; g.fillRect(0, 0, s, s);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      for (let y = 0; y < s; y += 4) g.fillRect(0, y, s, 1);
      g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2;
      g.strokeRect(3, 3, s - 6, s - 6);
      for (const [x, y] of [[8, 8], [56, 8], [8, 56], [56, 56], [32, 32]]) {
        g.fillStyle = '#8b95a1'; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill();
        g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(x + 0.7, y + 0.9, 1.4, 0, 7); g.fill();
      }
      noise(g, s, 400, 0.08);
    },
    // 3 危险警示条纹
    hazard(g, s) {
      g.fillStyle = '#c8a413'; g.fillRect(0, 0, s, s);
      g.fillStyle = '#171717';
      for (let i = -s; i < s * 2; i += 16) {
        g.beginPath();
        g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 - s, s); g.lineTo(i - s, s);
        g.closePath(); g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, s, 4); g.fillRect(0, s - 4, s, 4);
      noise(g, s, 500, 0.12);
    },
    // 4 管道墙
    pipes(g, s) {
      g.fillStyle = '#4a4f4a'; g.fillRect(0, 0, s, s);
      noise(g, s, 700, 0.10);
      for (const x of [10, 30, 50]) {
        const grad = g.createLinearGradient(x - 6, 0, x + 6, 0);
        grad.addColorStop(0, '#2f3630'); grad.addColorStop(.4, '#8d968b');
        grad.addColorStop(.6, '#6b736a'); grad.addColorStop(1, '#262b26');
        g.fillStyle = grad; g.fillRect(x - 6, 0, 12, s);
        g.fillStyle = '#39403a';
        g.fillRect(x - 8, 20, 16, 6); g.fillRect(x - 8, 46, 16, 6);
      }
    },
    // 5 电脑面板
    computer(g, s) {
      g.fillStyle = '#2b2f36'; g.fillRect(0, 0, s, s);
      g.fillStyle = '#0d1b12'; g.fillRect(6, 6, 52, 30);
      g.fillStyle = '#37ff7a';
      for (let i = 0; i < 9; i++) {
        const w = 6 + Math.random() * 40;
        g.globalAlpha = 0.35 + Math.random() * 0.6;
        g.fillRect(9, 9 + i * 3, w, 1.6);
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 5; i++) {
        g.fillStyle = ['#ff6a1f', '#ffd23f', '#37ff7a', '#3fa9ff', '#ff3f3f'][i];
        g.fillRect(8 + i * 12, 42, 8, 5);
      }
      g.fillStyle = '#1b1f24'; g.fillRect(4, 52, 56, 8);
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeRect(2, 2, s - 4, s - 4);
    },
    // 6 生化污染
    bio(g, s) {
      g.fillStyle = '#41503c'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = 'rgba(' + (60 + Math.random() * 60 | 0) + ',' + (140 + Math.random() * 90 | 0) + ',60,0.5)';
        g.beginPath();
        g.arc(Math.random() * s, Math.random() * s, 2 + Math.random() * 9, 0, 7);
        g.fill();
      }
      g.fillStyle = 'rgba(120,220,110,.25)';
      for (let x = 0; x < s; x += 7) g.fillRect(x, 0, 2, 10 + Math.random() * 40);
      noise(g, s, 800, 0.12);
    },
    // 7 砖墙 (旧区)
    brick(g, s) {
      g.fillStyle = '#7a4b38'; g.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 8) {
        for (let x = 0; x < s; x += 16) {
          const off = (y / 8) % 2 ? 8 : 0;
          g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + off, y, 15, 7);
          g.fillStyle = 'rgb(' + (120 + Math.random() * 30 | 0) + ',' + (72 + Math.random() * 20 | 0) + ',54)';
          g.fillRect(x + off + 1, y + 1, 13, 5);
        }
      }
      noise(g, s, 600, 0.10);
    },
    // 8 通风格栅
    vent(g, s) {
      g.fillStyle = '#3a3f45'; g.fillRect(0, 0, s, s);
      for (let y = 2; y < s - 2; y += 6) {
        g.fillStyle = '#11151a'; g.fillRect(4, y, s - 8, 4);
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(4, y + 4, s - 8, 1);
      }
      g.strokeStyle = '#575e66'; g.lineWidth = 3; g.strokeRect(2, 2, s - 4, s - 4);
    },
    // 9 出口闸门
    exitdoor(g, s) {
      g.fillStyle = '#4b4f55'; g.fillRect(0, 0, s, s);
      g.fillStyle = '#2c3035'; g.fillRect(2, 2, s - 4, s - 4);
      g.fillStyle = '#ff7b1c'; g.fillRect(6, 14, s - 12, 22);
      g.fillStyle = '#101010'; g.font = 'bold 13px monospace'; g.textAlign = 'center';
      g.fillText('EXIT', s / 2, 30);
      g.fillStyle = '#37ff7a';
      for (let i = 0; i < 4; i++) g.fillRect(10 + i * 12, 44, 8, 6);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, s - 6, s, 6);
    },
    // 10 玻璃/水泥混合窗
    glass(g, s) {
      g.fillStyle = '#3d4a52'; g.fillRect(0, 0, s, s);
      g.fillStyle = 'rgba(150,210,235,.45)'; g.fillRect(6, 6, s - 12, s - 12);
      g.strokeStyle = '#20272c'; g.lineWidth = 3;
      g.strokeRect(6, 6, s - 12, s - 12);
      g.beginPath(); g.moveTo(s / 2, 6); g.lineTo(s / 2, s - 6);
      g.moveTo(6, s / 2); g.lineTo(s - 6, s / 2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(10, s - 12); g.lineTo(28, 10); g.stroke();
    }
  };

  // ---------- 构建带明暗 LUT 的纹理集 ----------
  const order = ['concrete', 'metal', 'hazard', 'pipes', 'computer', 'bio', 'brick', 'vent', 'exitdoor', 'glass'];

  function build() {
    const shaded = []; // shaded[texIndex][shade] = Uint32Array
    for (let t = 0; t < order.length; t++) {
      const base = paint(painters[order[t]]);
      const levels = [];
      for (let s = 0; s < SHADES; s++) {
        const f = s / (SHADES - 1);
        const out = new Uint32Array(base.length);
        for (let i = 0; i < base.length; i++) {
          const px = base[i];
          const r = (px & 255) * f | 0;
          const gg = ((px >> 8) & 255) * f | 0;
          const b = ((px >> 16) & 255) * f | 0;
          out[i] = (255 << 24) | (b << 16) | (gg << 8) | r;
        }
        levels.push(out);
      }
      shaded.push(levels);
    }
    return shaded;
  }

  global.Textures = {
    SIZE: TEX,
    SHADES: SHADES,
    build: build,
    names: order,
    mkCanvas: mkCanvas
  };
})(window);

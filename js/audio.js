/* ============================================================
 * HLF2 - 程序化音效（WebAudio，无外部资源）
 * ============================================================ */
(function (global) {
  'use strict';

  let ctx = null, master = null, muted = false;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function noiseBuffer(dur) {
    const len = Math.max(1, (ctx.sampleRate * dur) | 0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function env(node, t0, a, d, peak) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    node.connect(g); g.connect(master);
    return g;
  }

  function tone(freq, dur, type, peak, slideTo) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    env(o, t0, 0.005, dur, peak || 0.3);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function burst(dur, filterType, freq, peak, q) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.05);
    const f = ctx.createBiquadFilter();
    f.type = filterType || 'bandpass';
    f.frequency.value = freq || 1200;
    f.Q.value = q || 1;
    src.connect(f);
    env(f, t0, 0.004, dur, peak || 0.3);
    src.start(t0); src.stop(t0 + dur + 0.06);
  }

  const SFX = {
    pistol() { burst(0.13, 'bandpass', 1500, 0.5, 0.8); tone(220, 0.11, 'square', 0.22, 70); },
    shotgun() { burst(0.3, 'lowpass', 1100, 0.75, 1); tone(120, 0.26, 'sawtooth', 0.3, 40); },
    smg() { burst(0.08, 'bandpass', 2000, 0.35, 1.2); tone(260, 0.06, 'square', 0.14, 90); },
    crowbar() { tone(520, 0.09, 'square', 0.16, 180); burst(0.07, 'highpass', 2600, 0.18); },
    hit() { burst(0.09, 'lowpass', 700, 0.35); },
    hurt() { tone(160, 0.22, 'sawtooth', 0.28, 70); burst(0.14, 'lowpass', 500, 0.25); },
    pickup() { tone(660, 0.08, 'square', 0.2); setTimeout(() => tone(990, 0.1, 'square', 0.2), 70); },
    health() { tone(520, 0.1, 'sine', 0.25); setTimeout(() => tone(780, 0.14, 'sine', 0.22), 90); },
    reload() { burst(0.05, 'bandpass', 900, 0.25); setTimeout(() => burst(0.06, 'bandpass', 1400, 0.25), 120); },
    empty() { burst(0.04, 'highpass', 3000, 0.2); },
    dead() { tone(200, 1.2, 'sawtooth', 0.3, 40); },
    explode() { burst(0.8, 'lowpass', 400, 0.8, 0.7); tone(80, 0.7, 'sawtooth', 0.4, 25); },
    crabDie() { tone(900, 0.25, 'sawtooth', 0.22, 200); burst(0.2, 'bandpass', 1800, 0.2); },
    zombieGrowl() { tone(110, 0.5, 'sawtooth', 0.16, 70); },
    crabIdle() { tone(1200, 0.06, 'square', 0.08, 800); },
    alarm() { tone(740, 0.35, 'square', 0.14, 500); },
    zap() { burst(0.25, 'highpass', 2200, 0.35); tone(1400, 0.2, 'sawtooth', 0.15, 300); },
    door() { tone(90, 0.5, 'sawtooth', 0.2, 140); burst(0.5, 'lowpass', 300, 0.2); },
    levelup() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'square', 0.22), i * 130));
    },
    step() { burst(0.05, 'lowpass', 300, 0.10); }
  };

  global.Sound = {
    init, resume,
    play(name) { init(); resume(); if (SFX[name]) SFX[name](); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.35; return muted; },
    get muted() { return muted; }
  };
})(window);

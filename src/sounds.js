let ctx = null, master = null, bufs = {};
const live = {};
const vols = JSON.parse(localStorage.getItem('sv') || '{}');
let sl = 0, st = null;

export const LIST = [
  ['rain', '🌧', 'مطر'], ['waves', '🌊', 'أمواج'], ['wind', '🍃', 'رياح'], ['fire', '🔥', 'موقد نار'],
  ['night', '🌙', 'ليل وصراصير'], ['brown', '🌫', 'ضوضاء بنية'], ['white', '⚪', 'ضوضاء بيضاء']
];

function nb(t) {
  const n = ctx.sampleRate * 4, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  let l = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (t === 'white') d[i] = w;
    else if (t === 'brown') { l = (l + .02 * w) / 1.02; d[i] = l * 3.5; }
    else { b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .11; }
  }
  return b;
}
function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.connect(ctx.destination);
    bufs = { white: nb('white'), pink: nb('pink'), brown: nb('brown') };
  }
  if (ctx.state === 'suspended') ctx.resume();
}
const src = t => { const s = ctx.createBufferSource(); s.buffer = bufs[t]; s.loop = true; s.start(0, Math.random() * 3); return s; };
const flt = (type, f, q = 1) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
const lfo = (hz, depth, param) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hz; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); return o; };
const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); };

const F = {
  rain(o) { const s = src('white'); chain(s, flt('highpass', 900), flt('lowpass', 9000), o); return [s]; },
  waves(o) { const s = src('brown'), g = ctx.createGain(); g.gain.value = .55; chain(s, flt('lowpass', 700), g, o); return [s, lfo(.11, .45, g.gain)]; },
  wind(o) { const s = src('pink'), bp = flt('bandpass', 450, .7); chain(s, bp, o); return [s, lfo(.07, 220, bp.frequency)]; },
  brown(o) { const s = src('brown'), g = ctx.createGain(); g.gain.value = .8; chain(s, g, o); return [s]; },
  white(o) { const s = src('white'); chain(s, flt('lowpass', 6500), o); return [s]; },
  fire(o) {
    const s = src('brown'), g = ctx.createGain(); g.gain.value = .5; chain(s, flt('lowpass', 400), g, o);
    let on = true, t;
    const pop = () => {
      if (!on) return;
      const b = src('white'), e = ctx.createGain(), now = ctx.currentTime;
      e.gain.setValueAtTime(0, now);
      e.gain.linearRampToValueAtTime(.5 + Math.random() * .5, now + .004);
      e.gain.exponentialRampToValueAtTime(.001, now + .05 + Math.random() * .06);
      chain(b, flt('bandpass', 1500 + Math.random() * 3000, 2), e, o);
      setTimeout(() => { try { b.stop(); } catch { } }, 250);
      t = setTimeout(pop, 60 + Math.random() * 350);
    };
    pop();
    return [s, { stop() { on = false; clearTimeout(t); } }];
  },
  night(o) {
    let on = true, t;
    const chirp = () => {
      if (!on) return;
      const n = 2 + Math.floor(Math.random() * 3), f = 4200 + Math.random() * 600;
      for (let i = 0; i < n; i++) {
        const at = ctx.currentTime + i * .09, os = ctx.createOscillator(), e = ctx.createGain();
        os.frequency.value = f;
        e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(.12, at + .01); e.gain.linearRampToValueAtTime(0, at + .06);
        chain(os, e, o); os.start(at); os.stop(at + .08);
      }
      t = setTimeout(chirp, 500 + Math.random() * 1200);
    };
    chirp();
    return [{ stop() { on = false; clearTimeout(t); } }];
  }
};

export const isOn = id => !!live[id];
export const getVol = id => vols[id] ?? .5;
export const sleepMin = () => sl;

export function setVol(id, v) {
  vols[id] = v; localStorage.setItem('sv', JSON.stringify(vols));
  if (live[id]) live[id].o.gain.setTargetAtTime(v * .7, ctx.currentTime, .05);
}
function stop(id) {
  const l = live[id]; if (!l) return;
  delete live[id];
  l.o.gain.setTargetAtTime(0, ctx.currentTime, .2);
  setTimeout(() => { l.nodes.forEach(n => { try { n.stop(); } catch { } }); try { l.o.disconnect(); } catch { } }, 900);
}
function start(id) {
  ensure();
  const o = ctx.createGain(); o.gain.value = 0; o.connect(master);
  const nodes = F[id](o);
  o.gain.setTargetAtTime(getVol(id) * .7, ctx.currentTime, .4);
  live[id] = { o, nodes };
}
export function stopAll() { Object.keys(live).forEach(stop); }

export function Mixer() {
  return LIST.map(([id, i, n]) => `<div class="card"><span style="font-size:26px">${i}</span>
  <div style="flex:1"><b>${n}</b><input type="range" min="0" max="100" value="${Math.round(getVol(id) * 100)}" data-in="sv" data-id="${id}" style="width:100%"></div>
  <button class="btn sm ${isOn(id) ? 'gold' : ''}" data-act="snd" data-id="${id}">${isOn(id) ? '⏸ إيقاف' : '▶ تشغيل'}</button></div>`).join('') +
    `<small>مؤقت الإيقاف التلقائي</small><div class="chips" style="margin-top:6px">${[0, 15, 30, 60].map(m => `<button class="chip ${sl === m ? 'on' : ''}" data-act="ssl" data-m="${m}">${m ? m + ' دقيقة' : 'بدون'}</button>`).join('')}</div>
  <button class="btn red sm" data-act="sall">⏹ إيقاف الكل</button>`;
}
export function refresh() { document.querySelectorAll('.mx').forEach(e => { e.innerHTML = Mixer(); }); }

export function sndAct(a, d) {
  if (a === 'snd') { isOn(d.id) ? stop(d.id) : start(d.id); }
  else if (a === 'ssl') {
    clearTimeout(st); sl = +d.m;
    if (sl) st = setTimeout(() => { stopAll(); sl = 0; refresh(); }, sl * 60000);
  } else if (a === 'sall') { stopAll(); clearTimeout(st); sl = 0; }
  refresh();
}

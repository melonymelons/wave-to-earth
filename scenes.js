import { paintAfternoon } from './afternoon.js';

const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function seededRandom(seed) {
  let n = seed;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

const random = seededRandom(2149);
const particles = Array.from({ length: 160 }, () => ({
  x: random(), y: random(), size: random(), speed: .2 + random(), phase: random() * TAU,
}));

function haze(ctx, x, y, rx, ry, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'transparent');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function sky(ctx, w, h, song, t) {
  const fill = ctx.createLinearGradient(0, 0, 0, h);
  fill.addColorStop(0, song.sky[0]);
  fill.addColorStop(.47, song.sky[1]);
  fill.addColorStop(.69, song.sky[2]);
  fill.addColorStop(1, song.water);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  const sun = song.scene === 'sunrise' || song.scene === 'dawn' || song.scene === 'curtains';
  haze(ctx, w * .75, h * .48, w * .43, h * .29, song.light, sun ? .58 : .24);
  if (sun || song.scene === 'ocean' || song.scene === 'train') {
    ctx.globalAlpha = sun ? .7 : .33;
    ctx.fillStyle = song.light;
    ctx.beginPath();
    ctx.arc(w * .75, h * (sun ? .47 : .49), Math.max(8, w * .022), 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (['night', 'lights', 'city', 'shore'].includes(song.scene)) {
    for (const p of particles.slice(0, 65)) {
      ctx.globalAlpha = (.12 + p.size * .35) * (.7 + Math.sin(t * .3 + p.phase) * .3);
      ctx.fillStyle = '#e9e5d8';
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h * .47, .4 + p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  clouds(ctx, w, h, song, t);
}

function clouds(ctx, w, h, song, t) {
  const storm = song.scene === 'storm';
  for (let i = 0; i < (storm ? 12 : 7); i++) {
    const p = particles[i];
    const x = ((p.x * w + t * (storm ? 5 : 1.4) + w * .35) % (w * 1.7)) - w * .35;
    haze(ctx, x, h * (.11 + p.y * .27), w * (.17 + p.size * .1), h * (.027 + p.size * .025), storm ? '#171e31' : song.light, storm ? .35 : .085);
  }
}

function water(ctx, w, h, song, t, horizon = .56) {
  const y0 = h * horizon;
  const fill = ctx.createLinearGradient(0, y0, 0, h);
  fill.addColorStop(0, song.sky[1]);
  fill.addColorStop(.13, song.water);
  fill.addColorStop(1, song.scene === 'sunrise' ? '#485b70' : '#142d3a');
  ctx.fillStyle = fill;
  ctx.fillRect(0, y0, w, h - y0);
  haze(ctx, w * .75, y0 + h * .07, w * .12, h * .2, song.light, .19);
  const quiet = ['lights', 'pond'].includes(song.scene);
  // Parallel wave fronts grow with perspective, with independently drifting light.
  for (let i = 0; i < 72; i++) {
    const depth = i / 72;
    const y = y0 + Math.pow(depth, 1.8) * (h - y0);
    const amplitude = (quiet ? .6 : 1.3) + depth * (quiet ? 1.8 : 8);
    ctx.beginPath();
    for (let x = -20; x <= w + 20; x += 12) {
      const yy = y + Math.sin(x / (70 + depth * 200) + t * .48 + i * 1.8) * amplitude
        + Math.cos(x / 33 - t * .28 + i) * amplitude * .24;
      if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = i % 4 === 0 ? song.light : song.sky[1];
    ctx.globalAlpha = (i % 4 === 0 ? .11 : .17) * (1 - depth * .4);
    ctx.lineWidth = .6 + depth * 1.2;
    ctx.stroke();
  }
  // Tiny reflected highlights break up the otherwise continuous wave fronts.
  for (const p of particles.slice(0, 95)) {
    const depth = p.y;
    const y = y0 + Math.pow(depth, 2) * (h - y0);
    const x = p.x * w + Math.sin(t * .23 + p.phase) * 12;
    const reflected = Math.max(0, 1 - Math.abs(x / w - .75) * 5);
    ctx.globalAlpha = (.025 + reflected * .16) * (.6 + Math.sin(t * .7 + p.phase) * .4);
    ctx.strokeStyle = song.light;
    ctx.lineWidth = .6 + depth;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3 + p.size * depth * 35, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function hills(ctx, w, h, song, t, moving = false) {
  for (let layer = 0; layer < 5; layer++) {
    const base = h * (.51 + layer * .07);
    const phase = moving ? t * (.08 + layer * .03) : 0;
    ctx.beginPath();
    ctx.moveTo(-10, h);
    for (let x = -10; x < w + 20; x += 10) {
      const nx = x / w;
      const y = base + Math.sin(nx * 6 + layer * 1.7 + phase) * h * .04
        + Math.sin(nx * 13 + layer + phase) * h * .022;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w + 20, h);
    ctx.closePath();
    ctx.fillStyle = layer < 2 ? song.sky[1] : song.water;
    ctx.globalAlpha = .3 + layer * .13;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let layer = 0; layer < 3; layer++) {
    haze(ctx, w * (.2 + layer * .3) + Math.sin(t * .06 + layer) * w * .08, h * (.56 + layer * .07), w * .6, h * .065, song.sky[2], .18);
  }
}

function grass(ctx, w, h, song, t, flowers = false) {
  for (let i = 0; i < (flowers ? 105 : 85); i++) {
    const p = particles[i];
    const x = p.x * w;
    const bottom = h * (.91 + p.y * .16);
    const length = h * (.03 + p.size * .095);
    const sway = Math.sin(t * .8 + p.phase) * length * .14;
    const endX = x + sway;
    const endY = bottom - length;
    ctx.globalAlpha = .4 + p.size * .35;
    ctx.strokeStyle = i % 3 === 0 ? '#a7b49a' : '#203f35';
    ctx.lineWidth = 1 + p.size * 1.3;
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.quadraticCurveTo(x - 7, bottom - length * .65, endX, endY);
    ctx.stroke();
    if (flowers && p.size > .35) {
      const r = 2.5 + p.size * 4;
      ctx.fillStyle = '#eee7d1';
      for (let petal = 0; petal < 7; petal++) {
        const angle = petal / 7 * TAU;
        ctx.beginPath();
        ctx.ellipse(endX + Math.cos(angle) * r, endY + Math.sin(angle) * r, r * .8, r * .4, angle, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#cfb77d';
      ctx.beginPath();
      ctx.arc(endX, endY, r * .45, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function branches(ctx, w, h, song, t) {
  const pink = song.scene === 'blossom';
  ctx.strokeStyle = pink ? '#433b43' : '#372f32';
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const x = w * (.82 + i * .037);
    const top = h * (.13 + i * .045);
    ctx.globalAlpha = .5 - i * .04;
    ctx.lineWidth = Math.max(2, w * .009 - i);
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.bezierCurveTo(x - 20, h * .7, x + 35, h * .42, x - w * .025, top);
    ctx.stroke();
    for (let b = 0; b < 4; b++) {
      const y = h * (.33 + b * .12);
      ctx.lineWidth = Math.max(1, w * .0025);
      ctx.beginPath();
      ctx.moveTo(x, y + h * .17);
      ctx.quadraticCurveTo(x - w * .04, y + h * .04, x - w * (.12 - b * .018), y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (const p of particles.slice(0, 65)) {
    const x = ((p.x * w + t * (10 + p.speed * 10)) % (w + 70)) - 35;
    const y = ((p.y * h + t * (pink ? 6 : 12) * p.speed) % (h + 40)) - 20;
    const r = 2 + p.size * (pink ? 4 : 7);
    ctx.save();
    ctx.translate(x, y + Math.sin(t * .8 + p.phase) * 12);
    ctx.rotate(p.phase + t * .3);
    ctx.globalAlpha = .3 + p.size * .4;
    ctx.fillStyle = pink ? (p.size > .5 ? '#e9c6cc' : '#d6a5b3') : (p.size > .5 ? '#b89265' : '#a97553');
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * .55, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function birds(ctx, w, h, t) {
  ctx.strokeStyle = '#283e4b';
  ctx.globalAlpha = .55;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    const p = particles[i + 10];
    const x = (w * (.48 + p.x * .5) + t * 4) % (w + 40);
    const y = h * (.2 + p.y * .18) + Math.sin(t * .35 + i) * 8;
    const wing = 3 + Math.sin(t * 1.8 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - wing);
    ctx.quadraticCurveTo(x - 2, y - 3, x, y);
    ctx.quadraticCurveTo(x + 2, y - 3, x + 5, y - wing);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function rain(ctx, w, h, song, t, window = true) {
  for (const p of particles) {
    const x = p.x * w + Math.sin(p.phase + t * .16) * 4;
    const y = ((p.y * h + t * (18 + p.speed * 27)) % (h + 60)) - 30;
    ctx.globalAlpha = .08 + p.size * .17;
    ctx.strokeStyle = '#c3d0d0';
    ctx.lineWidth = .5 + p.size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - (window ? 1 : 7), y + 8 + p.size * 22);
    ctx.stroke();
    if (window && p.size > .45) {
      ctx.fillStyle = '#c3d0d0';
      ctx.beginPath();
      ctx.ellipse(x, y + 20, 1 + p.size * 2.4, 2 + p.size * 4, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  if (window) {
    ctx.fillStyle = '#111e28';
    ctx.globalAlpha = .2;
    ctx.fillRect(w * .87, 0, Math.max(4, w * .009), h);
    ctx.fillRect(0, h * .82, w, Math.max(4, h * .01));
    ctx.globalAlpha = 1;
  }
}

function city(ctx, w, h, song, t) {
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 13; i++) {
      const p = particles[i + layer * 13];
      const x = i * w / 12 - w * .05;
      const top = h * (.48 + p.size * .24 + layer * .06);
      const bw = w * (.035 + p.x * .045);
      ctx.globalAlpha = .3 + layer * .15;
      ctx.fillStyle = '#182735';
      ctx.fillRect(x, top, bw, h - top);
      for (let wy = top + 12; wy < h; wy += 18) {
        for (let wx = x + 7; wx < x + bw - 5; wx += 13) {
          if (Math.sin(wx + wy) > .1) {
            ctx.fillStyle = Math.sin(wy) > 0 ? '#c8b193' : '#839db3';
            ctx.globalAlpha = .13 + p.size * .22;
            ctx.fillRect(wx, wy, 3, 5);
          }
        }
      }
    }
  }
  ctx.globalAlpha = 1;
  for (const p of particles.slice(0, 20)) {
    haze(ctx, p.x * w, h * (.61 + p.y * .38), 6 + p.size * 17, 6 + p.size * 17, p.size > .6 ? '#dfbba1' : '#8caabb', .18 + Math.sin(t * .1 + p.phase) * .03);
  }
  rain(ctx, w, h, song, t);
}

function lights(ctx, w, h, song, t) {
  for (const x of [.68, .76]) {
    haze(ctx, w * x, h * .55, 18, 22, song.light, .75);
    ctx.fillStyle = song.light;
    ctx.fillRect(w * x - 1, h * .548, 2, 3);
    haze(ctx, w * x, h * .69, w * .025, h * .13, song.light, .18);
    for (let i = 0; i < 18; i++) {
      const y = h * (.568 + i * .012);
      ctx.globalAlpha = .2 * (1 - i / 18);
      const rx = (2 + i * .65) * (.7 + Math.sin(t * .7 + i) * .3);
      ctx.fillRect(w * x - rx, y, rx * 2, 1);
    }
    ctx.globalAlpha = 1;
  }
}

function curtains(ctx, w, h, song, t) {
  hills(ctx, w, h, song, t);
  haze(ctx, w * .72, h * .35, w * .45, h * .5, song.light, .32);
  for (const side of [0, 1]) {
    const curtainWidth = w * (side ? .19 : .12);
    for (let i = 0; i < 30; i++) {
      const x = side ? w - curtainWidth + i / 30 * curtainWidth : i / 30 * curtainWidth;
      const drift = (side ? -1 : 1) * Math.sin(t * .48 + i * .1) * w * .02;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x, h * .3, x + drift, h * .55, x + drift * 2, h);
      ctx.strokeStyle = i % 4 === 0 ? '#ede7d2' : '#d0cbbb';
      ctx.lineWidth = curtainWidth / 30 + 1;
      ctx.globalAlpha = .1 + Math.sin(i * .7) * .04;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function pondFlowers(ctx, w, h, song, t) {
  for (let i = 0; i < 12; i++) {
    const p = particles[i + 50];
    const x = w * (.75 + p.x * .24);
    const y = h * (.77 + p.y * .2);
    const length = h * (.07 + p.size * .14);
    const sway = Math.sin(t * .6 + p.phase) * 5;
    ctx.strokeStyle = '#637b60';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 20);
    ctx.quadraticCurveTo(x - 10, y - length * .4, x + sway, y - length);
    ctx.stroke();
    ctx.fillStyle = '#e3e0cf';
    ctx.globalAlpha = .45 + p.size * .4;
    ctx.beginPath();
    ctx.moveTo(x + sway, y - length + 8);
    ctx.bezierCurveTo(x - 25 + sway, y - length - 4, x - 4 + sway, y - length - 31, x + 14 + sway, y - length - 19);
    ctx.quadraticCurveTo(x + 8 + sway, y - length - 6, x + sway, y - length + 8);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function shore(ctx, w, h, t) {
  ctx.fillStyle = '#333a47';
  ctx.beginPath();
  ctx.moveTo(0, h * .73);
  ctx.bezierCurveTo(w * .25, h * .86, w * .53, h * .78, w, h * .96);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = '#a9a6ad';
    ctx.globalAlpha = .1;
    ctx.lineWidth = 2 + i;
    ctx.beginPath();
    ctx.moveTo(0, h * .72 + i * 8 + Math.sin(t * .35) * 5);
    ctx.bezierCurveTo(w * .25, h * .84 + i * 8, w * .53, h * .77 + i * 8, w, h * .94 + i * 8);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function floatingSun(ctx, w, h, t) {
  if (paintAfternoon(ctx, w, h, t)) return;
  // Keep a quiet warm-blue atmosphere when GPU rendering is unavailable.
  const background = ctx.createLinearGradient(0, 0, w * .4, h);
  background.addColorStop(0, '#293d49');
  background.addColorStop(.55, '#3b474d');
  background.addColorStop(1, '#2c3540');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  haze(ctx, w * .7, h * .38, w * .65, h * .6, '#ce9d71', .2);
}

export function paintScene(ctx, width, height, song, seconds, pointer = { x: 0, y: 0 }) {
  const w = width;
  const h = height;
  if (!(w > 0 && h > 0)) return;
  ctx.save();
  // A subtle camera drift, rather than movement of the interface itself.
  ctx.translate(clamp(pointer.x, -1, 1) * 3, clamp(pointer.y, -1, 1) * 2);
  ctx.scale(1.008, 1.008);
  if (song.scene === 'sun-blobs') {
    floatingSun(ctx, w, h, seconds);
    ctx.restore();
    return;
  }
  sky(ctx, w, h, song, seconds);
  switch (song.scene) {
    case 'autumn': case 'blossom':
      hills(ctx, w, h, song, seconds);
      branches(ctx, w, h, song, seconds);
      break;
    case 'city':
      city(ctx, w, h, song, seconds);
      break;
    case 'sky':
      hills(ctx, w, h * 1.3, song, seconds);
      birds(ctx, w, h, seconds);
      break;
    case 'hills': case 'dawn':
      hills(ctx, w, h, song, seconds);
      grass(ctx, w, h, song, seconds);
      break;
    case 'rain': case 'home':
      hills(ctx, w, h, song, seconds);
      branches(ctx, w, h, song, 0);
      haze(ctx, w * .45, h * .55, w * .7, h * .32, song.sky[1], .45);
      rain(ctx, w, h, song, seconds);
      if (song.scene === 'home') {
        haze(ctx, w * .91, h * .58, w * .28, h * .48, song.light, .45);
        ctx.fillStyle = '#272e30';
        ctx.globalAlpha = .55;
        ctx.fillRect(w * .88, h * .81, w * .12, h * .19);
        ctx.globalAlpha = 1;
      }
      break;
    case 'curtains':
      curtains(ctx, w, h, song, seconds);
      break;
    case 'train':
      hills(ctx, w, h, song, seconds, true);
      ctx.fillStyle = '#292736';
      ctx.globalAlpha = .65;
      ctx.fillRect(0, h * .88, w, h * .12);
      ctx.fillRect(w * .9, 0, w * .017, h);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 6; i++) {
        const x = w - ((seconds * 90 + i * w / 5) % (w * 1.2));
        ctx.strokeStyle = '#343340';
        ctx.globalAlpha = .24;
        ctx.lineWidth = 3;
        ctx.beginPath();ctx.moveTo(x, h * .7);ctx.lineTo(x, h * .48);ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    case 'flowers':
      hills(ctx, w, h, song, seconds);
      grass(ctx, w, h, song, seconds, true);
      break;
    default:
      water(ctx, w, h, song, seconds, song.scene === 'pond' ? .59 : .56);
      if (song.scene === 'pond') { pondFlowers(ctx, w, h, song, seconds); rain(ctx, w, h, song, seconds, false); }
      if (song.scene === 'lights') lights(ctx, w, h, song, seconds);
      if (song.scene === 'storm') {
        haze(ctx, w * (.71 + Math.sin(seconds * .08) * .04), h * .42, w * .26, h * .35, song.light, .2 + Math.sin(seconds * .1) * .13);
        rain(ctx, w, h, song, seconds, false);
      }
      if (song.scene === 'shore') shore(ctx, w, h, seconds);
      if (song.scene === 'ocean' || song.scene === 'sunrise') birds(ctx, w, h, seconds * .4);
  }
  ctx.restore();
}

export class SceneRenderer {
  constructor(canvases, initialSong) {
    this.canvases = canvases;
    this.contexts = canvases.map(canvas => canvas.getContext('2d', { alpha: false }));
    this.songs = [initialSong, initialSong];
    this.current = 0;
    this.pointer = { x: 0, y: 0 };
    this.motionPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.time = 0;
    this.last = 0;
    this.lastRender = 0;
    this.transitionUntil = 0;
    this.frame = null;
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(this.frame); this.frame = null; }
      else { this.last = 0; this.start(); }
    });
    window.addEventListener('pointermove', e => {
      if (!this.motionPaused) this.pointer = { x: e.clientX / innerWidth * 2 - 1, y: e.clientY / innerHeight * 2 - 1 };
    }, { passive: true });
    this.resize();
    this.canvases[0].classList.add('visible');
    this.start();
  }

  resize() {
    this.width = innerWidth;
    this.height = innerHeight;
    this.dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.canvases.forEach(canvas => {
      canvas.width = Math.round(this.width * this.dpr);
      canvas.height = Math.round(this.height * this.dpr);
    });
    this.draw(0);
    this.draw(1);
  }

  setSong(song) {
    if (this.songs[this.current].id === song.id) return;
    const next = 1 - this.current;
    this.songs[next] = song;
    this.draw(next);
    this.canvases[next].classList.add('visible');
    this.canvases[this.current].classList.remove('visible');
    this.current = next;
    this.transitionUntil = performance.now() + 1900;
    this.start();
  }

  setPaused(paused) {
    this.motionPaused = paused;
    this.pointer = { x: 0, y: 0 };
    this.last = 0;
    this.draw(this.current);
    this.start();
  }

  draw(index) {
    const ctx = this.contexts[index];
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    paintScene(ctx, this.width, this.height, this.songs[index], this.time, this.pointer);
  }

  start() {
    if (this.frame === null && !document.hidden) this.frame = requestAnimationFrame(this.tick);
  }

  tick(now) {
    this.frame = null;
    if (document.hidden) return;
    if (!this.motionPaused) this.time += this.last ? Math.min((now - this.last) / 1000, .06) : 0;
    this.last = now;
    if (now - this.lastRender >= 1000 / 30) {
      this.draw(this.current);
      if (now < this.transitionUntil) this.draw(1 - this.current);
      this.lastRender = now;
    }
    if (!this.motionPaused || now < this.transitionUntil) this.start();
  }
}

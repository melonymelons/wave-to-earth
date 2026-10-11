function seededRandom(seed) {
  let value = seed;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
}

export function createStars(width, height) {
  const random = seededRandom(1723);
  const count = Math.round(Math.min(1000, Math.max(180, width * height / 1800)));
  return Array.from({ length: count }, () => {
    const bright = random() > .85;
    const large = random() < .012;
    return {
      x: random() * width, y: random() * height,
      radius: large ? 1.05 + random() * .3 : bright ? .9 + random() * .4 : .45 + random() * .45,
      brightness: large ? .65 + random() * .2 : bright ? .65 + random() * .3 : .3 + random() * .4,
      phase: random() * Math.PI * 2, speed: large ? .5 + random() * .55 : 1.8 + random() * 2.3,
      warm: !large && random() > .72, large,
    };
  });
}

export class StarField {
  constructor(canvas, reducedMotion) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reducedMotion = reducedMotion;
    this.frame = null;
    this.stopped = false;
    this.last = 0;
    this.tick = this.tick.bind(this);
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', () => this.start());
    reducedMotion.addEventListener('change', () => this.start());
    this.resize();
    this.start();
  }
  resize() {
    this.width = innerWidth;
    this.height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.stars = createStars(this.width, this.height);
    this.draw(0);
  }
  draw(time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    for (const star of this.stars) {
      const pulse = .5 + Math.sin(time * star.speed + star.phase) * .5;
      const shimmer = .82 + Math.sin(time * star.speed * 1.73 + star.phase * 2.4) * .18;
      const twinkle = this.reducedMotion.matches ? 1 : .025 + .975 * Math.pow(pulse, 1.25) * shimmer;
      if (star.large) {
        const radius = star.radius * 2.2;
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, radius);
        glow.addColorStop(0, 'rgba(207,225,250,.25)');
        glow.addColorStop(.35, 'rgba(177,205,242,.06)');
        glow.addColorStop(1, 'rgba(148,192,247,0)');
        ctx.fillStyle = glow;
        ctx.globalAlpha = star.brightness * twinkle;
        ctx.beginPath();
        ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(star.x, star.y);
        const ray = star.radius * 2.6;
        const waist = star.radius * .15;
        const shine = ctx.createRadialGradient(0, 0, 0, 0, 0, ray);
        shine.addColorStop(0, 'rgba(255,255,255,.8)');
        shine.addColorStop(.12, 'rgba(235,245,255,.5)');
        shine.addColorStop(.4, 'rgba(190,215,246,.18)');
        shine.addColorStop(1, 'rgba(148,192,247,0)');
        ctx.fillStyle = shine;
        ctx.beginPath();
        ctx.moveTo(0, -ray);
        ctx.quadraticCurveTo(waist, -waist, ray * .75, 0);
        ctx.quadraticCurveTo(waist, waist, 0, ray);
        ctx.quadraticCurveTo(-waist, waist, -ray * .75, 0);
        ctx.quadraticCurveTo(-waist, -waist, 0, -ray);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = star.large ? '#e7f1ff' : star.warm ? '#eee8dc' : '#e3e9ef';
      ctx.globalAlpha = star.brightness * twinkle;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.large ? star.radius * .4 : star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  start() {
    cancelAnimationFrame(this.frame);
    this.frame = null;
    if (document.hidden || this.stopped) return;
    if (this.reducedMotion.matches) { this.draw(0); return; }
    this.frame = requestAnimationFrame(this.tick);
  }
  tick(now) {
    this.frame = null;
    if (document.hidden || this.stopped || this.reducedMotion.matches) return;
    if (now - this.last > 1000 / 24) { this.draw(now / 1000); this.last = now; }
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.frame);
    this.frame = null;
  }
}

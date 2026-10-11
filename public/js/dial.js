// A shallow section of a large circle has the same curvature everywhere.
// Each tick travels along that arc, with its own unscaled size and direction.
export function createArcGeometry(width, scale = 1) {
  const originalWidth = width / scale;
  const margin = originalWidth < 500 ? 60 : 28;
  const originalHalfWidth = Math.max(40, originalWidth / 2 - margin);
  const halfWidth = originalHalfWidth * scale;
  const rise = Math.min(55, originalHalfWidth * .4, Math.max(28, originalHalfWidth * .25)) * scale;
  const radius = (halfWidth * halfWidth + rise * rise) / (2 * rise);
  const halfAngle = Math.asin(halfWidth / radius);
  const cx = width / 2;
  const cy = 162;
  const centerY = cy - rise + radius;
  return {
    width, radius, halfAngle, cx, cy, centerY,
    length: radius * halfAngle * 4,
    path: `M ${cx - halfWidth} ${cy} A ${radius} ${radius} 0 0 1 ${cx + halfWidth} ${cy}`,
    point(fraction) {
      const offset = ((fraction + .5) % 1 + 1) % 1 - .5;
      const angle = offset * halfAngle * 4;
      return {
        x: cx + radius * Math.sin(angle),
        y: centerY - radius * Math.cos(angle),
        nx: Math.sin(angle), ny: -Math.cos(angle),
        rotation: angle * 180 / Math.PI,
        visible: Math.abs(offset) <= .250001,
      };
    },
  };
}

// Exact damped spring integration keeps the feel consistent across frame rates.
export function advanceSpring(position, velocity, target, elapsed, following = false) {
  const frequency = following ? 32 : 20;
  const damping = following ? 1 : .66;
  const displacement = position - target;
  const decay = Math.exp(-damping * frequency * elapsed);
  if (damping === 1) {
    const b = velocity + frequency * displacement;
    return {
      position: target + (displacement + b * elapsed) * decay,
      velocity: (velocity - frequency * b * elapsed) * decay,
    };
  }
  const oscillation = frequency * Math.sqrt(1 - damping * damping);
  const b = (velocity + damping * frequency * displacement) / oscillation;
  const cosine = Math.cos(oscillation * elapsed);
  const sine = Math.sin(oscillation * elapsed);
  const offset = displacement * cosine + b * sine;
  return {
    position: target + offset * decay,
    velocity: decay * ((-displacement * sine + b * cosine) * oscillation - damping * frequency * offset),
  };
}

export class ArcDial {
  constructor(viewport, path, ticks, position, reducedMotion) {
    this.viewport = viewport;
    this.path = path;
    this.ticks = ticks;
    this.position = position;
    this.target = position;
    this.reducedMotion = reducedMotion;
    this.frame = null;
    this.velocity = 0;
    this.lastFrame = null;
    this.following = false;
    this.resize = new ResizeObserver(() => this.measure());
    this.resize.observe(viewport);
    this.measure();
  }

  measure() {
    this.geometry = createArcGeometry(this.viewport.clientWidth, Number(this.viewport.dataset?.scale) || 1);
    this.path.ownerSVGElement.setAttribute('viewBox', `0 0 ${this.geometry.width} 180`);
    this.path.setAttribute('d', this.geometry.path);
    this.draw();
  }

  draw() {
    this.ticks.forEach((tick, index) => {
      const point = this.geometry.point((index - this.position) / this.ticks.length);
      const length = 9;
      tick.style.left = `${point.x + point.nx * (length / 2)}px`;
      tick.style.top = `${point.y + point.ny * (length / 2)}px`;
      tick.style.transform = `translate(-50%, -50%) rotate(${point.rotation}deg)`;
      tick.style.visibility = point.visible ? 'visible' : 'hidden';
      tick.inert = !point.visible;
      tick.tabIndex = point.visible ? 0 : -1;
    });
    this.onFrame?.(this.position);
  }

  move(position, direct = false, following = false) {
    this.target = position;
    this.following = following;
    if (direct || this.reducedMotion.matches || globalThis.document?.hidden) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
      this.lastFrame = null;
      this.velocity = 0;
      this.position = position;
      this.draw();
      return;
    }
    if (this.frame !== null) return;
    if (Math.abs(position - this.position) < .0001 && Math.abs(this.velocity) < .001) {
      this.draw();
      return;
    }
    this.lastFrame = performance.now();
    const step = now => {
      const elapsed = Math.min(.032, Math.max(0, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      const next = advanceSpring(this.position, this.velocity, this.target, elapsed, this.following);
      this.position = next.position;
      this.velocity = next.velocity;
      if (Math.abs(this.target - this.position) < .0001 && Math.abs(this.velocity) < .001) {
        this.position = this.target;
        this.velocity = 0;
        this.frame = null;
        this.draw();
        return;
      }
      this.draw();
      this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }
}

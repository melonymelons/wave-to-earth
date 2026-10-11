import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcDial, advanceSpring, createArcGeometry } from '../public/js/dial.js';

test('settling gives a small bounce and converges to the selected song', () => {
  let state = { position: 0, velocity: 0 };
  let peak = 0;
  for (let i = 0; i < 240; i++) {
    state = advanceSpring(state.position, state.velocity, 1, 1 / 120);
    peak = Math.max(peak, state.position);
  }
  assert.ok(peak > 1.03 && peak < 1.08);
  assert.ok(Math.abs(state.position - 1) < .0001);
  assert.ok(Math.abs(state.velocity) < .001);
});

test('scroll following stays smooth without overshooting or losing input', () => {
  let state = { position: 0, velocity: 0 };
  for (let i = 0; i < 180; i++) {
    state = advanceSpring(state.position, state.velocity, .35, 1 / 120, true);
    assert.ok(state.position >= 0 && state.position <= .35);
  }
  assert.ok(Math.abs(state.position - .35) < .0001);
  const oneFrame = advanceSpring(.1, 2, 1, 1 / 30);
  const halfFrame = advanceSpring(.1, 2, 1, 1 / 60);
  const twoFrames = advanceSpring(halfFrame.position, halfFrame.velocity, 1, 1 / 60);
  assert.ok(Math.abs(oneFrame.position - twoFrames.position) < 1e-10);
});

test('the dial initializes before drawing and can change songs after startup', t => {
  const originalObserver = globalThis.ResizeObserver;
  const originalCancel = globalThis.cancelAnimationFrame;
  const originalDocument = globalThis.document;
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.cancelAnimationFrame = () => {};
  t.after(() => {
    if (originalObserver === undefined) delete globalThis.ResizeObserver;
    else globalThis.ResizeObserver = originalObserver;
    if (originalCancel === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = originalCancel;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  });
  const attributes = new Map();
  const path = {
    setAttribute(key, value) { attributes.set(key, value); },
    ownerSVGElement: { setAttribute(key, value) { attributes.set(key, value); } },
  };
  const ticks = Array.from({ length: 18 }, (_, index) => ({
    style: {}, getAttribute: () => String(index === 0),
  }));
  const dial = new ArcDial({ clientWidth: 840 }, path, ticks, 0, { matches: true });
  assert.ok(dial.geometry);
  assert.match(attributes.get('d'), /^M /);
  assert.equal(attributes.get('viewBox'), '0 0 840 180');
  assert.equal(ticks[0].style.left, '420px');
  assert.equal(ticks[0].style.visibility, 'visible');
  dial.move(1);
  assert.equal(dial.position, 1);
  assert.equal(ticks[1].style.left, '420px');
  dial.reducedMotion.matches = false;
  dial.move(.25, true);
  assert.equal(dial.position, .25, 'a small gesture moves a fraction of a song');
  assert.equal(dial.target, .25);
  assert.ok(parseFloat(ticks[0].style.left) < 420);
  dial.move(.5, true);
  assert.equal(dial.position, .5, 'more input moves the dial further without snapping');
  globalThis.document = { hidden: true };
  let selected = null;
  dial.onFrame = position => { selected = position; };
  dial.move(2);
  assert.equal(dial.position, 2, 'hidden tabs advance without an animation frame');
  assert.equal(selected, 2, 'background advancement updates the selected video immediately');
});

test('the arc has constant curvature, gentle ends, and perpendicular ticks', () => {
  for (const width of [300, 390, 840]) {
    const arc = createArcGeometry(width);
    assert.ok(arc.halfAngle < Math.PI / 3, 'ends slope without turning vertical');
    assert.ok(Math.abs(arc.point(.25).y - arc.cy) < .001);
    assert.ok(Math.abs(arc.point(-.25).y - arc.cy) < .001);
    assert.equal(arc.cy, 162);
    for (const fraction of [.03, .1, .2]) {
      const left = arc.point(-fraction);
      const right = arc.point(fraction);
      assert.ok(Math.abs(left.x + right.x - width) < .001);
      assert.ok(Math.abs(left.y - right.y) < .001);
      assert.ok(Math.abs(Math.hypot(right.nx, right.ny) - 1) < .0001);
      assert.ok(Math.abs(Math.hypot(right.x - arc.cx, right.y - arc.centerY) - arc.radius) < .001, 'radius is constant at every point');
      const before = arc.point(fraction - .00001);
      const after = arc.point(fraction + .00001);
      const dx = after.x - before.x;
      const dy = after.y - before.y;
      const dot = (dx * right.nx + dy * right.ny) / Math.hypot(dx, dy);
      assert.ok(Math.abs(dot) < .003, 'tick is perpendicular to arc tangent');
    }
  }
});

test('making the arc smaller preserves its curve and tick angles', () => {
  for (const width of [300, 390, 840]) {
    const original = createArcGeometry(width);
    const smaller = createArcGeometry(width * .8, .8);
    assert.ok(Math.abs(smaller.radius - original.radius * .8) < .001);
    assert.ok(Math.abs(smaller.halfAngle - original.halfAngle) < .001);
    for (const fraction of [-.25, -.1, 0, .1, .25]) {
      assert.ok(Math.abs(smaller.point(fraction).rotation - original.point(fraction).rotation) < .001);
    }
  }
});

test('equal song steps cover equal distances along the circular arc', () => {
  for (const width of [300, 390, 840]) {
    const arc = createArcGeometry(width);
    const distances = [];
    for (let step = 0; step < 4; step++) {
      let distance = 0;
      let previous = arc.point(step / 18);
      for (let sample = 1; sample <= 100; sample++) {
        const point = arc.point((step + sample / 100) / 18);
        distance += Math.hypot(point.x - previous.x, point.y - previous.y);
        previous = point;
      }
      distances.push(distance);
    }
    const difference = Math.max(...distances) - Math.min(...distances);
    assert.ok(difference / distances[0] < .001, 'tick spacing stays even on the shallow circular arc');
  }
});

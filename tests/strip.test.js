import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapSongIndex, wrappedDistance, nearestOccurrence, nextVideoIndex } from '../strip.js';

test('automatic advance follows uploaded videos and wraps past empty slots', () => {
  const clips = [true, true, true, true, true, false, false];
  assert.equal(nextVideoIndex(0, clips), 1);
  assert.equal(nextVideoIndex(3, clips), 4);
  assert.equal(nextVideoIndex(4, clips), 0);
  assert.equal(nextVideoIndex(0, [true, false, false]), 0);
  assert.equal(nextVideoIndex(0, [false, false]), -1);
});

test('the first and last songs connect in both directions', () => {
  assert.equal(wrapSongIndex(-1, 18), 17);
  assert.equal(wrapSongIndex(18, 18), 0);
  assert.equal(wrapSongIndex(-19, 18), 17);
  assert.equal(nearestOccurrence(17, 0, 18), -1);
  assert.equal(nearestOccurrence(0, 17, 18), 18);
});

test('frame placement remains continuous across the loop seam', () => {
  for (const position of [-.4, -.1, .1, .4]) {
    assert.ok(Math.abs(wrappedDistance(0, position, 18) - wrappedDistance(0, position + 18, 18)) < 1e-10);
    assert.ok(Math.abs(wrappedDistance(17, position, 18) - wrappedDistance(17, position + 18, 18)) < 1e-10);
  }
  assert.ok(Math.abs(wrappedDistance(0, -.1, 18) - .1) < 1e-10);
  assert.ok(Math.abs(wrappedDistance(17, -.1, 18) + .9) < 1e-10);
  assert.equal(nearestOccurrence(17, 36, 18), 35);
});

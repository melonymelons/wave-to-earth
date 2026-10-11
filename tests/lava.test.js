import test from 'node:test';
import assert from 'node:assert/strict';
import { lavaMasses, shadeLava } from '../lava.js';

test('the liquid renderer produces shaded forms that change over time', () => {
  const width = 128;
  const height = 80;
  const first = new Uint8ClampedArray(width * height * 4);
  const later = new Uint8ClampedArray(first.length);
  shadeLava(first, width, height, lavaMasses(width, height, 0));
  shadeLava(later, width, height, lavaMasses(width, height, 12));
  let opaque = 0;
  let clear = 0;
  let changed = 0;
  for (let i = 3; i < first.length; i += 4) {
    if (first[i] === 255) opaque++;
    if (first[i] === 0) clear++;
    if (first[i] !== later[i]) changed++;
  }
  assert.ok(opaque > 100, 'visible liquid forms');
  assert.ok(clear > width * height / 2, 'dark space between forms');
  assert.ok(changed > 100, 'movement changes the rendered silhouettes');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveByteRange } from '../server/ranges.js';

test('audio byte ranges support bounded, open-ended, and suffix requests', () => {
  assert.equal(resolveByteRange(undefined, 100), null);
  assert.deepEqual(resolveByteRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(resolveByteRange('bytes=50-', 100), { start: 50, end: 99 });
  assert.deepEqual(resolveByteRange('bytes=-20', 100), { start: 80, end: 99 });
  assert.deepEqual(resolveByteRange('bytes=90-200', 100), { start: 90, end: 99 });
  assert.deepEqual(resolveByteRange('bytes=-200', 100), { start: 0, end: 99 });
});

test('invalid and out-of-bounds byte ranges are rejected', () => {
  for (const header of ['bytes=100-', 'bytes=50-20', 'bytes=-0', 'bytes=-', 'bytes=0-2,5-8', 'invalid', 'bytes=99999999999999999-']) {
    assert.equal(resolveByteRange(header, 100), false, header);
  }
  assert.equal(resolveByteRange('bytes=0-', 0), false);
});

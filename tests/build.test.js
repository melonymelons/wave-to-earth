import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { songs } from '../public/data/songs.js';

test('Vercel build includes every playlist video and poster without external storage', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: root, encoding: 'utf8',
    env: { ...process.env, VERCEL: '1', MEDIA_BASE_URL: '', BLOB_READ_WRITE_TOKEN: 'test-secret-never-publish' },
  });
  assert.equal(result.status, 0, result.stderr);
  for (const song of songs) {
    for (const extension of ['mp4', 'png']) {
      const file = `videos/${song.id}.${extension}`;
      const source = await stat(new URL(`../public/${file}`, import.meta.url));
      const built = await stat(new URL(`../dist/${file}`, import.meta.url));
      assert.ok(built.size > 0 && built.size < 90_000_000, file);
      assert.equal(built.size, source.size, file);
    }
  }
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.match(html, /w2e x zkng/);
  const playlist = await readFile(new URL('../dist/data/songs.js', import.meta.url), 'utf8');
  assert.match(playlist, /\.\/videos\//);
  assert.doesNotMatch(playlist, /blob\.vercel-storage|test-secret-never-publish/);
});

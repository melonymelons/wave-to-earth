import test from 'node:test';
import assert from 'node:assert/strict';
import { songs } from '../public/data/songs.js';
import { readFile } from 'node:fs/promises';

test('the playlist contains 18 recorded clips in the requested order', () => {
  assert.equal(songs.length, 18);
  assert.deepEqual(songs.map(song => song.title), [
    'sing it all again', 'everything comes and goes', "talking 'bout u", 'skylark', 'courage',
    'cherry flavored love inside your heart', 'hyang', 'seasons', 'you', 'bad', 'sunny days',
    'annie.', 'calla', 'heaven and hell', 'closing', 'daisy', 'homesick', 'love',
  ]);
  assert.equal(new Set(songs.map(song => song.id)).size, 18);
  for (const song of songs) {
    assert.equal(song.video, `./videos/${song.id}.mp4`);
    assert.equal(song.poster, `./videos/${song.id}.png`);
    assert.ok(song.videoDurationSeconds > 0);
  }
});

test('video-strip mode keeps the black layout and fixed title without previous UI', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /id="previous"|id="next"/);
  assert.match(html, /id="chapter-count"/);
  assert.match(html, /<title>w2e x zkng<\/title>/);
  assert.doesNotMatch(app, /document\.title\s*=/);
  assert.match(html, /a feeling at a time/);
  assert.match(html, /id="video-strip"/);
  assert.doesNotMatch(app, /SceneRenderer/);
  assert.match(app, /ArcDial/);
  assert.match(html, /id="star-field"/);
  assert.match(html, /id="song-dial"/);
  assert.match(app, /video\.playsInline = true/);
  assert.match(app, /video\.muted = false/);
  assert.doesNotMatch(app, /video\.muted = true/);
  assert.match(app, /video\.controls = false/);
  assert.doesNotMatch(app, /video\.controls = i === index/);
  assert.doesNotMatch(html, /site-header|dial-readout|motion-toggle|collection-dialog/);
  assert.doesNotMatch(html, /spotify-embed|iframe|id="play"|add-audio|clip-file|song-audio|spotify-panel/);
  assert.doesNotMatch(app, /SpotifyPlayer|iframe-api|onSpotifyIframeApiReady|ClipPlayer|createObjectURL|clip-file/);
});


test('page assets and relative module imports resolve in the new folders', async () => {
  const publicRoot = new URL('../public/', import.meta.url);
  const html = await readFile(new URL('index.html', publicRoot), 'utf8');
  const visited = new Set();
  async function verifyModule(url) {
    if (visited.has(url.href)) return;
    visited.add(url.href);
    const source = await readFile(url, 'utf8');
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (match[1].startsWith('.')) await verifyModule(new URL(match[1], url));
    }
  }
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^"?]+)(?:\?[^" ]*)?"/g)) {
    const url = new URL(match[1], publicRoot);
    await readFile(url);
    if (url.pathname.endsWith('.js')) await verifyModule(url);
  }
  assert.ok(visited.has(new URL('js/app.js', publicRoot).href));
  assert.ok(visited.has(new URL('data/songs.js', publicRoot).href));
});

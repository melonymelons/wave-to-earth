import test from 'node:test';
import assert from 'node:assert/strict';
import { songs, spotifyUri, spotifyUrl } from '../songs.js';
import { paintScene } from '../scenes.js';
import { SpotifyPlayer, embedUrl } from '../player.js';
import { readFile } from 'node:fs/promises';

test('the collection contains 18 distinct songs in the requested order', () => {
  assert.equal(songs.length, 18);
  assert.deepEqual(songs.map(song => song.title), [
    'sing it all again', 'everything comes and goes', "talking 'bout u", 'skylark', 'courage',
    'cherry flavored love inside your heart', 'hyang', 'seasons', 'you', 'bad', 'sunny days',
    'annie.', 'calla', 'heaven and hell', 'closing', 'daisy', 'homesick', 'love',
  ]);
  assert.equal(new Set(songs.map(song => song.id)).size, 18);
  assert.equal(new Set(songs.map(song => song.spotify)).size, 18);
  for (const song of songs) {
    assert.match(song.spotify, /^[a-zA-Z0-9]{22}$/);
    assert.match(spotifyUri(song), /^spotify:track:/);
    assert.match(spotifyUrl(song), /^https:\/\/open\.spotify\.com\/track\//);
    assert.equal(song.sky.length, 3);
  }
});

test('all scenes render with finite drawing coordinates on desktop, mobile, and landscape', () => {
  let draws = 0;
  let stack = 0;
  const gradient = { addColorStop() {} };
  const numeric = (...args) => {
    for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg));
    draws++;
  };
  const ctx = new Proxy({}, {
    get(_, name) {
      if (name === 'save') return () => stack++;
      if (name === 'restore') return () => { stack--; assert.ok(stack >= 0); };
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return (...args) => { numeric(...args); return gradient; };
      if (name === 'ellipse') return (x, y, rx, ry, ...rest) => { numeric(x, y, rx, ry, ...rest); assert.ok(rx > 0 && ry > 0); };
      return numeric;
    },
    set(_, name, value) { if (typeof value === 'number') assert.ok(Number.isFinite(value), name); return true; },
  });
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390], [320, 568]]) {
    for (const song of songs) {
      for (const time of [0, 17, 10000]) {
        paintScene(ctx, width, height, song, time, { x: -.5, y: .5 });
        assert.equal(stack, 0, `${song.id}: balanced canvas state`);
      }
    }
  }
  assert.ok(draws > 10000);
});

function fakeController() {
  const listeners = new Map();
  const calls = [];
  return {
    calls,
    addListener(name, handler) { listeners.set(name, handler); },
    pause() { calls.push(['pause']); },
    play() { calls.push(['play']); },
    loadUri(uri) { calls.push(['load', uri]); },
    fire(name, data = {}) { listeners.get(name)?.({ data }); },
  };
}

test('a paused scene change selects its Spotify song without starting playback', () => {
  const player = new SpotifyPlayer(songs[0], () => {});
  const controller = fakeController();
  player.connect(controller);
  player.select(songs[7]);
  assert.deepEqual(controller.calls.at(-1), ['load', spotifyUri(songs[7])]);
  controller.fire('ready');
  assert.equal(controller.calls.some(([call]) => call === 'play'), false);
});

test('native Spotify playback can continue when a listener changes scenes', () => {
  const player = new SpotifyPlayer(songs[0], () => {});
  const controller = fakeController();
  player.connect(controller);
  controller.fire('playback_update', { playingURI: spotifyUri(songs[0]), isPaused: false });
  player.select(songs[7]);
  controller.fire('ready');
  assert.equal(controller.calls.at(-1)[0], 'play');
  assert.equal(player.resumeOnReady, false);
});

test('stale Spotify events cannot mark the new song as playing', () => {
  const player = new SpotifyPlayer(songs[0], () => {});
  const controller = fakeController();
  player.connect(controller);
  player.select(songs[7]);
  controller.fire('playback_update', { playingURI: spotifyUri(songs[0]), isPaused: false });
  assert.equal(player.playing, false);
});

test('the native fallback switches to the selected Spotify embed', () => {
  const selected = [];
  const player = new SpotifyPlayer(songs[0], song => selected.push(embedUrl(song)));
  player.select(songs[7]);
  assert.deepEqual(selected, [`https://open.spotify.com/embed/track/${songs[7].spotify}?theme=0`]);
});

test('video-strip mode keeps the black layout and fixed title without previous UI', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
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

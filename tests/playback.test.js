import test from 'node:test';
import assert from 'node:assert/strict';
import { VideoPlayback } from '../public/js/playback.js';

function clip() {
  return {
    paused: true, ended: false, muted: true, currentTime: 0, plays: 0,
    play() { this.plays++; this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; },
  };
}

test('clicking toggles play/pause and pause persists when switching songs', async () => {
  const first = clip();
  const second = clip();
  let current = first;
  const playback = new VideoPlayback(() => current, () => true, () => {});
  await playback.toggle();
  assert.equal(first.paused, false);
  assert.equal(first.muted, false);
  await playback.toggle();
  assert.equal(first.paused, true);
  assert.equal(playback.userPaused, true);
  current = second;
  playback.cancelPending();
  await playback.start();
  assert.equal(second.plays, 0, 'scrolling does not override manual pause');
  await playback.toggle();
  assert.equal(second.paused, false);
  assert.equal(playback.userPaused, false);
});

test('pausing during loading also blocks a late successful play promise', async () => {
  const video = clip();
  let resolvePlay;
  let starts = 0;
  video.play = () => new Promise(resolve => { resolvePlay = resolve; });
  const playback = new VideoPlayback(() => video, () => true, () => starts++);
  const pending = playback.start();
  await playback.toggle();
  video.paused = false;
  resolvePlay();
  await pending;
  assert.equal(video.paused, true);
  assert.equal(playback.userPaused, true);
  assert.equal(starts, 0);
});

test('a click starts blocked audible autoplay without toggling twice', async () => {
  const video = clip();
  video.play = () => Promise.reject(Object.assign(new Error('Blocked'), { name: 'NotAllowedError' }));
  const playback = new VideoPlayback(() => video, () => true, () => {});
  await playback.start();
  assert.equal(playback.awaitingGesture, true);
  video.play = function () { this.paused = false; return Promise.resolve(); };
  await playback.toggle();
  assert.equal(video.paused, false);
  assert.equal(playback.awaitingGesture, false);
});

test('the session deadline blocks clicks and pending playback from restarting video', async () => {
  const video = clip();
  let allowed = true;
  let resolvePlay;
  let starts = 0;
  video.play = () => new Promise(resolve => { resolvePlay = resolve; });
  const playback = new VideoPlayback(() => video, () => allowed, () => starts++);
  const pending = playback.start();
  allowed = false;
  video.paused = false;
  resolvePlay();
  await pending;
  await playback.toggle();
  assert.equal(video.paused, true);
  assert.equal(starts, 0);
});

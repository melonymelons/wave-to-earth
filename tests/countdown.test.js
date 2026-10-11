import test from 'node:test';
import assert from 'node:assert/strict';
import { PlaylistCountdown, playlistDuration, formatCountdown } from '../countdown.js';

test('duration totals use exact videos, song estimates, and new metadata', () => {
  const songs = [
    { id: 'one', durationSeconds: 240, videoDurationSeconds: 120 },
    { id: 'two', durationSeconds: 300 },
  ];
  assert.equal(playlistDuration(songs), 420);
  assert.equal(playlistDuration(songs, new Map([['two', 180]])), 300);
  assert.equal(formatCountdown(4215.1), '01:10:16');
  assert.equal(formatCountdown(0), '00:00:00');
});

test('the timer waits for playback then catches up after delayed running ticks', t => {
  let now = 0;
  let expirations = 0;
  const ticks = [];
  const timer = new PlaylistCountdown(60, remaining => ticks.push(remaining), () => expirations++, () => now);
  t.after(() => clearInterval(timer.interval));
  now = 20000;
  timer.check();
  assert.equal(timer.remaining(), 60);
  timer.start();
  now += 10000;
  timer.check();
  assert.equal(timer.remaining(), 50);
  timer.start();
  assert.equal(timer.remaining(), 50, 'scrolling or another clip does not restart the clock');
  now += 90000;
  timer.check();
  assert.equal(timer.expired, true);
  assert.equal(expirations, 1);
  assert.equal(ticks.at(-1), 0);
  assert.equal(timer.interval, null);
  timer.start();
  timer.setTotal(1000);
  timer.check();
  assert.equal(timer.remaining(), 0, 'expiration cannot be undone by late metadata or interaction');
  assert.equal(expirations, 1);
});

test('pause freezes the timer and resume continues from the same remaining time', t => {
  let now = 0;
  const timer = new PlaylistCountdown(300, () => {}, () => {}, () => now);
  t.after(() => clearInterval(timer.interval));
  timer.start();
  now += 45000;
  timer.pause();
  assert.equal(timer.remaining(), 255);
  assert.equal(timer.interval, null);
  now += 600000;
  timer.check();
  assert.equal(timer.remaining(), 255, 'paused time is not consumed');
  timer.setTotal(280);
  assert.equal(timer.remaining(), 235, 'actual video length updates preserve playback already counted');
  timer.start();
  now += 15000;
  timer.check();
  assert.equal(timer.remaining(), 220);
});

test('new clip metadata adjusts the budget while preserving time already elapsed', t => {
  let now = 1000;
  const timer = new PlaylistCountdown(300, () => {}, () => {}, () => now);
  t.after(() => clearInterval(timer.interval));
  timer.start();
  now += 100000;
  timer.setTotal(240);
  assert.equal(timer.remaining(), 140);
  timer.setTotal(400);
  assert.equal(timer.remaining(), 300);
});

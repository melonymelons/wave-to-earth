import { songs } from '../data/songs.js';
import { ArcDial } from './dial.js';
import { StarField } from './stars.js';
import { wrapSongIndex, wrappedDistance, nearestOccurrence, nextVideoIndex } from './strip.js';
import { PlaylistCountdown, playlistDuration, formatCountdown } from './countdown.js';
import { VideoPlayback } from './playback.js';

const strip = document.getElementById('video-strip');
const count = document.getElementById('chapter-count');
const timerLabel = document.getElementById('playlist-timer');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const frames = [];
const videos = [];
let activeIndex = Math.max(0, songs.findIndex(song => `#${song.id}` === location.hash));
let drag = null;
let wheelTimer;
let suppressClick = false;
let wheelActive = false;
let dialTarget = activeIndex;
let playbackStopped = false;
const actualDurations = new Map();
const countdown = new PlaylistCountdown(playlistDuration(songs), remaining => {
  timerLabel.textContent = formatCountdown(remaining);
  timerLabel.dateTime = `PT${Math.ceil(remaining)}S`;
  timerLabel.setAttribute('aria-label', `Playback ends in ${formatCountdown(remaining)}`);
}, stopPlaylist);
timerLabel.title = 'Combined runtime of all 18 concert videos. Begins with playback and pauses with the videos.';
const playback = new VideoPlayback(() => videos[activeIndex], () => !playbackStopped, syncCountdown);

function syncCountdown() {
  const video = videos[activeIndex];
  if (!playbackStopped && !playback.userPaused && video && !video.paused && !video.ended && video.readyState >= 3) countdown.start();
  else countdown.pause();
}

function stopPlaylist() {
  playbackStopped = true;
  playback.cancelPending();
  clearTimeout(wheelTimer);
  wheelActive = false;
  videos.forEach(video => video?.pause());
  cancelAnimationFrame(arcDial.frame);
  arcDial.frame = null;
  arcDial.velocity = 0;
  arcDial.target = arcDial.position;
  dialTarget = arcDial.position;
  stars.stop();
  timerLabel.title = 'Playback finished. Refresh the page to start a new session.';
}

function startVideo(video) {
  countdown.check();
  void playback.start(video);
}

songs.forEach((song, index) => {
  const frame = document.createElement('figure');
  frame.className = 'strip-frame';
  frame.id = song.id;
  frame.setAttribute('aria-label', song.video ? song.title : `${song.title}: video not added yet`);
  const media = document.createElement('div');
  media.className = 'strip-media';
  frame.append(media);
  if (song.video) {
    const video = document.createElement('video');
    video.src = song.video;
    video.poster = song.poster || '';
    video.preload = 'metadata';
    video.playsInline = true;
    video.loop = false;
    video.muted = false;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
    video.setAttribute('aria-label', `${song.title}, concert video`);
    video.addEventListener('loadedmetadata', () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      actualDurations.set(song.id, video.duration);
      countdown.setTotal(playlistDuration(songs, actualDurations));
    });
    video.addEventListener('playing', () => {
      countdown.check();
      if (playbackStopped || playback.userPaused || index !== activeIndex) video.pause();
      else syncCountdown();
    });
    video.addEventListener('pause', syncCountdown);
    video.addEventListener('waiting', () => { if (index === activeIndex) countdown.pause(); });
    video.addEventListener('ended', () => {
      if (index === activeIndex) countdown.pause();
      countdown.check();
      if (index !== activeIndex || playbackStopped || playback.userPaused) return;
      const next = nextVideoIndex(index, videos.map(clip => Boolean(clip && !clip.error)));
      if (next < 0) return;
      if (next === index) { startVideo(video); return; }
      clearTimeout(wheelTimer);
      wheelActive = false;
      const distance = wrapSongIndex(next - index, songs.length);
      moveDial(nearestOccurrence(index, arcDial.position, songs.length) + distance);
    });
    video.addEventListener('error', () => {
      frame.classList.add('is-empty');
      frame.setAttribute('aria-label', `${song.title}: video could not load`);
      video.hidden = true;
      syncCountdown();
    });
    videos[index] = video;
    media.append(video);
  } else {
    frame.classList.add('is-empty');
    videos[index] = null;
  }
  const caption = document.createElement('figcaption');
  caption.className = 'strip-title';
  caption.textContent = song.title;
  frame.append(caption);
  frame.addEventListener('click', event => {
    if (!suppressClick && index !== activeIndex) { goTo(index); event.stopPropagation(); }
  });
  frames.push(frame);
  strip.append(frame);
  const tick = document.createElement('button');
  tick.className = 'dial-tick';
  tick.setAttribute('aria-label', `${index + 1}. ${song.title}`);
  tick.setAttribute('aria-current', String(index === activeIndex));
  const mark = document.createElement('span');
  mark.setAttribute('aria-hidden', 'true');
  tick.append(mark);
  tick.addEventListener('click', event => { event.stopPropagation(); if (!suppressClick) goTo(index); });
  document.getElementById('dial-ticks').append(tick);
});

const ticks = [...document.querySelectorAll('.dial-tick')];
const arcDial = new ArcDial(document.querySelector('.dial-viewport'), document.getElementById('dial-arc-path'), ticks, activeIndex, reducedMotion);
const stars = new StarField(document.getElementById('star-field'), reducedMotion);
arcDial.onFrame = position => {
  const center = strip.clientWidth / 2;
  const stride = frameStride();
  frames.forEach((frame, index) => {
    frame.style.left = `${center + wrappedDistance(index, position, songs.length) * stride}px`;
  });
  setActive(wrapSongIndex(Math.round(position), songs.length));
};
function frameStride() {
  return frames[0].offsetWidth + parseFloat(getComputedStyle(strip).gap);
}
function moveDial(position, direct = false, following = false) {
  if (!Number.isFinite(position)) return;
  dialTarget = position;
  arcDial.move(position, direct, following);
}

function setActive(index, force = false) {
  if (index === activeIndex && !force) return;
  countdown.pause();
  playback.cancelPending();
  activeIndex = index;
  const song = songs[index];
  count.textContent = `${String(index + 1).padStart(2, '0')} / ${songs.length}`;
  ticks.forEach((tick, i) => tick.setAttribute('aria-current', String(i === index)));
  history.replaceState(null, '', `#${song.id}`);
  frames.forEach((frame, i) => {
    frame.classList.toggle('is-active', i === index);
    frame.setAttribute('aria-current', String(i === index));
    const video = videos[i];
    if (!video) return;
    video.controls = false;
    video.tabIndex = -1;
    if (i !== index || playbackStopped || playback.userPaused) video.pause();
    else {
      startVideo(video);
    }
  });
}

function goTo(index, smooth = true) {
  clearTimeout(wheelTimer);
  wheelActive = false;
  moveDial(nearestOccurrence(index, arcDial.position, songs.length), !smooth);
}
function settle() {
  wheelActive = false;
  moveDial(Math.round(dialTarget));
}

window.addEventListener('wheel', event => {
  if (event.ctrlKey || drag) return;
  event.preventDefault();
  clearTimeout(wheelTimer);
  if (!wheelActive) moveDial(arcDial.position, true);
  wheelActive = true;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const pixels = delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? strip.clientWidth : 1);
  const pixelsPerSong = arcDial.geometry.length / songs.length;
  moveDial(dialTarget + pixels / pixelsPerSong, false, true);
  wheelTimer = setTimeout(settle, 240);
}, { passive: false });

function bindDrag(surface, isDial) {
  surface.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    clearTimeout(wheelTimer);
    wheelActive = false;
    moveDial(arcDial.position, true);
    drag = { id: event.pointerId, x: event.clientX, start: arcDial.position, moved: false, surface };
  });
  surface.addEventListener('pointermove', event => {
    if (!drag || drag.surface !== surface || event.pointerId !== drag.id) return;
    const delta = event.clientX - drag.x;
    if (Math.abs(delta) > 6 && !drag.moved) {
      drag.moved = true;
      surface.setPointerCapture(event.pointerId);
      surface.classList.add('is-dragging');
    }
    if (drag.moved) {
      const pixelsPerSong = isDial ? arcDial.geometry.length / songs.length : frameStride();
      moveDial(drag.start - delta / pixelsPerSong, true);
    }
  });
  const finish = event => {
    if (!drag || drag.surface !== surface || event.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    suppressClick = moved;
    surface.classList.remove('is-dragging');
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    if (moved) settle();
    setTimeout(() => { suppressClick = false; }, 0);
  };
  surface.addEventListener('pointerup', finish);
  surface.addEventListener('pointercancel', finish);
}
bindDrag(strip, false);
bindDrag(document.getElementById('song-dial'), true);
strip.addEventListener('click', event => {
  if (suppressClick) { event.preventDefault(); event.stopPropagation(); }
}, true);

window.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('video')) return;
  if (event.code === 'Space' && !event.target.closest('button, a, input, textarea, select')) { event.preventDefault(); countdown.check(); void playback.toggle(); syncCountdown(); return; }
  if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.code)) { event.preventDefault(); goTo(activeIndex + 1); }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.code)) { event.preventDefault(); goTo(activeIndex - 1); }
  if (event.code === 'Home') { event.preventDefault(); goTo(0); }
  if (event.code === 'End') { event.preventDefault(); goTo(songs.length - 1); }
});
window.addEventListener('hashchange', () => {
  const index = songs.findIndex(song => `#${song.id}` === location.hash);
  if (index >= 0) goTo(index);
});
window.addEventListener('resize', () => goTo(activeIndex, false));
document.addEventListener('visibilitychange', () => {
  countdown.check();
  if (playbackStopped) return;
  // Finish pending selection without waiting for animation frames in a hidden tab.
  if (document.hidden && arcDial.frame !== null) {
    clearTimeout(wheelTimer);
    wheelActive = false;
    moveDial(Math.round(dialTarget), true);
  }
  const video = videos[activeIndex];
  if (!document.hidden && video?.paused && !playback.userPaused) startVideo(video);
  syncCountdown();
});

// One click event toggles once. Navigation clicks and drags are excluded.
document.addEventListener('click', event => {
  if (suppressClick || event.defaultPrevented || event.target.closest('.dial-tick')) return;
  countdown.check();
  void playback.toggle();
  syncCountdown();
});
// Navigation keys may satisfy an autoplay block, but never override manual pause.
document.addEventListener('keydown', event => {
  if (event.code === 'Space' || playback.userPaused || !playback.awaitingGesture) return;
  const video = videos[activeIndex];
  if (video) startVideo(video);
}, true);
setActive(activeIndex, true);
requestAnimationFrame(() => goTo(activeIndex, false));

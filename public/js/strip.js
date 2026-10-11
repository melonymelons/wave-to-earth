export const wrapSongIndex = (index, count) => ((index % count) + count) % count;

export function nextVideoIndex(index, available) {
  for (let step = 1; step <= available.length; step++) {
    const next = wrapSongIndex(index + step, available.length);
    if (available[next]) return next;
  }
  return -1;
}

// Frames crossing the far, offscreen edge reappear on the other side. The same
// video element is reused, so wrapping never reloads or restarts its footage.
export function wrappedDistance(index, position, count) {
  return wrapSongIndex(index - position + count / 2, count) - count / 2;
}

export function nearestOccurrence(index, position, count) {
  const song = wrapSongIndex(index, count);
  return song + Math.round((position - song) / count) * count;
}

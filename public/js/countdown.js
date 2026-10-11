export function playlistDuration(songs, actual = new Map()) {
  return songs.reduce((total, song) => {
    const seconds = actual.get(song.id) ?? song.videoDurationSeconds ?? 0;
    return total + (Number.isFinite(seconds) && seconds > 0 ? seconds : 0);
  }, 0);
}

export function formatCountdown(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  const pad = value => String(value).padStart(2, '0');
  return `${pad(Math.floor(whole / 3600))}:${pad(Math.floor(whole / 60) % 60)}:${pad(whole % 60)}`;
}

// Count only active playback segments. Pauses preserve time already used.
// Playback cannot restart once expired, even if more metadata arrives later.
export class PlaylistCountdown {
  constructor(totalSeconds, onTick, onExpire, now = Date.now) {
    this.totalSeconds = Math.max(0, totalSeconds);
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.now = now;
    this.startedAt = null;
    this.elapsedSeconds = 0;
    this.hasStarted = false;
    this.expired = false;
    this.interval = null;
    this.check();
  }

  remaining() {
    if (this.expired) return 0;
    const segment = this.startedAt === null ? 0 : Math.max(0, (this.now() - this.startedAt) / 1000);
    return Math.max(0, this.totalSeconds - this.elapsedSeconds - segment);
  }

  setTotal(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0 || this.expired) return;
    this.totalSeconds = seconds;
    this.check();
  }

  start() {
    if (this.expired || this.startedAt !== null) return;
    this.startedAt = this.now();
    this.hasStarted = true;
    this.interval = setInterval(() => this.check(), 250);
    this.check();
  }

  pause() {
    if (this.startedAt !== null) {
      this.elapsedSeconds += Math.max(0, (this.now() - this.startedAt) / 1000);
      this.startedAt = null;
    }
    clearInterval(this.interval);
    this.interval = null;
    this.check();
  }

  check() {
    const remaining = this.remaining();
    if (this.hasStarted && remaining <= 0 && !this.expired) {
      this.expired = true;
      clearInterval(this.interval);
      this.interval = null;
      this.onTick(0);
      this.onExpire();
      return;
    }
    this.onTick(remaining);
  }
}

// Persist the listener's pause intent across scrolling, tab changes, and pending
// play promises. A click toggles once; dragging and song selection do not toggle.
export class VideoPlayback {
  constructor(currentVideo, allowed, onStarted) {
    this.currentVideo = currentVideo;
    this.allowed = allowed;
    this.onStarted = onStarted;
    this.userPaused = false;
    this.pending = null;
    this.awaitingGesture = false;
    this.request = 0;
  }

  cancelPending() {
    this.request++;
    this.pending = null;
    this.awaitingGesture = false;
  }

  async start(video = this.currentVideo()) {
    if (!video || this.userPaused || !this.allowed()) return;
    const request = ++this.request;
    this.pending = video;
    video.muted = false;
    if (video.ended) video.currentTime = 0;
    try {
      await video.play();
      const canContinue = this.allowed() && !this.userPaused && video === this.currentVideo();
      if (!canContinue) video.pause();
      if (request !== this.request) return;
      this.pending = null;
      this.awaitingGesture = false;
      if (canContinue) this.onStarted();
    } catch (error) {
      if (request !== this.request) return;
      this.pending = null;
      this.awaitingGesture = error.name === 'NotAllowedError';
    }
  }

  toggle() {
    const video = this.currentVideo();
    if (!video || !this.allowed()) return Promise.resolve();
    if (!this.userPaused && (this.pending === video || (!video.paused && !video.ended))) {
      this.userPaused = true;
      this.cancelPending();
      video.pause();
      return Promise.resolve();
    }
    this.userPaused = false;
    return this.start(video);
  }
}

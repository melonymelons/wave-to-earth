import { spotifyUri } from './songs.js';

export const embedUrl = song => `https://open.spotify.com/embed/track/${song.spotify}?theme=0`;

// The native, visible Spotify embed owns play/pause. There is no proxy button.
export class SpotifyPlayer {
  constructor(song, loadFallback) {
    this.song = song;
    this.loadFallback = loadFallback;
    this.controller = null;
    this.playing = false;
    this.resumeOnReady = false;
    this.resumeTimer = null;
  }

  connect(controller, loadedSong = this.song) {
    this.controller = controller;
    controller.addListener('playback_update', event => {
      const data = event.data;
      if (data.playingURI && data.playingURI !== spotifyUri(this.song)) return;
      this.playing = !data.isPaused;
    });
    controller.addListener('ready', () => this.resume());
    if (loadedSong.id !== this.song.id) controller.loadUri(spotifyUri(this.song));
  }

  select(song) {
    if (song.id === this.song.id) return;
    const resume = this.playing || this.resumeOnReady;
    this.song = song;
    this.playing = false;
    this.resumeOnReady = resume;
    clearTimeout(this.resumeTimer);
    if (!this.controller) {
      this.resumeOnReady = false;
      this.loadFallback(song);
      return;
    }
    this.controller.pause();
    this.controller.loadUri(spotifyUri(song));
    // Browsers may require another click on Spotify's own play button. Never
    // add another play control or popup when that happens.
    if (resume) this.resumeTimer = setTimeout(() => this.resume(), 700);
  }

  resume() {
    if (!this.resumeOnReady || !this.controller) return;
    this.resumeOnReady = false;
    clearTimeout(this.resumeTimer);
    this.controller.play();
  }
}

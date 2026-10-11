# w2e x zkng

A horizontal strip of wave to earth concert videos, centered on a black page. Scroll or swipe along the strip to bring the next song into the middle. The strip has a shallow landscape crop, with a restored curved song dial below it and tiny twinkling dots on the black background. There are no photobooth decorations.

## Run

```sh
npm run dev
```

Open **http://localhost:3000**. Node.js is required; no dependency installation or build is needed.

The GitHub repository contains the code and favicon. Concert footage and preview
frames are excluded from Git and remain local. After cloning, follow
[videos/README.md](videos/README.md) to restore the media files.

## Current videos

- **sing it all again:** your `IMG_1723.MOV`, converted to H.264/AAC MP4 with its full 121-second duration, concert audio preserved. The page crops the portrait footage into a landscape frame, focused on the stage; the converted file retains the original framing. A poster frame is included.
- **everything comes and goes:** your `IMG_1727.mov`, converted to a browser-compatible MP4 with concert audio and a poster frame.
- **skylark:** your `IMG_1733.MOV`, converted to a browser-compatible MP4 with concert audio and a poster frame.
- **talking ’bout u:** your `IMG_1730.MOV`, converted to a browser-compatible MP4 with concert audio and a poster frame.
- **courage:** your `IMG_1736.mov`, converted to a browser-compatible MP4 with concert audio and a poster frame.
- **cherry flavored love inside your heart:** your `IMG_1739.mov`, converted to a browser-compatible MP4 with concert audio and a poster frame.
- **hyang:** your `IMG_1741.MOV`, converted to a browser-compatible MP4 with concert audio and a poster frame.
- **annie.:** your concert clip, converted to a browser-compatible MP4 with audio and a preview frame.
- **bad:** your concert clip, converted to a browser-compatible MP4 with audio and a preview frame.
- **calla:** your concert clip, converted to a browser-compatible MP4 with audio and a preview frame.
- **seasons:** your concert clip, converted to a browser-compatible MP4 with audio and a preview frame.
- **sunny days:** your concert clip, converted to a browser-compatible MP4 with audio and a preview frame.
- **you:** your concert clip, converted to a browser-compatible MP4 with audio and a preview frame.
- **closing:** your concert clip, converted to a browser-compatible MP4 with audio and a preview frame.
- **daisy:** your concert clip, converted to a browser-compatible MP4 with audio and a preview frame.
- **heaven and hell:** your concert clip, converted to a browser-compatible MP4 with audio and a preview frame.
- **homesick:** your `homesick.MOV`, converted to a browser-compatible MP4 with audio and a preview frame.
- **love:** your `love.MOV`, converted to a browser-compatible MP4 with audio and a preview frame.

All eighteen song slots now have their own concert footage.

Only the centered clip plays, with sound enabled. When it finishes, the strip and arc advance forward to the next uploaded video, skipping empty or failed slots. After the last available clip, playback wraps to the first. Native video controls, picture-in-picture, and cast controls are hidden. The centered clip starts automatically when scrolling selects it. Click or tap the page, or press Space, to pause/resume. A manual pause persists across scrolling and tab changes; dragging or selecting another song does not toggle playback. If the browser blocks audible autoplay on the first visit, a click or tap anywhere on the page retries playback; no playback button is shown. Clips pause when leaving the center. Audio continues when you switch browser tabs, including automatic advancement to the next clip; background visual animation is suspended. Reduced-motion preferences continue to apply to the arc and star animations.

## Playback countdown

The small timer beside **wave to earth** uses the total duration of the full eighteen-song collection. All eighteen slots use their actual video lengths. Browser video metadata keeps the total synchronized with the clips. The initial total is calculated from the actual runtimes of all eighteen uploaded clips.

The countdown starts on the first successful playback and counts active playback time. It freezes during manual pauses, buffering, or empty song slots, then resumes from the same remaining time when a video plays again. It keeps counting during background audio playback. Scrolling or restarting a clip does not reset the budget. Actual clip metadata continues to replace estimated durations without losing time already counted. At zero, every video pauses, automatic advancement stops, pending dial motion is cancelled, and star animation stops. Page interactions and returning to the tab cannot restart playback after expiration; refresh to start a new session.

This website does not issue an operating-system sleep command or request a wake lock. Stopping media lets normal automatic sleep take over, subject to macOS settings and other applications. For macOS, see [Apple's sleep settings guide](https://support.apple.com/en-gb/guide/mac-help/mchle41a6ccd/mac).

## Add more videos

Put each browser-compatible MP4 in `videos/`, then add `video` and optional `poster` paths to that song in `songs.js`:

```js
video: './videos/seasons.mp4',
poster: './videos/seasons.png',
```

Keep the original files elsewhere; the project only needs the browser copies. The strip uses a fixed 16:9 landscape crop. Adjust `object-position` in `styles.css` to change the crop focus.

## Navigation

- Scroll or drag the restored arc to move through the videos. Wheel and trackpad movement remain proportional, with a soft spring when settling.
- Swipe or drag the video strip directly; the first and last songs connect in a continuous loop.
- A mouse wheel moves the strip proportionally and centers the nearest frame when scrolling stops.
- Drag with the mouse, click an adjacent frame, or use arrow keys and Page Up / Page Down.
- Home / End goes to the first / last slot.
- Song name and count update with the centered frame. Each song has a URL fragment.
- The tab title remains **w2e x zkng**.

## Files

- **app.js / strip.js**: video creation, active playback, and seamless looping strip navigation. Each song keeps one video element, so wrapping does not restart its footage.
- **styles.css**: black layout, landscape crop, curved dial, and corner labels.
- **dial.js**: arc geometry and spring motion synchronized with the strip.
- **stars.js**: small dot stars with independent subtle twinkling; reduced motion is respected.
- **songs.js**: song order and media paths.
- **videos/**: converted footage and poster frames.
- **server.mjs / ranges.js**: local server with streaming byte ranges for video.

The former abstract background modules remain in the folder but are not loaded by the page.

## Checks

```sh
npm run check
```

The checks cover source syntax and the retained component tests. Live video decoding and interaction require a browser. The development server streams file ranges rather than loading an entire video into memory on each request.

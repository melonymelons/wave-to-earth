# Concert videos

The repository includes the website source. Concert videos and their preview
frames stay local and are ignored by Git.

To restore the complete playlist on another computer, copy the `.mp4` and `.png`
files from the original project's `videos/` folder into this folder. Filenames
must match the `video` and `poster` paths in `songs.js`.

All eighteen clips use their own song IDs, for example:

```text
sing-it-all-again.mp4
sing-it-all-again.png
everything-comes-and-goes.mp4
everything-comes-and-goes.png
talking-bout-u.mp4
talking-bout-u.png
...
homesick.mp4
homesick.png
love.mp4
love.png
```

H.264/AAC MP4 is the format used for the browser copies. The original MOV files
remain separate. The app preserves exact runtime metadata in `songs.js` and
refreshes it from each video when the browser loads its metadata.

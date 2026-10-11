# w2e x zkng

Playlist from wave to earth’s **“bad pieces”** concert setlist in **Philadelphia, PA**, on **October 3**.

Run `npm run dev` locally. Run `npm run build` to create the static site in `dist/`.
Vercel uses the included `vercel.json` to build and serve that folder.

The compressed videos and posters in `public/videos/` are committed to GitHub and copied into the static build. No Blob storage or media environment variables are needed.
Original recordings stay in the ignored `videos/` folder. To generate the web copies, install FFmpeg and run `npm run prepare:videos` locally. The copies use H.264/AAC, fit within 960 × 960 pixels, and stay below 90 MB per file. Commit the generated files before deploying; Vercel does not need FFmpeg.

1. sing it all again
2. everything comes and goes
3. talking 'bout u
4. skylark
5. courage
6. cherry flavored love inside your heart
7. hyang
8. seasons
9. you
10. bad
11. sunny days
12. annie.
13. calla
14. heaven and hell
15. closing
16. daisy
17. homesick
18. love

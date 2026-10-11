import { cp, mkdir, stat } from 'node:fs/promises';
import { songs } from '../public/data/songs.js';

const output = new URL('../dist/', import.meta.url);
for (const song of songs) {
  for (const extension of ['mp4', 'png']) {
    const filename = `videos/${song.id}.${extension}`;
    let size;
    try {
      size = (await stat(new URL(`../public/${filename}`, import.meta.url))).size;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      throw new Error(`Missing public/${filename}. Run npm run prepare:videos before committing the media.`);
    }
    if (!size || size >= 90_000_000) throw new Error(`${filename} must be nonempty and below 90 MB.`);
  }
}

await mkdir(output, { recursive: true });
await cp(new URL('../public/', import.meta.url), output, { recursive: true });
console.log('Built static website in dist/.');

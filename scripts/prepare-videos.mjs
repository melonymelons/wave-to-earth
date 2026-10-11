import { mkdir, copyFile, stat, rename, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { songs } from '../public/data/songs.js';

const media = new URL('../videos/', import.meta.url);
const output = new URL('../public/videos/', import.meta.url);
await mkdir(output, { recursive: true });

function encode(args) {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    process.on('error', reject);
    process.on('exit', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with ${code}`)));
  });
}

let totalBytes = 0;
for (const song of songs) {
  const filename = `${song.id}.mp4`;
  const destination = new URL(filename, output);
  const temporary = new URL(`${song.id}.partial.mp4`, output);
  let existing = false;
  try { existing = (await stat(destination)).size > 0; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!existing) {
    console.log(`Preparing ${song.title}…`);
    try {
      await encode([
        '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
        '-i', fileURLToPath(new URL(filename, media)),
        '-map', '0:v:0', '-map', '0:a:0', '-map_metadata', '-1',
        '-vf', "scale=960:960:force_original_aspect_ratio=decrease:force_divisible_by=2", '-r', '30',
        '-c:v', 'libx264', '-preset', 'fast', '-threads', '4', '-b:v', '850k', '-maxrate', '950k', '-bufsize', '1900k',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
        fileURLToPath(temporary),
      ]);
      await rename(temporary, destination);
    } catch (error) {
      await unlink(temporary).catch(() => {});
      throw error;
    }
  }
  if ((await stat(destination)).size >= 90_000_000) throw new Error(`${filename} exceeds the 90 MB file budget.`);
  const poster = `${song.id}.png`;
  await copyFile(new URL(poster, media), new URL(poster, output));
  totalBytes += (await stat(destination)).size + (await stat(new URL(poster, output))).size;
  console.log(`Ready: ${song.title}`);
}
console.log(`Prepared ${(totalBytes / 1_000_000).toFixed(1)} MB in public/videos/. Originals preserved.`);
if (totalBytes > 900_000_000) throw new Error('Prepared files exceed the 900 MB hosting budget.');

import { openAsBlob } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { list, put } from '@vercel/blob';
import { songs } from '../public/data/songs.js';

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error('Add BLOB_READ_WRITE_TOKEN to the ignored .env.local file before uploading.');
}

// Check every source before starting a potentially long upload.
const files = songs.flatMap(({ id }) => ['mp4', 'png'].map(ext => ({
  pathname: `videos/${id}.${ext}`,
  file: fileURLToPath(new URL(`../videos/hosted/${id}.${ext}`, import.meta.url)),
  contentType: ext === 'mp4' ? 'video/mp4' : 'image/png',
})));
for (const file of files) {
  try {
    file.size = (await stat(file.file)).size;
  } catch {
    throw new Error(`Missing ${file.file}. Run npm run prepare:videos first.`);
  }
}
const totalBytes = files.reduce((total, file) => total + file.size, 0);
if (totalBytes > 900_000_000) throw new Error('Prepared files exceed the 900 MB hosting budget. Compress them further before uploading.');

const existing = new Map();
let cursor;
do {
  const page = await list({ prefix: 'videos/', cursor });
  for (const blob of page.blobs) existing.set(blob.pathname, blob);
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

let mediaBase;
for (const file of files) {
  let blob = existing.get(file.pathname);
  if (blob && blob.size !== file.size) {
    throw new Error(`${file.pathname} already exists with a different size. Resolve that file in Blob storage before retrying.`);
  }
  if (blob) {
    console.log(`Already uploaded: ${file.pathname}`);
  } else {
    console.log(`Uploading: ${file.pathname}`);
    blob = await put(file.pathname, await openAsBlob(file.file), {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.contentType,
      multipart: file.contentType === 'video/mp4',
    });
  }
  mediaBase = new URL('./', blob.url).href;
}
console.log(`\nSet this environment variable in Vercel, then redeploy:\nMEDIA_BASE_URL=${mediaBase}`);

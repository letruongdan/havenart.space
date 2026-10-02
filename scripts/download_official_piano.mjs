import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const audioDir = path.resolve(__dirname, '../public/audio');

const DOWNLOADS = [
  {
    filename: 'kiss-the-rain.mp3',
    url: 'https://archive.org/download/yiruma-solo/13%20Kiss%20The%20Rain.mp3',
    title: 'Kiss the Rain — Yiruma (Official Studio Recording)',
    minBytes: 2_000_000,
  },
  {
    filename: 'river-flows.mp3',
    url: 'https://archive.org/download/yiruma-solo/06%20River%20Flows%20In%20You.mp3',
    title: 'River Flows in You — Yiruma (Official Studio Recording)',
    minBytes: 2_000_000,
  },
  {
    filename: 'spring-waltz.mp3',
    url: 'https://archive.org/download/yiruma-solo/05%20Spring%20Waltz.mp3',
    title: 'Spring Waltz — Yiruma (Official Studio Recording)',
    minBytes: 2_000_000,
  },
  {
    filename: 'destiny-of-love.mp3',
    url: 'https://archive.org/download/yiruma-solo/02%20Destiny%20Of%20Love.mp3',
    title: 'Destiny of Love — Yiruma (Official Studio Recording)',
    minBytes: 2_000_000,
  },
  {
    filename: 'if-i-could-see-you-again.mp3',
    url: 'https://archive.org/download/yiruma-solo/11%20If%20I%20Could%20See%20You%20Again.mp3',
    title: 'If I Could See You Again — Yiruma (Official Studio Recording)',
    minBytes: 2_000_000,
  },
  {
    filename: 'clair-de-lune.mp3',
    url: 'https://archive.org/download/clair-de-lune_202408/clair%20de%20lune.mp3',
    title: 'Clair de Lune — Claude Debussy (Acoustic Grand Piano)',
    minBytes: 2_000_000,
  },
  {
    filename: 'gymnopedie-no1.mp3',
    url: 'https://archive.org/download/gymnopedie-1-erik-satie-176573_202506/gymnopedie-1-erik-satie-176573.mp3',
    title: 'Gymnopédie No. 1 — Erik Satie (Acoustic Grand Piano)',
    minBytes: 2_000_000,
  },
];

async function downloadFile(item) {
  const destPath = path.join(audioDir, item.filename);
  console.log(`[Downloading] ${item.title}...`);
  console.log(`  Source: ${item.url}`);

  try {
    const response = await fetch(item.url, {
      headers: {
        'User-Agent': 'HavenArt/1.0 (https://havenart.space; dev@havenart.space)',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < item.minBytes) {
      throw new Error(`File size too small (${buffer.length} bytes), expected >= ${item.minBytes}`);
    }

    fs.writeFileSync(destPath, buffer);
    console.log(`  ✓ Saved ${item.filename} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
    return true;
  } catch (err) {
    console.error(`  ✗ Failed to download ${item.filename}:`, err.message);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  let successCount = 0;
  for (const item of DOWNLOADS) {
    const ok = await downloadFile(item);
    if (ok) successCount++;
  }

  console.log(`\nDownload summary: ${successCount}/${DOWNLOADS.length} files successfully downloaded.`);
}

main().catch(console.error);

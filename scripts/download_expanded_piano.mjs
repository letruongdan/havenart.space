import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const audioDir = path.resolve(__dirname, '../public/audio');

const DOWNLOADS = [
  {
    filename: 'moonlight-sonata.mp3',
    url: 'https://archive.org/download/LudwigVanBeethovenMoonlightSonataAdagioSostenutogetTune.net/Ludwig_Van_Beethoven_-_Moonlight_Sonata_Adagio_Sostenuto_(get-tune.net).mp3',
    title: 'Moonlight Sonata (Adagio Sostenuto) — Ludwig van Beethoven',
    minBytes: 2_000_000,
  },
  {
    filename: 'chopin-nocturne-op9.mp3',
    url: 'https://archive.org/download/Chopin-NocturneOp.9No.2/20120420_Chopin_Nocturne_op9-2_amplified.mp3',
    title: 'Nocturne Op. 9 No. 2 — Frédéric Chopin',
    minBytes: 2_000_000,
  },
  {
    filename: 'gnossienne-no1.mp3',
    url: 'https://archive.org/download/erik-satie-gnossienne-no.-1/Erik_Satie_Gnossienne_No.1.mp3',
    title: 'Gnossienne No. 1 — Erik Satie',
    minBytes: 2_000_000,
  },
  {
    filename: 'bach-prelude-c.mp3',
    url: 'https://archive.org/download/BachWellTemperedKlavierBookI-PreludeInCMajor/Bach_Well-Tempered_Klavier_Book_I_-_Prelude_1_in_C_major.mp3',
    title: 'Prelude in C Major (BWV 846) — J.S. Bach',
    minBytes: 1_000_000,
  },
  {
    filename: 'traumerei.mp3',
    url: 'https://archive.org/download/traumerei_202503/Traumerei.mp3',
    title: 'Träumerei (Kinderszenen) — Robert Schumann',
    minBytes: 1_000_000,
  },
  {
    filename: 'shining-smile.mp3',
    url: 'https://archive.org/download/yiruma-solo/04%20Shining%20Smile.mp3',
    title: 'Shining Smile — Yiruma',
    minBytes: 2_000_000,
  },
  {
    filename: 'its-your-day.mp3',
    url: 'https://archive.org/download/yiruma-solo/12%20It%27s%20Your%20Day.mp3',
    title: "It's Your Day — Yiruma",
    minBytes: 2_000_000,
  },
  {
    filename: 'sometimes-someone.mp3',
    url: 'https://archive.org/download/yiruma-solo/01%20Sometimes%20Someone.mp3',
    title: 'Sometimes Someone — Yiruma',
    minBytes: 2_000_000,
  },
  {
    filename: 'joy.mp3',
    url: 'https://archive.org/download/yiruma-solo/07%20Joy.mp3',
    title: 'Joy — Yiruma',
    minBytes: 2_000_000,
  },
  {
    filename: 'lost-in-island.mp3',
    url: 'https://archive.org/download/yiruma-solo/03%20Lost%20In%20Island.mp3',
    title: 'Lost In Island — Yiruma',
    minBytes: 2_000_000,
  },
];

async function downloadFile(item) {
  const destPath = path.join(audioDir, item.filename);

  if (fs.existsSync(destPath)) {
    const stats = fs.statSync(destPath);
    if (stats.size >= item.minBytes) {
      console.log(`  ✓ Already exists: ${item.filename} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
      return true;
    }
  }

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

  console.log('--- Downloading Expanded Haven Piano Collection ---');
  let successCount = 0;
  for (const item of DOWNLOADS) {
    const ok = await downloadFile(item);
    if (ok) successCount++;
  }

  console.log(`\nDownload summary: ${successCount}/${DOWNLOADS.length} piano files ready.`);
}

main().catch(console.error);

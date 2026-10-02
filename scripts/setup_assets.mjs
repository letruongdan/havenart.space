import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve('public');
const ARTWORKS_DIR = path.join(PUBLIC_DIR, 'images', 'artworks');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const CREDITS_PATH = path.join(PUBLIC_DIR, 'credits.json');

fs.mkdirSync(ARTWORKS_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(ICONS_DIR, { recursive: true });

// 1. Curated Artwork Sources (Wikimedia Commons high-resolution Public Domain originals)
const ARTWORK_SOURCES = [
  {
    id: 'haven-art-fuji-morning',
    filename: 'hokusai-red-fuji.webp',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Katsushika_Hokusai_-_Fine_Wind%2C_Clear_Morning_%28Gaif%C5%AB_kaisei%29_-_Google_Art_Project.jpg/1280px-Katsushika_Hokusai_-_Fine_Wind%2C_Clear_Morning_%28Gaif%C5%AB_kaisei%29_-_Google_Art_Project.jpg',
  },
  {
    id: 'haven-art-monet-waterlilies',
    filename: 'monet-water-lilies.webp',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/1280px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg',
  },
  {
    id: 'haven-art-hasui-lake-chuzenji',
    filename: 'hasui-lake-chuzenji.webp',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/NDL-DC_2586549-41_Kawase_Hasui_S06.jpg/1280px-NDL-DC_2586549-41_Kawase_Hasui_S06.jpg',
  },
  {
    id: 'haven-art-turner-evening-star',
    filename: 'turner-evening-star.webp',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Turner_-_The_Evening_Star%2C_about_1830%2C_NG1991.jpg',
  },
  {
    id: 'haven-art-friedrich-morning-mist',
    filename: 'friedrich-morning-mist.webp',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Caspar_David_Friedrich_-_Morgennebel_im_Gebirge.jpg',
  },
];

async function downloadArtworks() {
  console.log('--- 1. Downloading and optimizing artworks ---');
  for (const art of ARTWORK_SOURCES) {
    const targetPath = path.join(ARTWORKS_DIR, art.filename);
    console.log(`Processing: ${art.filename}...`);
    try {
      const response = await fetch(art.url, {
        headers: { 'User-Agent': 'HavenArtBot/1.0 (https://havenart.space; contact@havenart.space)' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${art.url}: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);

      // Convert to optimized WebP (max width 1920, maintain aspect ratio, quality 85)
      await sharp(inputBuffer)
        .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85, effort: 4 })
        .toFile(targetPath);

      const stats = fs.statSync(targetPath);
      console.log(`✓ ${art.filename} saved (${(stats.size / 1024).toFixed(1)} kB)`);
    } catch (err) {
      console.error(`Error processing ${art.filename}:`, err);
      throw err;
    }
  }
}

// 2. Synthesize 3 Calming Ambient Tracks
function synthesizeTrack(filename, baseFreqs, noiseAmp, lfoSpeed) {
  return new Promise((resolve, reject) => {
    const sampleRate = 44100;
    const durationSec = 35; // 35 seconds of seamless ambient loop
    const numSamples = sampleRate * durationSec;
    const buffer = Buffer.alloc(numSamples * 4); // 2 channels * 16-bit PCM

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Smooth sinusoidal loop envelope to avoid clicking at loop boundaries
      const loopEnv = Math.sin((Math.PI * t) / durationSec);

      const lfo1 = 0.5 + 0.5 * Math.sin(2 * Math.PI * lfoSpeed * t);
      const lfo2 = 0.5 + 0.5 * Math.sin(2 * Math.PI * (lfoSpeed * 0.73) * t + 1.2);

      let left = 0;
      let right = 0;

      for (let f = 0; f < baseFreqs.length; f++) {
        const freq = baseFreqs[f];
        const detuneL = freq * 0.9985;
        const detuneR = freq * 1.0015;
        const weight = (0.28 / (f + 1)) * (f % 2 === 0 ? lfo1 : lfo2);

        left += Math.sin(2 * Math.PI * detuneL * t) * weight;
        right += Math.sin(2 * Math.PI * detuneR * t) * weight;
      }

      // Soft natural atmospheric pink noise
      const noise = (Math.random() * 2 - 1) * noiseAmp;
      left = (left + noise) * loopEnv * 0.42;
      right = (right + noise) * loopEnv * 0.42;

      // Clamp to [-1, 1]
      left = Math.max(-1, Math.min(1, left));
      right = Math.max(-1, Math.min(1, right));

      buffer.writeInt16LE(Math.floor(left * 32767), i * 4);
      buffer.writeInt16LE(Math.floor(right * 32767), i * 4 + 2);
    }

    const outputPath = path.join(AUDIO_DIR, filename);
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 's16le',
      '-ar', '44100',
      '-ac', '2',
      '-i', 'pipe:0',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      outputPath,
    ]);

    ffmpeg.stdin.write(buffer);
    ffmpeg.stdin.end();

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const stats = fs.statSync(outputPath);
        console.log(`✓ Audio track ${filename} generated (${(stats.size / 1024).toFixed(1)} kB)`);
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code} for ${filename}`));
      }
    });
  });
}

async function generateAudioTracks() {
  console.log('--- 2. Generating tranquil ambient audio tracks ---');
  // Track 1: Morning Mist (432Hz root, tranquil A major pentatonic harmonics)
  await synthesizeTrack('morning-mist.mp3', [108, 216, 270, 324, 432, 648], 0.012, 0.08);

  // Track 2: Serene Solitude (D minor / F major peaceful meditation resonance)
  await synthesizeTrack('serene-solitude.mp3', [146.83, 220, 293.66, 349.23, 440, 523.25], 0.008, 0.06);

  // Track 3: Gentle Nightfall (E minor pentatonic, slow warm nocturnal drone)
  await synthesizeTrack('gentle-nightfall.mp3', [82.41, 164.81, 246.94, 329.63, 392.0, 493.88], 0.015, 0.05);
}

// 3. Update Credits Ledger with verified SHA-256 hashes
function updateCreditsLedger() {
  console.log('--- 3. Updating public/credits.json with physical SHA-256 hashes ---');
  const creditsRaw = fs.readFileSync(CREDITS_PATH, 'utf-8');
  const credits = JSON.parse(creditsRaw);

  for (const asset of credits.assets) {
    const relFile = asset.file.replace(/^\//, '');
    const physicalPath = path.join(PUBLIC_DIR, relFile);
    if (fs.existsSync(physicalPath)) {
      const buf = fs.readFileSync(physicalPath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      asset.checksum = `sha256:${hash}`;
      console.log(`Hash updated for ${asset.id} (${relFile}): ${asset.checksum.slice(0, 20)}...`);
    } else {
      console.warn(`File not found for asset ${asset.id}: ${physicalPath}`);
    }
  }

  credits.updatedAt = new Date().toISOString();
  fs.writeFileSync(CREDITS_PATH, JSON.stringify(credits, null, 2) + '\n', 'utf-8');
  console.log('✓ credits.json updated successfully.');
}

async function main() {
  await downloadArtworks();
  await generateAudioTracks();
  updateCreditsLedger();
  console.log('\nAll assets downloaded, synthesized, and verified successfully!');
}

main().catch((err) => {
  console.error('Asset setup failed:', err);
  process.exit(1);
});

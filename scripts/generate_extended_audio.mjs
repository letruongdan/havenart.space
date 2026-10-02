import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const AUDIO_DIR = path.resolve('public', 'audio');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

function synthesizeTrack(filename, baseFreqs, noiseAmp, lfoSpeed, filterType = 'ambient') {
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

      // Natural atmospheric pink/water noise
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

async function run() {
  console.log('--- Generating Haven Art Extended Ambient Tracks ---');
  // 1. Raindrop Solace (F major / soft rain resonance, reflective)
  await synthesizeTrack('rain-solace.mp3', [174.61, 220, 261.63, 349.23, 440, 523.25], 0.035, 0.05);

  // 2. Golden Dusk (G major warm acoustic resonance, sunset)
  await synthesizeTrack('golden-dusk.mp3', [98.0, 196.0, 246.94, 293.66, 392.0, 493.88], 0.01, 0.04);

  // 3. Zen Garden (C major meditative temple bells & calm stream)
  await synthesizeTrack('zen-garden.mp3', [130.81, 196.0, 261.63, 329.63, 392.0, 523.25], 0.012, 0.07);

  // 4. Hopeful Dawn (D major uplifting harmonic resonance)
  await synthesizeTrack('hopeful-dawn.mp3', [146.83, 220.0, 293.66, 369.99, 440.0, 587.33], 0.009, 0.09);

  console.log('✓ All extended tracks successfully generated.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

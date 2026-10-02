import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const sampleRate = 44100;

// Note frequencies in Hz
const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Gb4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Gb5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, B5: 987.77,
  C6: 1046.50
};

// Realistic physical piano note synthesizer
function addPianoNote(buffer, startSec, durationSec, freq, velocity = 0.7, pan = 0.5) {
  const startSample = Math.floor(startSec * sampleRate);
  const noteSamples = Math.floor(durationSec * sampleRate);
  const totalSamples = buffer.length / 2;

  // Number of harmonics to synthesize
  const numHarmonics = Math.min(12, Math.floor(8000 / freq));

  for (let i = 0; i < noteSamples; i++) {
    const idx = startSample + i;
    if (idx >= totalSamples) break;

    const t = i / sampleRate;

    // Hammer strike transient (first 8ms)
    const attack = Math.min(1.0, t / 0.005);

    // Multi-decay envelope (piano strings have two decay stages: initial prompt sound + slow sustain)
    const promptDecay = Math.exp(-t * (3.5 + freq * 0.004));
    const sustainDecay = Math.exp(-t * (0.8 + freq * 0.001));
    const envelope = attack * (0.6 * promptDecay + 0.4 * sustainDecay) * velocity;

    let sample = 0;
    for (let h = 1; h <= numHarmonics; h++) {
      // Inharmonicity slightly sharpens higher harmonics (stiffness of piano wire)
      const inharmonicFreq = freq * h * Math.sqrt(1 + 0.00015 * h * h);
      // Higher harmonics decay faster
      const harmonicDecay = Math.exp(-t * h * 1.2);
      const amp = (1 / Math.pow(h, 1.15)) * harmonicDecay;

      sample += Math.sin(2 * Math.PI * inharmonicFreq * t) * amp;
    }

    // Add wooden hammer thud at onset
    if (t < 0.03) {
      const thud = Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 120) * 0.25 * velocity;
      sample += thud;
    }

    const val = sample * envelope * 0.18;
    buffer[idx * 2] += val * (1 - pan * 0.6); // Left channel
    buffer[idx * 2 + 1] += val * (0.4 + pan * 0.6); // Right channel
  }
}

// Generate "Kiss the Rain" style lyrical rain piano piece
function generateKissTheRainTrack(filename) {
  return new Promise((resolve, reject) => {
    const durationSec = 36;
    const totalSamples = sampleRate * durationSec;
    const floatBuffer = new Float32Array(totalSamples * 2);

    // Lyrical chord progression in A-flat major / A major:
    // Section 1: Ab - Eb/G - Fm7 - Db (Gentle, emotive cascading)
    // Section 2: Bbm7 - Eb7 - Ab
    // Notes and phrasing in the exact mood of "Kiss the Rain"

    // Gentle raindrop / water ambience layer
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      // Soft loop envelope
      const loopEnv = Math.sin((Math.PI * t) / durationSec);
      // Micro rain drops
      if (Math.random() < 0.0008) {
        const dropFreq = 1800 + Math.random() * 1200;
        const dropLen = Math.floor(sampleRate * 0.02);
        for (let d = 0; d < dropLen && (i + d) < totalSamples; d++) {
          const dt = d / sampleRate;
          const dropSample = Math.sin(2 * Math.PI * dropFreq * dt) * Math.exp(-dt * 200) * 0.012 * loopEnv;
          floatBuffer[(i + d) * 2] += dropSample;
          floatBuffer[(i + d) * 2 + 1] += dropSample;
        }
      }
      // Warm room background air
      const softAir = (Math.random() * 2 - 1) * 0.002 * loopEnv;
      floatBuffer[i * 2] += softAir;
      floatBuffer[i * 2 + 1] += softAir;
    }

    // Melody & Accompaniment sequence (36 seconds looped)
    // Measures (each measure = 4.5s)
    const melodyEvents = [
      // Measure 1: Ab Major (Arpeggio + Melody: C5, Bb4, Ab4, Eb4)
      { t: 0.0, f: NOTES.Ab3, d: 4.0, v: 0.65, p: 0.3 },
      { t: 0.4, f: NOTES.Eb4, d: 3.5, v: 0.5, p: 0.4 },
      { t: 0.8, f: NOTES.Ab4, d: 3.0, v: 0.55, p: 0.5 },
      { t: 1.2, f: NOTES.C5,  d: 2.2, v: 0.75, p: 0.6 },
      { t: 2.2, f: NOTES.Bb4, d: 1.2, v: 0.65, p: 0.55 },
      { t: 3.0, f: NOTES.Ab4, d: 1.4, v: 0.7, p: 0.5 },

      // Measure 2: Eb/G (G3 bass, Eb4, G4, Bb4, Eb5)
      { t: 4.5, f: NOTES.G3,  d: 4.0, v: 0.6, p: 0.3 },
      { t: 4.9, f: NOTES.Eb4, d: 3.5, v: 0.5, p: 0.4 },
      { t: 5.3, f: NOTES.G4,  d: 3.0, v: 0.55, p: 0.45 },
      { t: 5.7, f: NOTES.Eb5, d: 2.0, v: 0.72, p: 0.65 },
      { t: 6.8, f: NOTES.Db5, d: 1.2, v: 0.62, p: 0.6 },
      { t: 7.5, f: NOTES.C5,  d: 1.4, v: 0.68, p: 0.55 },

      // Measure 3: Fm7 (F3 bass, C4, Ab4, C5)
      { t: 9.0,  f: NOTES.F3,  d: 4.0, v: 0.62, p: 0.25 },
      { t: 9.4,  f: NOTES.C4,  d: 3.5, v: 0.5, p: 0.35 },
      { t: 9.8,  f: NOTES.Ab4, d: 3.0, v: 0.52, p: 0.45 },
      { t: 10.2, f: NOTES.C5,  d: 2.2, v: 0.75, p: 0.6 },
      { t: 11.3, f: NOTES.Bb4, d: 1.2, v: 0.62, p: 0.55 },
      { t: 12.0, f: NOTES.Ab4, d: 1.4, v: 0.7, p: 0.5 },

      // Measure 4: Db Major (Db3 bass, Ab3, F4, Ab4)
      { t: 13.5, f: NOTES.Db3, d: 4.0, v: 0.65, p: 0.25 },
      { t: 13.9, f: NOTES.Ab3, d: 3.5, v: 0.52, p: 0.35 },
      { t: 14.3, f: NOTES.F4,  d: 3.0, v: 0.55, p: 0.45 },
      { t: 14.7, f: NOTES.Ab4, d: 2.5, v: 0.72, p: 0.55 },
      { t: 16.0, f: NOTES.G4,  d: 1.2, v: 0.6, p: 0.5 },
      { t: 16.8, f: NOTES.F4,  d: 1.4, v: 0.65, p: 0.45 },

      // Measure 5: Bbm7 (Bb2 bass, F3, Db4, F4)
      { t: 18.0, f: NOTES.Bb2, d: 4.0, v: 0.62, p: 0.2 },
      { t: 18.4, f: NOTES.F3,  d: 3.5, v: 0.5, p: 0.3 },
      { t: 18.8, f: NOTES.Db4, d: 3.0, v: 0.55, p: 0.4 },
      { t: 19.2, f: NOTES.F4,  d: 2.2, v: 0.7, p: 0.5 },
      { t: 20.3, f: NOTES.Eb4, d: 1.2, v: 0.62, p: 0.45 },
      { t: 21.0, f: NOTES.Db4, d: 1.4, v: 0.65, p: 0.4 },

      // Measure 6: Eb7 (Eb3 bass, Bb3, G4, Eb5)
      { t: 22.5, f: NOTES.Eb3, d: 4.0, v: 0.65, p: 0.3 },
      { t: 22.9, f: NOTES.Bb3, d: 3.5, v: 0.52, p: 0.35 },
      { t: 23.3, f: NOTES.Db4, d: 3.0, v: 0.55, p: 0.4 },
      { t: 23.7, f: NOTES.G4,  d: 2.0, v: 0.72, p: 0.55 },
      { t: 24.8, f: NOTES.Ab4, d: 1.2, v: 0.65, p: 0.55 },
      { t: 25.5, f: NOTES.Bb4, d: 1.4, v: 0.7, p: 0.6 },

      // Measure 7: Ab Major (High tender resolution: C5, Eb5, Ab5)
      { t: 27.0, f: NOTES.Ab3, d: 4.0, v: 0.65, p: 0.3 },
      { t: 27.4, f: NOTES.Eb4, d: 3.5, v: 0.52, p: 0.4 },
      { t: 27.8, f: NOTES.C5,  d: 3.0, v: 0.68, p: 0.6 },
      { t: 28.5, f: NOTES.Eb5, d: 2.5, v: 0.75, p: 0.65 },
      { t: 29.8, f: NOTES.Ab5, d: 2.2, v: 0.7, p: 0.7 },
      { t: 30.8, f: NOTES.Eb5, d: 1.8, v: 0.62, p: 0.6 },

      // Measure 8: Gentle fade & lingering arpeggio (C5, Ab4, Eb4, Ab3)
      { t: 31.5, f: NOTES.Db3, d: 3.5, v: 0.58, p: 0.25 },
      { t: 32.0, f: NOTES.Ab3, d: 3.2, v: 0.52, p: 0.35 },
      { t: 32.6, f: NOTES.C4,  d: 2.8, v: 0.55, p: 0.45 },
      { t: 33.2, f: NOTES.Eb4, d: 2.5, v: 0.58, p: 0.5 },
      { t: 34.0, f: NOTES.Ab4, d: 2.0, v: 0.6, p: 0.55 },
    ];

    for (const note of melodyEvents) {
      addPianoNote(floatBuffer, note.t, note.d, note.f, note.v, note.p);
    }

    // Convert floatBuffer to 16-bit PCM with soft limiting
    const pcmBuffer = Buffer.alloc(totalSamples * 4);
    for (let i = 0; i < totalSamples; i++) {
      let l = floatBuffer[i * 2];
      let r = floatBuffer[i * 2 + 1];

      // Soft saturation limiter
      l = Math.tanh(l);
      r = Math.tanh(r);

      pcmBuffer.writeInt16LE(Math.floor(l * 32767), i * 4);
      pcmBuffer.writeInt16LE(Math.floor(r * 32767), i * 4 + 2);
    }

    const outputPath = path.resolve('public', 'audio', filename);
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

    ffmpeg.stdin.write(pcmBuffer);
    ffmpeg.stdin.end();

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ Generated ${filename} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} kB)`);
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });
  });
}

generateKissTheRainTrack('kiss-the-rain.mp3')
  .then(() => console.log('Done test!'))
  .catch((err) => console.error(err));

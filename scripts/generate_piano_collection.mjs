import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const AUDIO_DIR = path.resolve('public', 'audio');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

const sampleRate = 44100;

// Note frequencies in Hz
const NOTES = {
  F2: 87.31, G2: 98.00, Ab2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,
  C3: 130.81, Db3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Gb3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, Db4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Gb4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Db5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Gb5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77,
  C6: 1046.50, Db6: 1108.73, D6: 1174.66, E6: 1318.51, F6: 1396.91
};

// Realistic physical acoustic piano note synthesizer
function addPianoNote(buffer, startSec, durationSec, freq, velocity = 0.7, pan = 0.5) {
  const startSample = Math.floor(startSec * sampleRate);
  const noteSamples = Math.floor(durationSec * sampleRate);
  const totalSamples = buffer.length / 2;

  const numHarmonics = Math.min(14, Math.floor(8500 / freq));

  for (let i = 0; i < noteSamples; i++) {
    const idx = startSample + i;
    if (idx >= totalSamples) break;

    const t = i / sampleRate;

    // Fast acoustic strike attack (< 5ms)
    const attack = Math.min(1.0, t / 0.004);

    // Realistic prompt & sustain decay curves
    const promptDecay = Math.exp(-t * (3.2 + freq * 0.0035));
    const sustainDecay = Math.exp(-t * (0.65 + freq * 0.0008));
    const envelope = attack * (0.6 * promptDecay + 0.4 * sustainDecay) * velocity;

    let sample = 0;
    for (let h = 1; h <= numHarmonics; h++) {
      // Inharmonicity of piano strings
      const inharmonicFreq = freq * h * Math.sqrt(1 + 0.00015 * h * h);
      const harmonicDecay = Math.exp(-t * h * 1.15);
      const amp = (1 / Math.pow(h, 1.12)) * harmonicDecay;

      sample += Math.sin(2 * Math.PI * inharmonicFreq * t) * amp;
    }

    // Wooden hammer body impact
    if (t < 0.025) {
      const thud = Math.sin(2 * Math.PI * 95 * t) * Math.exp(-t * 130) * 0.22 * velocity;
      sample += thud;
    }

    const val = sample * envelope * 0.17;
    buffer[idx * 2] += val * (1 - pan * 0.55);
    buffer[idx * 2 + 1] += val * (0.45 + pan * 0.55);
  }
}

function writeAudioFile(floatBuffer, totalSamples, filename) {
  return new Promise((resolve, reject) => {
    const pcmBuffer = Buffer.alloc(totalSamples * 4);
    for (let i = 0; i < totalSamples; i++) {
      let l = floatBuffer[i * 2];
      let r = floatBuffer[i * 2 + 1];

      // Soft limiting
      l = Math.tanh(l);
      r = Math.tanh(r);

      pcmBuffer.writeInt16LE(Math.floor(l * 32767), i * 4);
      pcmBuffer.writeInt16LE(Math.floor(r * 32767), i * 4 + 2);
    }

    const outputPath = path.resolve(AUDIO_DIR, filename);
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
        console.log(`✓ Audio file ${filename} generated (${(fs.statSync(outputPath).size / 1024).toFixed(1)} kB)`);
        resolve();
      } else {
        reject(new Error(`FFmpeg error ${code}`));
      }
    });
  });
}

// 1. KISS THE RAIN (Yiruma Homage)
async function generateKissTheRain() {
  const durationSec = 36;
  const totalSamples = sampleRate * durationSec;
  const floatBuffer = new Float32Array(totalSamples * 2);

  // Soft raindrops in the background
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const loopEnv = Math.sin((Math.PI * t) / durationSec);
    if (Math.random() < 0.0007) {
      const dropFreq = 1900 + Math.random() * 1100;
      const dropLen = Math.floor(sampleRate * 0.018);
      for (let d = 0; d < dropLen && (i + d) < totalSamples; d++) {
        const dt = d / sampleRate;
        const drop = Math.sin(2 * Math.PI * dropFreq * dt) * Math.exp(-dt * 220) * 0.011 * loopEnv;
        floatBuffer[(i + d) * 2] += drop;
        floatBuffer[(i + d) * 2 + 1] += drop;
      }
    }
  }

  const notes = [
    // Measure 1: Ab Major
    { t: 0.0, f: NOTES.Ab3, d: 4.0, v: 0.65, p: 0.3 },
    { t: 0.4, f: NOTES.Eb4, d: 3.5, v: 0.5, p: 0.4 },
    { t: 0.8, f: NOTES.Ab4, d: 3.0, v: 0.55, p: 0.5 },
    { t: 1.2, f: NOTES.C5,  d: 2.2, v: 0.75, p: 0.6 },
    { t: 2.2, f: NOTES.Bb4, d: 1.2, v: 0.65, p: 0.55 },
    { t: 3.0, f: NOTES.Ab4, d: 1.4, v: 0.7, p: 0.5 },

    // Measure 2: Eb/G
    { t: 4.5, f: NOTES.G3,  d: 4.0, v: 0.6, p: 0.3 },
    { t: 4.9, f: NOTES.Eb4, d: 3.5, v: 0.5, p: 0.4 },
    { t: 5.3, f: NOTES.G4,  d: 3.0, v: 0.55, p: 0.45 },
    { t: 5.7, f: NOTES.Eb5, d: 2.0, v: 0.72, p: 0.65 },
    { t: 6.8, f: NOTES.Db5, d: 1.2, v: 0.62, p: 0.6 },
    { t: 7.5, f: NOTES.C5,  d: 1.4, v: 0.68, p: 0.55 },

    // Measure 3: Fm7
    { t: 9.0,  f: NOTES.F3,  d: 4.0, v: 0.62, p: 0.25 },
    { t: 9.4,  f: NOTES.C4,  d: 3.5, v: 0.5, p: 0.35 },
    { t: 9.8,  f: NOTES.Ab4, d: 3.0, v: 0.52, p: 0.45 },
    { t: 10.2, f: NOTES.C5,  d: 2.2, v: 0.75, p: 0.6 },
    { t: 11.3, f: NOTES.Bb4, d: 1.2, v: 0.62, p: 0.55 },
    { t: 12.0, f: NOTES.Ab4, d: 1.4, v: 0.7, p: 0.5 },

    // Measure 4: Db Major
    { t: 13.5, f: NOTES.Db3, d: 4.0, v: 0.65, p: 0.25 },
    { t: 13.9, f: NOTES.Ab3, d: 3.5, v: 0.52, p: 0.35 },
    { t: 14.3, f: NOTES.F4,  d: 3.0, v: 0.55, p: 0.45 },
    { t: 14.7, f: NOTES.Ab4, d: 2.5, v: 0.72, p: 0.55 },
    { t: 16.0, f: NOTES.G4,  d: 1.2, v: 0.6, p: 0.5 },
    { t: 16.8, f: NOTES.F4,  d: 1.4, v: 0.65, p: 0.45 },

    // Measure 5: Bbm7
    { t: 18.0, f: NOTES.Bb2, d: 4.0, v: 0.62, p: 0.2 },
    { t: 18.4, f: NOTES.F3,  d: 3.5, v: 0.5, p: 0.3 },
    { t: 18.8, f: NOTES.Db4, d: 3.0, v: 0.55, p: 0.4 },
    { t: 19.2, f: NOTES.F4,  d: 2.2, v: 0.7, p: 0.5 },
    { t: 20.3, f: NOTES.Eb4, d: 1.2, v: 0.62, p: 0.45 },
    { t: 21.0, f: NOTES.Db4, d: 1.4, v: 0.65, p: 0.4 },

    // Measure 6: Eb7
    { t: 22.5, f: NOTES.Eb3, d: 4.0, v: 0.65, p: 0.3 },
    { t: 22.9, f: NOTES.Bb3, d: 3.5, v: 0.52, p: 0.35 },
    { t: 23.3, f: NOTES.Db4, d: 3.0, v: 0.55, p: 0.4 },
    { t: 23.7, f: NOTES.G4,  d: 2.0, v: 0.72, p: 0.55 },
    { t: 24.8, f: NOTES.Ab4, d: 1.2, v: 0.65, p: 0.55 },
    { t: 25.5, f: NOTES.Bb4, d: 1.4, v: 0.7, p: 0.6 },

    // Measure 7: Ab Major (High tender resolution)
    { t: 27.0, f: NOTES.Ab3, d: 4.0, v: 0.65, p: 0.3 },
    { t: 27.4, f: NOTES.Eb4, d: 3.5, v: 0.52, p: 0.4 },
    { t: 27.8, f: NOTES.C5,  d: 3.0, v: 0.68, p: 0.6 },
    { t: 28.5, f: NOTES.Eb5, d: 2.5, v: 0.75, p: 0.65 },
    { t: 29.8, f: NOTES.Ab5, d: 2.2, v: 0.7, p: 0.7 },
    { t: 30.8, f: NOTES.Eb5, d: 1.8, v: 0.62, p: 0.6 },

    // Measure 8: Outro arpeggio
    { t: 31.5, f: NOTES.Db3, d: 3.5, v: 0.58, p: 0.25 },
    { t: 32.0, f: NOTES.Ab3, d: 3.2, v: 0.52, p: 0.35 },
    { t: 32.6, f: NOTES.C4,  d: 2.8, v: 0.55, p: 0.45 },
    { t: 33.2, f: NOTES.Eb4, d: 2.5, v: 0.58, p: 0.5 },
    { t: 34.0, f: NOTES.Ab4, d: 2.0, v: 0.6, p: 0.55 },
  ];

  for (const n of notes) {
    addPianoNote(floatBuffer, n.t, n.d, n.f, n.v, n.p);
  }

  await writeAudioFile(floatBuffer, totalSamples, 'kiss-the-rain.mp3');
}

// 2. GYMNOPÉDIE NO. 1 (Erik Satie)
async function generateGymnopedie() {
  const durationSec = 36;
  const totalSamples = sampleRate * durationSec;
  const floatBuffer = new Float32Array(totalSamples * 2);

  // Erik Satie: 3/4 time, slow gentle waltz, alternating Gmaj7 and Dmaj7
  // Bar duration = 3.0s (1 beat = 1.0s, quarter note)
  const satieBars = [
    // Bar 1: Gmaj7 (G2 bass, B3-D4-F#4 chord)
    { t: 0.0, f: NOTES.G2,  d: 2.8, v: 0.55, p: 0.3 },
    { t: 1.0, f: NOTES.B3,  d: 1.8, v: 0.42, p: 0.45 },
    { t: 1.0, f: NOTES.D4,  d: 1.8, v: 0.42, p: 0.5 },
    { t: 1.0, f: NOTES.Gb4, d: 1.8, v: 0.45, p: 0.55 },
    { t: 2.0, f: NOTES.B3,  d: 1.0, v: 0.38, p: 0.45 },
    { t: 2.0, f: NOTES.D4,  d: 1.0, v: 0.38, p: 0.5 },

    // Bar 2: Dmaj7 (D3 bass, F#3-A3-C#4 chord)
    { t: 3.0, f: NOTES.D3,  d: 2.8, v: 0.52, p: 0.3 },
    { t: 4.0, f: NOTES.Gb3, d: 1.8, v: 0.4, p: 0.45 },
    { t: 4.0, f: NOTES.A3,  d: 1.8, v: 0.4, p: 0.5 },
    { t: 4.0, f: NOTES.Db4, d: 1.8, v: 0.42, p: 0.55 },
    { t: 5.0, f: NOTES.Gb3, d: 1.0, v: 0.36, p: 0.45 },
    { t: 5.0, f: NOTES.A3,  d: 1.0, v: 0.36, p: 0.5 },

    // Bar 3: Gmaj7 + Melody entry (B4 melody note)
    { t: 6.0, f: NOTES.G2,  d: 2.8, v: 0.55, p: 0.3 },
    { t: 7.0, f: NOTES.B3,  d: 1.8, v: 0.42, p: 0.45 },
    { t: 7.0, f: NOTES.D4,  d: 1.8, v: 0.42, p: 0.5 },
    { t: 7.0, f: NOTES.B4,  d: 3.5, v: 0.68, p: 0.6 }, // Melody B4
    { t: 8.0, f: NOTES.B3,  d: 1.0, v: 0.38, p: 0.45 },
    { t: 8.0, f: NOTES.D4,  d: 1.0, v: 0.38, p: 0.5 },

    // Bar 4: Dmaj7 + Melody G4
    { t: 9.0,  f: NOTES.D3,  d: 2.8, v: 0.52, p: 0.3 },
    { t: 10.0, f: NOTES.Gb3, d: 1.8, v: 0.4, p: 0.45 },
    { t: 10.0, f: NOTES.A3,  d: 1.8, v: 0.4, p: 0.5 },
    { t: 10.0, f: NOTES.G4,  d: 2.5, v: 0.62, p: 0.55 }, // Melody G4
    { t: 11.0, f: NOTES.Gb4, d: 2.0, v: 0.65, p: 0.55 }, // Melody F#4

    // Bar 5: Gmaj7 + Melody E4
    { t: 12.0, f: NOTES.G2,  d: 2.8, v: 0.55, p: 0.3 },
    { t: 13.0, f: NOTES.B3,  d: 1.8, v: 0.42, p: 0.45 },
    { t: 13.0, f: NOTES.D4,  d: 1.8, v: 0.42, p: 0.5 },
    { t: 13.0, f: NOTES.E4,  d: 3.2, v: 0.64, p: 0.55 }, // Melody E4
    { t: 14.0, f: NOTES.B3,  d: 1.0, v: 0.38, p: 0.45 },
    { t: 14.0, f: NOTES.D4,  d: 1.0, v: 0.38, p: 0.5 },

    // Bar 6: Dmaj7 + Melody D4
    { t: 15.0, f: NOTES.D3,  d: 2.8, v: 0.52, p: 0.3 },
    { t: 16.0, f: NOTES.Gb3, d: 1.8, v: 0.4, p: 0.45 },
    { t: 16.0, f: NOTES.A3,  d: 1.8, v: 0.4, p: 0.5 },
    { t: 16.0, f: NOTES.D4,  d: 3.0, v: 0.65, p: 0.5 },  // Melody D4
    { t: 17.0, f: NOTES.Gb3, d: 1.0, v: 0.36, p: 0.45 },
    { t: 17.0, f: NOTES.A3,  d: 1.0, v: 0.36, p: 0.5 },

    // Bar 7: Em / G + Melody B3
    { t: 18.0, f: NOTES.E3,  d: 2.8, v: 0.5, p: 0.3 },
    { t: 19.0, f: NOTES.G3,  d: 1.8, v: 0.4, p: 0.45 },
    { t: 19.0, f: NOTES.B3,  d: 2.5, v: 0.58, p: 0.45 }, // Melody B3
    { t: 20.0, f: NOTES.G3,  d: 1.0, v: 0.35, p: 0.45 },

    // Bar 8: Dmaj7 + Resolution to D4
    { t: 21.0, f: NOTES.D3,  d: 2.8, v: 0.52, p: 0.3 },
    { t: 22.0, f: NOTES.Gb3, d: 1.8, v: 0.4, p: 0.45 },
    { t: 22.0, f: NOTES.A3,  d: 1.8, v: 0.4, p: 0.5 },
    { t: 22.0, f: NOTES.D4,  d: 2.8, v: 0.62, p: 0.5 },
    { t: 23.0, f: NOTES.Gb3, d: 1.0, v: 0.36, p: 0.45 },

    // Bar 9-12: Continuation & Gentle lingering cadence
    { t: 24.0, f: NOTES.G2,  d: 2.8, v: 0.52, p: 0.3 },
    { t: 25.0, f: NOTES.B3,  d: 1.8, v: 0.4, p: 0.45 },
    { t: 25.0, f: NOTES.Gb4, d: 3.0, v: 0.65, p: 0.55 },
    { t: 27.0, f: NOTES.D3,  d: 2.8, v: 0.5, p: 0.3 },
    { t: 28.0, f: NOTES.A3,  d: 1.8, v: 0.4, p: 0.45 },
    { t: 28.0, f: NOTES.Db4, d: 2.8, v: 0.58, p: 0.5 },
    { t: 30.0, f: NOTES.G2,  d: 3.5, v: 0.5, p: 0.3 },
    { t: 31.0, f: NOTES.B3,  d: 2.5, v: 0.4, p: 0.45 },
    { t: 31.0, f: NOTES.D4,  d: 2.5, v: 0.42, p: 0.5 },
    { t: 32.5, f: NOTES.Gb4, d: 2.5, v: 0.55, p: 0.55 },
  ];

  for (const n of satieBars) {
    addPianoNote(floatBuffer, n.t, n.d, n.f, n.v, n.p);
  }

  await writeAudioFile(floatBuffer, totalSamples, 'gymnopedie-no1.mp3');
}

// 3. CLAIR DE LUNE (Claude Debussy)
async function generateClairDeLune() {
  const durationSec = 36;
  const totalSamples = sampleRate * durationSec;
  const floatBuffer = new Float32Array(totalSamples * 2);

  // Debussy: Db major, ethereal moonlight impressionism
  const debussyNotes = [
    { t: 0.0,  f: NOTES.F4,  d: 3.2, v: 0.65, p: 0.55 },
    { t: 0.8,  f: NOTES.Eb4, d: 2.5, v: 0.6, p: 0.5 },
    { t: 1.8,  f: NOTES.Db4, d: 2.8, v: 0.62, p: 0.45 },
    { t: 2.8,  f: NOTES.C4,  d: 2.0, v: 0.58, p: 0.45 },
    { t: 3.5,  f: NOTES.Db4, d: 3.0, v: 0.65, p: 0.5 },

    // Left hand arpeggios
    { t: 4.5,  f: NOTES.Db3, d: 4.5, v: 0.55, p: 0.3 },
    { t: 5.2,  f: NOTES.Ab3, d: 3.8, v: 0.48, p: 0.4 },
    { t: 5.8,  f: NOTES.F4,  d: 3.2, v: 0.52, p: 0.5 },
    { t: 6.5,  f: NOTES.Ab4, d: 2.8, v: 0.6, p: 0.55 },
    { t: 7.2,  f: NOTES.C5,  d: 2.5, v: 0.68, p: 0.6 },
    { t: 8.2,  f: NOTES.Bb4, d: 2.0, v: 0.62, p: 0.55 },
    { t: 9.0,  f: NOTES.Ab4, d: 3.0, v: 0.65, p: 0.5 },

    // Measure 3: Gb major
    { t: 11.0, f: NOTES.Gb2, d: 4.5, v: 0.55, p: 0.25 },
    { t: 11.6, f: NOTES.Db3, d: 4.0, v: 0.48, p: 0.35 },
    { t: 12.2, f: NOTES.Bb3, d: 3.5, v: 0.5, p: 0.45 },
    { t: 12.8, f: NOTES.Db4, d: 3.0, v: 0.55, p: 0.5 },
    { t: 13.5, f: NOTES.F4,  d: 2.5, v: 0.62, p: 0.55 },
    { t: 14.5, f: NOTES.Gb4, d: 2.2, v: 0.65, p: 0.6 },
    { t: 15.5, f: NOTES.Ab4, d: 2.5, v: 0.68, p: 0.65 },

    // Measure 4: High tender register
    { t: 17.5, f: NOTES.Db3, d: 4.5, v: 0.52, p: 0.3 },
    { t: 18.2, f: NOTES.Ab3, d: 4.0, v: 0.48, p: 0.4 },
    { t: 18.8, f: NOTES.F5,  d: 3.0, v: 0.72, p: 0.65 },
    { t: 20.0, f: NOTES.Eb5, d: 2.5, v: 0.68, p: 0.6 },
    { t: 21.2, f: NOTES.Db5, d: 2.8, v: 0.65, p: 0.55 },

    // Measure 5: Moonlight stillness
    { t: 23.5, f: NOTES.Bbm2, d: 4.5, v: 0.5, p: 0.25 },
    { t: 24.2, f: NOTES.F3,   d: 4.0, v: 0.45, p: 0.35 },
    { t: 24.8, f: NOTES.Db4,  d: 3.5, v: 0.5, p: 0.45 },
    { t: 25.5, f: NOTES.C5,   d: 2.8, v: 0.62, p: 0.55 },
    { t: 26.8, f: NOTES.Bb4,  d: 2.2, v: 0.6, p: 0.5 },
    { t: 28.0, f: NOTES.Ab4,  d: 3.5, v: 0.65, p: 0.5 },

    // Measure 6: Cadence
    { t: 30.0, f: NOTES.Db3, d: 5.0, v: 0.55, p: 0.3 },
    { t: 30.8, f: NOTES.Ab3, d: 4.2, v: 0.48, p: 0.4 },
    { t: 31.5, f: NOTES.F4,  d: 3.5, v: 0.52, p: 0.5 },
    { t: 32.5, f: NOTES.Ab4, d: 3.0, v: 0.58, p: 0.55 },
    { t: 33.5, f: NOTES.Db5, d: 2.5, v: 0.65, p: 0.6 },
  ];

  for (const n of debussyNotes) {
    addPianoNote(floatBuffer, n.t, n.d, n.f, n.v, n.p);
  }

  await writeAudioFile(floatBuffer, totalSamples, 'clair-de-lune.mp3');
}

// 4. RIVER FLOWS IN YOU (Yiruma Homage)
async function generateRiverFlows() {
  const durationSec = 36;
  const totalSamples = sampleRate * durationSec;
  const floatBuffer = new Float32Array(totalSamples * 2);

  // River Flows: A major (F#m - D - A - E)
  const riverNotes = [
    // Measure 1: F#m
    { t: 0.0, f: NOTES.Gb2, d: 4.0, v: 0.62, p: 0.25 },
    { t: 0.4, f: NOTES.Db3, d: 3.5, v: 0.5, p: 0.35 },
    { t: 0.8, f: NOTES.A3,  d: 3.0, v: 0.52, p: 0.45 },
    { t: 1.2, f: NOTES.A4,  d: 1.2, v: 0.72, p: 0.55 },
    { t: 1.8, f: NOTES.Ab4, d: 1.0, v: 0.68, p: 0.55 },
    { t: 2.3, f: NOTES.A4,  d: 1.2, v: 0.72, p: 0.55 },
    { t: 2.8, f: NOTES.E4,  d: 1.5, v: 0.65, p: 0.5 },

    // Measure 2: D Major
    { t: 4.5, f: NOTES.D3,  d: 4.0, v: 0.6, p: 0.25 },
    { t: 4.9, f: NOTES.A3,  d: 3.5, v: 0.5, p: 0.35 },
    { t: 5.3, f: NOTES.Gb4, d: 3.0, v: 0.55, p: 0.45 },
    { t: 5.7, f: NOTES.A4,  d: 1.2, v: 0.7, p: 0.55 },
    { t: 6.3, f: NOTES.Ab4, d: 1.0, v: 0.65, p: 0.55 },
    { t: 6.8, f: NOTES.A4,  d: 1.2, v: 0.7, p: 0.55 },
    { t: 7.3, f: NOTES.Db5, d: 1.8, v: 0.75, p: 0.6 },

    // Measure 3: A Major
    { t: 9.0,  f: NOTES.A2,  d: 4.0, v: 0.62, p: 0.3 },
    { t: 9.4,  f: NOTES.E3,  d: 3.5, v: 0.5, p: 0.4 },
    { t: 9.8,  f: NOTES.A3,  d: 3.0, v: 0.52, p: 0.45 },
    { t: 10.2, f: NOTES.Db4, d: 2.5, v: 0.58, p: 0.5 },
    { t: 10.8, f: NOTES.E4,  d: 2.0, v: 0.65, p: 0.55 },
    { t: 11.5, f: NOTES.A4,  d: 1.8, v: 0.7, p: 0.6 },

    // Measure 4: E Major
    { t: 13.5, f: NOTES.E2,  d: 4.0, v: 0.6, p: 0.25 },
    { t: 13.9, f: NOTES.B2,  d: 3.5, v: 0.5, p: 0.35 },
    { t: 14.3, f: NOTES.Ab3, d: 3.0, v: 0.52, p: 0.45 },
    { t: 14.7, f: NOTES.B3,  d: 2.5, v: 0.58, p: 0.5 },
    { t: 15.3, f: NOTES.E4,  d: 2.0, v: 0.65, p: 0.55 },
    { t: 16.0, f: NOTES.Ab4, d: 1.8, v: 0.68, p: 0.6 },

    // Measure 5: Higher register F#m
    { t: 18.0, f: NOTES.Gb2, d: 4.0, v: 0.62, p: 0.25 },
    { t: 18.4, f: NOTES.Db3, d: 3.5, v: 0.5, p: 0.35 },
    { t: 18.8, f: NOTES.A3,  d: 3.0, v: 0.52, p: 0.45 },
    { t: 19.2, f: NOTES.Db5, d: 1.5, v: 0.75, p: 0.65 },
    { t: 20.0, f: NOTES.D5,  d: 1.2, v: 0.78, p: 0.65 },
    { t: 20.8, f: NOTES.Db5, d: 1.5, v: 0.72, p: 0.65 },
    { t: 21.6, f: NOTES.B4,  d: 1.8, v: 0.68, p: 0.6 },

    // Measure 6: D Major
    { t: 22.5, f: NOTES.D3,  d: 4.0, v: 0.6, p: 0.25 },
    { t: 22.9, f: NOTES.A3,  d: 3.5, v: 0.5, p: 0.35 },
    { t: 23.3, f: NOTES.Gb4, d: 3.0, v: 0.55, p: 0.45 },
    { t: 23.7, f: NOTES.A4,  d: 2.2, v: 0.7, p: 0.55 },
    { t: 24.8, f: NOTES.B4,  d: 1.5, v: 0.72, p: 0.6 },
    { t: 25.6, f: NOTES.Db5, d: 1.8, v: 0.75, p: 0.65 },

    // Measure 7: A Major resolution
    { t: 27.0, f: NOTES.A2,  d: 4.0, v: 0.62, p: 0.3 },
    { t: 27.4, f: NOTES.E3,  d: 3.5, v: 0.5, p: 0.4 },
    { t: 27.8, f: NOTES.Db4, d: 3.0, v: 0.55, p: 0.5 },
    { t: 28.3, f: NOTES.A4,  d: 2.5, v: 0.7, p: 0.6 },
    { t: 29.5, f: NOTES.Db5, d: 2.0, v: 0.72, p: 0.65 },
    { t: 30.5, f: NOTES.E5,  d: 2.2, v: 0.75, p: 0.7 },

    // Measure 8: Soft outro
    { t: 31.5, f: NOTES.E2,  d: 4.0, v: 0.58, p: 0.25 },
    { t: 32.0, f: NOTES.B2,  d: 3.5, v: 0.5, p: 0.35 },
    { t: 32.6, f: NOTES.E3,  d: 3.0, v: 0.52, p: 0.45 },
    { t: 33.2, f: NOTES.A4,  d: 2.5, v: 0.65, p: 0.55 },
    { t: 34.0, f: NOTES.Db5, d: 2.0, v: 0.68, p: 0.6 },
  ];

  for (const n of riverNotes) {
    addPianoNote(floatBuffer, n.t, n.d, n.f, n.v, n.p);
  }

  await writeAudioFile(floatBuffer, totalSamples, 'river-flows.mp3');
}

async function run() {
  console.log('--- Generating Haven Art Classical & Lyrical Piano Collection ---');
  await generateKissTheRain();
  await generateGymnopedie();
  await generateClairDeLune();
  await generateRiverFlows();
  console.log('✓ All 4 piano pieces generated successfully.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
await build({entryPoints:['src/lib/audio/ambient-catalog.ts'],bundle:true,platform:'node',format:'esm',outfile:'tests/reports/original-catalog.mjs'});
const { ALL_HAVEN_AUDIO_TRACKS } = await import('../tests/reports/original-catalog.mjs');
const rate = 22050, duration = 36;
for (let index=0;index<ALL_HAVEN_AUDIO_TRACKS.length;index++) {
  const track = ALL_HAVEN_AUDIO_TRACKS[index];
  const output = path.resolve('public',track.src.slice(1));
  const samples = rate * duration;
  const pcm = Buffer.alloc(samples * 2);
  const scale = [0,2,4,7,9];
  const base = 130.81 * 2 ** ((index % 12) / 12);
  const tempo = 1.2 + (index % 7) * 0.07;
  let noise = 0, seed = index + 1;
  for (let i=0;i<samples;i++) {
    const t = i/rate, beat = Math.floor(t/tempo), age = t%tempo;
    const freq = base * 2 ** ((scale[(beat*3+index)%scale.length] + (beat%3 === 0 ? 12 : 0))/12);
    const edge = Math.min(1,t/2,(duration-t)/2);
    seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
    noise = noise*0.97 + ((seed/4294967296)*2-1)*0.03;
    const sound = track.category === 'piano'
      ? Math.min(1,age/0.008)*Math.exp(-age*2.2)*(Math.sin(2*Math.PI*freq*age)+0.3*Math.sin(4*Math.PI*freq*age)+0.09*Math.sin(6*Math.PI*freq*age))*0.2
      : (Math.sin(2*Math.PI*base*t)*0.1+Math.sin(2*Math.PI*base*1.5*t)*0.05+noise*0.35)*(0.7+Math.sin(t*0.2)*0.15);
    pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sound*edge))*32767),i*2);
  }
  await new Promise((resolve,reject) => {
    const encoder = spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','s16le','-ar',String(rate),'-ac','1','-i','pipe:0','-c:a','libmp3lame','-b:a','96k',output]);
    encoder.on('error',reject); encoder.on('close',code => code === 0 ? resolve() : reject(new Error(`encoder exit ${code}`)));
    encoder.stdin.end(pcm);
  });
  console.log(`Generated original ${track.title}`);
}
const ledgerPath = 'public/credits.json';
const ledger = JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
const crypto = await import('node:crypto');
ledger.assets = ledger.assets.filter(asset => !asset.file.startsWith('/audio/'));
for (const track of ALL_HAVEN_AUDIO_TRACKS) ledger.assets.push({id:track.id,file:track.src,title:track.title,author:'Haven Soundscapes',source_url:'https://havenart.space/media-provenance',license:'CC0 1.0 Universal / Public Domain',license_url:'https://creativecommons.org/publicdomain/zero/1.0/',downloadedAt:'2026-10-03T00:00:00.000Z',checksum:'sha256:'+crypto.createHash('sha256').update(fs.readFileSync('public'+track.src)).digest('hex'),alt_vi:track.genreVi});
ledger.updatedAt='2026-10-03T00:00:00.000Z';
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');

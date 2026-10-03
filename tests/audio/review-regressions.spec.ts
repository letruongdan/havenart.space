import {afterEach,it,expect,vi} from 'vitest';
import {AudioEngine} from '../../src/lib/audio/engine';
afterEach(()=>vi.unstubAllGlobals());
it('does not report playing after a rejected play operation',async()=>{
 vi.stubGlobal('Audio',class {play=vi.fn(async()=>{throw new Error('missing media');});pause=vi.fn();});
 const engine=new AudioEngine();await engine.unlockAudio();
 await expect(engine.play()).rejects.toThrow('Không thể phát');expect(engine.isPlaying()).toBe(false);engine.destroy();
});
it('keeps the current track when a crossfade target cannot play',async()=>{
 let attempts=0;
 vi.stubGlobal('Audio',class {play=vi.fn(async()=>{if(attempts++>0)throw new Error('missing media');});pause=vi.fn();});
 const engine=new AudioEngine();await engine.unlockAudio();await engine.play();const track=engine.getCurrentTrack();
 await expect(engine.nextTrack()).rejects.toThrow();expect(engine.getCurrentTrack()).toEqual(track);expect(engine.isPlaying()).toBe(true);engine.destroy();
});

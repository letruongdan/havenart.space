import {it,expect,vi} from 'vitest';
import {VisualController} from '../../src/lib/visuals/controller';
import {searchWikimediaArtworks} from '../../src/lib/visuals/wikimedia-api';
it('reports the actual fallback mode when shader initialization fails',async()=>{
 const mode=vi.fn();const controller=new VisualController({hasWebGL2:true,prefersReducedMotion:false,onModeChange:mode});
 await controller.init({getContext:()=>null,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as HTMLCanvasElement);
 controller.setMode('shader');expect(controller.getActiveMode()).toBe('static');expect(mode).toHaveBeenLastCalledWith('static');controller.destroy();
});
it('rejects unknown Wikimedia licenses rather than calling them public domain',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({query:{pages:{one:{title:'File:Landscape.jpg',imageinfo:[{url:'https://example.test/image.jpg',width:1200,height:800,extmetadata:{}}]}}}})));
 expect(await searchWikimediaArtworks()).toEqual([]);vi.unstubAllGlobals();
});

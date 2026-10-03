import { getDatabase } from './db';
import type { HavenArtwork } from '../visuals/pexels';
export const providers = ['pexels','pixabay','unsplash'] as const;
export type PhotoProvider = typeof providers[number];
export function photoKeys(): Record<PhotoProvider,string> {
  const row = getDatabase().prepare('SELECT * FROM settings WHERE id = ?').get('system') as any;
  return {pexels:row?.pexels_api_key || process.env.PEXELS_API_KEY || '',pixabay:row?.pixabay_api_key || process.env.PIXABAY_API_KEY || '',unsplash:row?.unsplash_api_key || process.env.UNSPLASH_API_KEY || ''};
}
export function savePhotoKey(provider:PhotoProvider,key:string): void {
  const db = getDatabase();
  db.prepare("INSERT OR IGNORE INTO settings (id,site_name,allow_registration,updated_at) VALUES ('system','Haven Art',1,?)").run(Date.now());
  const columns = {pexels:'pexels_api_key',pixabay:'pixabay_api_key',unsplash:'unsplash_api_key'};
  db.prepare(`UPDATE settings SET ${columns[provider]} = ?, updated_at = ? WHERE id = 'system'`).run(key,Date.now());
  photoCache.clear();
}
const photoCache = new Map<string,{at:number;photos:HavenArtwork[]}>();
export async function providerPhotos(provider:PhotoProvider,key:string,query='peaceful landscape'): Promise<HavenArtwork[]> {
  const url = provider === 'pexels' ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`
    : provider === 'unsplash' ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`
    : `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}&per_page=12&orientation=horizontal&image_type=photo&safesearch=true`;
  const response = await fetch(url,{signal:AbortSignal.timeout(8000),headers:provider === 'pexels' ? {Authorization:key} : provider === 'unsplash' ? {Authorization:`Client-ID ${key}`} : {}});
  if (!response.ok) throw new Error('Không thể xác thực provider.');
  const data = await response.json();
  const list = data.photos || data.results || data.hits || [];
  return list.map((p:any):HavenArtwork => ({id:`${provider}-${p.id}`,title:p.alt || p.alt_description || p.tags || 'Landscape',artist:p.photographer || p.user?.name || p.user || provider,src:p.src?.large2x || p.urls?.regular || p.largeImageURL,sourceUrl:p.url || p.links?.html || p.pageURL,license:`${provider} License`,weather:['clear'],moods:['calm'],timeOfDay:['day'],provider})).filter((p:HavenArtwork) => p.src?.startsWith('https://') && p.sourceUrl?.startsWith('https://'));
}
export async function configuredPhotos(): Promise<HavenArtwork[]> {
  const cached = photoCache.get('landscape');
  if (cached && Date.now() - cached.at < 300000) return cached.photos;
  // Share the request while concurrent visitors load the same catalog.
  if (inFlight) return inFlight;
  const keys = photoKeys();
  inFlight = Promise.allSettled(providers.filter(p => keys[p]).map(p => providerPhotos(p,keys[p])))
    .then(rows => rows.flatMap(r => r.status === 'fulfilled' ? r.value : []))
    .then(photos => { photoCache.set('landscape',{at:Date.now(),photos}); return photos; })
    .finally(() => { inFlight = null; });
  return inFlight;
}
let inFlight: Promise<HavenArtwork[]> | null = null;

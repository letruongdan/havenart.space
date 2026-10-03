import type { APIRoute } from 'astro';
import { verifyAdminRequest } from '../../../lib/server/admin-auth';
import { providers, photoKeys, savePhotoKey, providerPhotos, type PhotoProvider } from '../../../lib/server/photos';
export const prerender = false;
export const GET: APIRoute = async ({request}) => {
  if (!verifyAdminRequest(request)) return Response.json({success:false},{status:401});
  const keys = photoKeys();
  return Response.json({configured:Object.fromEntries(providers.map(p => [p,!!keys[p]]))});
};
export const POST: APIRoute = async ({request}) => {
  if (!verifyAdminRequest(request)) return Response.json({success:false},{status:401});
  try {
    const {provider,key,test} = await request.json();
    if (!providers.includes(provider) || typeof key !== 'string' || key.length > 256) return Response.json({success:false,error:'Cấu hình không hợp lệ.'},{status:400});
    if (test) {
      const photos = await providerPhotos(provider as PhotoProvider,key);
      return Response.json({success:true,valid:true,message:'Kết nối thành công.',photographer:photos[0]?.artist,samplePhotographer:photos[0]?.artist,totalResults:photos.length});
    }
    savePhotoKey(provider,key.trim());
    return Response.json({success:true});
  } catch { return Response.json({success:false,valid:false,error:'Không thể lưu hoặc kiểm tra cấu hình.'},{status:400}); }
};

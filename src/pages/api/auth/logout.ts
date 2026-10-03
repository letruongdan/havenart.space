import type { APIRoute } from 'astro';
import { revokeToken } from '../../../lib/server/db';
import { requestToken } from '../../../lib/server/request-auth';
export const prerender = false;
export const POST: APIRoute = async ({request}) => {
  revokeToken(requestToken(request));
  return Response.json({success:true});
};

import type { APIRoute } from 'astro';
import { configuredPhotos } from '../../lib/server/photos';
export const prerender = false;
export const GET: APIRoute = async () => Response.json({photos:await configuredPhotos()});

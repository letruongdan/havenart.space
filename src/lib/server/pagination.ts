export function pagination(request:Request) {
  const search = new URL(request.url).searchParams;
  const rawLimit = Number(search.get('limit') || 100),rawOffset = Number(search.get('offset') || 0);
  return {limit:Number.isFinite(rawLimit) ? Math.max(1,Math.min(100,Math.floor(rawLimit))) : 100,offset:Number.isFinite(rawOffset) ? Math.max(0,Math.floor(rawOffset)) : 0};
}

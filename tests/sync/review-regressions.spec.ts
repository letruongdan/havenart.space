import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import { JournalRepository } from '../../src/lib/db/repository';
import { setStoredUserSession } from '../../src/lib/auth/user-client';
import { syncAllWithServer,getLastSyncedAt } from '../../src/lib/sync/cloud-sync';
const a={user:{id:'review-sync-a',email:'a@test.local',name:'A',createdAt:0},token:'a'.repeat(64)};
const b={user:{id:'review-sync-b',email:'b@test.local',name:'B',createdAt:0},token:'b'.repeat(64)};
let repos: JournalRepository[]=[];
beforeEach(()=>{localStorage.clear();repos=[];});
afterEach(async()=>{for(const repo of repos){await repo.close();await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase(repo.dbName);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);});}vi.unstubAllGlobals();});
it('separates owners and rejects syncing a previous account or guest database',async()=>{
 setStoredUserSession(a);const first=new JournalRepository();repos.push(first);await first.createEntry({body:'A private offline note'});
 setStoredUserSession(b);const second=new JournalRepository();repos.push(second);expect(await second.listEntries(true)).toEqual([]);
 const mock=vi.fn();vi.stubGlobal('fetch',mock);
 expect((await syncAllWithServer(first)).success).toBe(false);expect(mock).not.toHaveBeenCalled();
});
it('pushes deletion tombstones and preserves server timestamps without resurrecting deleted notes',async()=>{
 setStoredUserSession(a);const repo=new JournalRepository();repos.push(repo);
 const note=await repo.createEntry({body:'a note'});await repo.softDeleteEntry(note.id);const tombstone=(await repo.getEntry(note.id))!;
 const serverNote={...tombstone,body:'newer remote',updatedAt:tombstone.updatedAt+10};
 const mock=vi.fn(async (url:string,options?:RequestInit)=>{
  if(url.endsWith('/push')){expect(JSON.parse(options!.body as string).entries[0].deletedAt).not.toBeNull();return Response.json({success:true,syncedCount:1,totalCount:0});}
  return Response.json({success:true,entries:[serverNote]});
 });vi.stubGlobal('fetch',mock);
 expect((await syncAllWithServer(repo)).success).toBe(true);
 expect((await repo.getEntry(note.id))!.updatedAt).toBe(serverNote.updatedAt);expect(await repo.listActiveEntries()).toEqual([]);
 expect(await repo.purgeExpiredDeletes(0)).toBe(0);
});
it('does not report full synchronization when pull fails',async()=>{
 setStoredUserSession(a);const repo=new JournalRepository();repos.push(repo);
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('/push')?Response.json({success:true,syncedCount:0,totalCount:0}):Response.json({success:false,error:'pull failed'},{status:500})));
 const result=await syncAllWithServer(repo);expect(result.success).toBe(false);expect(result.error).toBe('pull failed');expect(getLastSyncedAt()).toBeNull();
});
it('pins credentials through a sync and aborts if the active account changes',async()=>{
 setStoredUserSession(a);const repo=new JournalRepository();repos.push(repo);
 const mock=vi.fn(async()=>{setStoredUserSession(b);return Response.json({success:true,syncedCount:0,totalCount:0});});vi.stubGlobal('fetch',mock);
 expect((await syncAllWithServer(repo)).success).toBe(false);expect(mock).toHaveBeenCalledTimes(1);expect(getLastSyncedAt()).toBeNull();
});

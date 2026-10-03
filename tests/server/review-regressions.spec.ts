import { beforeEach,afterEach,describe,it,expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { closeDatabase,getDatabase,findUserByToken,authenticateUser,createServerUser,revokeToken,resetUserPassword,upsertServerEntries,getUserServerEntries,exportServerDatabase,importServerDatabase,addServerFeedback,recordServerSession,readServerDatabase,changeServerPassword,hashPassword } from '../../src/lib/server/db';
import { verifyAdminRequest } from '../../src/lib/server/admin-auth';
import { POST as feedback } from '../../src/pages/api/feedback';
let directory:string;
const oldPaths = {sql:process.env.HAVEN_SQLITE_PATH,json:process.env.HAVEN_SERVER_DB_PATH};
beforeEach(() => {
  closeDatabase();
  fs.mkdirSync('tests/reports',{recursive:true});
  directory = fs.mkdtempSync(path.resolve('tests/reports/security-'));
  process.env.HAVEN_SQLITE_PATH = path.join(directory,'source.db');
  process.env.HAVEN_SERVER_DB_PATH = path.join(directory,'source.json');
});
afterEach(() => { closeDatabase(); process.env.HAVEN_SQLITE_PATH=oldPaths.sql;process.env.HAVEN_SERVER_DB_PATH=oldPaths.json;fs.rmSync(directory,{recursive:true,force:true}); });
describe('Review security and restore regressions', () => {
  it('creates no public default admin without explicit bootstrap configuration', () => {
    const configured=process.env.HAVEN_ADMIN_PASSWORD;
    delete process.env.HAVEN_ADMIN_PASSWORD;
    try { expect(readServerDatabase().users).toEqual([]); }
    finally { process.env.HAVEN_ADMIN_PASSWORD=configured; }
  });
  it('retires an existing known-default root password while preserving journal rows', () => {
    const db=getDatabase();
    const root=db.prepare("SELECT id,salt FROM users WHERE role='admin'").get() as {id:string;salt:string};
    upsertServerEntries(root.id,[{id:'preserved',body:'existing journal data',createdAt:1,updatedAt:1}]);
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword('havenart@2026',root.salt),root.id);
    closeDatabase();
    const configured=process.env.HAVEN_ADMIN_PASSWORD;
    delete process.env.HAVEN_ADMIN_PASSWORD;
    try {
      expect(getDatabase().prepare('SELECT status FROM users WHERE id=?').get(root.id)).toEqual({status:'suspended'});
      expect(getUserServerEntries(root.id)[0].body).toBe('existing journal data');
    } finally { process.env.HAVEN_ADMIN_PASSWORD=configured; }
  });
  it('rejects wildcard, truncated, malformed and expired sessions', () => {
    getDatabase();
    for (const token of ['%','_','abc','a'.repeat(64)]) {
      expect(findUserByToken(token)).toBeUndefined();
      expect(verifyAdminRequest(new Request('http://local/api/admin/stats',{headers:{Authorization:`Bearer ${token}`}}))).toBeNull();
    }
    const session = authenticateUser('admin',process.env.HAVEN_ADMIN_PASSWORD!)!;
    expect(findUserByToken(session.token)?.role).toBe('admin');
    getDatabase().prepare('UPDATE auth_sessions SET expires_at=0').run();
    expect(findUserByToken(session.token)).toBeUndefined();
  });
  it('revokes logout and password-reset sessions and changes the server password', () => {
    const auth = createServerUser({email:'secure@example.test',name:'User',password:'old-test-password'});
    revokeToken(auth.token);
    expect(findUserByToken(auth.token)).toBeUndefined();
    const next=authenticateUser(auth.user.email,'old-test-password')!;
    expect(changeServerPassword(auth.user.id,'wrong','new-test-password')).toBe(false);
    expect(changeServerPassword(auth.user.id,'old-test-password','new-test-password')).toBe(true);
    expect(findUserByToken(next.token)).toBeUndefined();
    expect(authenticateUser(auth.user.email,'old-test-password')).toBeNull();
    const final=authenticateUser(auth.user.email,'new-test-password')!;
    resetUserPassword(auth.user.id,'another-test-password');
    expect(findUserByToken(final.token)).toBeUndefined();
  });
  it('rate limits repeated server login failures', () => {
    for(let i=0;i<10;i++) expect(authenticateUser('unknown@example.test','bad')).toBeNull();
    expect(() => authenticateUser('unknown@example.test','bad')).toThrow('15 phút');
  });
  it('preserves separate owners and sync tombstones', () => {
    const a=createServerUser({email:'a@example.test',name:'A',password:'some-password'}).user;
    const b=createServerUser({email:'b@example.test',name:'B',password:'some-password'}).user;
    const entry={id:'shared',body:'private',createdAt:1000,updatedAt:1000,deletedAt:null};
    upsertServerEntries(a.id,[entry]);upsertServerEntries(b.id,[{...entry,body:'B'}]);
    upsertServerEntries(a.id,[{...entry,deletedAt:2000,updatedAt:2000}]);
    upsertServerEntries(a.id,[entry]);
    expect(getUserServerEntries(a.id)).toEqual([]);
    expect(getUserServerEntries(a.id,true)[0].deletedAt).toBe(2000);
    expect(getUserServerEntries(b.id)[0].body).toBe('B');
  });
  it('restores all exported tables into an empty database and rejects invalid data atomically', () => {
    const user=createServerUser({email:'restore@example.test',name:'Restore',password:'restore-password'}).user;
    addServerFeedback({userId:user.id,userName:user.name,rating:5,comment:'A feedback'});
    recordServerSession({sessionId:'one',userId:user.id,durationSeconds:12});
    const payload=exportServerDatabase();
    closeDatabase();process.env.HAVEN_SQLITE_PATH=path.join(directory,'restored.db');process.env.HAVEN_SERVER_DB_PATH=path.join(directory,'restored.json');
    const result=importServerDatabase(payload);
    expect(result.feedbacksImported).toBe(1);
    const restored=readServerDatabase();
    expect(restored.feedbacks).toEqual(payload.feedbacks);
    expect(restored.sessions).toEqual(payload.sessions);
    expect(restored.settings).toEqual(payload.settings);
    const before=JSON.stringify(restored);
    expect(() => importServerDatabase({...payload,entries:[{id:'invalid'}]})).toThrow();
    expect(JSON.stringify(readServerDatabase())).toBe(before);
  });
  it('accepts guest feedback without trusting a client-supplied user identity', async () => {
    const response=await feedback({request:new Request('http://local/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating:5,comment:'hello',userName:null,userId:'forged'})}),clientAddress:'127.0.0.1'} as any);
    expect(response.status).toBe(201);
    const data=await response.json();expect(data.feedback.userId).toBeNull();expect(data.feedback.userName).toBe('Người bạn Haven Art');
  });
});

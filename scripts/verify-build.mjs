import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
const port = await new Promise(resolve => { const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const address=server.address();server.close(()=>resolve(address.port));}); });
fs.mkdirSync('tests/reports',{recursive:true});
const directory=fs.mkdtempSync(path.resolve('tests/reports/build-'));
const child=spawn(process.execPath,['dist/server/entry.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),HAVEN_SQLITE_PATH:path.join(directory,'test.db'),HAVEN_SERVER_DB_PATH:path.join(directory,'test.json'),HAVEN_ADMIN_PASSWORD:'build-smoke-only-password'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);
const base=`http://127.0.0.1:${port}`;
try {
  for(let i=0;i<100;i++) { try { if ((await fetch(base)).ok) break; } catch {} if(child.exitCode!==null) throw new Error(output);await new Promise(resolve=>setTimeout(resolve,100)); }
  const vi=await (await fetch(base)).text();
  const en=await (await fetch(base+'/?lang=en')).text();
  assert.match(vi,/<html lang="vi"/);assert.match(en,/<html lang="en"/);
  assert.match(en,/A tranquil sanctuary/);assert.notEqual(vi,en);
  fs.writeFileSync('tests/reports/build-root.html',vi);fs.writeFileSync('tests/reports/build-english.html',en);
  for(const token of ['%','_','invalid']) assert.equal((await fetch(base+'/api/admin/stats',{headers:{Authorization:`Bearer ${token}`}})).status,401);
  const auth=await (await fetch(base+'/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'build-smoke-only-password'})})).json();
  assert.equal(auth.success,true);
  assert.equal((await fetch(base+'/api/admin/stats',{headers:{Authorization:`Bearer ${auth.token}`}})).status,200);
  const logout=await fetch(base+'/api/admin/auth',{method:'DELETE',headers:{Authorization:`Bearer ${auth.token}`,Origin:base}});
  assert.equal(logout.status,200,await logout.text());
  assert.equal((await fetch(base+'/api/admin/stats',{headers:{Authorization:`Bearer ${auth.token}`}})).status,401);
  const feedback=await fetch(base+'/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating:5,comment:'synthetic smoke feedback',userName:null})});
  assert.equal(feedback.status,201);
  const sw=await (await fetch(base+'/sw.js')).text();
  for (const file of fs.readdirSync('dist/client/_astro').filter(name=>name.startsWith('HavenShell') || name.endsWith('.css'))) assert.ok(sw.includes('/_astro/'+file));
  assert.ok(!sw.includes('/audio/original-piano-01.mp3'));
  console.log('Production HTTP smoke checks passed: language routes, auth rejection/revocation, guest feedback, release precache.');
} finally {
  child.kill();
  await new Promise(resolve=>child.exitCode !== null ? resolve() : child.once('exit',resolve));
  fs.rmSync(directory,{recursive:true,force:true});
}

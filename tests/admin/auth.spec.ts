import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {verifyAdminLogin,changeAdminPassword,logoutAdmin,getAdminToken,isAdminAuthenticated} from '../../src/lib/admin/auth';
beforeEach(()=>{localStorage.clear();sessionStorage.clear();});
afterEach(()=>vi.unstubAllGlobals());
it('requires a successful server login, never local credentials',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
  expect((await verifyAdminLogin('admin','anything')).success).toBe(false);
  expect(isAdminAuthenticated()).toBe(false);
});
it('passes login and password changes to the server and clears cached sessions',async()=>{
  const token='a'.repeat(64);
  const fetchMock=vi.fn().mockImplementation(async()=>Response.json({success:true,token}));
  vi.stubGlobal('fetch',fetchMock);
  expect((await verifyAdminLogin('admin','server-password')).success).toBe(true);
  expect(getAdminToken()).toBe(token);
  expect(localStorage.getItem('haven_admin_token')).toBeNull();
  expect((await changeAdminPassword('server-password','new-server-password')).success).toBe(true);
  expect(fetchMock).toHaveBeenCalledWith('/api/admin/auth',expect.objectContaining({method:'PATCH',body:JSON.stringify({currentPassword:'server-password',newPassword:'new-server-password'})}));
  expect(getAdminToken()).toBe('');
});
it('sends the token to revoke before clearing it',()=>{
 const mock=vi.fn().mockResolvedValue(Response.json({success:true}));vi.stubGlobal('fetch',mock);
 sessionStorage.setItem('haven_admin_token','a'.repeat(64));sessionStorage.setItem('haven_admin_expires_at',String(Date.now()+10000));
 logoutAdmin();expect(mock).toHaveBeenCalledWith('/api/admin/auth',expect.objectContaining({method:'DELETE',headers:{Authorization:'Bearer '+'a'.repeat(64)}}));
 expect(isAdminAuthenticated()).toBe(false);
});

const TOKEN_KEY = 'haven_admin_token';
const EXPIRY_KEY = 'haven_admin_expires_at';
export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const expiry = Number(sessionStorage.getItem(EXPIRY_KEY));
    const token = sessionStorage.getItem(TOKEN_KEY) || '';
    return expiry > Date.now() && /^[a-f0-9]{64}$/.test(token) ? token : '';
  } catch { return ''; }
}
export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + 86400000));
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('haven_admin_cred_v1');
}
export function isAdminAuthenticated(): boolean { return !!getAdminToken(); }
export async function verifyAdminLogin(username: string, password: string): Promise<{success:boolean;error?:string}> {
  try {
    const response = await fetch('/api/admin/auth', { method: 'POST', credentials: 'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username,password}) });
    const data = await response.json();
    if (!response.ok || !data.success) return {success:false,error:data.error || 'Đăng nhập không thành công.'};
    setAdminToken(data.token);
    return {success:true};
  } catch { return {success:false,error:'Không thể kết nối máy chủ. Vui lòng thử lại.'}; }
}
export function logoutAdmin(): void {
  const token = getAdminToken();
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(TOKEN_KEY);
  void fetch('/api/admin/auth', {method:'DELETE',credentials:'same-origin',headers: token ? {Authorization:`Bearer ${token}`} : {}}).catch(() => {});
}
export async function changeAdminPassword(currentPassword:string,newPassword:string): Promise<{success:boolean;error?:string}> {
  try {
    const response = await fetch('/api/admin/auth', {method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getAdminToken()}`},body:JSON.stringify({currentPassword,newPassword})});
    const data = await response.json();
    if (response.ok && data.success) logoutAdmin();
    return {success:response.ok && data.success,error:data.error};
  } catch { return {success:false,error:'Không thể kết nối máy chủ.'}; }
}

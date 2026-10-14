export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Refresh tokens belong only in server-side environment variables.
// No Google credential may be prefixed with VITE_ or sent to the browser.
export function googleAccessTokenProvider({clientId,clientSecret,refreshToken,fetchImpl=fetch}) {
  if(!clientId || !clientSecret || !refreshToken) throw new Error('Autorização Google do aplicativo não configurada.');
  let cached;let expires=0;let pending;
  return async () => {
    if(cached && Date.now()<expires-60000) return cached;
    if(pending) return pending;
    pending=(async()=>{
      const response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:'refresh_token'}),signal:AbortSignal.timeout(30000)});
      if(!response.ok) throw new Error('A autorização Google precisa ser refeita pelo responsável.');
      const data=await response.json();
      if(!data.access_token || !Number.isFinite(data.expires_in) || data.expires_in<=0) throw new Error('O Google retornou uma autorização inválida.');
      cached=data.access_token;expires=Date.now()+data.expires_in*1000;return cached;
    })().finally(()=>{pending=null;});
    return pending;
  };
}

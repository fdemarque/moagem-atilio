import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
const cookieName='moagem_session';
const digest=value=>createHash('sha256').update(value).digest();
export const equalSecret=(a,b)=>typeof a==='string' && typeof b==='string' && timingSafeEqual(digest(a),digest(b));
export function json(value,status=200,headers={}) {return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});}
export function sameOrigin(request) {
  const origin=request.headers.get('origin');
  return !origin || origin===new URL(request.url).origin;
}
export function authorized(request) {
  const secret=process.env.SESSION_SECRET;
  if(!secret || secret.length<32) return false;
  const cookies=request.headers.get('cookie') || '';
  const token=cookies.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
  if(!token) return false;
  const [expiry,signature]=token.split('.');
  return Number(expiry)>Date.now() && equalSecret(signature,createHmac('sha256',secret).update(expiry).digest('base64url'));
}
export function sessionCookie(request) {
  const expiry=String(Date.now()+365*86400000);
  const signature=createHmac('sha256',process.env.SESSION_SECRET).update(expiry).digest('base64url');
  return `${cookieName}=${expiry}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
export function safeFailure(error) {
  console.error('Falha na cópia do estoque:',error.name);
  return json({error:'Não foi possível enviar a cópia. Seus dados continuam salvos neste aparelho.'},503);
}

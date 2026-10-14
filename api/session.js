import { authorized, equalSecret, json, sameOrigin, sessionCookie } from '../server/http.js';
async function handler(request) {
  if(request.method==='GET') return json({authorized:authorized(request),configured:Boolean(process.env.MOAGEM_PASSWORD && process.env.SESSION_SECRET)});
  if(request.method!=='POST') return json({error:'Método inválido.'},405);
  if(!sameOrigin(request)) return json({error:'Origem inválida.'},403);
  if(!process.env.MOAGEM_PASSWORD || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length<32) return json({error:'A conexão ainda está sendo preparada pelo responsável.'},503);
  try {
    const body=await request.json();
    if(!equalSecret(body.password,process.env.MOAGEM_PASSWORD)) return json({error:'Código de acesso incorreto.'},401);
    return json({authorized:true},200,{'Set-Cookie':sessionCookie(request)});
  } catch {return json({error:'Solicitação inválida.'},400);}
}
export default {fetch:handler};

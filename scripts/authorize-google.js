import fs from 'node:fs/promises';
import http from 'node:http';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {GOOGLE_SCOPE} from '../server/google-auth.js';

const credentialPath=process.argv[2];
const expectedAccount=process.argv[3];
if(!credentialPath || !expectedAccount) throw new Error('Uso: node scripts/authorize-google.js caminho-do-cliente.json email-da-conta-do-moinho');
const raw=JSON.parse(await fs.readFile(credentialPath,'utf8'));
const client=raw.web;
const redirect='http://127.0.0.1:4175/oauth/google/callback';
if(!client?.client_id || !client.client_secret || !client.redirect_uris?.includes(redirect)) throw new Error('Configure o cliente OAuth web com o retorno http://127.0.0.1:4175/oauth/google/callback.');
const state=randomBytes(32).toString('base64url');
const verifier=randomBytes(48).toString('base64url');
const params=new URLSearchParams({client_id:client.client_id,redirect_uri:redirect,response_type:'code',scope:GOOGLE_SCOPE,access_type:'offline',prompt:'consent',login_hint:expectedAccount,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
let exchanging=false;
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,redirect);
  if(req.method!=='GET' || url.pathname!=='/oauth/google/callback'){res.writeHead(404);res.end();return;}
  const received=url.searchParams.get('state') || '';
  if(Buffer.byteLength(received)!==Buffer.byteLength(state) || !timingSafeEqual(Buffer.from(received),Buffer.from(state))){res.writeHead(400);res.end('Solicitação inválida.');return;}
  if(exchanging){res.writeHead(409);res.end('Autorização já está sendo processada.');return;}
  if(url.searchParams.has('error')){res.writeHead(400);res.end('Autorização cancelada. Nenhum dado foi enviado.');return;}
  exchanging=true;
  try {
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:client.client_id,client_secret:client.client_secret,code:url.searchParams.get('code') || '',code_verifier:verifier,redirect_uri:redirect,grant_type:'authorization_code'}),signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw new Error('Não foi possível concluir a autorização Google.');
    const token=await response.json();
    if(!token.refresh_token || !token.access_token || !token.scope?.split(' ').includes(GOOGLE_SCOPE)) throw new Error('Autorização sem a permissão necessária ou sem renovação automática.');
    const profileResponse=await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',{headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(30000)});
    if(!profileResponse.ok) throw new Error('Não foi possível conferir a conta Google.');
    const profile=await profileResponse.json();
    if(profile.user?.emailAddress?.toLowerCase()!==expectedAccount.toLowerCase()) throw new Error('Foi selecionada outra conta Google. Credenciais não foram salvas.');
    let env='';try {env=await fs.readFile('.env.local','utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
    const values={GOOGLE_CLIENT_ID:client.client_id,GOOGLE_CLIENT_SECRET:client.client_secret,GOOGLE_REFRESH_TOKEN:token.refresh_token,GOOGLE_BACKUP_ACCOUNT:expectedAccount};
    for(const [key,value] of Object.entries(values)){
      const line=`${key}=${JSON.stringify(value)}`;
      const pattern=new RegExp(`^${key}=.*$`,'m');
      env=pattern.test(env)?env.replace(pattern,line):`${env.trimEnd()}\n${line}\n`;
    }
    await fs.writeFile('.env.local',env.trimStart(),{mode:0o600});
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('Conta do moinho autorizada. Volte ao Codex.');
    console.log('Conta do moinho conferida. Credenciais salvas somente em .env.local; nenhum token foi exibido.');
    clearTimeout(timeout);server.close();
  } catch(error) {res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});res.end(error.message);console.error(error.message);exchanging=false;}
});
const timeout=setTimeout(()=>{console.error('Autorização expirou. Execute novamente quando estiver pronto.');server.close();},15*60*1000);
server.listen(4175,'127.0.0.1',()=>console.log(`Autorize com a conta do moinho:\nhttps://accounts.google.com/o/oauth2/v2/auth?${params}`));

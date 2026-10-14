import test from 'node:test';
import assert from 'node:assert/strict';
import session from '../api/session.js';
import sync from '../api/sync.js';
import maintenance from '../api/maintenance.js';
test('endpoints privados rejeitam acesso sem sessão e origem externa',async()=>{
  process.env.SESSION_SECRET='test-only-secret-'.repeat(4);process.env.MOAGEM_PASSWORD='test-only-password';process.env.CRON_SECRET='test-only-cron';
  assert.equal((await sync(new Request('https://moinho.test/api/sync',{method:'POST'}))).status,401);
  assert.equal((await maintenance(new Request('https://moinho.test/api/maintenance'))).status,401);
  const bad=await session(new Request('https://moinho.test/api/session',{method:'POST',headers:{origin:'https://evil.test'},body:JSON.stringify({password:process.env.MOAGEM_PASSWORD})}));assert.equal(bad.status,403);
  const wrong=await session(new Request('https://moinho.test/api/session',{method:'POST',body:JSON.stringify({password:'wrong'})}));assert.equal(wrong.status,401);
  const response=await session(new Request('https://moinho.test/api/session',{method:'POST',body:JSON.stringify({password:process.env.MOAGEM_PASSWORD})}));assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);
  const info=await session(new Request('https://moinho.test/api/session',{headers:{cookie}}));assert.equal((await info.json()).authorized,true);
  const forged=await session(new Request('https://moinho.test/api/session',{headers:{cookie:cookie.replace(/moagem_session=[^;]+/,'moagem_session=9999999999999.forged')}}));assert.equal((await forged.json()).authorized,false);
});

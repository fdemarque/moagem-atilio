import test from 'node:test';
import assert from 'node:assert/strict';
import {googleAccessTokenProvider} from '../server/google-auth.js';
test('renovação Google usa credenciais de servidor e deduplica chamadas concorrentes',async()=>{
 let requests=0;
 const get=googleAccessTokenProvider({clientId:'test-id',clientSecret:'test-secret',refreshToken:'test-refresh',fetchImpl:async(url,options)=>{
  requests++;assert.equal(url,'https://oauth2.googleapis.com/token');assert.equal(options.body.get('grant_type'),'refresh_token');return new Response(JSON.stringify({access_token:'test-access',expires_in:3600}),{status:200});
 }});
 assert.deepEqual(await Promise.all([get(),get(),get()]),['test-access','test-access','test-access']);assert.equal(requests,1);assert.equal(await get(),'test-access');assert.equal(requests,1);
});
test('falha de autorização nunca devolve token e permite nova tentativa',async()=>{
 let requests=0;const get=googleAccessTokenProvider({clientId:'test',clientSecret:'test',refreshToken:'test',fetchImpl:async()=>{requests++;return new Response('',{status:400});}});
 await assert.rejects(get(),/refeita/);await assert.rejects(get(),/refeita/);assert.equal(requests,2);
});

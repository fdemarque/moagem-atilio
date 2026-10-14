import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleBackup, backupTables } from '../server/google-backup.js';
import { migrateLegacy } from '../src/lib/document.js';
const doc = migrateLegacy({clientes:['=Cliente'],movimentacoes:[{id:1,cliente:'=Cliente',tipo_movimentacao:'IN',tipo_sacaria:'granel',quantidade:100,peso_kg:100,data_movimentacao:'2026-10-01',documentos:[]}]});
function fakeGoogle({wrongAccount=false,corruptMedia=false,failSheets=false}={}) {
  const files=[];const cells=new Map();const calls=[];let serial=0;let uploadMetadata;
  const json = data => new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
  const fetchImpl = async(url,options={}) => {
    calls.push({url,options});const u=new URL(url);const method=options.method || 'GET';const body=options.body && method!=='PUT' ? JSON.parse(options.body) : null;
    assert.equal(options.headers.Authorization,'Bearer test-only');
    if(u.pathname.endsWith('/about')) return json({user:{emailAddress:wrongAccount ? 'wrong@example.com' : 'moinho@example.com'}});
    if(u.pathname.startsWith('/upload/') && method==='POST'){uploadMetadata=body;return new Response('',{status:200,headers:{location:'https://www.googleapis.com/upload/session'}});}
    if(u.pathname==='/upload/session' && method==='PUT'){const file={...uploadMetadata,id:`f${++serial}`,contents:options.body};files.push(file);return json({id:file.id});}
    if(u.pathname.endsWith('/drive/v3/files') && method==='POST'){const file={...body,id:`f${++serial}`};files.push(file);return json(file);}
    if(u.pathname.endsWith('/drive/v3/files') && method==='GET'){
      const q=u.searchParams.get('q');const kind=q.match(/key='moagemKind' and value='([^']+)'/);const snapshot=q.match(/key='moagemSnapshot' and value='([^']+)'/);const parent=q.match(/'([^']+)' in parents/);
      return json({files:files.filter(f=>(!kind || f.appProperties?.moagemKind===kind[1]) && (!snapshot || f.appProperties?.moagemSnapshot===snapshot[1]) && (!parent || f.parents?.includes(parent[1])))});
    }
    if(u.pathname.includes('/drive/v3/files/')){
      const id=u.pathname.split('/').at(-1);const file=files.find(f=>f.id===id);assert.ok(file);
      if(method==='PATCH'){if(body.appProperties) file.appProperties={...file.appProperties,...body.appProperties};if(u.searchParams.get('addParents')) file.parents=[u.searchParams.get('addParents')];return json({id});}
      if(u.searchParams.get('alt')==='media') return new Response(corruptMedia ? '{}' : file.contents,{status:200});
      return json({parents:file.parents || []});
    }
    if(u.pathname==='/v4/spreadsheets' && method==='POST'){
      const id=`s${++serial}`;files.push({id,name:body.properties.title,parents:[],appProperties:{}});return json({spreadsheetId:id});
    }
    if(u.pathname.endsWith('/values:batchUpdate')){
      if(failSheets) return new Response('',{status:403});assert.equal(body.valueInputOption,'RAW');
      for(const data of body.data){const [title,row]=data.range.match(/^'([^']+)'!A(\d+)$/).slice(1);const values=cells.get(title)||[];for(let i=0;i<data.values.length;i++)values[Number(row)-1+i]=data.values[i];cells.set(title,values);}return json({});
    }
    if(u.pathname.includes('/values/')){const title=decodeURIComponent(u.pathname.split('/values/')[1]).match(/^'([^']+)'!/)[1];return json({values:cells.get(title)});}
    throw new Error(`Unexpected fake route: ${method} ${u.pathname}`);
  };
  return {fetchImpl,files,calls};
}
const adapter = fake => createGoogleBackup({getAccessToken:async()=> 'test-only',expectedAccount:'moinho@example.com',fetchImpl:fake.fetchImpl});
test('backup Google confere JSON e planilhas, usa RAW e repetir não cria novos arquivos',async()=>{
 const fake=fakeGoogle();const service=adapter(fake);const saved=await service.saveSnapshot(doc);assert.equal(saved.verified,true);
 const count=fake.files.length;const again=await service.saveSnapshot(doc);assert.equal(fake.files.length,count);assert.equal(again.jsonId,saved.jsonId);assert.equal(again.spreadsheetId,saved.spreadsheetId);
 assert.equal(fake.files.filter(f=>f.mimeType==='application/json').length,1);
 assert.ok(fake.calls.some(c=>c.options.body?.includes('"valueInputOption":"RAW"')));
 assert.deepEqual(JSON.parse(fake.files.find(f=>f.id===saved.jsonId).contents),doc);
});
test('conta incorreta é rejeitada antes de criar pasta ou transmitir dados',async()=>{
 const fake=fakeGoogle({wrongAccount:true});await assert.rejects(adapter(fake).saveSnapshot(doc),/conta exclusiva/);assert.equal(fake.files.length,0);assert.equal(fake.calls.length,1);
});
test('checksum incorreto bloqueia sucesso e criação de planilha',async()=>{
 const fake=fakeGoogle({corruptMedia:true});await assert.rejects(adapter(fake).saveSnapshot(doc),/conferência do JSON/);assert.equal(fake.files.filter(f=>f.id.startsWith('s')).length,0);
});
test('falha de planilha preserva JSON e não marca cópia como concluída',async()=>{
 const fake=fakeGoogle({failSheets:true});await assert.rejects(adapter(fake).saveSnapshot(doc),/HTTP 403/);assert.equal(fake.files.filter(f=>f.mimeType==='application/json').length,1);assert.ok(fake.files.every(f=>f.appProperties?.moagemComplete!=='true'));
});
test('tabelas separam produtos e preservam crédito, IDs e estado de exclusão',()=>{
 const tables=backupTables(doc);assert.equal(tables.length,6);assert.equal(tables.find(t=>t.title==='Milho').values[1][0],doc.payload.movimentacoes[0].uuid);assert.equal(tables.find(t=>t.title==='Balanços').values[1][6],100);
});

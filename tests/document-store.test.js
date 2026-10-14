import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentStore } from '../server/document-store.js';
import { emptyDocument, legacyUuid, monthlyBalance } from '../src/lib/document.js';
function memoryFiles() {
  const values=new Map();let sequence=0;
  return {values,read:async path=>values.get(path) || null,immutable:async(path,text)=>{if(!values.has(path))values.set(path,{text,etag:String(++sequence)});},compareAndSet:async(path,text,etag)=>{if((values.get(path)?.etag || null)!==etag)throw new Error('Conflict');values.set(path,{text,etag:String(++sequence)});}};
}
function doc(rows) {
  return {...emptyDocument(),payload:{clientes:[],movimentacoes:rows.map(([id,module,date,quantity,type='IN'])=>({uuid:legacyUuid(id),updated_at:'2026-10-14T00:00:00Z',cliente:'Pai',modulo:module,data_movimentacao:date,quantidade:quantity,tipo_movimentacao:type,tipo_sacaria:module==='milho'?'granel':'unidade',peso_kg:module==='milho'?quantity:null,documentos:[]}))}};
}
test('CAS concorrente preserva duas inclusões e repetição não cria registros',async()=>{
  const files=memoryFiles(),store=createDocumentStore({files,googleBackup:{saveSnapshot:async()=>({verified:true})}});
  const a=doc([['a','soja','2026-10-01',10]]),b=doc([['b','sacarias','2026-10-01',20]]);
  await Promise.all([store.sync(a),store.sync(b)]);
  assert.equal((await store.read()).document.payload.movimentacoes.length,2);
  await store.sync(a);assert.equal((await store.read()).document.payload.movimentacoes.length,2);
});
test('arquivamento, aparelho antigo, edição e exclusão preservam saldos e histórico',async()=>{
  let date=new Date('2026-10-14T00:00:00Z');const files=memoryFiles();
  const store=createDocumentStore({files,googleBackup:{saveSnapshot:async()=>({verified:true})},clock:()=>date});
  const source=doc([['old','milho','2026-09-01',999],['corn','milho','2026-10-01',80],['soy','soja','2026-10-01',10],['sack','sacarias','2026-10-01',20],['out','soja','2026-11-01',2,'OUT']]);
  await store.sync(source);date=new Date('2027-05-01T00:00:00Z');
  const before=(await store.read()).document;
  await store.maintain();const saved=await store.read();
  assert.ok(saved.root.archives.length>0);assert.ok(saved.root.active.payload.movimentacoes.length<source.payload.movimentacoes.length);
  assert.deepEqual(saved.document.payload.movimentacoes,before.payload.movimentacoes);
  for(const module of ['milho','soja','sacarias']) assert.deepEqual(monthlyBalance(saved.document.payload.movimentacoes,module,'2027-05'),monthlyBalance(before.payload.movimentacoes,module,'2027-05'));
  const stale=structuredClone(source);stale.payload.movimentacoes.push(...doc([['new','soja','2027-04-01',3]]).payload.movimentacoes);
  await store.sync(stale);assert.equal((await store.read()).document.payload.movimentacoes.length,6);
  const edited=structuredClone(source);const row=edited.payload.movimentacoes.find(r=>r.modulo==='soja');row.quantidade=30;row.updated_at='2027-05-02T00:00:00Z';
  await store.sync(edited);assert.equal((await store.read()).document.payload.movimentacoes.find(r=>r.uuid===row.uuid).quantidade,30);
  row.updated_at=row.deleted_at='2027-05-03T00:00:00Z';await store.sync(edited);await store.sync(source);
  assert.ok((await store.read()).document.payload.movimentacoes.find(r=>r.uuid===row.uuid).deleted_at);
});
test('falha Google ou checksum impede arquivamento e mantém estado',async()=>{
  const files=memoryFiles();let date=new Date('2026-01-01T00:00:00Z'),fail=false;
  const store=createDocumentStore({files,clock:()=>date,googleBackup:{saveSnapshot:async()=>{if(fail)throw new Error('Drive offline');return {verified:true};}}});
  await store.sync(doc([['old','soja','2026-01-01',10]]));date=new Date('2026-10-01T00:00:00Z');fail=true;
  const prior=files.values.get('moagem/state.json');await assert.rejects(store.maintain());assert.deepEqual(files.values.get('moagem/state.json'),prior);
  fail=false;await store.maintain();const saved=await store.read();files.values.set(saved.root.archives[0].path,{text:'corrupt',etag:'x'});
  await assert.rejects(store.read(),/Histórico incompleto/);
});
test('falha de retenção não invalida a cópia confirmada nem altera registros',async()=>{
  const files=memoryFiles();files.pruneSnapshots=async()=>{throw new Error('Delete unavailable');};
  const store=createDocumentStore({files,googleBackup:{saveSnapshot:async()=>({verified:true})}});
  await store.sync(doc([['one','soja','2026-10-01',10]]));const prior=(await store.read()).document;
  const result=await store.maintain();assert.equal(result.verified,true);assert.equal(result.cleanupPending,true);
  assert.deepEqual((await store.read()).document,prior);
});

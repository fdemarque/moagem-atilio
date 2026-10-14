import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeStorage, readDocument, importDocument, changeDocument, listBackups, saveMovement, deleteMovement, addClient, recoverBackup } from '../src/lib/storage.js';
import { migrateLegacy } from '../src/lib/document.js';
const legacyStorage=new Map([['moagem_clientes_cadastrados','["Cliente antigo"]']]);
globalThis.localStorage={getItem:key=>legacyStorage.get(key) ?? null};
const fields={cliente:'Cliente antigo',modulo:'soja',tipo_movimentacao:'IN',tipo_sacaria:'unidade',quantidade:10,peso_kg:null,data_movimentacao:'2026-10-13',documentos:[]};
test('migração, importação, concorrência e rollback preservam os dados',async t=>{
 await t.test('backup preventivo e migração dos nomes sem apagar armazenamento antigo',async()=>{
  const doc=await initializeStorage();assert.equal(doc.payload.clientes[0].nome,'Cliente antigo');
  const backups=await listBackups();assert.equal(backups[0].source.moagem_clientes_cadastrados,'["Cliente antigo"]');
  assert.equal(legacyStorage.get('moagem_clientes_cadastrados'),'["Cliente antigo"]');
 });
 await t.test('duas escritas simultâneas preservam ambas inserções',async()=>{
  await Promise.all([saveMovement(fields),saveMovement({...fields,modulo:'sacarias'})]);
  assert.equal((await readDocument()).payload.movimentacoes.length,2);
 });
 await t.test('falha de validação aborta estado e backup da transação',async()=>{
  const previous=await readDocument(),count=(await listBackups()).length;
  await assert.rejects(changeDocument(doc=>{doc.payload.movimentacoes[0].quantidade=-1;return doc;},'teste-falha'));
  assert.deepEqual(await readDocument(),previous);assert.equal((await listBackups()).length,count);
 });
 await t.test('importação inválida e JSON corrompido não alteram o documento',async()=>{
  const previous=await readDocument();await assert.rejects(importDocument('{'));await assert.rejects(importDocument('{"schema_version":999}'));
  assert.deepEqual(await readDocument(),previous);
 });
 await t.test('edição e exclusão fazem backups e antigo backup não ressuscita registro',async()=>{
  const old=await readDocument(),uuid=old.payload.movimentacoes[0].uuid;
  await saveMovement({...fields,quantidade:15},uuid);await deleteMovement(uuid);
  const b=(await listBackups()).at(-1);assert.equal(b.reason,'antes-da-exclusao');assert.equal(b.document.payload.movimentacoes[0].quantidade,15);
  await importDocument(JSON.stringify(old));assert.ok((await readDocument()).payload.movimentacoes.find(r=>r.uuid===uuid).deleted_at);
 });
 await t.test('reimportação do legado é idempotente e preserva registros novos',async()=>{
  const legacy={clientes:['Pai'],movimentacoes:[{id:5,cliente:'Pai',tipo_movimentacao:'IN',tipo_sacaria:'granel',quantidade:20,peso_kg:20,data_movimentacao:'2026-10-01',documentos:[]}]};
  await importDocument(JSON.stringify(legacy));const count=(await readDocument()).payload.movimentacoes.length;
  await importDocument(JSON.stringify(migrateLegacy(legacy)));assert.equal((await readDocument()).payload.movimentacoes.length,count);
 });
 await t.test('cadastro duplicado em paralelo não cria cópias',async()=>{
  const results=await Promise.allSettled([addClient('Novo'),addClient('Novo')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 });
 await t.test('recuperação explícita desfaz exclusão preservando registros posteriores',async()=>{
  const current=await readDocument();const deleted=current.payload.movimentacoes.find(r=>r.deleted_at);
  const snapshot=(await listBackups()).find(b=>b.reason==='antes-da-exclusao');
  await recoverBackup(snapshot);const restored=await readDocument();
  assert.equal(restored.payload.movimentacoes.length,current.payload.movimentacoes.length);
  assert.equal(restored.payload.movimentacoes.find(r=>r.uuid===deleted.uuid).deleted_at,undefined);
  assert.ok(Date.parse(restored.payload.movimentacoes.find(r=>r.uuid===deleted.uuid).updated_at)>Date.parse(deleted.updated_at));
 });
});

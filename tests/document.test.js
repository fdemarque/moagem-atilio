import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDocument, migrateLegacy, mergeDocuments, validateDocument, monthlyBalance } from '../src/lib/document.js';
const sample = (id=1, extra={}) => ({ id, cliente:'Pai', tipo_movimentacao:'IN', tipo_sacaria:'granel', quantidade:1000, peso_kg:1000, documentos:[], data_movimentacao:'2026-10-01', criado_em:'2026-10-01T12:00:00Z',...extra });
test('migração preserva cada campo de clientes e movimentações e é idempotente', () => {
  const raw={clientes:[{id:8,nome:'Pai',criado_em:'2026-09-01T00:00:00Z'}],movimentacoes:[sample()]};
  const result=migrateLegacy(raw);
  for(const [k,v] of Object.entries(raw.clientes[0])) assert.deepEqual(result.payload.clientes[0][k],v);
  for(const [k,v] of Object.entries(raw.movimentacoes[0])) assert.deepEqual(result.payload.movimentacoes[0][k],v);
  assert.equal(mergeDocuments(result,migrateLegacy(raw)).added,0);
  assert.equal(mergeDocuments(result,migrateLegacy(raw)).updated,0);
});
test('merge soma inserções paralelas e usa a versão mais recente por item', () => {
  const a=migrateLegacy({clientes:[],movimentacoes:[sample()]});
  const b=migrateLegacy({clientes:[],movimentacoes:[sample(2)]});
  const newer=structuredClone(a.payload.movimentacoes[0]);newer.quantidade=2000;newer.updated_at='2026-10-02T12:00:00Z';b.payload.movimentacoes.push(newer);
  const result=mergeDocuments(a,b);
  assert.equal(result.document.payload.movimentacoes.length,2);assert.equal(result.added,1);assert.equal(result.updated,1);
  assert.equal(result.document.payload.movimentacoes.find(r => r.id===1).quantidade,2000);
});
test('tombstone impede ressurreição por backup antigo e vence empate', () => {
  const a=migrateLegacy({clientes:[],movimentacoes:[sample()]});const b=structuredClone(a);
  const r=b.payload.movimentacoes[0];r.updated_at='2026-10-03T00:00:00Z';r.deleted_at=r.updated_at;
  assert.ok(mergeDocuments(b,a).document.payload.movimentacoes[0].deleted_at);
  const c=structuredClone(b);delete c.payload.movimentacoes[0].deleted_at;
  assert.ok(mergeDocuments(c,b).document.payload.movimentacoes[0].deleted_at);
});
test('empates têm resultado determinístico independente da ordem de importação', () => {
 const a=migrateLegacy({clientes:[],movimentacoes:[sample()]}),b=structuredClone(a);b.payload.movimentacoes[0].quantidade=2000;
 assert.deepEqual(mergeDocuments(a,b).document.payload,mergeDocuments(b,a).document.payload);
});
test('validação bloqueia schema futuro, UUID duplicado, data inválida e unidades fracionadas', () => {
  const a=migrateLegacy({clientes:[],movimentacoes:[sample()]});
  for(const change of [d=>d.schema_version=99,d=>d.payload.movimentacoes.push(d.payload.movimentacoes[0]),d=>d.payload.movimentacoes[0].data_movimentacao='2026-02-30',d=>{d.payload.movimentacoes[0].modulo='soja';d.payload.movimentacoes[0].quantidade=1.5;},d=>d.payload.movimentacoes[0].documentos=['https://example.com/photo']]) {
    const d=structuredClone(a);change(d);assert.throws(()=>validateDocument(d));
  }
});
test('milho conserva a base outubro/2026 e sacos de 25/50 kg', () => {
  const doc=migrateLegacy({clientes:[],movimentacoes:[sample(1,{data_movimentacao:'2026-09-01',quantidade:5000,peso_kg:5000}),sample(2),sample(3,{tipo_movimentacao:'OUT',tipo_sacaria:'pequena',quantidade:2,peso_kg:null}),sample(4,{tipo_movimentacao:'OUT',tipo_sacaria:'normal',quantidade:3,peso_kg:null,data_movimentacao:'2026-11-02'})]});
  const oct=monthlyBalance(doc.payload.movimentacoes,'milho','2026-10');assert.equal(oct.opening,0);assert.equal(oct.closing,950);
  const nov=monthlyBalance(doc.payload.movimentacoes,'milho','2026-11');assert.equal(nov.opening,950);assert.equal(nov.closing,800);
});
test('soja e sacarias contam unidades e mantêm crédito entre meses e anos', () => {
  for(const module of ['soja','sacarias']){
    const rows=migrateLegacy({clientes:[],movimentacoes:[sample(1,{data_movimentacao:'2026-12-01',quantidade:20}),sample(2,{data_movimentacao:'2027-01-02',tipo_movimentacao:'OUT',quantidade:3})]}).payload.movimentacoes.map(r=>({...r,modulo:module}));
    const b=monthlyBalance(rows,module,'2027-01');assert.equal(b.opening,20);assert.equal(b.output,3);assert.equal(b.closing,17);
  }
});
test('documento vazio permanece válido',()=>assert.equal(validateDocument(emptyDocument()).schema_version,1));

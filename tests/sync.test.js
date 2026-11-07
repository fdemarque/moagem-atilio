import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGas } from './fake-gas.js';
import { legacyUuid } from '../src/lib/document.js';

const local = new Map();
globalThis.localStorage = { getItem: k => local.get(k) ?? null, setItem: (k, v) => local.set(k, String(v)), removeItem: k => local.delete(k) };
globalThis.window = globalThis;
const events = new EventTarget();
globalThis.addEventListener = events.addEventListener.bind(events);
globalThis.removeEventListener = events.removeEventListener.bind(events);
globalThis.dispatchEvent = events.dispatchEvent.bind(events);

const { initializeStorage, saveMovement, deleteMovement, readDocument, readSyncState, importDocument } = await import('../src/lib/storage.js');
const { startSync } = await import('../src/lib/sync.js');

const URL_GAS = 'https://script.google.com/macros/s/teste/exec';
const code = Buffer.from(JSON.stringify({ u: URL_GAS, t: 'token-teste-0123456789' })).toString('base64url');
const fields = { cliente: 'Ana', modulo: 'soja', tipo_movimentacao: 'IN', tipo_sacaria: 'unidade', quantidade: 10, peso_kg: null, data_movimentacao: '2026-11-03', documentos: [] };

function device(server, { fail = () => false } = {}) {
  const statuses = [];
  let waiters = [];
  const fetchImpl = async (url, init) => {
    assert.equal(url, URL_GAS);
    if (fail()) throw new Error('rede');
    return { json: async () => server.post(init.body) };
  };
  const sync = startSync(s => { statuses.push(s.kind); waiters = waiters.filter(w => !w(s.kind)); }, { fetchImpl, interval: 3600000 });
  const until = kind => new Promise(resolve => waiters.push(k => k === kind && (resolve(), true)));
  return { sync, statuses, until };
}

test('aparelho envia pendências, recebe alterações e retoma após falha', async () => {
  const server = loadGas();
  await initializeStorage();
  // Base antiga já existente no aparelho: tudo é enviado na primeira conexão.
  await importDocument(JSON.stringify({ app: 'moagem-atilio', schema_version: 1, last_updated: '2026-11-01T00:00:00.000Z', payload: { clientes: [{ uuid: legacyUuid('cliente:Ana'), nome: 'Ana', updated_at: '2026-11-01T00:00:00.000Z' }], movimentacoes: [] } }));
  await saveMovement(fields);

  let offline = false;
  const a = device(server, { fail: () => offline });
  assert.equal(a.statuses.at(-1) ?? 'setup', 'setup');
  const saved = a.until('saved');
  await a.sync.connect(code);
  await saved;
  assert.equal(server.sheets.get('Movimentações').rows().length, 2);
  assert.equal(server.sheets.get('Clientes').rows().length, 2);
  assert.deepEqual((await readSyncState()).meta.pending, {});

  // Edição feita em outro aparelho chega a este.
  const uuid = (await readDocument()).payload.movimentacoes[0].uuid;
  server.post({ token: 'token-teste-0123456789', acao: 'sincronizar', desde: 0, movimentacoes: [{ ...fields, uuid, quantidade: 30, updated_at: new Date(Date.now() + 5000).toISOString() }] });
  let next = a.until('saved');
  a.sync.retry();
  await next;
  assert.equal((await readDocument()).payload.movimentacoes[0].quantidade, 30);

  // Falha de rede mantém a exclusão pendente; ao voltar, ela chega à planilha.
  offline = true;
  const failed = a.until('error');
  await deleteMovement(uuid);
  await failed;
  assert.equal(Object.keys((await readSyncState()).meta.pending).length, 1);
  offline = false;
  next = a.until('saved');
  a.sync.retry();
  await next;
  assert.ok(server.sheets.get('Movimentações').rows()[1][10], 'Apagado em preenchido');
  assert.deepEqual((await readSyncState()).meta.pending, {});
  a.sync.stop();
});

test('registro recusado pela planilha continua pendente e é informado', async () => {
  const server = loadGas();
  const novo = await saveMovement({ ...fields, quantidade: 7, data_movimentacao: '2026-11-05' });
  const uuid = novo.payload.movimentacoes.find(r => r.quantidade === 7).uuid;
  const statuses = [];
  let resolve; const done = new Promise(r => { resolve = r; });
  // Planilha recusa este registro (simula divergência de validação).
  const fetchImpl = async (_, init) => {
    const body = JSON.parse(init.body);
    body.movimentacoes = (body.movimentacoes || []).map(r => r.uuid === uuid ? { ...r, quantidade: -1 } : r);
    return { json: async () => server.post(body) };
  };
  const sync = startSync(s => { statuses.push(s); if (s.kind === 'refused' || s.kind === 'saved') resolve(); }, { fetchImpl, interval: 3600000 });
  await done;
  sync.stop();
  assert.equal(statuses.at(-1).kind, 'refused');
  assert.match(statuses.at(-1).detail, /1 registro/);
  assert.ok((await readSyncState()).meta.pending[`movimentacoes:${uuid}`], 'continua pendente');
});

test('código de conexão inválido é recusado sem salvar', async () => {
  const { parseConnectionCode } = await import('../src/lib/sync.js');
  assert.throws(() => parseConnectionCode('abc'), /inválido/);
  assert.equal(parseConnectionCode(`https://app/#conectar=${code}`).url, URL_GAS);
});

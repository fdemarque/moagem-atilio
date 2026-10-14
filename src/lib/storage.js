import { emptyDocument, migrateLegacy, validateDocument, mergeDocuments, legacyUuid, now } from './document.js';
export const DB_NAME = 'moagem-atilio-local';
let connection;
let initialization;
function openDb() {
  return connection ||= new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('documents'); request.result.createObjectStore('backups', { autoIncrement: true }); };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(new Error('Não foi possível abrir o armazenamento. Use uma janela normal do navegador.'));
    request.onblocked = () => reject(new Error('Feche outras abas do aplicativo e tente novamente.'));
  });
}
export async function readDocument() {
  const db = await openDb();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('documents'); const request = tx.objectStore('documents').get('state');
    request.onsuccess = () => resolve(request.result ? validateDocument(request.result) : null);
    request.onerror = () => reject(request.error);
  });
}
// Each change reads the latest state and writes in the SAME IDB transaction.
// Transactions are serialized across tabs; backup and mutation succeed or abort together.
export async function changeDocument(transform, reason = null, source = null) {
  const db = await openDb();
  return new Promise((resolve,reject) => {
    const tx = db.transaction(['documents','backups'], 'readwrite');
    const store = tx.objectStore('documents'); const request = store.get('state');
    let result; let failure;
    request.onsuccess = () => {
      try {
        const previous = request.result || emptyDocument();
        validateDocument(previous);
        result = transform(structuredClone(previous));
        if (result?.then) throw new Error('Alteração precisa ser síncrona.');
        result.last_updated = now(); validateDocument(result);
        if (reason) tx.objectStore('backups').add({ created_at: now(), reason, document: previous, source });
        store.put(result, 'state');
      } catch(error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => { globalThis.dispatchEvent?.(new Event('moagem-change')); resolve(result); };
    tx.onabort = tx.onerror = () => reject(failure || new Error('Não foi possível salvar. Os dados anteriores foram mantidos. Verifique o espaço livre.'));
  });
}
export function initializeStorage() {
  if (initialization) return initialization;
  initialization = (async () => {
    const existing = await readDocument();
    if (existing) return existing;
    const source = {};
    for (const key of ['moagem_clientes_cadastrados','moagem_movimentacoes','moagem_estado']) {
      const value = localStorage.getItem(key);
      if (value !== null) source[key] = value;
    }
    // Keep raw bytes before parsing/converting, even when a legacy value is corrupt.
    const db = await openDb();
    await new Promise((resolve,reject) => {
      const tx = db.transaction('backups','readwrite');
      tx.objectStore('backups').add({ created_at: now(), reason: 'antes-da-migracao', source });
      tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(new Error('Falha no backup preventivo. Migração cancelada.'));
    });
    let migrated = emptyDocument();
    if (source.moagem_estado) migrated = migrateLegacy(JSON.parse(source.moagem_estado));
    if (source.moagem_clientes_cadastrados || source.moagem_movimentacoes) {
      const legacy = migrateLegacy({ clientes: JSON.parse(source.moagem_clientes_cadastrados || '[]'), movimentacoes: JSON.parse(source.moagem_movimentacoes || '[]') });
      migrated = mergeDocuments(migrated,legacy).document;
    }
    return changeDocument(current => mergeDocuments(current,migrated).document, 'migracao-local', source);
  })().catch(error => { initialization = null; throw error; });
  return initialization;
}
export async function importDocument(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error('Arquivo JSON corrompido. Nenhum dado foi alterado.'); }
  const incoming = migrateLegacy(raw);
  let summary;
  const document = await changeDocument(current => { summary = mergeDocuments(current,incoming); return summary.document; }, 'antes-da-importacao', raw);
  return { ...summary, document };
}
export async function listBackups() {
  const db = await openDb();
  return new Promise((resolve,reject) => {
    const request = db.transaction('backups').objectStore('backups').getAll();
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
function nextStamp(previous) {
  return new Date(Math.max(Date.now(), Date.parse(previous?.updated_at || 0) + 1 || 0)).toISOString();
}
export function addClient(nome) {
  const clean = nome.trim(); if (!clean) throw new Error('Informe o nome do cliente.');
  return changeDocument(doc => {
    if (doc.payload.clientes.some(c => c.nome.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR') && !c.deleted_at)) throw new Error('Este cliente já está cadastrado.');
    doc.payload.clientes.push({ uuid: legacyUuid(`cliente:${clean}`), nome: clean, updated_at: now() }); return doc;
  });
}
export function saveMovement(fields, uuid = null) {
  return changeDocument(doc => {
    const previous = uuid && doc.payload.movimentacoes.find(r => r.uuid === uuid);
    if (uuid && !previous) throw new Error('Registro não encontrado. Atualize a tela.');
    if (previous?.deleted_at) throw new Error('Este registro foi apagado em outra aba.');
    const row = { ...previous, ...fields, uuid: uuid || crypto.randomUUID(), updated_at: nextStamp(previous) };
    if (previous) doc.payload.movimentacoes = doc.payload.movimentacoes.map(r => r.uuid === uuid ? row : r);
    else doc.payload.movimentacoes.push(row);
    return doc;
  }, uuid ? 'antes-da-edicao' : null);
}
export function deleteMovement(uuid) {
  return changeDocument(doc => {
    const row = doc.payload.movimentacoes.find(r => r.uuid === uuid);
    if (!row) throw new Error('Registro não encontrado.');
    row.updated_at = nextStamp(row); row.deleted_at = row.updated_at; return doc;
  }, 'antes-da-exclusao');
}
// Explicit recovery differs from synchronization: restore old versions with a NEW
// timestamp, keeping every record that was created after this backup.
export function recoverBackup(backup) {
  const incoming = migrateLegacy(backup.document || { legacy_storage: backup.source });
  return changeDocument(doc => {
    for (const entity of ['clientes','movimentacoes']) {
      for (const restored of incoming.payload[entity].filter(r => !r.deleted_at)) {
        const index = doc.payload[entity].findIndex(r => r.uuid === restored.uuid);
        const current = doc.payload[entity][index];
        const copy = { ...restored, updated_at: nextStamp(current) };
        delete copy.deleted_at;
        if (index < 0) doc.payload[entity].push(copy); else doc.payload[entity][index] = copy;
      }
    }
    return doc;
  }, 'antes-da-recuperacao');
}
export function downloadFile(blob, name) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const jsonFile = doc => new File([JSON.stringify(doc,null,2)], `moagem-backup-${now().replace(/[:.]/g,'-')}.json`, { type: 'application/json' });

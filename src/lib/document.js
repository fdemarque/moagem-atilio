export const MODULES = ['milho', 'sacarias', 'soja'];
export const SCHEMA = 1;
export const now = () => new Date().toISOString();
export function emptyDocument() {
  return { app: 'moagem-atilio', schema_version: SCHEMA, last_updated: now(), payload: { clientes: [], movimentacoes: [] } };
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
function assert(ok, message) { if (!ok) throw new Error(message); }
export function validateDocument(doc) {
  assert(doc?.app === 'moagem-atilio' && doc.schema_version === SCHEMA, 'Arquivo incompatível. Escolha um backup JSON do Moagem Atílio.');
  assert(typeof doc.last_updated === 'string' && Number.isFinite(Date.parse(doc.last_updated)), 'Data do backup inválida.');
  assert(Array.isArray(doc.payload?.clientes) && Array.isArray(doc.payload?.movimentacoes), 'Backup sem clientes ou movimentações.');
  for (const entity of ['clientes', 'movimentacoes']) {
    const seen = new Set();
    for (const row of doc.payload[entity]) {
      assert(row && uuidPattern.test(row.uuid) && !seen.has(row.uuid), 'Identificador inválido ou repetido no backup.');
      seen.add(row.uuid);
      assert(typeof row.updated_at === 'string' && Number.isFinite(Date.parse(row.updated_at)), 'Registro sem data de atualização válida.');
      assert(row.deleted_at == null || (Number.isFinite(Date.parse(row.deleted_at)) && row.deleted_at === row.updated_at), 'Exclusão inválida.');
      if (entity === 'clientes') assert(typeof row.nome === 'string' && row.nome.trim().length > 0, 'Nome de cliente inválido.');
      else {
        assert(MODULES.includes(row.modulo), 'Módulo inválido.');
        assert(typeof row.cliente === 'string' && row.cliente.trim().length > 0, 'Movimentação sem cliente.');
        assert(['IN', 'OUT'].includes(row.tipo_movimentacao), 'Tipo de movimentação inválido.');
        assert(typeof row.quantidade === 'number' && Number.isFinite(row.quantidade) && row.quantidade > 0, 'Quantidade inválida.');
        assert(row.modulo === 'milho' && row.tipo_movimentacao === 'IN' || Number.isSafeInteger(row.quantidade), 'Informe unidades inteiras.');
        assert(validDate(row.data_movimentacao), 'Data de movimentação inválida.');
        assert(row.modulo !== 'milho' || ['granel', 'normal', 'pequena'].includes(row.tipo_sacaria), 'Tipo de saca inválido.');
        assert(row.peso_kg == null || typeof row.peso_kg === 'number' && Number.isFinite(row.peso_kg) && row.peso_kg >= 0, 'Peso inválido.');
        assert(Array.isArray(row.documentos) && row.documentos.every(x => typeof x === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(x)), 'Comprovante inválido ou remoto. Importe um backup com fotos disponíveis offline.');
      }
    }
  }
  return doc;
}
// Deterministic UUID for legacy identities: the same export on two devices merges once.
export function legacyUuid(value) {
  let hex = '';
  for (let seed = 0; seed < 4; seed++) {
    let hash = 2166136261 ^ seed;
    for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    hex += (hash >>> 0).toString(16).padStart(8, '0');
  }
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20)}`;
}
export function migrateLegacy(raw) {
  if (raw?.legacy_storage) {
    const keys = raw.legacy_storage;
    if (keys.moagem_estado) return migrateLegacy(JSON.parse(keys.moagem_estado));
    return migrateLegacy({ clientes: JSON.parse(keys.moagem_clientes_cadastrados || '[]'), movimentacoes: JSON.parse(keys.moagem_movimentacoes || '[]') });
  }
  if (raw?.app === 'moagem-atilio') return validateDocument(raw);
  assert(raw && Array.isArray(raw.clientes) && Array.isArray(raw.movimentacoes), 'Formato antigo desconhecido. Nenhum dado foi alterado.');
  assert(raw.exported_at == null || Number.isFinite(Date.parse(raw.exported_at)), 'Data de exportação antiga inválida.');
  const doc = emptyDocument();
  const stamp = Number.isFinite(Date.parse(raw.exported_at)) ? new Date(raw.exported_at).toISOString() : '1970-01-01T00:00:00.000Z';
  const names = new Set(raw.clientes.map(c => typeof c === 'string' ? c : c.nome));
  for (const row of raw.movimentacoes) {
    assert(row.id != null, 'Registro antigo sem ID. Migração interrompida.');
    names.add(row.cliente);
    doc.payload.movimentacoes.push({ ...row, uuid: legacyUuid(`movimentacao:${row.id}`), modulo: 'milho', quantidade: Number(row.quantidade), peso_kg: row.peso_kg == null ? null : Number(row.peso_kg), updated_at: row.updated_at || (raw.exported_at ? stamp : row.created_at || row.criado_em || stamp), documentos: row.documentos || [] });
  }
  doc.payload.clientes = [...names].map(nome => { const original = raw.clientes.find(c => c?.nome === nome) || {}; return { ...original, nome, uuid: legacyUuid(`cliente:${nome}`), updated_at: original.updated_at || (raw.exported_at ? stamp : original.criado_em || stamp) }; });
  return validateDocument(doc);
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function mergeDocuments(local, incoming) {
  validateDocument(local); validateDocument(incoming);
  const result = structuredClone(local);
  let added = 0, updated = 0;
  for (const entity of ['clientes', 'movimentacoes']) {
    const index = new Map(result.payload[entity].map(r => [r.uuid, r]));
    for (const row of incoming.payload[entity]) {
      const previous = index.get(row.uuid);
      const newer = !previous || Date.parse(row.updated_at) > Date.parse(previous.updated_at);
      const tied = previous && Date.parse(row.updated_at) === Date.parse(previous.updated_at);
      const winsTie = tied && (Boolean(row.deleted_at) !== Boolean(previous.deleted_at) ? Boolean(row.deleted_at) : canonical(row) > canonical(previous));
      if (newer || winsTie) { index.set(row.uuid, structuredClone(row)); previous ? updated++ : added++; }
    }
    result.payload[entity] = [...index.values()];
  }
  result.last_updated = now();
  return { document: validateDocument(result), added, updated };
}
export function extrairPesoKg(row) {
  if (row.peso_kg != null && Number(row.peso_kg) > 0) return Number(row.peso_kg);
  return row.tipo_movimentacao === 'IN' ? Number(row.quantidade) : Number(row.quantidade) * (row.tipo_sacaria === 'pequena' ? 25 : 50);
}
export const amount = row => row.modulo === 'milho' ? extrairPesoKg(row) : row.quantidade;
export const signed = row => amount(row) * (row.tipo_movimentacao === 'IN' ? 1 : -1);
export function monthlyBalance(rows, module, month) {
  const active = rows.filter(r => !r.deleted_at && r.modulo === module);
  const movements = active.filter(r => r.data_movimentacao.startsWith(month)).sort((a,b) => b.data_movimentacao.localeCompare(a.data_movimentacao));
  // Preserve validated October 2026 corn base; previous months keep their original monthly rule.
  const before = active.filter(r => r.data_movimentacao < `${month}-01` && (module !== 'milho' || month > '2026-10' && r.data_movimentacao >= '2026-10-01'));
  const opening = before.reduce((s,r) => s + signed(r), 0);
  const input = movements.filter(r => r.tipo_movimentacao === 'IN').reduce((s,r) => s + amount(r),0);
  const output = movements.filter(r => r.tipo_movimentacao === 'OUT').reduce((s,r) => s + amount(r),0);
  return { movements, opening, input, output, closing: opening + input - output };
}

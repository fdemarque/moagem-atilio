import { readSyncState, applyRemote } from './storage.js';
import { ENTITIES } from './document.js';

const CONNECTION_KEY = 'moagem-conexao';
const BATCH_BYTES = 8 * 1024 * 1024;

// Connection code = base64url(JSON {u: Apps Script /exec URL, t: token}).
export function parseConnectionCode(code) {
  const clean = String(code || '').trim().replace(/^.*#conectar=/, '').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  try {
    const value = JSON.parse(atob(clean + '='.repeat((4 - clean.length % 4) % 4)));
    if (/^https:\/\/script\.google(usercontent)?\.com\/.+\/exec$/.test(value.u) && typeof value.t === 'string' && value.t.length >= 16) return { url: value.u, token: value.t };
  } catch { /* invalid below */ }
  throw new Error('Código de conexão inválido. Confira se copiou o código inteiro.');
}
export function readConnection() {
  try { const value = JSON.parse(localStorage.getItem(CONNECTION_KEY)); return value?.url && value?.token ? value : null; } catch { return null; }
}
export function saveConnection(connection) { localStorage.setItem(CONNECTION_KEY, JSON.stringify(connection)); }
export function forgetConnection() { localStorage.removeItem(CONNECTION_KEY); }

// Pending records grouped in batches below the request budget.
export function pendingBatches(document, meta) {
  const batches = [], acks = [];
  let current = { clientes: [], movimentacoes: [] }, ack = [], size = 0;
  for (const entity of ENTITIES) for (const row of document?.payload[entity] || []) {
    const k = `${entity}:${row.uuid}`;
    if (meta.pending[k] !== row.updated_at) continue;
    const bytes = JSON.stringify(row).length;
    if (size && size + bytes > BATCH_BYTES) { batches.push(current); acks.push(ack); current = { clientes: [], movimentacoes: [] }; ack = []; size = 0; }
    current[entity].push(row); ack.push([k, row.updated_at]); size += bytes;
  }
  batches.push(current); acks.push(ack);
  return { batches, acks };
}

const STATUS = {
  setup: 'Salvo neste aparelho. Ainda não conectado à planilha.',
  offline: 'Salvo neste aparelho. Sem internet: envio para a planilha quando voltar.',
  sending: 'Salvo neste aparelho. Enviando para a planilha…',
  saved: 'Salvo neste aparelho e na planilha.',
  access: 'Salvo neste aparelho. O código de conexão foi recusado: conecte de novo.',
  error: 'Salvo neste aparelho. A planilha não respondeu; nova tentativa em breve.',
};

export function startSync(onStatus, { fetchImpl = (...args) => fetch(...args), interval = 60000 } = {}) {
  let stopped = false, running = false, again = false, timer, retry = interval;
  const status = (kind, detail) => onStatus({ kind, text: STATUS[kind], detail });
  async function call(connection, body) {
    // text/plain avoids a CORS preflight, which Apps Script does not answer.
    const response = await fetchImpl(connection.url, { method: 'POST', body: JSON.stringify({ token: connection.token, ...body }), redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(120000) });
    const result = await response.json().catch(() => ({ ok: false, erro: 'Resposta inválida da planilha.' }));
    if (!result.ok) { const error = new Error(result.erro || 'Falha na planilha.'); error.access = result.codigo === 'acesso'; throw error; }
    return result;
  }
  function schedule(delay = 1500) { clearTimeout(timer); if (!stopped) timer = setTimeout(run, delay); }
  async function run() {
    if (stopped) return;
    if (running) { again = true; return; }
    const connection = readConnection();
    if (!connection) { status('setup'); return; }
    if (globalThis.navigator?.onLine === false) { status('offline'); schedule(interval); return; }
    running = true; again = false;
    try {
      const { document, meta } = await readSyncState();
      const { batches, acks } = pendingBatches(document, meta);
      if (acks.flat().length) status('sending');
      let cursor = meta.cursor, more = true;
      for (let i = 0; i < batches.length || more; i++) {
        const result = await call(connection, { acao: 'sincronizar', desde: cursor, ...(batches[i] || {}) });
        await applyRemote(result, acks[i] || []);
        cursor = result.cursor; more = result.mais;
        if (result.rejeitados?.length) console.warn('Registros recusados pela planilha:', result.rejeitados);
      }
      retry = interval;
      status('saved');
      schedule(again ? 0 : interval);
    } catch (error) {
      status(error.access ? 'access' : 'error', error.message);
      if (!error.access) { schedule(retry); retry = Math.min(retry * 2, 10 * interval); }
    } finally { running = false; }
  }
  const changed = event => { if (!event?.detail?.remote) schedule(); };
  const online = () => schedule(0), offline = () => status('offline');
  const visible = () => { if (globalThis.document?.visibilityState !== 'hidden') schedule(0); };
  window.addEventListener('moagem-change', changed); window.addEventListener('online', online); window.addEventListener('offline', offline); window.addEventListener('focus', visible);
  globalThis.document?.addEventListener?.('visibilitychange', visible);
  schedule(0);
  return {
    retry: () => { retry = interval; schedule(0); },
    async connect(code) {
      const connection = parseConnectionCode(code);
      await call(connection, { acao: 'verificar' });
      saveConnection(connection); schedule(0);
    },
    stop: () => { stopped = true; clearTimeout(timer); window.removeEventListener('moagem-change', changed); window.removeEventListener('online', online); window.removeEventListener('offline', offline); window.removeEventListener('focus', visible); globalThis.document?.removeEventListener?.('visibilitychange', visible); },
  };
}

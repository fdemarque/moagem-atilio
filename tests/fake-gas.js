// Ambiente Apps Script mínimo em memória para testar gas/*.js no Node.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

function fakeSheet(name) {
  let rows = [];
  const sheet = {
    rows: () => rows,
    getName: () => name,
    getLastRow: () => rows.length,
    getMaxRows: () => Math.max(rows.length, 1000),
    insertRowsAfter() {}, insertRowAfter() { rows.splice(1, 0, []); },
    deleteRows(start, count) { rows.splice(start - 1, count); },
    setFrozenRows() {},
    getRange(row, col, numRows = 1, numCols = 1) {
      const range = {
        getRow: () => row, getColumn: () => col, getNumRows: () => numRows, getNumColumns: () => numCols, getSheet: () => sheet,
        getValues: () => Array.from({ length: numRows }, (_, r) => Array.from({ length: numCols }, (_, c) => rows[row - 1 + r]?.[col - 1 + c] ?? '')),
        getValue: () => range.getValues()[0][0],
        setValues(values) { values.forEach((v, r) => { rows[row - 1 + r] ||= []; v.forEach((x, c) => { rows[row - 1 + r][col - 1 + c] = x; }); }); return range; },
        setValue(v) { return range.setValues([[v]]); },
        clearContent() { for (let r = 0; r < numRows; r++) if (rows[row - 1 + r]) for (let c = 0; c < numCols; c++) rows[row - 1 + r][col - 1 + c] = ''; return range; },
        sort(spec) {
          const body = rows.slice(row - 1, row - 1 + numRows);
          body.sort((a, b) => { for (const s of spec) { const x = a[s.column - 1], y = b[s.column - 1]; if (x !== y) return (x < y ? -1 : 1) * (s.ascending ? 1 : -1); } return 0; });
          rows.splice(row - 1, numRows, ...body); return range;
        },
      };
      for (const m of ['setNumberFormat', 'setNumberFormats', 'setFontWeight', 'setBackground', 'setBackgrounds', 'setNotes']) range[m] = () => range;
      return range;
    },
  };
  return sheet;
}

export function loadGas() {
  const sheets = new Map(), props = new Map(), files = new Map();
  const spreadsheet = {
    getSheetByName: n => sheets.get(n) || null,
    insertSheet: n => { const s = fakeSheet(n); sheets.set(n, s); return s; },
    getSheets: () => [...sheets.values()], deleteSheet() {}, getName: () => 'Moagem teste', getId: () => 'planilha',
    setSpreadsheetTimeZone() {}, getSpreadsheetTimeZone: () => 'America/Sao_Paulo',
  };
  const folder = {
    getFoldersByName: () => ({ hasNext: () => true, next: () => folder }),
    getFilesByName: name => { const f = [...files.values()].find(x => x.name === name); return { hasNext: () => Boolean(f), next: () => f.file }; },
    createFile: blob => { const id = `id${files.size + 1}`; const file = { getId: () => id, getBlob: () => blob }; files.set(id, { name: blob.name, file }); return file; },
  };
  const context = {
    console,
    SpreadsheetApp: { getActive: () => spreadsheet, flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
    DriveApp: { getRootFolder: () => folder, getFileById: id => files.get(id).file },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_, text) => [...createHash('sha256').update(text).digest()],
      base64EncodeWebSafe: v => Buffer.from(typeof v === 'string' ? v : v).toString('base64url'),
      base64Encode: v => Buffer.from(v).toString('base64'),
      base64Decode: v => [...Buffer.from(v, 'base64')],
      newBlob: (bytes, type, name) => ({ name, getContentType: () => type, getBytes: () => bytes }),
      getUuid: () => crypto.randomUUID(),
    },
  };
  vm.createContext(context);
  for (const file of ['Regras.js', 'Codigo.js']) vm.runInContext(readFileSync(new URL(`../gas/${file}`, import.meta.url), 'utf8'), context, { filename: file });
  for (const entidade of ['clientes', 'movimentacoes']) {
    const t = context.TABELAS[entidade];
    spreadsheet.insertSheet(t.aba).getRange(1, 1, 1, t.colunas.length).setValues([t.colunas.map(c => c[1])]);
  }
  spreadsheet.insertSheet('Registro');
  props.set('API_TOKEN', 'token-teste'); props.set('REV', '0');
  // Mesmo contrato HTTP do App da Web: corpo texto, resposta JSON.
  const post = body => JSON.parse(context.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).text);
  return { gas: context, sheets, props, files, post };
}

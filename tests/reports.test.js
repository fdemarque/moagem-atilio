import test from 'node:test';
import assert from 'node:assert/strict';
import { reportSections, reportDocument } from '../src/utils/reports.js';
import { legacyUuid } from '../src/lib/document.js';

const row = (n, extra) => ({ uuid: legacyUuid(`r${n}`), cliente: 'Ana', modulo: 'soja', tipo_movimentacao: 'IN', tipo_sacaria: 'unidade', quantidade: 10, peso_kg: null, data_movimentacao: '2026-11-03', documentos: [], updated_at: '2026-11-03T00:00:00.000Z', ...extra });
const state = { payload: { clientes: [{ uuid: legacyUuid('c'), nome: 'Bia', updated_at: '2026-11-01T00:00:00.000Z' }], movimentacoes: [
  row(1, { data_movimentacao: '2026-11-20' }),
  row(2, { tipo_movimentacao: 'OUT', quantidade: 4, data_movimentacao: '2026-11-05' }),
  row(3, { modulo: 'milho', tipo_sacaria: 'granel', quantidade: 1500, peso_kg: 1500, data_movimentacao: '2026-10-10' }),
  row(4, { cliente: 'Bia', data_movimentacao: '2026-11-08' }),
  row(5, { deleted_at: '2026-11-03T00:00:00.000Z' }),
] } };

test('PDF do cliente traz os três produtos, sem coluna de cliente, em ordem de data', () => {
  const sections = reportSections(state, '2026-11', null, 'Ana');
  assert.deepEqual(sections.map(s => s.module), ['milho', 'sacarias', 'soja']);
  const soja = sections[2];
  assert.ok(!soja.summaryHead.includes('Cliente'));
  assert.deepEqual(soja.summary, [['0', '10', '4', '6']], 'apagado não entra');
  assert.deepEqual(soja.movements.map(m => m[0]), ['05/11/2026', '20/11/2026']);
  assert.equal(soja.movements[0][3], '-4');
  assert.deepEqual(sections[0].summary, [['1.500', '0', '0', '1.500']], 'crédito do milho vem de outubro');
  assert.equal(sections[1].movements.length, 0);
});

test('relatório geral lista só clientes com saldo ou movimento em cada produto', () => {
  const [milho, sacarias, soja] = reportSections(state, '2026-11');
  assert.deepEqual(milho.summary.map(r => r[0]), ['Ana']);
  assert.deepEqual(sacarias.summary, []);
  assert.deepEqual(soja.summary.map(r => r[0]), ['Ana', 'Bia']);
  assert.ok(reportDocument(state, '2026-11').getNumberOfPages() >= 1);
});

test('textos do PDF usam só caracteres da fonte padrão (sem traços tipográficos)', () => {
  const text = reportSections(state, '2026-11', null, 'Ana').flatMap(s => [s.title, ...s.summaryHead, ...s.movementsHead, ...s.summary.flat(), ...s.movements.flat()]).join(' ');
  assert.doesNotMatch(text, /[^\u0000-\u00ff·]/, 'helvetica do jsPDF cobre só Latin-1');
});

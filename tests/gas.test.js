import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { monthlyBalance, legacyUuid } from '../src/lib/document.js';
import { loadGas } from './fake-gas.js';

const id = n => legacyUuid(`teste:${n}`);
const mov = (n, extra) => ({ uuid: id(n), cliente: 'Ana', modulo: 'soja', tipo_movimentacao: 'IN', tipo_sacaria: 'unidade', quantidade: 10, peso_kg: null, data_movimentacao: '2026-11-03', documentos: [], updated_at: '2026-11-03T10:00:00.000Z', ...extra });
const FOTO = 'data:image/png;base64,iVBORw0KGgo=';

function fixtures() {
  const rows = [];
  const dates = ['2026-08-15', '2026-09-30', '2026-10-01', '2026-10-20', '2026-11-02', '2026-12-10', '2027-01-05'];
  let n = 0;
  for (const modulo of ['milho', 'sacarias', 'soja']) for (const d of dates) for (const tipo of ['IN', 'OUT']) {
    rows.push(mov(n++, { modulo, data_movimentacao: d, tipo_movimentacao: tipo, quantidade: tipo === 'IN' && modulo === 'milho' ? 1234.5 : 7, tipo_sacaria: modulo === 'milho' ? (tipo === 'IN' ? 'granel' : n % 2 ? 'pequena' : 'normal') : 'unidade', peso_kg: null }));
  }
  rows.push(mov(n++, { deleted_at: '2026-11-03T10:00:00.000Z' }));
  const real = new URL('../backups/moagem-migracao-validada.json', import.meta.url);
  if (existsSync(real)) rows.push(...JSON.parse(readFileSync(real, 'utf8')).payload.movimentacoes);
  return rows;
}

test('regras da planilha equivalem às do app', () => {
  const { gas } = loadGas();
  const rows = fixtures();
  for (const cliente of new Set(rows.map(r => r.cliente))) for (const modulo of ['milho', 'sacarias', 'soja']) for (const mes of ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']) {
    const doCliente = rows.filter(r => r.cliente === cliente);
    const app = monthlyBalance(doCliente, modulo, mes), planilha = gas.balancoMensal(doCliente, modulo, mes);
    assert.deepEqual([planilha.abertura, planilha.entradas, planilha.saidas, planilha.fechamento], [app.opening, app.input, app.output, app.closing], `${cliente} ${modulo} ${mes}`);
  }
});

test('linha da planilha preserva o registro, inclusive campos antigos', () => {
  const { gas } = loadGas();
  const original = mov(1, { id: 42, observacao: 'legado', deleted_at: '2026-11-03T10:00:00.000Z' });
  const linha = gas.registroParaLinha('movimentacoes', original, 5);
  assert.equal(linha[4], 'Entrada');
  assert.deepEqual(JSON.parse(JSON.stringify(gas.linhaParaRegistro('movimentacoes', linha))), original);
  assert.equal(gas.validarRegistro('movimentacoes', { ...original, quantidade: 1.5 }), 'Quantidade deve ser inteira');
});

test('sincronização por revisão, conflitos e fotos no Drive', () => {
  const { post, files, sheets } = loadGas();
  assert.equal(post({ token: 'errado', acao: 'sincronizar' }).codigo, 'acesso');

  const a = post({ token: 'token-teste-0123456789', acao: 'sincronizar', desde: 0, clientes: [{ uuid: id('c'), nome: 'Ana', updated_at: '2026-11-01T00:00:00.000Z' }], movimentacoes: [mov(1, { documentos: [FOTO] }), mov(2)] });
  assert.equal(a.ok, true);
  assert.equal(a.cursor, 3);
  assert.equal(a.movimentacoes.length, 2);
  assert.deepEqual(a.movimentacoes.find(r => r.uuid === id(1)).documentos, [FOTO], 'foto volta como data URL');
  assert.equal(files.size, 1);
  assert.match(sheets.get('Movimentações').rows().find(r => r[0] === id(1))[8], /^https:\/\/drive\.google\.com\/file\/d\/id1\/view$/);

  // Nada novo: resposta vazia com o mesmo cursor.
  const b = post({ token: 'token-teste-0123456789', acao: 'sincronizar', desde: a.cursor });
  assert.deepEqual([b.movimentacoes.length, b.clientes.length, b.cursor], [0, 0, 3]);

  // Versão mais antiga é recusada e a planilha devolve a sua.
  const c = post({ token: 'token-teste-0123456789', acao: 'sincronizar', desde: 3, movimentacoes: [mov(2, { quantidade: 99, updated_at: '2026-11-02T00:00:00.000Z' })] });
  assert.equal(c.movimentacoes[0].quantidade, 10);
  assert.equal(c.cursor, 3);

  // Empate com exclusão: a exclusão vence.
  const d = post({ token: 'token-teste-0123456789', acao: 'sincronizar', desde: 3, movimentacoes: [mov(2, { deleted_at: '2026-11-03T10:00:00.000Z' })] });
  assert.equal(d.movimentacoes[0].deleted_at, '2026-11-03T10:00:00.000Z');
  assert.equal(d.cursor, 4);
  assert.equal(sheets.get('Movimentações').rows().length, 3, 'atualiza a linha existente');

  // Registro inválido é recusado sem interromper os demais.
  const e = post({ token: 'token-teste-0123456789', acao: 'sincronizar', desde: 4, movimentacoes: [mov(3, { quantidade: -1 }), mov(4)] });
  assert.equal(e.rejeitados.length, 1);
  assert.equal(e.movimentacoes.length, 1);
});

test('edição manual na planilha gera nova revisão', () => {
  const { post, gas, sheets } = loadGas();
  post({ token: 'token-teste-0123456789', acao: 'sincronizar', desde: 0, movimentacoes: [mov(1)] });
  const sh = sheets.get('Movimentações');
  sh.getRange(2, 6).setValue(15);
  gas.aoEditar({ range: sh.getRange(2, 6) });
  const r = post({ token: 'token-teste-0123456789', acao: 'sincronizar', desde: 1 });
  assert.equal(r.movimentacoes[0].quantidade, 15);
  assert.ok(r.movimentacoes[0].updated_at > '2026-11-03T10:00:00.000Z');
});

test('rotina diária: saldos, resumo, linhas inválidas, ordenação, backup e registro', () => {
  const { post, gas, sheets, files } = loadGas();
  const t = 'token-teste-0123456789';
  post({ token: t, acao: 'sincronizar', desde: 0,
    clientes: [{ uuid: id('c1'), nome: 'Bia', updated_at: '2026-11-01T00:00:00.000Z' }],
    movimentacoes: [
      mov(1, { data_movimentacao: '2026-10-02' }),
      mov(2, { modulo: 'milho', tipo_sacaria: 'granel', quantidade: 2000, peso_kg: 2000, data_movimentacao: '2026-10-05' }),
      mov(3, { modulo: 'milho', tipo_movimentacao: 'OUT', tipo_sacaria: 'pequena', quantidade: 4, peso_kg: 100, data_movimentacao: '2026-11-05' }),
      mov(4, { deleted_at: '2026-11-03T10:00:00.000Z' }),
    ] });
  // Linha quebrada à mão: quantidade com texto.
  const sh = sheets.get('Movimentações');
  sh.rows().push(gas.registroParaLinha('movimentacoes', mov(5), 99).map((v, i) => i === 5 ? 'dez' : v));

  gas.rotinaDiaria();

  const hoje = new Date().toISOString().slice(0, 10);
  const saldos = sheets.get('Saldos atuais').rows().slice(1);
  assert.deepEqual(JSON.parse(JSON.stringify(saldos)), [['Ana', gas.creditoAtual([mov(2, { modulo: 'milho', tipo_sacaria: 'granel', quantidade: 2000, peso_kg: 2000, data_movimentacao: '2026-10-05' }), mov(3, { modulo: 'milho', tipo_movimentacao: 'OUT', tipo_sacaria: 'pequena', quantidade: 4, peso_kg: 100, data_movimentacao: '2026-11-05' })], 'milho', hoje), 0, 10], ['Bia', 0, 0, 0]]);
  assert.equal(saldos[0][1], 1900, 'milho: 2000 kg - 4 sacos de 25 kg');
  const resumo = sheets.get('Resumo mensal').rows().slice(1);
  assert.ok(resumo.some(r => r[0] === '2026-11' && r[1] === 'Ana' && r[2] === 'milho' && r[3] === 2000 && r[6] === 1900));
  const datas = sh.rows().slice(1).map(r => r[1]);
  assert.deepEqual(datas, [...datas].sort().reverse(), 'ordenado por data, mais recente primeiro');
  assert.ok([...files.values()].some(f => /^moagem-\d{4}-\d{2}-\d{2}\.xlsx$/.test(f.name)), 'backup salvo');
  assert.match(String(sheets.get('Registro').rows()[1][2]), /1 linhas com problema/);
});

test('apagar pela planilha: preencher "Apagado em" vira exclusão válida nos aparelhos', () => {
  const { post, gas, sheets } = loadGas();
  const t = 'token-teste-0123456789';
  post({ token: t, acao: 'sincronizar', desde: 0, movimentacoes: [mov(1)] });
  const sh = sheets.get('Movimentações');
  sh.getRange(2, 11).setValue('sim');
  gas.aoEditar({ range: sh.getRange(2, 11) });
  const r = post({ token: t, acao: 'sincronizar', desde: 1 }).movimentacoes[0];
  assert.ok(r.deleted_at);
  assert.equal(r.deleted_at, r.updated_at);
  assert.equal(gas.validarRegistro('movimentacoes', r), '');
});

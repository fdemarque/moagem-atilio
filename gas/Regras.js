// Regras puras, sem serviços Google. Espelho de src/lib/document.js:
// tests/gas.test.js confere a equivalência. Alterar os dois juntos.

var MODULOS = ['milho', 'sacarias', 'soja'];
var NOMES_MODULO = { milho: 'Milho (kg)', sacarias: 'Sacarias vazias (unidades)', soja: 'Soja (sacos)' };

// [campo do app, cabeçalho na planilha, tipo]
var TABELAS = {
  movimentacoes: {
    aba: 'Movimentações',
    colunas: [
      ['uuid', 'ID', 'texto'],
      ['data_movimentacao', 'Data', 'texto'],
      ['cliente', 'Cliente', 'texto'],
      ['modulo', 'Módulo', 'texto'],
      ['tipo_movimentacao', 'Operação', 'operacao'],
      ['quantidade', 'Quantidade', 'numero'],
      ['tipo_sacaria', 'Tipo de saco', 'texto'],
      ['peso_kg', 'Peso (kg)', 'numero'],
      ['documentos', 'Comprovantes', 'lista'],
      ['updated_at', 'Atualizado em', 'texto'],
      ['deleted_at', 'Apagado em', 'texto'],
      ['rev', 'Revisão', 'numero'],
      ['extras', 'Outros dados', 'texto']
    ]
  },
  clientes: {
    aba: 'Clientes',
    colunas: [
      ['uuid', 'ID', 'texto'],
      ['nome', 'Nome', 'texto'],
      ['updated_at', 'Atualizado em', 'texto'],
      ['deleted_at', 'Apagado em', 'texto'],
      ['rev', 'Revisão', 'numero'],
      ['extras', 'Outros dados', 'texto']
    ]
  }
};

function indiceColuna(entidade, campo) {
  var cols = TABELAS[entidade].colunas;
  for (var i = 0; i < cols.length; i++) if (cols[i][0] === campo) return i;
  throw new Error('Coluna desconhecida: ' + campo);
}

function textoCelula(valor, campo, fuso) {
  if (valor === null || valor === undefined) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    if (campo === 'data_movimentacao') {
      return fuso ? Utilities.formatDate(valor, fuso, 'yyyy-MM-dd') : valor.toISOString().slice(0, 10);
    }
    return valor.toISOString();
  }
  return String(valor).trim();
}

// Registro do app -> linha. `documentos` já deve vir como links do Drive.
function registroParaLinha(entidade, registro, rev) {
  var cols = TABELAS[entidade].colunas, conhecidos = {}, extras = {}, temExtras = false;
  cols.forEach(function (c) { conhecidos[c[0]] = true; });
  Object.keys(registro).forEach(function (k) {
    if (!conhecidos[k]) { extras[k] = registro[k]; temExtras = true; }
  });
  return cols.map(function (c) {
    var campo = c[0], tipo = c[2], v = registro[campo];
    if (campo === 'rev') return rev;
    if (campo === 'extras') return temExtras ? JSON.stringify(extras) : '';
    if (tipo === 'operacao') return v === 'IN' ? 'Entrada' : v === 'OUT' ? 'Saída' : String(v || '');
    if (tipo === 'lista') return (v || []).join('\n');
    if (tipo === 'numero') return v === null || v === undefined || v === '' ? '' : Number(v);
    return v === null || v === undefined ? '' : String(v);
  });
}

// Linha -> registro do app (sem `rev`; extras reincorporados).
function linhaParaRegistro(entidade, valores, fuso) {
  var cols = TABELAS[entidade].colunas, r = {};
  var extras = textoCelula(valores[indiceColuna(entidade, 'extras')], 'extras');
  if (extras) {
    try { var e = JSON.parse(extras); Object.keys(e).forEach(function (k) { r[k] = e[k]; }); } catch (err) { /* marcado na verificação */ }
  }
  cols.forEach(function (c, i) {
    var campo = c[0], tipo = c[2], v = valores[i];
    if (campo === 'rev' || campo === 'extras') return;
    if (tipo === 'numero') { r[campo] = v === '' || v === null || v === undefined ? null : Number(v); return; }
    if (tipo === 'operacao') { var t = textoCelula(v); r[campo] = t === 'Entrada' ? 'IN' : t === 'Saída' ? 'OUT' : t; return; }
    if (tipo === 'lista') { r[campo] = textoCelula(v).split(/\s+/).filter(Boolean); return; }
    var texto = textoCelula(v, campo, fuso);
    r[campo] = campo === 'deleted_at' && !texto ? null : texto;
  });
  if (r.deleted_at === null) delete r.deleted_at;
  return r;
}

var PADRAO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var PADRAO_FOTO = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
var PADRAO_LINK = /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/view$/;

function dataValida(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
}

// Mesmas regras de validateDocument, por registro. Retorna mensagem ou ''.
function validarRegistro(entidade, r) {
  if (!r || !PADRAO_UUID.test(r.uuid)) return 'ID inválido';
  if (typeof r.updated_at !== 'string' || !isFinite(Date.parse(r.updated_at))) return 'Atualizado em inválido';
  if (r.deleted_at != null && (!isFinite(Date.parse(r.deleted_at)) || r.deleted_at !== r.updated_at)) return 'Apagado em deve ser igual a Atualizado em';
  if (entidade === 'clientes') return typeof r.nome === 'string' && r.nome.trim() ? '' : 'Nome vazio';
  if (MODULOS.indexOf(r.modulo) < 0) return 'Módulo deve ser milho, sacarias ou soja';
  if (typeof r.cliente !== 'string' || !r.cliente.trim()) return 'Cliente vazio';
  if (r.tipo_movimentacao !== 'IN' && r.tipo_movimentacao !== 'OUT') return 'Operação deve ser Entrada ou Saída';
  if (typeof r.quantidade !== 'number' || !isFinite(r.quantidade) || r.quantidade <= 0) return 'Quantidade inválida';
  if (!(r.modulo === 'milho' && r.tipo_movimentacao === 'IN') && Math.floor(r.quantidade) !== r.quantidade) return 'Quantidade deve ser inteira';
  if (!dataValida(r.data_movimentacao)) return 'Data inválida (use AAAA-MM-DD)';
  if (r.modulo === 'milho' && ['granel', 'normal', 'pequena'].indexOf(r.tipo_sacaria) < 0) return 'Tipo de saco do milho inválido';
  if (r.peso_kg != null && (typeof r.peso_kg !== 'number' || !isFinite(r.peso_kg) || r.peso_kg < 0)) return 'Peso inválido';
  if (!Array.isArray(r.documentos)) return 'Comprovantes inválidos';
  for (var i = 0; i < r.documentos.length; i++) {
    if (!PADRAO_FOTO.test(r.documentos[i]) && !PADRAO_LINK.test(r.documentos[i])) return 'Comprovante inválido';
  }
  return '';
}

// Vence o maior updated_at; empate com exclusão vence a exclusão.
// Nos demais empates a planilha mantém a sua versão e a devolve ao aparelho.
function recebidoVence(recebido, atual) {
  if (!atual) return true;
  var a = Date.parse(recebido.updated_at), b = Date.parse(atual.updated_at);
  if (a !== b) return a > b;
  return Boolean(recebido.deleted_at) && !atual.deleted_at;
}

function pesoKg(r) {
  if (r.peso_kg != null && Number(r.peso_kg) > 0) return Number(r.peso_kg);
  return r.tipo_movimentacao === 'IN' ? Number(r.quantidade) : Number(r.quantidade) * (r.tipo_sacaria === 'pequena' ? 25 : 50);
}
function quantia(r) { return r.modulo === 'milho' ? pesoKg(r) : r.quantidade; }
function comSinal(r) { return quantia(r) * (r.tipo_movimentacao === 'IN' ? 1 : -1); }

function balancoMensal(linhas, modulo, mes) {
  var ativos = linhas.filter(function (r) { return !r.deleted_at && r.modulo === modulo; });
  var doMes = ativos.filter(function (r) { return r.data_movimentacao.indexOf(mes) === 0; });
  // Outubro/2026 é a base validada do milho; meses anteriores seguem o balanço mensal antigo.
  var antes = ativos.filter(function (r) {
    return r.data_movimentacao < mes + '-01' && (modulo !== 'milho' || (mes > '2026-10' && r.data_movimentacao >= '2026-10-01'));
  });
  var soma = function (lista, f) { return lista.reduce(function (s, r) { return s + f(r); }, 0); };
  var abertura = soma(antes, comSinal);
  var entradas = soma(doMes.filter(function (r) { return r.tipo_movimentacao === 'IN'; }), quantia);
  var saidas = soma(doMes.filter(function (r) { return r.tipo_movimentacao === 'OUT'; }), quantia);
  return { abertura: abertura, entradas: entradas, saidas: saidas, fechamento: abertura + entradas - saidas };
}

// Mês do crédito atual: o maior entre o mês corrente e o último registro.
function mesAtual(linhas, modulo, hoje) {
  var mes = hoje.slice(0, 7);
  linhas.forEach(function (r) {
    if (!r.deleted_at && r.modulo === modulo && r.data_movimentacao.slice(0, 7) > mes) mes = r.data_movimentacao.slice(0, 7);
  });
  return mes;
}
function creditoAtual(linhas, modulo, hoje) {
  return balancoMensal(linhas, modulo, mesAtual(linhas, modulo, hoje)).fechamento;
}

function proximoMes(mes) {
  var a = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7)) + 1;
  if (m > 12) { m = 1; a++; }
  return a + '-' + (m < 10 ? '0' : '') + m;
}

// Linhas de "Resumo mensal": do primeiro mês com registro até o mês atual.
function resumoMensal(linhas, hoje) {
  var ativos = linhas.filter(function (r) { return !r.deleted_at; });
  var saida = [], pares = {};
  ativos.forEach(function (r) { pares[r.cliente + '\u0000' + r.modulo] = true; });
  Object.keys(pares).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); }).forEach(function (par) {
    var partes = par.split('\u0000'), cliente = partes[0], modulo = partes[1];
    var doCliente = ativos.filter(function (r) { return r.cliente === cliente; });
    var meses = doCliente.filter(function (r) { return r.modulo === modulo; }).map(function (r) { return r.data_movimentacao.slice(0, 7); }).sort();
    var fim = mesAtual(doCliente, modulo, hoje);
    for (var mes = meses[0]; mes <= fim; mes = proximoMes(mes)) {
      var b = balancoMensal(doCliente, modulo, mes);
      saida.push([mes, cliente, modulo, b.abertura, b.entradas, b.saidas, b.fechamento]);
    }
  });
  return saida.sort(function (a, b) { return b[0].localeCompare(a[0]) || a[1].localeCompare(b[1], 'pt-BR') || a[2].localeCompare(b[2]); });
}


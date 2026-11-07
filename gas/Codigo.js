// Moagem Atílio — API e rotinas da planilha. Regras puras em Regras.gs.
// Implantar como App da Web: executar como "Eu", acesso "Qualquer pessoa".
// Toda chamada exige o token guardado nas Propriedades do script.

var APP_URL = 'https://moagem-atilio.vercel.app';
var PASTA_RAIZ = 'Moagem Atílio';
var LIMITE_RESPOSTA = 20 * 1024 * 1024; // bytes aproximados de fotos por página
var DIAS_BACKUP = 60;
var VERSAO = '4'; // conferível em GET /exec

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Moagem')
    .addItem('Atualizar saldos e verificar agora', 'rotinaDiaria')
    .addItem('Link de conexão dos aparelhos', 'mostrarLinkConexao')
    .addItem('Trocar URL da implantação', 'trocarUrlImplantacao')
    .addItem('Instalar ou reparar', 'instalar')
    .addToUi();
}

// ---------- instalação ----------

function instalar() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('America/Sao_Paulo');
  Object.keys(TABELAS).forEach(function (entidade) {
    var t = TABELAS[entidade];
    var sh = prepararAba(ss, t.aba, t.colunas.map(function (c) { return c[1]; }));
    t.colunas.forEach(function (c, i) {
      if (c[2] !== 'numero') formatar(sh.getRange(1, i + 1, sh.getMaxRows(), 1), '@');
    });
  });
  prepararAba(ss, 'Saldos atuais', ['Cliente', NOMES_MODULO.milho, NOMES_MODULO.sacarias, NOMES_MODULO.soja]);
  prepararAba(ss, 'Resumo mensal', ['Mês', 'Cliente', 'Módulo', 'Crédito anterior', 'Entradas', 'Saídas', 'Crédito final']);
  prepararAba(ss, 'Registro', ['Data e hora', 'Ação', 'Detalhe']);
  ['Página1', 'Sheet1', 'Planilha1'].forEach(function (nome) {
    var sh = ss.getSheetByName(nome);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('API_TOKEN')) props.setProperty('API_TOKEN', novoToken());
  if (!props.getProperty('REV')) props.setProperty('REV', '0');
  pasta('Comprovantes');
  pasta('Backups');
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'rotinaDiaria' || t.getHandlerFunction() === 'aoEditar') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('rotinaDiaria').timeBased().everyDays(1).atHour(6).inTimezone('America/Sao_Paulo').create();
  ScriptApp.newTrigger('aoEditar').forSpreadsheet(ss).onEdit().create();
  registrar('Instalação', 'Abas, pastas, token e rotinas configurados.');
  return 'Instalação concluída.';
}

function prepararAba(ss, nome, cabecalho) {
  var sh = ss.getSheetByName(nome) || ss.insertSheet(nome);
  sh.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold').setBackground('#e8f5e9');
  sh.setFrozenRows(1);
  return sh;
}

function novoToken() {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now());
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '').slice(0, 32);
}

function pasta(nome) {
  var raiz = encontrarPasta(DriveApp.getRootFolder(), PASTA_RAIZ);
  return nome ? encontrarPasta(raiz, nome) : raiz;
}
function encontrarPasta(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

// ---------- API ----------

function doGet() {
  return ContentService.createTextOutput('Moagem Atílio: serviço ativo (versão ' + VERSAO + ').');
}

function doPost(e) {
  var saida;
  try {
    var pedido = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
    if (!token || pedido.token !== token) saida = { ok: false, codigo: 'acesso', erro: 'Código de conexão inválido.' };
    else if (pedido.acao === 'sincronizar') saida = sincronizar(pedido);
    else if (pedido.acao === 'verificar') saida = { ok: true, planilha: SpreadsheetApp.getActive().getName() };
    else saida = { ok: false, erro: 'Ação desconhecida.' };
  } catch (err) {
    console.error(err);
    saida = { ok: false, erro: 'Falha na planilha: ' + err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(saida)).setMimeType(ContentService.MimeType.JSON);
}

function comTrava(fn) {
  var trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try { return fn(); } finally { trava.releaseLock(); }
}

function sincronizar(pedido) {
  return comTrava(function () {
    var props = PropertiesService.getScriptProperties();
    var rev = Number(props.getProperty('REV') || 0);
    var devolver = { clientes: {}, movimentacoes: {} }, rejeitados = [];
    Object.keys(TABELAS).forEach(function (entidade) {
      var recebidos = pedido[entidade] || [];
      if (!recebidos.length) return;
      var sh = aba(entidade), tabela = lerTabela(entidade), porId = {}, novas = [];
      tabela.forEach(function (item) { porId[item.registro.uuid] = item; });
      recebidos.forEach(function (registro) {
        var erro = validarRegistro(entidade, registro);
        if (erro) { rejeitados.push({ uuid: registro && registro.uuid, erro: erro }); return; }
        var atual = porId[registro.uuid];
        if (atual && !recebidoVence(registro, atual.registro)) { devolver[entidade][registro.uuid] = atual.registro; return; }
        rev++;
        var linha = registroParaLinha(entidade, comFotosNoDrive(registro), rev);
        if (atual && atual.nova != null) novas[atual.nova] = linha;
        else if (atual) escreverLinha(sh, atual.linha, linha);
        else { porId[registro.uuid] = { nova: novas.length, registro: registro }; novas.push(linha); }
      });
      if (novas.length) {
        var inicio = Math.max(sh.getLastRow(), 1) + 1;
        if (sh.getMaxRows() < inicio + novas.length - 1) sh.insertRowsAfter(sh.getMaxRows(), novas.length);
        escreverLinha(sh, inicio, novas);
      }
    });
    props.setProperty('REV', String(rev));
    if (rejeitados.length) registrar('Registros recusados', JSON.stringify(rejeitados).slice(0, 2000));
    SpreadsheetApp.flush();
    return Object.assign({ ok: true, rejeitados: rejeitados }, coletarAlteracoes(Number(pedido.desde) || 0, rev, devolver));
  });
}

function aba(entidade) {
  var sh = SpreadsheetApp.getActive().getSheetByName(TABELAS[entidade].aba);
  if (!sh) throw new Error('Aba ' + TABELAS[entidade].aba + ' não encontrada. Use Moagem → Instalar ou reparar.');
  return sh;
}

function lerTabela(entidade) {
  var sh = aba(entidade), n = sh.getLastRow() - 1, cols = TABELAS[entidade].colunas.length;
  if (n < 1) return [];
  var fuso = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  var iRev = indiceColuna(entidade, 'rev');
  return sh.getRange(2, 1, n, cols).getValues().map(function (valores, i) {
    return { linha: i + 2, rev: Number(valores[iRev]) || 0, registro: linhaParaRegistro(entidade, valores, fuso) };
  }).filter(function (item) { return item.registro.uuid; });
}

function escreverLinha(sh, inicio, linhas) {
  if (!Array.isArray(linhas[0])) linhas = [linhas];
  sh.getRange(inicio, 1, linhas.length, linhas[0].length).setValues(linhas);
}
// Formatação é cosmética e opcional. Abas convertidas em tabela do Sheets têm
// colunas tipadas que recusam formato de número; o erro só aparece quando o
// Sheets aplica as operações pendentes, por isso o flush fica dentro do try.
function formatar(faixa, formato) {
  try { faixa.setNumberFormat(formato); SpreadsheetApp.flush(); }
  catch (err) { console.warn('Formatação ignorada: ' + err.message); }
  return faixa;
}

// Registros com revisão posterior ao cursor do aparelho, mais os devolvidos
// em conflito. Fotos voltam como data URL para uso sem internet.
function coletarAlteracoes(desde, rev, devolver) {
  var itens = [];
  Object.keys(TABELAS).forEach(function (entidade) {
    lerTabela(entidade).forEach(function (item) {
      if (item.rev > desde && validarRegistro(entidade, item.registro) === '') itens.push({ entidade: entidade, rev: item.rev, registro: item.registro });
      else if (devolver[entidade][item.registro.uuid]) itens.push({ entidade: entidade, rev: 0, registro: item.registro });
    });
  });
  itens.sort(function (a, b) { return a.rev - b.rev; });
  var saida = { clientes: [], movimentacoes: [], cursor: rev, mais: false }, bytes = 0;
  for (var i = 0; i < itens.length; i++) {
    var item = itens[i], registro = comFotosEmDados(item.registro);
    bytes += JSON.stringify(registro).length;
    saida[item.entidade].push(registro);
    if (bytes > LIMITE_RESPOSTA && i < itens.length - 1 && item.rev > desde) {
      saida.cursor = item.rev;
      saida.mais = true;
      break;
    }
  }
  return saida;
}

// ---------- comprovantes ----------

function comFotosNoDrive(registro) {
  if (!registro.documentos || !registro.documentos.length) return registro;
  var copia = JSON.parse(JSON.stringify(registro));
  copia.documentos = registro.documentos.map(salvarFoto);
  return copia;
}

function salvarFoto(foto) {
  var m = /^data:(image\/(png|jpeg|webp|gif));base64,(.+)$/.exec(foto);
  if (!m) return foto; // já é link do Drive
  var resumo = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, m[3]);
  var nome = Utilities.base64EncodeWebSafe(resumo).replace(/[=_-]/g, '').slice(0, 24) + '.' + (m[2] === 'jpeg' ? 'jpg' : m[2]);
  var destino = pasta('Comprovantes'), it = destino.getFilesByName(nome);
  var arquivo = it.hasNext() ? it.next() : destino.createFile(Utilities.newBlob(Utilities.base64Decode(m[3]), m[1], nome));
  return 'https://drive.google.com/file/d/' + arquivo.getId() + '/view';
}

function comFotosEmDados(registro) {
  if (!registro.documentos || !registro.documentos.length) return registro;
  var copia = JSON.parse(JSON.stringify(registro));
  copia.documentos = registro.documentos.map(function (link) {
    var id = (/\/d\/([\w-]+)/.exec(link) || [])[1];
    if (!id) return null;
    try {
      var blob = DriveApp.getFileById(id).getBlob();
      return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
    } catch (err) {
      registrar('Comprovante não encontrado', registro.uuid + ' ' + link);
      return null;
    }
  }).filter(Boolean);
  return copia;
}

// ---------- edição direta na planilha ----------

// Gatilho instalável: uma edição manual vira nova versão do registro e chega aos aparelhos.
function aoEditar(e) {
  var sh = e.range.getSheet(), entidade = null;
  Object.keys(TABELAS).forEach(function (k) { if (TABELAS[k].aba === sh.getName()) entidade = k; });
  if (!entidade || e.range.getRow() < 2) return;
  var iAtual = indiceColuna(entidade, 'updated_at') + 1, iApagado = indiceColuna(entidade, 'deleted_at') + 1, iRev = indiceColuna(entidade, 'rev') + 1;
  if (e.range.getNumColumns() === 1 && (e.range.getColumn() === iAtual || e.range.getColumn() === iRev)) return;
  comTrava(function () {
    var props = PropertiesService.getScriptProperties(), rev = Number(props.getProperty('REV') || 0);
    var agora = new Date();
    for (var linha = e.range.getRow(); linha < e.range.getRow() + e.range.getNumRows(); linha++) {
      if (!sh.getRange(linha, 1).getValue()) continue;
      var anterior = Date.parse(sh.getRange(linha, iAtual).getValue()) || 0;
      var carimbo = new Date(Math.max(agora.getTime(), anterior + 1)).toISOString();
      rev++;
      sh.getRange(linha, iAtual).setValue(carimbo);
      if (sh.getRange(linha, iApagado).getValue()) sh.getRange(linha, iApagado).setValue(carimbo);
      sh.getRange(linha, iRev).setValue(rev);
    }
    props.setProperty('REV', String(rev));
  });
}

// ---------- rotina diária ----------

function rotinaDiaria() {
  comTrava(function () {
    var ss = SpreadsheetApp.getActive();
    var hoje = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd');
    var problemas = verificarTabelas();
    var movimentos = lerTabela('movimentacoes').map(function (i) { return i.registro; })
      .filter(function (r) { return validarRegistro('movimentacoes', r) === ''; });
    var clientes = lerTabela('clientes').map(function (i) { return i.registro; })
      .filter(function (c) { return !c.deleted_at && c.nome; }).map(function (c) { return c.nome; });
    movimentos.forEach(function (r) { if (!r.deleted_at && clientes.indexOf(r.cliente) < 0) clientes.push(r.cliente); });
    clientes.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });

    var saldos = clientes.map(function (nome) {
      var doCliente = movimentos.filter(function (r) { return r.cliente === nome; });
      return [nome].concat(MODULOS.map(function (m) { return creditoAtual(doCliente, m, hoje); }));
    });
    reescrever(ss.getSheetByName('Saldos atuais'), saldos, 4);
    reescrever(ss.getSheetByName('Resumo mensal'), resumoMensal(movimentos, hoje), 7);
    ordenarMovimentacoes();
    var backup = salvarBackup(hoje);
    registrar('Rotina diária', clientes.length + ' clientes, ' + movimentos.length + ' movimentações, ' + problemas + ' linhas com problema. Backup: ' + backup);
  });
}

function reescrever(sh, linhas, colunas) {
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, colunas).clearContent();
  if (linhas.length) sh.getRange(2, 1, linhas.length, colunas).setValues(linhas);
  formatar(sh.getRange(2, 2, Math.max(linhas.length, 1), colunas - 1), '#,##0.###');
  if (sh.getName() === 'Resumo mensal') formatar(sh.getRange(2, 1, Math.max(linhas.length, 1), 3), '@');
}

// Pinta de vermelho as linhas inválidas (com nota explicando) e de cinza as apagadas.
function verificarTabelas() {
  var problemas = 0;
  Object.keys(TABELAS).forEach(function (entidade) {
    var sh = aba(entidade), itens = lerTabela(entidade), vistos = {};
    if (!itens.length) return;
    var cols = TABELAS[entidade].colunas.length, n = sh.getLastRow() - 1;
    var cores = [], notas = [];
    for (var i = 0; i < n; i++) { cores.push(new Array(cols).fill(null)); notas.push(new Array(cols).fill('')); }
    itens.forEach(function (item) {
      var erro = validarRegistro(entidade, item.registro);
      if (!erro && vistos[item.registro.uuid]) erro = 'ID repetido';
      vistos[item.registro.uuid] = true;
      var cor = erro ? '#f8d7da' : item.registro.deleted_at ? '#eeeeee' : null;
      cores[item.linha - 2] = new Array(cols).fill(cor);
      notas[item.linha - 2][0] = erro;
      if (erro) problemas++;
    });
    sh.getRange(2, 1, n, cols).setBackgrounds(cores);
    sh.getRange(2, 1, n, cols).setNotes(notas);
  });
  return problemas;
}

function ordenarMovimentacoes() {
  var sh = aba('movimentacoes');
  if (sh.getLastRow() > 2) {
    sh.getRange(2, 1, sh.getLastRow() - 1, TABELAS.movimentacoes.colunas.length)
      .sort([{ column: indiceColuna('movimentacoes', 'data_movimentacao') + 1, ascending: false }, { column: indiceColuna('movimentacoes', 'cliente') + 1, ascending: true }]);
  }
}

// Cópia .xlsx da planilha inteira. Mantém 60 dias e o dia 1 de cada mês.
function salvarBackup(hoje) {
  var ss = SpreadsheetApp.getActive(), destino = pasta('Backups');
  var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  var resposta = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (resposta.getResponseCode() !== 200) throw new Error('Backup não gerado (HTTP ' + resposta.getResponseCode() + ').');
  var nome = 'moagem-' + hoje + '.xlsx';
  var antigos = destino.getFilesByName(nome);
  while (antigos.hasNext()) antigos.next().setTrashed(true);
  destino.createFile(resposta.getBlob().setName(nome));
  var limite = new Date(Date.now() - DIAS_BACKUP * 86400000);
  var todos = destino.getFiles();
  while (todos.hasNext()) {
    var f = todos.next(), m = /^moagem-(\d{4}-\d{2})-(\d{2})\.xlsx$/.exec(f.getName());
    if (m && m[2] !== '01' && f.getDateCreated() < limite) f.setTrashed(true);
  }
  return nome;
}

function registrar(acao, detalhe) {
  var sh = SpreadsheetApp.getActive().getSheetByName('Registro');
  if (!sh) return;
  sh.insertRowAfter(1);
  sh.getRange(2, 1, 1, 3).setValues([[new Date(), acao, detalhe]]);
  if (sh.getLastRow() > 1001) sh.deleteRows(1002, sh.getLastRow() - 1001);
}

// ---------- conexão dos aparelhos ----------

// A URL vem de Implantar → Gerenciar implantações (App da Web, termina em /exec).
// getService().getUrl() pode devolver a URL de teste (/dev), cujo ID é outro.
var PADRAO_EXEC = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;

function urlImplantacao(perguntar) {
  var props = PropertiesService.getScriptProperties(), url = props.getProperty('WEBAPP_URL');
  if (url && PADRAO_EXEC.test(url) && !perguntar) return url;
  var ui = SpreadsheetApp.getUi();
  var resposta = ui.prompt('URL do App da Web', 'Cole a URL de Implantar → Gerenciar implantações → App da Web (termina em /exec):', ui.ButtonSet.OK_CANCEL);
  if (resposta.getSelectedButton() !== ui.Button.OK) throw new Error('Conexão cancelada.');
  url = resposta.getResponseText().trim();
  if (!PADRAO_EXEC.test(url)) throw new Error('URL inválida. Ela começa com https://script.google.com/macros/s/ e termina em /exec.');
  props.setProperty('WEBAPP_URL', url);
  return url;
}

function codigoConexao(url) {
  var token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  return Utilities.base64EncodeWebSafe(JSON.stringify({ u: url, t: token })).replace(/=+$/, '');
}

function trocarUrlImplantacao() { urlImplantacao(true); mostrarLinkConexao(); }

function mostrarLinkConexao() {
  var codigo = codigoConexao(urlImplantacao(false)), link = APP_URL + '/#conectar=' + codigo;
  var html = HtmlService.createHtmlOutput(
    '<p style="font:16px sans-serif">Abra este link uma vez em cada aparelho:</p>' +
    '<textarea readonly style="width:100%;height:90px;font:14px monospace">' + link + '</textarea>' +
    '<p style="font:16px sans-serif">Ou cole este código em Configurações → Conectar este aparelho:</p>' +
    '<textarea readonly style="width:100%;height:70px;font:14px monospace">' + codigo + '</textarea>' +
    '<p style="font:14px sans-serif;color:#555">Não compartilhe com outras pessoas. Para trocar o código, apague API_TOKEN nas Propriedades do script e use Instalar ou reparar.</p>'
  ).setWidth(520).setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(html, 'Conexão dos aparelhos');
}

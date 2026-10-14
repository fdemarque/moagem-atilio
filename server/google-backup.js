import { createHash } from 'node:crypto';
import { MODULES, validateDocument, monthlyBalance, amount } from '../src/lib/document.js';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const folderMime = 'application/vnd.google-apps.folder';
const digest = value => createHash('sha256').update(value).digest('hex');
const literal = value => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
const idPath = id => encodeURIComponent(id);

export function backupTables(document) {
  validateDocument(document);
  const { clientes, movimentacoes } = document.payload;
  const tables = [{ title: 'Clientes', values: [['UUID','Cliente','Atualizado em','Excluído em'], ...clientes.map(c => [c.uuid,c.nome,c.updated_at,c.deleted_at || ''])] }];
  for (const module of MODULES) tables.push({
    title: {milho:'Milho',sacarias:'Sacarias',soja:'Soja'}[module],
    values: [['UUID','Cliente','Data','Operação','Quantidade informada','Tipo de saco','Movimento no estoque','Unidade do estoque','Atualizado em','Excluído em','Fotos no JSON'], ...movimentacoes.filter(r => r.modulo === module).map(r => [r.uuid,r.cliente,r.data_movimentacao,r.tipo_movimentacao === 'IN' ? 'Entrada' : 'Saída',r.quantidade,r.tipo_sacaria || '',amount(r),module === 'milho' ? 'kg' : module === 'soja' ? 'sacos' : 'unidades',r.updated_at,r.deleted_at || '',r.documentos.length])],
  });
  const balances = [['Cliente','Produto','Mês','Crédito anterior','Entradas','Saídas','Crédito final','Unidade']];
  const active = movimentacoes.filter(r => !r.deleted_at);
  for (const name of [...new Set([...clientes.filter(c => !c.deleted_at).map(c => c.nome),...active.map(r => r.cliente)])].sort()) {
    for (const module of MODULES) {
      const rows = active.filter(r => r.cliente === name && r.modulo === module);
      for (const month of [...new Set(rows.map(r => r.data_movimentacao.slice(0,7)))].sort()) {
        const b = monthlyBalance(rows,module,month);
        balances.push([name,module,month,b.opening,b.input,b.output,b.closing,module === 'milho' ? 'kg' : module === 'soja' ? 'sacos' : 'unidades']);
      }
    }
  }
  tables.push({title:'Balanços',values:balances});
  tables.push({title:'Metadados',values:[['Campo','Valor'],['Aplicativo',document.app],['Schema',document.schema_version],['Atualizado em',document.last_updated],['Clientes (inclui exclusões)',clientes.length],['Movimentos (inclui exclusões)',movimentacoes.length],['Recuperação','Use o JSON completo. Fotos e todos os metadados permanecem no JSON.']]});
  return tables;
}

// Server-only adapter. The caller supplies short-lived credentials from the
// application's own OAuth authorization, never the Codex user's connection.
export function createGoogleBackup({ getAccessToken, expectedAccount, fetchImpl = fetch }) {
  if (!expectedAccount || typeof getAccessToken !== 'function') throw new Error('Conta e autorização Google do aplicativo precisam ser configuradas.');
  async function authorizedSession() {
    const token = await getAccessToken();
    if (!token || typeof token !== 'string') throw new Error('Autorização Google indisponível.');
    async function request(url, options = {}, raw = false) {
      if (!['www.googleapis.com','sheets.googleapis.com'].includes(new URL(url).hostname) || new URL(url).protocol !== 'https:') throw new Error('Destino Google inválido.');
      const response = await fetchImpl(url,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers},signal:AbortSignal.timeout(30000),redirect:'error'});
      if (!response.ok) throw new Error(`Google respondeu HTTP ${response.status}. A cópia anterior foi preservada.`);
      if (raw) return response;
      return response.status === 204 ? null : response.json();
    }
    const profile = await request(`${DRIVE}/about?fields=user(emailAddress)`);
    if (profile.user?.emailAddress?.toLowerCase() !== expectedAccount.toLowerCase()) throw new Error('A conta Google autorizada não é a conta exclusiva do moinho. Nenhum arquivo foi gravado.');
    return request;
  }
  const jsonOptions = (method,body) => ({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  async function find(request,q) {
    let cursor;
    do {
      const params = new URLSearchParams({q:`trashed=false and (${q})`,fields:'nextPageToken,files(id,name,parents,appProperties)',pageSize:'100',...(cursor ? {pageToken:cursor} : {})});
      const result = await request(`${DRIVE}/files?${params}`);
      if(result.files?.length) return result.files[0];
      cursor = result.nextPageToken;
    } while(cursor);
    return null;
  }
  async function ensureFolder(request,kind,name,parent = null) {
    const q = `mimeType=${literal(folderMime)} and appProperties has { key='moagemKind' and value=${literal(kind)} }${parent ? ` and ${literal(parent)} in parents` : ''}`;
    return await find(request,q) || request(`${DRIVE}/files?fields=id,name`,jsonOptions('POST',{name,mimeType:folderMime,appProperties:{moagemKind:kind},...(parent ? {parents:[parent]} : {})}));
  }
  async function prepare(request) {
    const root = await ensureFolder(request,'root','Moagem Atílio');
    const json = await ensureFolder(request,'json','Backups JSON',root.id);
    const sheets = await ensureFolder(request,'sheets','Planilhas',root.id);
    const archives = await ensureFolder(request,'archives','Histórico',root.id);
    return {root:root.id,json:json.id,sheets:sheets.id,archives:archives.id};
  }
  async function verifyJson(request,fileId,hash) {
    const response = await request(`${DRIVE}/files/${idPath(fileId)}?alt=media`,{},true);
    if (digest(await response.text()) !== hash) throw new Error('A conferência do JSON no Drive falhou. O arquivamento não pode prosseguir.');
  }
  return {
    async prepareFolders() { const request = await authorizedSession(); return prepare(request); },
    async saveSnapshot(document,{historical=false}={}) {
      validateDocument(document);
      const request = await authorizedSession();
      const folders = await prepare(request);
      const contents = JSON.stringify(document);
      const hash = digest(contents);
      const query = `appProperties has { key='moagemSnapshot' and value=${literal(hash)} }`;
      const targetFolder=historical?folders.archives:folders.json;
      let jsonFile = await find(request,`${query} and ${literal(targetFolder)} in parents`);
      if (!jsonFile) {
        const metadata = {name:`moagem-${document.last_updated.replace(/[:.]/g,'-')}-${hash.slice(0,12)}.json`,mimeType:'application/json',parents:[targetFolder],appProperties:{moagemSnapshot:hash}};
        const initial = await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name', {...jsonOptions('POST',metadata),headers:{'Content-Type':'application/json','X-Upload-Content-Type':'application/json','X-Upload-Content-Length':String(Buffer.byteLength(contents))}},true);
        const location = initial.headers.get('location');
        if (!location) throw new Error('O Google não informou o endereço de upload.');
        jsonFile = await request(location,{method:'PUT',headers:{'Content-Type':'application/json'},body:contents});
      }
      await verifyJson(request,jsonFile.id,hash);
      // Sheet completion is marked only after values are written and checked.
      let sheet = await find(request,`${query} and ${literal(folders.sheets)} in parents`);
      if (!sheet || sheet.appProperties?.moagemComplete !== 'true') {
        const tables = backupTables(document);
        if(!sheet) {
          const created = await request(SHEETS,jsonOptions('POST',{properties:{title:`Moagem Atílio — ${document.last_updated.slice(0,10)} — ${hash.slice(0,12)}`},sheets:tables.map(t => ({properties:{title:t.title,gridProperties:{rowCount:Math.max(t.values.length,1000),columnCount:12,frozenRowCount:1}}}))}));
          sheet = {id:created.spreadsheetId};
          const metadata = await request(`${DRIVE}/files/${idPath(sheet.id)}?fields=parents`);
          const params = new URLSearchParams({addParents:folders.sheets,fields:'id',...(metadata.parents?.length ? {removeParents:metadata.parents.join(',')} : {})});
          await request(`${DRIVE}/files/${idPath(sheet.id)}?${params}`,jsonOptions('PATCH',{appProperties:{moagemSnapshot:hash,moagemComplete:'false'}}));
        }
        for(const table of tables) {
          for(let offset=0;offset<table.values.length;offset+=1000) await request(`${SHEETS}/${idPath(sheet.id)}/values:batchUpdate`,jsonOptions('POST',{valueInputOption:'RAW',data:[{range:`'${table.title}'!A${offset+1}`,majorDimension:'ROWS',values:table.values.slice(offset,offset+1000)}]}));
          const params = new URLSearchParams({valueRenderOption:'UNFORMATTED_VALUE'});
          const checked = await request(`${SHEETS}/${idPath(sheet.id)}/values/${encodeURIComponent(`'${table.title}'!A1:L${table.values.length}`)}?${params}`);
          const trim = rows => rows.map(row => {const cells=[...row];while(cells.at(-1)==='') cells.pop();return cells;});
          if (JSON.stringify(trim(checked.values || [])) !== JSON.stringify(trim(table.values))) throw new Error('A conferência da planilha falhou. O JSON completo está preservado.');
        }
        await request(`${DRIVE}/files/${idPath(sheet.id)}?fields=id`,jsonOptions('PATCH',{appProperties:{moagemSnapshot:hash,moagemComplete:'true'}}));
      }
      return {verified:true,hash,jsonId:jsonFile.id,spreadsheetId:sheet.id,folders};
    },
  };
}

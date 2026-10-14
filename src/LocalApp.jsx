import React, { useEffect, useState, useRef } from 'react';
import { Wheat, PackageOpen, Bean, ChevronRight, ArrowLeft, ArrowDown, ArrowUp, Download, Share2, Trash2, Home } from 'lucide-react';
import { initializeStorage, readDocument, addClient, deleteMovement, importDocument, jsonFile, downloadFile, listBackups, recoverBackup } from './lib/storage.js';
import { MODULES, monthlyBalance, signed } from './lib/document.js';
import MovementForm, { localToday } from './components/MovementForm';
import Dialog from './components/Dialog';
import { startSync } from './lib/sync.js';
const titles = { milho: 'Milho', sacarias: 'Sacarias vazias', soja: 'Soja' };
const units = { milho: 'kg', sacarias: 'unidades', soja: 'sacos' };
const icons = { milho: Wheat, sacarias: PackageOpen, soja: Bean };
const descriptions = { milho: 'Entradas em quilos · Saídas em sacos', sacarias: 'Entradas e saídas de sacarias vazias', soja: 'Entradas e saídas de sacos de soja' };
const fmt = n => n.toLocaleString('pt-BR');
export default function App() {
  const [state,setState] = useState(null), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [module,setModule] = useState(null), [client,setClient] = useState(null), [search,setSearch] = useState('');
  const [month,setMonth] = useState(localToday().slice(0,7)), [modal,setModal] = useState(null);
  const [newName,setNewName] = useState(''), [busy,setBusy] = useState(false);
  const [install,setInstall] = useState(null), [offlineReady,setOfflineReady] = useState(false);
  const [maintenance,setMaintenance] = useState(false);
  const [syncStatus,setSyncStatus] = useState({kind:'setup',text:'Dados salvos neste aparelho.'});
  const [accessCode,setAccessCode] = useState('');
  const sync = useRef(null);
  const [updateWorker,setUpdateWorker] = useState(null);
  useEffect(() => {
    let disposed=false;
    initializeStorage().then(doc=>{setState(doc);if(!disposed)sync.current=startSync(setSyncStatus);}).catch(err => setError(`Não foi possível abrir os dados: ${err.message}`));
    const refresh = () => readDocument().then(doc => {if(doc) setState(doc);}).catch(err => setError(err.message));
    window.addEventListener('moagem-change',refresh); window.addEventListener('focus',refresh);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('moagem-atilio') : null;
    if(channel) channel.onmessage = refresh;
    const announce = () => channel?.postMessage('changed'); window.addEventListener('moagem-change',announce);
    const installHandler = event => { event.preventDefault(); setInstall(event); };
    window.addEventListener('beforeinstallprompt',installHandler);
    const readyHandler = () => setOfflineReady(true); window.addEventListener('moagem-offline-ready',readyHandler);
    const updateHandler = event => setUpdateWorker(event.detail); window.addEventListener('moagem-update-ready',updateHandler);
    if(import.meta.env.PROD) navigator.serviceWorker?.ready.then(() => setOfflineReady(true)).catch(() => {});
    return () => { disposed=true;sync.current?.stop();window.removeEventListener('moagem-change',refresh); window.removeEventListener('moagem-change',announce); window.removeEventListener('focus',refresh); window.removeEventListener('beforeinstallprompt',installHandler); window.removeEventListener('moagem-offline-ready',readyHandler); window.removeEventListener('moagem-update-ready',updateHandler); channel?.close(); };
  }, []);
  async function action(work, success) {
    setError(''); setBusy(true);
    try { await work(); if(success) setNotice(success); } catch(err) { setError(err.message || 'Não foi possível concluir. Tente novamente.'); } finally { setBusy(false); }
  }
  const rows = state?.payload.movimentacoes.filter(r => !r.deleted_at) || [];
  const names = [...new Set([...(state?.payload.clientes.filter(c => !c.deleted_at).map(c => c.nome) || []),...rows.map(r => r.cliente)])].sort((a,b) => a.localeCompare(b,'pt-BR'));
  const balance = module ? monthlyBalance(rows.filter(r => r.cliente === client),module,month) : null;
  async function pdf(key,person,share=false) { const { exportReport } = await import('./utils/reports.js'); await exportReport(state,month,key,person,share); }
  function moveMonth(delta) { const [year,m] = month.split('-').map(Number); const date = new Date(year,m-1+delta,1); setMonth(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`); }
  function goHome() { setModule(null); setClient(null); setSearch(''); setError(''); setMaintenance(false); }
  async function exportJson(share=false) {
    const file=jsonFile(await readDocument());
    if(share && navigator.canShare?.({files:[file]})) {try {await navigator.share({files:[file],title:'Backup Moagem Atílio'});return;} catch(err){if(err.name === 'AbortError') return;}}
    downloadFile(file,file.name);
  }
  async function importFile(event) {
    const file=event.target.files?.[0];event.target.value='';
    if(file) action(async () => {if(file.size > 100*1024*1024) throw new Error('Arquivo acima de 100 MB.');const result=await importDocument(await file.text());setState(result.document);setNotice(`Importação concluída: ${result.added} registros novos e ${result.updated} atualizados.`);});
  }
  return <div className="app">
    <header><div className="header-inner"><button className="brand" onClick={goHome} aria-label="Moagem Atílio — início"><Wheat size={32} /><span>Moagem Atílio<small>Controle de estoque</small></span></button>{module && <button className="secondary" onClick={goHome}><Home size={21} /> Início</button>}</div></header>
    <main className="stack">
      {updateWorker && <div className="notice"><p>Uma nova versão está pronta.</p><button className="secondary" disabled={Boolean(modal) || busy} onClick={() => { navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once:true });updateWorker.postMessage('ACTIVATE_UPDATE'); }}>Atualizar aplicativo</button></div>}
      {error && <div className="error" role="alert">{error}{!state && <button className="secondary" onClick={() => action(async () => setState(await initializeStorage()))}>Tentar novamente</button>}</div>}
      {notice && <div className="notice" role="status">{notice}<button className="secondary" onClick={() => setNotice('')}>Entendi</button></div>}
      {!state ? <p>Preparando seus dados com segurança…</p> : !module ? <>
        <div><p className="eyebrow">Bem-vindo ao moinho</p><h1>O que vamos registrar?</h1><p className="muted">Toque no produto para ver clientes e estoque.</p></div>
        <div className="module-list">{MODULES.map(key => { const Icon = icons[key]; return <button className={`module-card ${key}`} key={key} onClick={() => {setModule(key);setSearch('');}}><span className="module-icon"><Icon size={38} strokeWidth={2} /></span><span><strong>{titles[key]}</strong><small>{descriptions[key]}</small></span><ChevronRight aria-hidden="true" /></button>; })}</div>
        <section className="card stack"><h2>Relatório geral</h2><p className="muted">Milho, sacarias e soja em um único PDF.</p><label>Mês do relatório<input aria-label="Mês do relatório" type="month" value={month} onChange={e => {if(e.target.value) setMonth(e.target.value);}} /></label><button className="primary" disabled={busy} onClick={() => action(() => pdf(null,null))}><Download /> Baixar relatório geral</button><button className="secondary" disabled={busy} onClick={() => action(() => pdf(null,null,true))}><Share2 /> Compartilhar relatório geral</button></section>
        <p className="muted" role="status">{rows.length} registros · {names.length} clientes<br />{syncStatus.text}{offlineReady && <><br />Funciona sem internet.</>}</p>
        {syncStatus.kind === 'access' && <button className="secondary" onClick={()=>{setAccessCode('');setModal({kind:'connect'});}}>Conectar este aparelho</button>}
        {syncStatus.kind === 'error' && <button className="secondary" onClick={()=>sync.current?.retry()}>Tentar enviar a cópia novamente</button>}
        {install && <button className="primary" onClick={() => action(async () => {await install.prompt();await install.userChoice;setInstall(null);await navigator.storage?.persist?.();})}>Instalar aplicativo</button>}
        <button className="secondary" aria-expanded={maintenance} aria-controls="maintenance-tools" onClick={() => setMaintenance(value => !value)}>{maintenance ? 'Fechar configurações' : 'Configurações'}</button>
        {maintenance && <section id="maintenance-tools" className="card stack"><h2>Manutenção</h2><p className="muted">Área do responsável pelo aplicativo. {syncStatus.text}. As cópias em arquivo também podem ser usadas para recuperação.</p>
          <button className="primary" disabled={busy} onClick={() => action(() => exportJson(),'Backup JSON baixado. Guarde uma cópia em outro lugar.')}><Download /> Exportar dados JSON</button>
          <button className="secondary" disabled={busy} onClick={() => action(() => exportJson(true))}><Share2 /> Compartilhar backup JSON</button>
          <label className="file-button secondary">Importar dados JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={importFile} /></label>
          <p className="muted">A importação soma registros novos e mantém a versão mais recente de cada registro.</p>
          <button className="secondary" disabled={busy} onClick={() => action(async () => {const backups=await listBackups();setModal({kind:'backups',backups:backups.reverse()});})}>Ver backups automáticos</button>
          {!rows.length && <p className="note">Os registros da versão antiga precisam ser importados com o backup completo antes de usar este aparelho.</p>}
          <p className="muted">Para instalar no iPhone: abra no Safari e toque em Compartilhar → Adicionar à Tela de Início. No Android, use “Instalar aplicativo” no menu do navegador.</p>
          <p><a href="https://fdemarque.github.io/moagem-atilio/privacidade.html" target="_blank" rel="noopener noreferrer">Política de privacidade</a> · <a href="https://fdemarque.github.io/moagem-atilio/termos.html" target="_blank" rel="noopener noreferrer">Termos de uso</a></p>
        </section>}
      </> : <>
        <button className="back-button" onClick={client ? () => setClient(null) : goHome}><ArrowLeft /> {client ? 'Voltar aos clientes' : 'Trocar produto'}</button>
        <div><p className="eyebrow">{titles[module]}</p><h1>{client || 'Clientes'}</h1></div>
        {!client ? <>
          <button className="primary" onClick={() => {setNewName('');setModal({kind:'client'});}}>+ Novo cliente</button>
          <label>Buscar cliente<input type="search" placeholder="Digite o nome" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <label>Mês do relatório<input type="month" value={month} onChange={e => {if(e.target.value) setMonth(e.target.value);}} /></label>
          <button className="secondary" disabled={busy} onClick={() => action(() => pdf(module,null))}><Download /> Relatório de {titles[module]}</button>
          {names.filter(n => n.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR').trim())).map(name => {
            let movements=rows.filter(r => r.modulo === module && r.cliente === name);
            if(module === 'milho' && movements.some(r => r.data_movimentacao >= '2026-10-01')) movements=movements.filter(r => r.data_movimentacao >= '2026-10-01');
            const total=movements.reduce((s,r) => s+signed(r),0);
            return <button className="client-card" key={name} onClick={() => setClient(name)}><span><strong>{name}</strong><small>Crédito: <b className={total < 0 ? 'negative' : ''}>{fmt(total)} {units[module]}</b></small></span><ChevronRight /></button>;
          })}
          {!names.length && <p className="note">Cadastre um cliente ou importe os dados da versão antiga.</p>}
          {names.length > 0 && !names.some(n => n.toLowerCase().includes(search.toLowerCase().trim())) && <p>Nenhum cliente encontrado.</p>}
        </> : <>
          <div className="two-buttons"><button className="primary" onClick={() => setModal({kind:'movement',type:'IN'})}><ArrowDown /> Entrada</button><button className="danger" onClick={() => setModal({kind:'movement',type:'OUT'})}><ArrowUp /> Saída</button></div>
          <div className="month-nav"><button className="secondary" aria-label="Mês anterior" onClick={() => moveMonth(-1)}>‹</button><label className="sr-only" htmlFor="period">Mês do balanço</label><input id="period" aria-label="Mês do balanço" type="month" value={month} onChange={e => {if(e.target.value) setMonth(e.target.value);}} /><button className="secondary" aria-label="Próximo mês" onClick={() => moveMonth(1)}>›</button></div>
          <section className="card stack"><h2>Balanço do mês</h2><div className="balance-grid"><div><small>Crédito anterior</small><strong>{fmt(balance.opening)} {units[module]}</strong></div><div><small>Entradas</small><strong>{fmt(balance.input)} {units[module]}</strong></div><div><small>Saídas</small><strong>{fmt(balance.output)} {units[module]}</strong></div></div><div className="credit"><span>Crédito ao final do mês</span><strong className={balance.closing < 0 ? 'negative' : ''}>{fmt(balance.closing)} {units[module]}</strong>{module === 'milho' && <small>Equivale a cerca de {Math.floor(balance.closing/50)} sacos de 50 kg</small>}</div></section>
          <h2>Movimentações ({balance.movements.length})</h2><p className="muted">Toque no registro para editar.</p>
          {balance.movements.map(row => <article className={`movement ${row.tipo_movimentacao === 'IN' ? 'entry' : 'exit'}`} key={row.uuid}><button className="movement-edit" onClick={() => setModal({kind:'movement',row})}><b>{row.tipo_movimentacao === 'IN' ? '↓ Entrada' : '↑ Saída'}</b><strong>{fmt(row.quantidade)} {module === 'milho' && row.tipo_movimentacao === 'IN' ? 'kg' : units[module] === 'kg' ? 'sacos' : units[module]}</strong><small>{row.data_movimentacao.split('-').reverse().join('/')}{module === 'milho' && row.tipo_movimentacao === 'OUT' ? ` · ${row.tipo_sacaria === 'pequena' ? '25' : '50'} kg por saco` : ''}</small></button><div className="record-actions">{row.documentos.length > 0 && <button className="secondary" onClick={() => setModal({kind:'photos',row})}>Ver fotos ({row.documentos.length})</button>}<button className="icon-button" aria-label={`Apagar registro de ${row.data_movimentacao}`} onClick={() => setModal({kind:'delete',row})}><Trash2 /></button></div></article>)}
          {!balance.movements.length && <p className="note">Nenhum registro neste mês. Use Entrada ou Saída para registrar.</p>}
          <button className="primary" disabled={busy} onClick={() => action(() => pdf(module,client))}><Download /> Baixar PDF do cliente</button><button className="secondary" disabled={busy} onClick={() => action(() => pdf(module,client,true))}><Share2 /> Compartilhar PDF</button>
        </>}
      </>}
    </main>
    {modal?.kind === 'connect' && <Dialog title="Conectar este aparelho" onClose={()=>setModal(null)} busy={busy}><p>O responsável informa o código uma vez. Depois disso, as cópias são enviadas automaticamente.</p><form className="stack" onSubmit={e=>{e.preventDefault();action(async()=>{await sync.current.connect(accessCode);setAccessCode('');setModal(null);},'Aparelho conectado.');}}><label>Código de acesso<input type="password" value={accessCode} onChange={e=>setAccessCode(e.target.value)} required disabled={busy} autoComplete="current-password" /></label>{error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>Conectar</button></form></Dialog>}
    {modal?.kind === 'movement' && <MovementForm module={module} client={client} row={modal.row} type={modal.type} onClose={() => setModal(null)} onSaved={() => setNotice('Registro salvo neste aparelho.')} />}
    {modal?.kind === 'client' && <Dialog title="Novo cliente" onClose={() => setModal(null)} busy={busy}><form className="stack" onSubmit={e => {e.preventDefault();action(async () => {await addClient(newName);setClient(newName.trim());setModal(null);},'Cliente cadastrado.');}}><label>Nome do cliente<input value={newName} onChange={e => setNewName(e.target.value)} required disabled={busy} /></label>{error && <p role="alert" className="error">{error}</p>}<button className="primary" disabled={busy}>Cadastrar cliente</button></form></Dialog>}
    {modal?.kind === 'delete' && <Dialog title="Apagar este registro?" onClose={() => setModal(null)} busy={busy}><p>O crédito será recalculado. Uma cópia do estado atual será guardada no backup automático.</p><div className="two-buttons"><button className="secondary" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button className="danger" disabled={busy} onClick={() => action(async () => {await deleteMovement(modal.row.uuid);setModal(null);},'Registro apagado.')}>Sim, apagar</button></div>{error && <p role="alert" className="error">{error}</p>}</Dialog>}
    {modal?.kind === 'photos' && <Dialog title="Comprovantes" onClose={() => setModal(null)}>{modal.row.documentos.map((url,i) => <img className="receipt" src={url} key={i} alt={`Comprovante ${i+1}`} />)}</Dialog>}
    {modal?.kind === 'backups' && <Dialog title="Backups automáticos" onClose={() => setModal(null)}><p className="muted">Baixe uma cópia para guardar fora do aparelho. Use Recuperar para desfazer uma edição ou exclusão.</p>{modal.backups.map((b,i) => <div className="backup-row" key={i}><p>{new Date(b.created_at).toLocaleString('pt-BR')}<small>{b.reason}</small></p><button className="secondary" onClick={() => {const blob=new Blob([JSON.stringify(b.document || {legacy_storage:b.source},null,2)],{type:'application/json'});downloadFile(blob,`moagem-automatico-${i}.json`);}}>Baixar cópia</button><button className="secondary" onClick={() => setModal({kind:'recover',backup:b})}>Recuperar esta cópia</button></div>)}</Dialog>}
    {modal?.kind === 'recover' && <Dialog title="Recuperar esta cópia?" onClose={() => setModal(null)} busy={busy}><p>Os registros desta cópia voltarão à versão de {new Date(modal.backup.created_at).toLocaleString('pt-BR')}. Registros novos criados depois dela serão mantidos. O estado atual será guardado antes da recuperação.</p><div className="two-buttons"><button className="secondary" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button className="primary" disabled={busy} onClick={() => action(async () => {await recoverBackup(modal.backup);setModal(null);},'Cópia recuperada. Os registros novos foram mantidos.')}>Sim, recuperar</button></div>{error && <p role="alert" className="error">{error}</p>}</Dialog>}
  </div>;
}

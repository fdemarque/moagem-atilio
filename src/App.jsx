import React, { useEffect, useMemo, useState } from 'react';
import { addClient, deleteMovement, importDocument, jsonFile, downloadFile, listBackups, readDocument, recoverBackup } from './lib/storage.js';
import { MODULES, currentCredit, monthlyBalance } from './lib/document.js';
import { localToday } from './lib/format.js';
import { useRoute } from './hooks/useRoute.js';
import { useAppData } from './hooks/useAppData.js';
import Header from './components/Header.jsx';
import Banner from './components/ui/Banner.jsx';
import Button from './components/ui/Button.jsx';
import ConfirmDialog from './components/ui/ConfirmDialog.jsx';
import MovementForm from './components/dialogs/MovementForm.jsx';
import ClientDialog from './components/dialogs/ClientDialog.jsx';
import ConnectDialog from './components/dialogs/ConnectDialog.jsx';
import PhotosDialog from './components/dialogs/PhotosDialog.jsx';
import BackupsDialog from './components/dialogs/BackupsDialog.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import ClientListScreen from './screens/ClientListScreen.jsx';
import ClientScreen from './screens/ClientScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';

async function shareOrDownload(file, title) {
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return; } catch (err) { if (err.name === 'AbortError') return; }
  }
  downloadFile(file, file.name);
}

export default function App() {
  const [route, go] = useRoute();
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const data = useAppData({ onNotice: setNotice, onError: setError });
  const { state, syncStatus } = data;

  // Messages belong to the screen where they happened.
  useEffect(() => { setNotice(''); setError(''); }, [route.screen, route.module, route.client]);

  async function action(work, success) {
    setError(''); setBusy(true);
    try { await work(); if (success) setNotice(success); return true; }
    catch (err) { setError(err.message || 'Não foi possível concluir. Tente novamente.'); return false; }
    finally { setBusy(false); }
  }
  const closeDialog = () => { setDialog(null); setError(''); };
  const report = (module, client, share) => action(async () => {
    const { reportFile } = await import('./utils/reports.js');
    await shareOrDownload(reportFile(state, month, module, client), 'Relatório Moagem Atílio');
  });

  const view = useMemo(() => {
    if (!state) return null;
    const rows = state.payload.movimentacoes.filter(r => !r.deleted_at);
    const names = [...new Set([...state.payload.clientes.filter(c => !c.deleted_at).map(c => c.nome), ...rows.map(r => r.cliente)])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const today = localToday();
    const byClient = new Map(names.map(n => [n, []]));
    for (const r of rows) byClient.get(r.cliente).push(r);
    const credits = name => Object.fromEntries(MODULES.map(m => [m, currentCredit(byClient.get(name) || [], m, today)]));
    return { rows, names, byClient, credits, summary: `${rows.length} registros · ${names.length} clientes neste aparelho.` };
  }, [state]);

  let screen = null;
  if (state && route.screen === 'home') screen = <HomeScreen month={month} setMonth={setMonth} onReport={report} busy={busy} summary={view.summary} />;
  if (state && route.screen === 'clients') screen = <ClientListScreen module={route.module} go={go} month={month} setMonth={setMonth} onReport={report} busy={busy}
    clients={view.names.map(name => ({ name, credit: view.credits(name)[route.module] }))} onNewClient={() => setDialog({ kind: 'client' })} />;
  if (state && route.screen === 'client') {
    const clientRows = view.byClient.get(route.client) || [];
    screen = <ClientScreen module={route.module} client={route.client} go={go} month={month} setMonth={setMonth} onReport={report} busy={busy}
      credits={view.credits(route.client)} balance={monthlyBalance(clientRows, route.module, month)} openDialog={setDialog} />;
  }
  if (state && route.screen === 'settings') screen = <SettingsScreen go={go} syncStatus={syncStatus} busy={busy} offlineReady={data.offlineReady} summary={view.summary}
    onConnect={() => setDialog({ kind: 'connect' })} onRetry={() => data.sync.current?.retry()}
    install={data.install} onInstall={() => action(async () => { await data.install.prompt(); await data.install.userChoice; data.clearInstall(); await navigator.storage?.persist?.(); })}
    onExport={share => action(async () => shareOrDownload(jsonFile(await readDocument()), 'Backup Moagem Atílio'), share ? null : 'Backup JSON baixado. Guarde uma cópia em outro lugar.')}
    onImport={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) action(async () => {
      if (file.size > 100 * 1024 * 1024) throw new Error('Arquivo acima de 100 MB.');
      const result = await importDocument(await file.text());
      setNotice(`Importação concluída: ${result.added} registros novos e ${result.updated} atualizados.`);
    }); }}
    onBackups={() => action(async () => setDialog({ kind: 'backups', backups: (await listBackups()).reverse() }))} />;

  const inDialog = Boolean(dialog);
  const dialogProps = { onClose: closeDialog, busy, error };
  return <div className="app">
    <Header syncStatus={syncStatus} />
    <main className="stack">
      {data.updateWorker && <Banner kind="notice" action={<Button variant="primary" disabled={inDialog || busy} onClick={() => { navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true }); data.updateWorker.postMessage('ACTIVATE_UPDATE'); }}>Atualizar aplicativo</Button>}>Nova versão disponível.</Banner>}
      {data.loadError && <Banner kind="error" action={<Button onClick={() => data.reload().catch(() => {})}>Tentar novamente</Button>}>{data.loadError}</Banner>}
      {error && !inDialog && <Banner kind="error" onDismiss={() => setError('')}>{error}</Banner>}
      {notice && <Banner kind="notice" onDismiss={() => setNotice('')}>{notice}</Banner>}
      {!state && !data.loadError ? <p className="lead">Abrindo os dados deste aparelho…</p> : screen}
    </main>
    {dialog?.kind === 'movement' && <MovementForm module={route.module} client={route.client} row={dialog.row} type={dialog.type} onClose={closeDialog} onSaved={setNotice} />}
    {dialog?.kind === 'client' && <ClientDialog {...dialogProps} onSave={name => action(async () => { const clean = await addClient(name); setDialog(null); go({ module: route.module, client: clean }); }, 'Cliente cadastrado.')} />}
    {dialog?.kind === 'connect' && <ConnectDialog {...dialogProps} onConnect={code => action(async () => { await data.sync.current.connect(code); setDialog(null); }, 'Aparelho conectado à planilha.')} />}
    {dialog?.kind === 'delete' && <ConfirmDialog {...dialogProps} title="Apagar este registro?" danger confirmLabel="Sim, apagar" onConfirm={() => action(async () => { await deleteMovement(dialog.row.uuid); setDialog(null); }, 'Registro apagado.')}>O crédito será recalculado. A exclusão também vai para a planilha.</ConfirmDialog>}
    {dialog?.kind === 'photos' && <PhotosDialog row={dialog.row} onClose={closeDialog} />}
    {dialog?.kind === 'backups' && <BackupsDialog backups={dialog.backups} onClose={closeDialog} onRecover={backup => setDialog({ kind: 'recover', backup })} />}
    {dialog?.kind === 'recover' && <ConfirmDialog {...dialogProps} title="Recuperar esta cópia?" confirmLabel="Sim, recuperar" onConfirm={() => action(async () => { await recoverBackup(dialog.backup); setDialog(null); }, 'Cópia recuperada. Os registros novos foram mantidos.')}>Os registros voltarão à versão de {new Date(dialog.backup.created_at).toLocaleString('pt-BR')}. Registros criados depois serão mantidos.</ConfirmDialog>}
  </div>;
}

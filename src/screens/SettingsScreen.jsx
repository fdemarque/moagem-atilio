import React from 'react';
import { ArrowLeft, Download, Share2, Upload, History, Link2, RefreshCw, Smartphone } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import { readConnection } from '../lib/sync.js';

export default function SettingsScreen({ go, syncStatus, onConnect, onRetry, install, onInstall, onExport, onImport, onBackups, busy, offlineReady, summary }) {
  const connected = Boolean(readConnection());
  return <>
    <Button variant="back" icon={ArrowLeft} onClick={() => go({})}>Produtos</Button>
    <h1>Configurações</h1>

    <section className="card stack" aria-labelledby="sheet-title">
      <h2 id="sheet-title">Planilha</h2>
      <p className="lead" role="status">{syncStatus.text}</p>
      {syncStatus.detail && syncStatus.kind === 'error' && <p className="muted">Detalhe: {syncStatus.detail}</p>}
      <p className="muted">{summary}</p>
      {connected && syncStatus.kind !== 'access' && <Button icon={RefreshCw} disabled={busy} onClick={onRetry}>Enviar e atualizar agora</Button>}
      <Button variant={connected && syncStatus.kind !== 'access' ? 'secondary' : 'primary'} icon={Link2} onClick={onConnect}>{connected ? 'Trocar código de conexão' : 'Conectar este aparelho'}</Button>
    </section>

    <section className="card stack" aria-labelledby="app-title">
      <h2 id="app-title">Aplicativo</h2>
      {offlineReady && <p className="muted">Este aparelho já funciona sem internet.</p>}
      {install && <Button variant="primary" icon={Smartphone} onClick={onInstall}>Instalar aplicativo</Button>}
      <p className="muted">iPhone: abra no Safari → Compartilhar → Adicionar à Tela de Início. Android: menu do Chrome → Instalar aplicativo.</p>
    </section>

    <section className="card stack" aria-labelledby="files-title">
      <h2 id="files-title">Cópias em arquivo</h2>
      <p className="muted">Para o responsável. A planilha já guarda tudo; use estas opções só para recuperação.</p>
      <Button icon={Download} disabled={busy} onClick={() => onExport(false)}>Exportar dados JSON</Button>
      {navigator.canShare && <Button icon={Share2} disabled={busy} onClick={() => onExport(true)}>Enviar backup JSON</Button>}
      <label className="file-button secondary"><Upload aria-hidden="true" size={24} />Importar dados JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={onImport} /></label>
      <p className="muted">A importação soma registros novos e mantém a versão mais recente de cada registro.</p>
      <Button icon={History} disabled={busy} onClick={onBackups}>Cópias automáticas deste aparelho</Button>
    </section>

    <p><a href="https://fdemarque.github.io/moagem-atilio/privacidade.html" target="_blank" rel="noopener noreferrer">Política de privacidade</a> · <a href="https://fdemarque.github.io/moagem-atilio/termos.html" target="_blank" rel="noopener noreferrer">Termos de uso</a></p>
  </>;
}

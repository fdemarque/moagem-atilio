import React from 'react';
import Dialog from '../ui/Dialog.jsx';
import Button from '../ui/Button.jsx';
import { downloadFile } from '../../lib/storage.js';

const REASONS = { 'antes-da-edicao': 'Antes de uma edição', 'antes-da-exclusao': 'Antes de uma exclusão', 'antes-da-importacao': 'Antes de uma importação', 'antes-da-recuperacao': 'Antes de uma recuperação', 'antes-da-migracao': 'Antes da migração', 'migracao-local': 'Migração' };

export default function BackupsDialog({ backups, onRecover, onClose }) {
  return <Dialog title="Cópias automáticas" onClose={onClose}>
    <p className="muted">Cópias guardadas neste aparelho antes de cada alteração. Recuperar desfaz edições e exclusões e mantém os registros criados depois.</p>
    {!backups.length && <p>Nenhuma cópia ainda.</p>}
    {backups.map((b, i) => <div className="backup-row" key={i}>
      <p>{new Date(b.created_at).toLocaleString('pt-BR')}<small>{REASONS[b.reason] || b.reason}</small></p>
      <div className="two-buttons">
        <Button onClick={() => downloadFile(new Blob([JSON.stringify(b.document || { legacy_storage: b.source }, null, 2)], { type: 'application/json' }), `moagem-automatico-${i}.json`)}>Baixar</Button>
        <Button onClick={() => onRecover(b)}>Recuperar</Button>
      </div>
    </div>)}
  </Dialog>;
}

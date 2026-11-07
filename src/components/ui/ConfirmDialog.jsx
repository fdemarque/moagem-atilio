import React from 'react';
import Dialog from './Dialog.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({ title, children, confirmLabel, danger = false, onConfirm, onClose, busy, error }) {
  return <Dialog title={title} onClose={onClose} busy={busy} error={error}>
    <p className="lead">{children}</p>
    <div className="two-buttons">
      <Button onClick={onClose} disabled={busy}>Cancelar</Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Aguarde…' : confirmLabel}</Button>
    </div>
  </Dialog>;
}

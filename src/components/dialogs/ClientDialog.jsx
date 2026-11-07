import React, { useState } from 'react';
import Dialog from '../ui/Dialog.jsx';
import Button from '../ui/Button.jsx';

export default function ClientDialog({ onSave, onClose, busy, error }) {
  const [name, setName] = useState('');
  return <Dialog title="Novo cliente" onClose={onClose} busy={busy} error={error}>
    <p className="muted">O cliente aparece em Milho, Sacarias e Soja.</p>
    <form className="stack" onSubmit={e => { e.preventDefault(); onSave(name); }}>
      <label>Nome do cliente<input value={name} onChange={e => setName(e.target.value)} required disabled={busy} autoComplete="off" /></label>
      <Button type="submit" variant="primary" disabled={busy}>Cadastrar cliente</Button>
    </form>
  </Dialog>;
}

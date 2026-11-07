import React, { useState } from 'react';
import Dialog from '../ui/Dialog.jsx';
import Button from '../ui/Button.jsx';

export default function ConnectDialog({ onConnect, onClose, busy, error }) {
  const [code, setCode] = useState('');
  return <Dialog title="Conectar à planilha" onClose={onClose} busy={busy} error={error}>
    <p>Na planilha, use o menu Moagem → Link de conexão dos aparelhos. Abra o link neste aparelho ou cole o código abaixo. É feito uma vez só.</p>
    <form className="stack" onSubmit={e => { e.preventDefault(); onConnect(code); }}>
      <label>Código de conexão<textarea rows={3} value={code} onChange={e => setCode(e.target.value)} required disabled={busy} autoComplete="off" spellCheck={false} /></label>
      <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Conferindo…' : 'Conectar'}</Button>
    </form>
  </Dialog>;
}

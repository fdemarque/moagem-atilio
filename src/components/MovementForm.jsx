import React, { useState } from 'react';
import Dialog from './Dialog';
import { saveMovement } from '../lib/storage.js';
export const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
async function readPhoto(file) {
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Foto muito grande. Escolha uma foto de até 8 MB.');
  return new Promise((resolve,reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('Falha ao ler a foto.')); r.readAsDataURL(file); });
}
export default function MovementForm({ module, client, row, type, onClose, onSaved }) {
  const [operation,setOperation] = useState(row?.tipo_movimentacao || type);
  const [quantity,setQuantity] = useState(String(module === 'milho' && row?.tipo_movimentacao === 'IN' ? row.peso_kg || row.quantidade : row?.quantidade || ''));
  const [sack,setSack] = useState(row?.tipo_sacaria === 'pequena' ? 'pequena' : 'normal');
  const [date,setDate] = useState(row?.data_movimentacao || localToday());
  const [photos,setPhotos] = useState(row?.documentos || []);
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const bulk = module === 'milho' && operation === 'IN';
  const label = bulk ? 'Peso recebido (kg)' : module === 'sacarias' ? 'Quantidade de sacarias vazias' : 'Quantidade de sacos';
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const count = Number(quantity);
      if (!Number.isFinite(count) || count <= 0 || (!bulk && !Number.isSafeInteger(count))) throw new Error(bulk ? 'Informe um peso maior que zero.' : 'Informe uma quantidade inteira maior que zero.');
      await saveMovement({ cliente: client, modulo: module, tipo_movimentacao: operation, tipo_sacaria: module === 'milho' ? bulk ? 'granel' : sack : 'unidade', quantidade: count, peso_kg: module === 'milho' ? bulk ? count : count * (sack === 'pequena' ? 25 : 50) : null, data_movimentacao: date, documentos: photos },row?.uuid);
      onSaved(); onClose();
    } catch(err) { setError(err.message); } finally { setBusy(false); }
  }
  async function attach(event) {
    const files = [...event.target.files]; event.target.value = ''; setBusy(true); setError('');
    try { const results = await Promise.all(files.map(readPhoto)); setPhotos(p => [...p,...results]); }
    catch(err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Dialog title={`${row ? 'Editar registro' : operation === 'IN' ? 'Registrar entrada' : 'Registrar saída'}`} onClose={onClose} busy={busy}>
    <p className="muted">{client} · {module === 'sacarias' ? 'Sacarias vazias' : module === 'soja' ? 'Soja' : 'Milho'}</p>
    <form onSubmit={submit} className="stack">
      <div className="two-buttons"><button type="button" disabled={busy} className={operation === 'IN' ? 'primary' : 'secondary'} onClick={() => { setOperation('IN'); setQuantity(''); }}>↓ Entrada</button><button type="button" disabled={busy} className={operation === 'OUT' ? 'danger' : 'secondary'} onClick={() => { setOperation('OUT'); setQuantity(''); }}>↑ Saída</button></div>
      <label>{label}<input autoFocus type="number" inputMode={bulk ? 'decimal' : 'numeric'} min={bulk ? '0.001' : '1'} step={bulk ? 'any' : '1'} value={quantity} onChange={e => setQuantity(e.target.value)} required disabled={busy} /></label>
      <div className="quick-buttons">{(bulk ? [100,500,1000] : [1,10,50]).map(n => <button type="button" className="secondary" key={n} disabled={busy} onClick={() => setQuantity(String((Number(quantity) || 0)+n))}>+{n}</button>)}</div>
      {module === 'milho' && !bulk && <label>Tamanho do saco<select value={sack} onChange={e => setSack(e.target.value)} disabled={busy}><option value="normal">Normal — 50 kg</option><option value="pequena">Pequeno — 25 kg</option></select></label>}
      {module === 'milho' && !bulk && <p className="note">Abate {(Number(quantity || 0)*(sack === 'pequena' ? 25 : 50)).toLocaleString('pt-BR')} kg do crédito.</p>}
      {module === 'soja' && <p className="note">Um saco de soja corresponde a uma unidade. O estoque é contado em sacos.</p>}
      <label>Data do registro<input type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={busy} /></label>
      <div className="two-buttons"><label className="file-button secondary">Tirar foto<input type="file" accept="image/*" capture="environment" onChange={attach} disabled={busy} /></label><label className="file-button secondary">Anexar foto<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={attach} disabled={busy} /></label></div>
      {photos.map((photo,i) => <div className="photo-row" key={i}><img src={photo} alt={`Comprovante ${i+1}`} /><button type="button" className="secondary" disabled={busy} onClick={() => setPhotos(p => p.filter((_,j) => j !== i))}>Remover foto {i+1}</button></div>)}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="two-buttons"><button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar registro'}</button></div>
    </form>
  </Dialog>;
}

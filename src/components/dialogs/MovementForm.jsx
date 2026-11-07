import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Camera, ImagePlus } from 'lucide-react';
import Dialog from '../ui/Dialog.jsx';
import Button from '../ui/Button.jsx';
import { saveMovement } from '../../lib/storage.js';
import { TITLES } from '../../lib/document.js';
import { formatNumber, localToday } from '../../lib/format.js';

const MAX_SIDE = 1600;

// Photos are reduced to JPEG (≤1600 px) before saving: lighter on the phone
// and on the sheet's Drive folder, still readable for receipts.
async function readPhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha uma foto (JPG, PNG ou WebP).');
  if (file.size > 25 * 1024 * 1024) throw new Error('Foto muito grande. Escolha uma foto de até 25 MB.');
  const original = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('Falha ao ler a foto.')); r.readAsDataURL(file); });
  try {
    const image = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const reduced = canvas.toDataURL('image/jpeg', 0.8);
    return reduced.length < original.length ? reduced : original;
  } catch {
    if (!/^data:image\/(png|jpeg|webp|gif);/.test(original)) throw new Error('Formato de foto não suportado. Use JPG ou PNG.');
    return original;
  }
}

export default function MovementForm({ module, client, row, type, onClose, onSaved }) {
  const [operation, setOperation] = useState(row?.tipo_movimentacao || type);
  const [quantity, setQuantity] = useState(String(module === 'milho' && row?.tipo_movimentacao === 'IN' ? row.peso_kg || row.quantidade : row?.quantidade || ''));
  const [sack, setSack] = useState(row?.tipo_sacaria === 'pequena' ? 'pequena' : 'normal');
  const [date, setDate] = useState(row?.data_movimentacao || localToday());
  const [photos, setPhotos] = useState(row?.documentos || []);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const bulk = module === 'milho' && operation === 'IN';
  const label = bulk ? 'Peso recebido (kg)' : module === 'sacarias' ? 'Quantidade de sacarias vazias' : 'Quantidade de sacos';
  const sackKg = sack === 'pequena' ? 25 : 50;
  function switchOperation(next) { if (next !== operation) { setOperation(next); setQuantity(''); } }
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const count = Number(String(quantity).replace(',', '.'));
      if (!Number.isFinite(count) || count <= 0 || (!bulk && !Number.isSafeInteger(count))) throw new Error(bulk ? 'Informe um peso maior que zero.' : 'Informe uma quantidade inteira maior que zero.');
      await saveMovement({ cliente: client, modulo: module, tipo_movimentacao: operation, tipo_sacaria: module === 'milho' ? bulk ? 'granel' : sack : 'unidade', quantidade: count, peso_kg: module === 'milho' ? bulk ? count : count * sackKg : null, data_movimentacao: date, documentos: photos }, row?.uuid);
      onSaved(row ? 'Registro alterado.' : operation === 'IN' ? 'Entrada registrada.' : 'Saída registrada.'); onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function attach(event) {
    const files = [...event.target.files]; event.target.value = ''; setBusy(true); setError('');
    try { const results = await Promise.all(files.map(readPhoto)); setPhotos(p => [...p, ...results]); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Dialog title={row ? 'Editar registro' : operation === 'IN' ? 'Registrar entrada' : 'Registrar saída'} onClose={onClose} busy={busy} error={error}>
    <p className="muted">{client} · {TITLES[module]}</p>
    <form onSubmit={submit} className="stack">
      <div className="two-buttons" role="group" aria-label="Operação">
        <Button variant={operation === 'IN' ? 'primary' : 'secondary'} icon={ArrowDown} aria-pressed={operation === 'IN'} disabled={busy} onClick={() => switchOperation('IN')}>Entrada</Button>
        <Button variant={operation === 'OUT' ? 'danger' : 'secondary'} icon={ArrowUp} aria-pressed={operation === 'OUT'} disabled={busy} onClick={() => switchOperation('OUT')}>Saída</Button>
      </div>
      <label>{label}<input data-autofocus type="number" inputMode={bulk ? 'decimal' : 'numeric'} min={bulk ? '0.001' : '1'} step={bulk ? 'any' : '1'} value={quantity} onChange={e => setQuantity(e.target.value)} required disabled={busy} /></label>
      <div className="quick-buttons">{(bulk ? [100, 500, 1000] : [1, 10, 50]).map(n => <Button key={n} disabled={busy} aria-label={`Somar ${n}`} onClick={() => setQuantity(String((Number(quantity) || 0) + n))}>+{n}</Button>)}</div>
      {module === 'milho' && !bulk && <>
        <label>Tamanho do saco<select value={sack} onChange={e => setSack(e.target.value)} disabled={busy}><option value="normal">Normal — 50 kg</option><option value="pequena">Pequeno — 25 kg</option></select></label>
        <p className="banner note">Abate {formatNumber(Number(quantity || 0) * sackKg)} kg do crédito.</p>
      </>}
      <label>Data do registro<input type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={busy} /></label>
      <div className="two-buttons">
        <label className="file-button secondary"><Camera aria-hidden="true" size={24} />Tirar foto<input type="file" accept="image/*" capture="environment" onChange={attach} disabled={busy} /></label>
        <label className="file-button secondary"><ImagePlus aria-hidden="true" size={24} />Anexar foto<input type="file" accept="image/*" multiple onChange={attach} disabled={busy} /></label>
      </div>
      {photos.map((photo, i) => <div className="photo-row" key={i}><img src={photo} alt={`Comprovante ${i + 1}`} /><Button disabled={busy} onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}>Remover foto {i + 1}</Button></div>)}
      <div className="two-buttons">
        <Button onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar registro'}</Button>
      </div>
    </form>
  </Dialog>;
}

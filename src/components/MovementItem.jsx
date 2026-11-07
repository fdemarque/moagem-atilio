import React from 'react';
import { ArrowDown, ArrowUp, Image, Trash2 } from 'lucide-react';
import { formatAmount, formatDate, movementQuantity } from '../lib/format.js';
import { amount } from '../lib/document.js';

export default function MovementItem({ row, onEdit, onDelete, onPhotos }) {
  const entry = row.tipo_movimentacao === 'IN';
  const Icon = entry ? ArrowDown : ArrowUp;
  const date = formatDate(row.data_movimentacao);
  const showKg = row.modulo === 'milho' && !entry;
  return <article className={`movement ${entry ? 'entry' : 'exit'}`}>
    <button type="button" className="movement-edit" onClick={onEdit} aria-label={`${entry ? 'Entrada' : 'Saída'} de ${movementQuantity(row)} em ${date}. Editar registro.`}>
      <b><Icon aria-hidden="true" size={20} /> {entry ? 'Entrada' : 'Saída'}</b>
      <strong>{movementQuantity(row)}</strong>
      <small>{date}{showKg && ` · abate ${formatAmount(amount(row), 'milho')}`}</small>
    </button>
    <div className="record-actions">
      {row.documentos.length > 0 && <button type="button" className="icon-button" aria-label={`Ver ${row.documentos.length} foto(s) do registro de ${date}`} onClick={onPhotos}><Image aria-hidden="true" /></button>}
      <button type="button" className="icon-button" aria-label={`Apagar registro de ${date}`} onClick={onDelete}><Trash2 aria-hidden="true" /></button>
    </div>
  </article>;
}

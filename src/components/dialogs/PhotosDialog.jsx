import React from 'react';
import Dialog from '../ui/Dialog.jsx';

export default function PhotosDialog({ row, onClose }) {
  return <Dialog title="Comprovantes" onClose={onClose}>
    {row.documentos.map((url, i) => <img className="receipt" src={url} key={i} alt={`Comprovante ${i + 1}`} />)}
  </Dialog>;
}

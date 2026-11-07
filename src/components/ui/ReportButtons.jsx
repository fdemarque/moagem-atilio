import React from 'react';
import { Download, Share2 } from 'lucide-react';
import Button from './Button.jsx';

const canShare = typeof navigator !== 'undefined' && Boolean(navigator.canShare);

// Download is the main action; Share appears only where the phone supports it.
export default function ReportButtons({ label, onReport, busy }) {
  return <div className={canShare ? 'two-buttons' : 'stack'}>
    <Button variant="primary" icon={Download} disabled={busy} onClick={() => onReport(false)}>Baixar {label}</Button>
    {canShare && <Button icon={Share2} disabled={busy} onClick={() => onReport(true)}>Enviar {label}</Button>}
  </div>;
}

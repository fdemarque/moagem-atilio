import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function Dialog({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  const callbacks = useRef({ onClose, busy });
  callbacks.current = { onClose, busy };
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.querySelector('input:not([type=file]), select, button')?.focus();
    const handle = event => {
      if (event.key === 'Escape' && !callbacks.current.busy) callbacks.current.onClose();
      if (event.key === 'Tab') {
        const nodes = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(n => n.getClientRects().length);
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    dialog.addEventListener('keydown', handle);
    return () => { dialog.removeEventListener('keydown',handle); document.body.style.overflow = originalOverflow; previous?.focus(); };
  }, []);
  return <div className="dialog-backdrop"><section className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
    <div className="dialog-title"><h2>{title}</h2><button className="icon-button" aria-label="Fechar" onClick={onClose} disabled={busy}><X /></button></div>
    {children}
  </section></div>;
}
